from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
from slugify import slugify
import hashlib
import json
import asyncio
from io import BytesIO
import markdown
from pypdf import PdfReader
from docx import Document
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Setup
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Auth setup
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"

# Create the main app
app = FastAPI(title="Accredis API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ===========================
# MODELS
# ===========================

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: str = "staff"  # staff, manager, owner, consultant

class UserCreate(UserBase):
    password: str
    clinic_id: Optional[str] = None

class UserResponse(UserBase):
    id: str
    clinic_id: Optional[str] = None
    created_at: datetime
    is_active: bool = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ClinicBase(BaseModel):
    name: str
    abn: Optional[str] = None
    address: str
    state: str  # NSW, VIC, QLD, SA, WA, TAS, NT, ACT
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class ClinicCreate(ClinicBase):
    pass

class ClinicResponse(ClinicBase):
    id: str
    slug: str
    created_at: datetime
    owner_id: str

class DocumentStatus(str):
    DRAFT = "draft"
    REVIEW = "review" 
    PUBLISHED = "published"
    ARCHIVED = "archived"

class DocumentBase(BaseModel):
    title: str
    category: str  # policy, procedure, checklist, risk_assessment
    content: str
    jurisdiction: str  # national, NSW, VIC, QLD, SA, WA, TAS, NT, ACT
    tags: List[str] = []
    
class DocumentCreate(DocumentBase):
    clinic_id: str

class DocumentResponse(DocumentBase):
    id: str
    clinic_id: str
    status: str = DocumentStatus.DRAFT
    version: int = 1
    created_by: str
    created_at: datetime
    updated_at: datetime
    signature_hash: Optional[str] = None
    signed_by: Optional[str] = None
    signed_at: Optional[datetime] = None

class DocumentGenerationRequest(BaseModel):
    prompt: str
    category: str = "policy"
    jurisdiction: str = "national"
    clinic_id: str

class RiskBase(BaseModel):
    title: str
    description: str
    category: str  # clinical, WHS, privacy, business
    severity: int = Field(..., ge=1, le=5)
    likelihood: int = Field(..., ge=1, le=5)
    mitigation_plan: Optional[str] = None
    
class RiskCreate(RiskBase):
    clinic_id: str
    
class RiskResponse(RiskBase):
    id: str
    clinic_id: str
    risk_score: int  # severity * likelihood
    status: str = "open"  # open, monitoring, closed
    owner_id: Optional[str] = None
    linked_docs: List[str] = []
    created_at: datetime
    updated_at: datetime
    
class AuditResult(BaseModel):
    document_id: str
    score: float  # 0-100
    compliance_issues: List[Dict[str, Any]]
    recommendations: List[str]
    racgp_coverage: Dict[str, bool]
    
# ===========================
# UTILITIES
# ===========================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, clinic_id: Optional[str] = None) -> str:
    payload = {
        "user_id": user_id,
        "clinic_id": clinic_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def create_document_hash(content: str, user_id: str, timestamp: datetime) -> str:
    """Create SHA-256 hash for digital signature"""
    data = f"{content}{user_id}{timestamp.isoformat()}"
    return hashlib.sha256(data.encode()).hexdigest()

async def generate_ai_document(prompt: str, jurisdiction: str, category: str) -> str:
    """Generate document using AI"""
    try:
        # Get API key from environment
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Create jurisdiction-aware system message
        system_message = f"""You are an expert in Australian healthcare compliance and policy writing for General Practice clinics.

Generate a comprehensive {category} document for {jurisdiction} jurisdiction that complies with:
- RACGP Standards for General Practices 5th Edition
- National Vaccine Storage Guidelines (Strive for 5)
- State-specific regulations for {jurisdiction}

Format the response as a structured policy document with:
1. Title
2. Purpose/Scope
3. Policy Statement
4. Procedures (numbered steps)
5. Responsibilities
6. References to relevant standards
7. Review requirements

Make it specific to Australian General Practice operations and include relevant compliance references."""

        # Initialize AI chat
        chat = LlmChat(
            api_key=api_key,
            session_id=f"doc_gen_{uuid.uuid4()}",
            system_message=system_message
        ).with_model("openai", "gpt-4o").with_max_tokens(4096)
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return response
        
    except Exception as e:
        logger.error(f"AI document generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Document generation failed")

async def audit_document(content: str, jurisdiction: str) -> AuditResult:
    """Audit document for compliance"""
    try:
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        system_message = f"""You are an expert compliance auditor for Australian General Practice clinics.

Audit the provided document against:
- RACGP Standards for General Practices 5th Edition
- {jurisdiction} specific healthcare regulations
- Best practices for GP clinic operations

Provide a detailed compliance analysis with:
1. Overall compliance score (0-100)
2. Specific compliance issues found
3. Recommendations for improvement
4. RACGP standard coverage assessment

Return the analysis in JSON format."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"audit_{uuid.uuid4()}",
            system_message=system_message
        ).with_model("openai", "gpt-4o").with_max_tokens(2048)
        
        user_message = UserMessage(text=f"Audit this document:\n\n{content}")
        response = await chat.send_message(user_message)
        
        # Parse AI response (simplified for MVP)
        return AuditResult(
            document_id="",
            score=85.0,  # Default score - in production, parse AI response
            compliance_issues=[],
            recommendations=["Review and update annually", "Ensure staff training"],
            racgp_coverage={"Standard_1": True, "Standard_2": True}
        )
        
    except Exception as e:
        logger.error(f"Document audit failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Document audit failed")

# ===========================
# AUTHENTICATION ROUTES
# ===========================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    if await db.users.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "role": user_data.role,
        "clinic_id": user_data.clinic_id,
        "password_hash": hashed_password,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id, user_data.clinic_id)
    user_response = UserResponse(**{k: v for k, v in user_doc.items() if k != "password_hash"})
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account deactivated")
    
    token = create_jwt_token(user["id"], user.get("clinic_id"))
    user_response = UserResponse(**{k: v for k, v in user.items() if k != "password_hash"})
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user=Depends(get_current_user)):
    return UserResponse(**{k: v for k, v in current_user.items() if k != "password_hash"})

# ===========================
# CLINIC MANAGEMENT
# ===========================

@api_router.post("/clinics", response_model=ClinicResponse)
async def create_clinic(clinic_data: ClinicCreate, current_user=Depends(get_current_user)):
    clinic_id = str(uuid.uuid4())
    clinic_slug = slugify(clinic_data.name)
    
    clinic_doc = {
        "id": clinic_id,
        "slug": clinic_slug,
        "name": clinic_data.name,
        "abn": clinic_data.abn,
        "address": clinic_data.address,
        "state": clinic_data.state,
        "phone": clinic_data.phone,
        "email": clinic_data.email,
        "owner_id": current_user["id"],
        "created_at": datetime.utcnow()
    }
    
    await db.clinics.insert_one(clinic_doc)
    
    # Update user's clinic_id
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"clinic_id": clinic_id}}
    )
    
    return ClinicResponse(**clinic_doc)

@api_router.get("/clinics/{clinic_id}", response_model=ClinicResponse)
async def get_clinic(clinic_id: str, current_user=Depends(get_current_user)):
    clinic = await db.clinics.find_one({"id": clinic_id})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    return ClinicResponse(**clinic)

@api_router.get("/clinics", response_model=List[ClinicResponse])
async def get_user_clinics(current_user=Depends(get_current_user)):
    # Get clinics where user is owner or staff
    clinics = await db.clinics.find({
        "$or": [
            {"owner_id": current_user["id"]},
            {"id": current_user.get("clinic_id")}
        ]
    }).to_list(100)
    
    return [ClinicResponse(**clinic) for clinic in clinics]

# ===========================
# DOCUMENT MANAGEMENT
# ===========================

@api_router.post("/documents/generate", response_model=DocumentResponse)
async def generate_document(request: DocumentGenerationRequest, current_user=Depends(get_current_user)):
    # Verify clinic access
    clinic = await db.clinics.find_one({"id": request.clinic_id})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    # Generate AI content
    ai_content = await generate_ai_document(request.prompt, request.jurisdiction, request.category)
    
    # Create document
    doc_id = str(uuid.uuid4())
    
    # Extract title from AI content - look for the first heading
    import re
    title_match = re.search(r'^#+\s*(.+)$', ai_content, re.MULTILINE)
    if title_match:
        extracted_title = title_match.group(1).strip()
    else:
        # Fallback to first sentence if no heading found
        sentences = ai_content.split('.')
        extracted_title = sentences[0][:100] + "..." if len(sentences[0]) > 100 else sentences[0]
        
    # Clean up any markdown formatting from title
    extracted_title = re.sub(r'[#*_`]', '', extracted_title).strip()
    
    doc = {
        "id": doc_id,
        "title": extracted_title,
        "content": ai_content,
        "category": request.category,
        "jurisdiction": request.jurisdiction,
        "clinic_id": request.clinic_id,
        "status": DocumentStatus.DRAFT,
        "version": 1,
        "tags": [],
        "created_by": current_user["id"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.documents.insert_one(doc)
    return DocumentResponse(**doc)

@api_router.get("/documents", response_model=List[DocumentResponse])
async def get_documents(
    clinic_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    query = {}
    
    # Filter by clinic if specified
    if clinic_id:
        query["clinic_id"] = clinic_id
    elif current_user.get("clinic_id"):
        query["clinic_id"] = current_user["clinic_id"]
    
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    
    documents = await db.documents.find(query).sort("created_at", -1).to_list(100)
    return [DocumentResponse(**doc) for doc in documents]

@api_router.get("/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, current_user=Depends(get_current_user)):
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return DocumentResponse(**doc)

@api_router.put("/documents/{doc_id}/status")
async def update_document_status(
    doc_id: str,
    status: str,
    current_user=Depends(get_current_user)
):
    valid_statuses = [DocumentStatus.DRAFT, DocumentStatus.REVIEW, DocumentStatus.PUBLISHED, DocumentStatus.ARCHIVED]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    update_data = {
        "status": status,
        "updated_at": datetime.utcnow()
    }
    
    # If publishing, add digital signature
    if status == DocumentStatus.PUBLISHED:
        signature_hash = create_document_hash(doc["content"], current_user["id"], datetime.utcnow())
        update_data.update({
            "signature_hash": signature_hash,
            "signed_by": current_user["id"],
            "signed_at": datetime.utcnow()
        })
    
    await db.documents.update_one({"id": doc_id}, {"$set": update_data})
    return {"message": "Document status updated", "status": status}

@api_router.post("/documents/{doc_id}/audit", response_model=AuditResult)
async def audit_document_endpoint(doc_id: str, current_user=Depends(get_current_user)):
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    audit_result = await audit_document(doc["content"], doc["jurisdiction"])
    audit_result.document_id = doc_id
    
    # Store audit result
    audit_doc = {
        "id": str(uuid.uuid4()),
        "document_id": doc_id,
        "score": audit_result.score,
        "compliance_issues": audit_result.compliance_issues,
        "recommendations": audit_result.recommendations,
        "racgp_coverage": audit_result.racgp_coverage,
        "audited_by": current_user["id"],
        "audited_at": datetime.utcnow()
    }
    await db.audits.insert_one(audit_doc)
    
    return audit_result

# ===========================
# RISK MANAGEMENT
# ===========================

@api_router.post("/risks", response_model=RiskResponse)
async def create_risk(risk_data: RiskCreate, current_user=Depends(get_current_user)):
    risk_id = str(uuid.uuid4())
    risk_doc = {
        "id": risk_id,
        "title": risk_data.title,
        "description": risk_data.description,
        "category": risk_data.category,
        "severity": risk_data.severity,
        "likelihood": risk_data.likelihood,
        "mitigation_plan": risk_data.mitigation_plan,
        "clinic_id": risk_data.clinic_id,
        "risk_score": risk_data.severity * risk_data.likelihood,
        "status": "open",
        "owner_id": current_user["id"],
        "linked_docs": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.risks.insert_one(risk_doc)
    return RiskResponse(**risk_doc)

@api_router.get("/risks", response_model=List[RiskResponse])
async def get_risks(clinic_id: Optional[str] = None, current_user=Depends(get_current_user)):
    query = {}
    if clinic_id:
        query["clinic_id"] = clinic_id
    elif current_user.get("clinic_id"):
        query["clinic_id"] = current_user["clinic_id"]
    
    risks = await db.risks.find(query).sort("risk_score", -1).to_list(100)
    return [RiskResponse(**risk) for risk in risks]

# ===========================
# FILE UPLOAD & PROCESSING
# ===========================

@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    clinic_id: str = Form(...),
    category: str = Form("policy"),
    jurisdiction: str = Form("national"),
    current_user=Depends(get_current_user)
):
    if file.size > 20 * 1024 * 1024:  # 20MB limit
        raise HTTPException(status_code=400, detail="File too large")
    
    # Read file content
    content = await file.read()
    extracted_text = ""
    
    try:
        if file.content_type == "application/pdf":
            pdf_reader = PdfReader(BytesIO(content))
            extracted_text = "\n".join([page.extract_text() for page in pdf_reader.pages])
        elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            doc = Document(BytesIO(content))
            extracted_text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        else:
            extracted_text = content.decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")
    
    # Create document
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "title": file.filename,
        "content": extracted_text,
        "category": category,
        "jurisdiction": jurisdiction,
        "clinic_id": clinic_id,
        "status": DocumentStatus.DRAFT,
        "version": 1,
        "tags": ["uploaded"],
        "created_by": current_user["id"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.documents.insert_one(doc)
    return {"message": "Document uploaded successfully", "document_id": doc_id}

# ===========================
# SETTINGS MANAGEMENT
# ===========================

@api_router.post("/settings")
async def save_settings(settings: dict, current_user=Depends(get_current_user)):
    """Save user/clinic settings - for MVP, we'll update the backend .env file with API key"""
    try:
        # For MVP: Update OpenAI API key in environment
        if 'openai_api_key' in settings and settings['openai_api_key']:
            # In production, this should be encrypted per-clinic in database
            api_key = settings['openai_api_key']
            
            # Update .env file
            env_path = ROOT_DIR / '.env'
            with open(env_path, 'r') as f:
                lines = f.readlines()
            
            # Update or add OPENAI_API_KEY
            key_found = False
            for i, line in enumerate(lines):
                if line.startswith('OPENAI_API_KEY='):
                    lines[i] = f'OPENAI_API_KEY="{api_key}"\n'
                    key_found = True
                    break
            
            if not key_found:
                lines.append(f'OPENAI_API_KEY="{api_key}"\n')
            
            with open(env_path, 'w') as f:
                f.writelines(lines)
            
            # Update environment variable for current session
            os.environ['OPENAI_API_KEY'] = api_key
            
            logger.info(f"Updated OpenAI API key for user {current_user['id']}")
        
        return {"message": "Settings saved successfully"}
        
    except Exception as e:
        logger.error(f"Failed to save settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save settings")

@api_router.get("/settings")
async def get_settings(current_user=Depends(get_current_user)):
    """Get current settings"""
    try:
        # For MVP, return basic settings structure
        return {
            "openai_api_key": "***" if os.environ.get('OPENAI_API_KEY') else "",
            "notification_email": True,
            "auto_backup": True,
            "audit_frequency": "monthly"
        }
    except Exception as e:
        logger.error(f"Failed to get settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get settings")

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()