# Accredis - Healthcare Compliance Platform

A comprehensive healthcare compliance platform designed specifically for Australian General Practice clinics, built with React and Supabase.

## 🏥 Features

### ✅ **Core Platform**
- **Multi-tenant Architecture**: Secure clinic isolation with role-based access
- **User Management**: Staff, Manager, Owner, and Consultant roles
- **Document Management**: AI-powered policy generation with review workflow
- **Risk Register**: Clinical and operational risk assessment with automated scoring
- **Compliance Tracking**: RACGP Standards alignment and audit trails

### 📝 **Document Management**
- **AI Generation**: Create policies, procedures, checklists, and risk assessments
- **Rich Text Editor**: Professional document editing with healthcare-specific formatting
- **Review Workflow**: Draft → Review → Published status management
- **Digital Signatures**: Secure document signing with SHA-256 hashing
- **Version Control**: Track document changes and maintain history

### ⚠️ **Risk Management**
- **Risk Categories**: Clinical, WHS, Privacy, and Business risks
- **Automated Scoring**: Severity × Likelihood risk matrix
- **Mitigation Planning**: Track risk reduction strategies
- **Compliance Linking**: Connect risks to relevant documents

### 🇦🇺 **Australian Compliance**
- **RACGP Standards**: Built-in compliance with 5th Edition standards
- **State Regulations**: Support for all Australian states and territories
- **Jurisdiction Awareness**: Tailored content for specific locations
- **Privacy Compliance**: Australian Privacy Principles integration

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd accredis
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Copy your project URL and anon key
   - Create a `.env` file in the frontend directory:
   ```bash
   cp .env.example .env
   ```
   - Add your Supabase credentials to `.env`

4. **Run database migrations**
   - In your Supabase dashboard, go to SQL Editor
   - Run the migration file: `supabase/migrations/create_initial_schema.sql`

5. **Start the development server**
   ```bash
   npm start
   ```

### First Time Setup

1. **Register an account** at `/register`
2. **Create a clinic** (if you're an owner)
3. **Generate your first document** using AI assistance
4. **Set up your risk register** for compliance tracking

## 🏗️ Architecture

### Frontend (React)
- **React 19** with modern hooks and context
- **Tailwind CSS** for professional healthcare UI
- **React Router** for navigation
- **React Quill** for rich text editing
- **Heroicons** for consistent iconography

### Backend (Supabase)
- **PostgreSQL** database with Row Level Security
- **Real-time subscriptions** for live updates
- **Built-in authentication** with JWT tokens
- **Edge Functions** for AI integration (optional)

### Security
- **Row Level Security (RLS)** for data isolation
- **JWT Authentication** with automatic token refresh
- **Role-based permissions** for clinic management
- **Digital signatures** for document integrity

## 📊 Database Schema

### Core Tables
- `clinics` - Multi-tenant clinic information
- `user_profiles` - Extended user information with roles
- `documents` - Policy and procedure documents
- `risks` - Risk register entries
- `audits` - Compliance audit results

### Security Model
- Clinic-based data isolation
- Role-based access control
- Audit trails for all changes
- Digital signature verification

## 🔧 Configuration

### Environment Variables
```bash
# Required
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
REACT_APP_OPENAI_API_KEY=your_openai_api_key
```

### Supabase Setup
1. Create a new Supabase project
2. Run the migration SQL in the SQL Editor
3. Configure authentication settings
4. Set up any additional edge functions for AI integration

## 🎯 Usage

### Document Generation
1. Navigate to **Documents** → **Generate Document**
2. Describe your document requirements
3. Select category (Policy, Procedure, Checklist, Risk Assessment)
4. Choose jurisdiction (National or specific state/territory)
5. AI generates a compliant document following RACGP standards

### Document Management
1. **Edit** documents with the rich text editor
2. **Review** workflow for quality assurance
3. **Publish** with digital signatures
4. **Track** versions and changes

### Risk Management
1. **Identify** risks across categories
2. **Assess** using severity × likelihood matrix
3. **Plan** mitigation strategies
4. **Monitor** risk levels and status

## 🔒 Security Features

- **Multi-tenant isolation** - Clinics can only access their own data
- **Role-based permissions** - Different access levels for staff roles
- **Digital signatures** - Tamper-evident document signing
- **Audit trails** - Complete history of all changes
- **Data encryption** - All data encrypted in transit and at rest

## 📱 Responsive Design

- **Mobile-first** approach for tablet and phone access
- **Progressive Web App** capabilities
- **Offline-ready** for critical document access
- **Print-optimized** document layouts

## 🧪 Testing

The platform includes comprehensive testing for:
- Authentication and authorization
- Document CRUD operations
- Risk management workflows
- Compliance validation
- UI/UX functionality

## 📈 Roadmap

### Phase 1 (Current)
- ✅ Core platform with Supabase migration
- ✅ Rich text editor and document formatting
- ✅ AI document generation
- ✅ Professional healthcare UI

### Phase 2 (Next)
- 🔄 Admin panel for system management
- 🔄 Advanced AI model selection
- 🔄 Document templates library
- 🔄 Bulk operations and reporting

### Phase 3 (Future)
- 📋 Mobile app development
- 📋 Integration with practice management systems
- 📋 Advanced analytics and insights
- 📋 Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@accredis.com or create an issue in the repository.

---

**Built with ❤️ for Australian healthcare professionals**