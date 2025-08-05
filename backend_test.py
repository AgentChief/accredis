#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Accredis Application
Tests all endpoints including auth, clinics, documents, risks, and settings
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class AccredisAPITester:
    def __init__(self, base_url: str = "https://3a613ff7-04b5-4966-bd61-71f63dc3a56f.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.clinic_id = None
        self.document_id = None
        self.risk_id = None
        self.tests_run = 0
        self.tests_passed = 0
        
        # Test data
        self.test_timestamp = datetime.now().strftime('%H%M%S')
        self.test_user = {
            "email": f"testuser{self.test_timestamp}@example.com",
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User",
            "role": "manager"
        }

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    params: Optional[Dict] = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request with error handling"""
        url = f"{self.api_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {"raw_response": response.text}
                
            if not success:
                response_data["status_code"] = response.status_code
                response_data["expected_status"] = expected_status
                
            return success, response_data
            
        except Exception as e:
            return False, {"error": str(e)}

    def test_user_registration(self) -> bool:
        """Test user registration"""
        success, response = self.make_request('POST', '/auth/register', self.test_user, expected_status=200)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            return self.log_test("User Registration", True, f"- User ID: {self.user_data['id']}")
        else:
            return self.log_test("User Registration", False, f"- {response}")

    def test_user_login(self) -> bool:
        """Test user login"""
        login_data = {
            "email": self.test_user["email"],
            "password": self.test_user["password"]
        }
        
        success, response = self.make_request('POST', '/auth/login', login_data, expected_status=200)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            return self.log_test("User Login", True, f"- Token received")
        else:
            return self.log_test("User Login", False, f"- {response}")

    def test_get_current_user(self) -> bool:
        """Test getting current user info"""
        success, response = self.make_request('GET', '/auth/me', expected_status=200)
        
        if success and 'email' in response:
            return self.log_test("Get Current User", True, f"- Email: {response['email']}")
        else:
            return self.log_test("Get Current User", False, f"- {response}")

    def test_create_clinic(self) -> bool:
        """Test clinic creation"""
        clinic_data = {
            "name": f"Test Clinic {self.test_timestamp}",
            "abn": "12 345 678 901",
            "address": "123 Test Street, Sydney NSW 2000",
            "state": "NSW",
            "phone": "(02) 1234 5678",
            "email": f"clinic{self.test_timestamp}@example.com"
        }
        
        success, response = self.make_request('POST', '/clinics', clinic_data, expected_status=200)
        
        if success and 'id' in response:
            self.clinic_id = response['id']
            return self.log_test("Create Clinic", True, f"- Clinic ID: {self.clinic_id}")
        else:
            return self.log_test("Create Clinic", False, f"- {response}")

    def test_get_clinics(self) -> bool:
        """Test getting user clinics"""
        success, response = self.make_request('GET', '/clinics', expected_status=200)
        
        if success and isinstance(response, list):
            return self.log_test("Get Clinics", True, f"- Found {len(response)} clinics")
        else:
            return self.log_test("Get Clinics", False, f"- {response}")

    def test_get_clinic_by_id(self) -> bool:
        """Test getting specific clinic"""
        if not self.clinic_id:
            return self.log_test("Get Clinic by ID", False, "- No clinic ID available")
            
        success, response = self.make_request('GET', f'/clinics/{self.clinic_id}', expected_status=200)
        
        if success and 'name' in response:
            return self.log_test("Get Clinic by ID", True, f"- Clinic: {response['name']}")
        else:
            return self.log_test("Get Clinic by ID", False, f"- {response}")

    def test_save_settings(self) -> bool:
        """Test saving settings (OpenAI API key)"""
        settings_data = {
            "openai_api_key": "sk-test-key-for-demo",
            "notification_email": True,
            "auto_backup": True,
            "audit_frequency": "monthly"
        }
        
        success, response = self.make_request('POST', '/settings', settings_data, expected_status=200)
        
        if success:
            return self.log_test("Save Settings", True, "- Settings saved successfully")
        else:
            return self.log_test("Save Settings", False, f"- {response}")

    def test_get_settings(self) -> bool:
        """Test getting settings"""
        success, response = self.make_request('GET', '/settings', expected_status=200)
        
        if success and isinstance(response, dict):
            return self.log_test("Get Settings", True, f"- Settings retrieved")
        else:
            return self.log_test("Get Settings", False, f"- {response}")

    def test_generate_document(self) -> bool:
        """Test AI document generation"""
        if not self.clinic_id:
            return self.log_test("Generate Document", False, "- No clinic ID available")
            
        doc_request = {
            "prompt": "Create a cold-chain policy for NSW clinics",
            "category": "policy",
            "jurisdiction": "NSW",
            "clinic_id": self.clinic_id
        }
        
        success, response = self.make_request('POST', '/documents/generate', doc_request, expected_status=200)
        
        if success and 'id' in response:
            self.document_id = response['id']
            return self.log_test("Generate Document", True, f"- Document ID: {self.document_id}")
        else:
            return self.log_test("Generate Document", False, f"- {response}")

    def test_get_documents(self) -> bool:
        """Test getting documents"""
        success, response = self.make_request('GET', '/documents', expected_status=200)
        
        if success and isinstance(response, list):
            return self.log_test("Get Documents", True, f"- Found {len(response)} documents")
        else:
            return self.log_test("Get Documents", False, f"- {response}")

    def test_get_document_by_id(self) -> bool:
        """Test getting specific document"""
        if not self.document_id:
            return self.log_test("Get Document by ID", False, "- No document ID available")
            
        success, response = self.make_request('GET', f'/documents/{self.document_id}', expected_status=200)
        
        if success and 'title' in response:
            return self.log_test("Get Document by ID", True, f"- Document: {response['title']}")
        else:
            return self.log_test("Get Document by ID", False, f"- {response}")

    def test_update_document_status(self) -> bool:
        """Test updating document status (draft -> review -> published)"""
        if not self.document_id:
            return self.log_test("Update Document Status", False, "- No document ID available")
        
        # Test moving to review
        success1, response1 = self.make_request('PUT', f'/documents/{self.document_id}/status', 
                                               params={"status": "review"}, expected_status=200)
        
        if not success1:
            return self.log_test("Update Document Status", False, f"- Failed to move to review: {response1}")
        
        # Test moving to published
        success2, response2 = self.make_request('PUT', f'/documents/{self.document_id}/status', 
                                               params={"status": "published"}, expected_status=200)
        
        if success2:
            return self.log_test("Update Document Status", True, "- Draft → Review → Published")
        else:
            return self.log_test("Update Document Status", False, f"- Failed to publish: {response2}")

    def test_audit_document(self) -> bool:
        """Test document compliance audit"""
        if not self.document_id:
            return self.log_test("Audit Document", False, "- No document ID available")
            
        success, response = self.make_request('POST', f'/documents/{self.document_id}/audit', expected_status=200)
        
        if success and 'score' in response:
            return self.log_test("Audit Document", True, f"- Compliance Score: {response['score']}")
        else:
            return self.log_test("Audit Document", False, f"- {response}")

    def test_create_risk(self) -> bool:
        """Test creating a risk entry"""
        if not self.clinic_id:
            return self.log_test("Create Risk", False, "- No clinic ID available")
            
        risk_data = {
            "title": "Test Clinical Risk",
            "description": "This is a test risk for clinical operations",
            "category": "clinical",
            "severity": 4,
            "likelihood": 3,
            "mitigation_plan": "Implement additional safety protocols",
            "clinic_id": self.clinic_id
        }
        
        success, response = self.make_request('POST', '/risks', risk_data, expected_status=200)
        
        if success and 'id' in response:
            self.risk_id = response['id']
            risk_score = response.get('risk_score', 0)
            return self.log_test("Create Risk", True, f"- Risk ID: {self.risk_id}, Score: {risk_score}")
        else:
            return self.log_test("Create Risk", False, f"- {response}")

    def test_get_risks(self) -> bool:
        """Test getting risks"""
        success, response = self.make_request('GET', '/risks', expected_status=200)
        
        if success and isinstance(response, list):
            return self.log_test("Get Risks", True, f"- Found {len(response)} risks")
        else:
            return self.log_test("Get Risks", False, f"- {response}")

    def test_file_upload(self) -> bool:
        """Test file upload functionality"""
        # This is a simplified test - in a real scenario we'd upload actual files
        # For now, we'll just test that the endpoint exists and handles missing files appropriately
        success, response = self.make_request('POST', '/documents/upload', expected_status=422)  # Expect validation error
        
        if response.get('status_code') == 422:
            return self.log_test("File Upload Endpoint", True, "- Endpoint exists and validates input")
        else:
            return self.log_test("File Upload Endpoint", False, f"- Unexpected response: {response}")

    def run_all_tests(self) -> int:
        """Run all API tests"""
        print("🚀 Starting Accredis Backend API Tests")
        print("=" * 50)
        
        # Authentication Tests
        print("\n📝 Authentication Tests")
        if not self.test_user_registration():
            print("❌ Registration failed - stopping tests")
            return 1
            
        self.test_user_login()
        self.test_get_current_user()
        
        # Clinic Management Tests
        print("\n🏥 Clinic Management Tests")
        self.test_create_clinic()
        self.test_get_clinics()
        self.test_get_clinic_by_id()
        
        # Settings Tests
        print("\n⚙️ Settings Tests")
        self.test_save_settings()
        self.test_get_settings()
        
        # Document Management Tests
        print("\n📄 Document Management Tests")
        self.test_generate_document()
        self.test_get_documents()
        self.test_get_document_by_id()
        self.test_update_document_status()
        self.test_audit_document()
        
        # Risk Management Tests
        print("\n⚠️ Risk Management Tests")
        self.test_create_risk()
        self.test_get_risks()
        
        # File Upload Tests
        print("\n📁 File Upload Tests")
        self.test_file_upload()
        
        # Summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend is working correctly.")
            return 0
        else:
            failed = self.tests_run - self.tests_passed
            print(f"⚠️ {failed} tests failed. Please check the backend implementation.")
            return 1

def main():
    """Main test runner"""
    tester = AccredisAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())