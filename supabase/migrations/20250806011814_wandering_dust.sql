/*
  # Create initial Accredis schema

  1. New Tables
    - `clinics`
      - `id` (uuid, primary key)
      - `name` (text)
      - `abn` (text, optional)
      - `address` (text)
      - `state` (text) - Australian states/territories
      - `phone` (text, optional)
      - `email` (text, optional)
      - `slug` (text, unique)
      - `owner_id` (uuid, references auth.users)
      - `created_at` (timestamp)

    - `documents`
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `category` (text) - policy, procedure, checklist, risk_assessment
      - `jurisdiction` (text) - national, NSW, VIC, QLD, SA, WA, TAS, NT, ACT
      - `status` (text) - draft, review, published, archived
      - `version` (integer)
      - `tags` (text array)
      - `clinic_id` (uuid, references clinics)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `signature_hash` (text, optional)
      - `signed_by` (uuid, optional, references auth.users)
      - `signed_at` (timestamp, optional)

    - `risks`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `category` (text) - clinical, WHS, privacy, business
      - `severity` (integer, 1-5)
      - `likelihood` (integer, 1-5)
      - `risk_score` (integer) - calculated: severity * likelihood
      - `status` (text) - open, monitoring, closed
      - `mitigation_plan` (text, optional)
      - `owner_id` (uuid, optional, references auth.users)
      - `linked_docs` (text array)
      - `clinic_id` (uuid, references clinics)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `audits`
      - `id` (uuid, primary key)
      - `document_id` (uuid, references documents)
      - `score` (numeric)
      - `compliance_issues` (jsonb)
      - `recommendations` (text array)
      - `racgp_coverage` (jsonb)
      - `audited_by` (uuid, references auth.users)
      - `audited_at` (timestamp)

    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `first_name` (text)
      - `last_name` (text)
      - `role` (text) - staff, manager, owner, consultant
      - `clinic_id` (uuid, optional, references clinics)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their clinic data
    - Add policies for document management workflow
    - Add policies for risk management
*/

-- Create clinics table
CREATE TABLE IF NOT EXISTS clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  abn text,
  address text NOT NULL,
  state text NOT NULL CHECK (state IN ('NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT')),
  phone text,
  email text,
  slug text UNIQUE NOT NULL,
  owner_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'manager', 'owner', 'consultant')),
  clinic_id uuid REFERENCES clinics(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL CHECK (category IN ('policy', 'procedure', 'checklist', 'risk_assessment')),
  jurisdiction text NOT NULL DEFAULT 'national' CHECK (jurisdiction IN ('national', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  version integer NOT NULL DEFAULT 1,
  tags text[] DEFAULT '{}',
  clinic_id uuid REFERENCES clinics(id) NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  signature_hash text,
  signed_by uuid REFERENCES auth.users(id),
  signed_at timestamptz
);

-- Create risks table
CREATE TABLE IF NOT EXISTS risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('clinical', 'WHS', 'privacy', 'business')),
  severity integer NOT NULL CHECK (severity >= 1 AND severity <= 5),
  likelihood integer NOT NULL CHECK (likelihood >= 1 AND likelihood <= 5),
  risk_score integer GENERATED ALWAYS AS (severity * likelihood) STORED,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'monitoring', 'closed')),
  mitigation_plan text,
  owner_id uuid REFERENCES auth.users(id),
  linked_docs text[] DEFAULT '{}',
  clinic_id uuid REFERENCES clinics(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create audits table
CREATE TABLE IF NOT EXISTS audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) NOT NULL,
  score numeric NOT NULL CHECK (score >= 0 AND score <= 100),
  compliance_issues jsonb DEFAULT '[]',
  recommendations text[] DEFAULT '{}',
  racgp_coverage jsonb DEFAULT '{}',
  audited_by uuid REFERENCES auth.users(id) NOT NULL,
  audited_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

-- Clinics policies
CREATE POLICY "Users can view clinics they own or are staff of"
  ON clinics FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR 
    id IN (
      SELECT clinic_id FROM user_profiles 
      WHERE id = auth.uid() AND clinic_id IS NOT NULL
    )
  );

CREATE POLICY "Users can create clinics"
  ON clinics FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Clinic owners can update their clinics"
  ON clinics FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- User profiles policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can create their own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Documents policies
CREATE POLICY "Users can view documents from their clinic"
  ON documents FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_profiles 
      WHERE id = auth.uid() AND clinic_id IS NOT NULL
    ) OR
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create documents for their clinic"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    (clinic_id IN (
      SELECT clinic_id FROM user_profiles 
      WHERE id = auth.uid() AND clinic_id IS NOT NULL
    ) OR
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    ))
  );

CREATE POLICY "Users can update documents they created or if they're managers/owners"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    (clinic_id IN (
      SELECT clinic_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('manager', 'owner')
    ))
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_profiles 
      WHERE id = auth.uid() AND clinic_id IS NOT NULL
    ) OR
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );

-- Risks policies
CREATE POLICY "Users can view risks from their clinic"
  ON risks FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_profiles 
      WHERE id = auth.uid() AND clinic_id IS NOT NULL
    ) OR
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create risks for their clinic"
  ON risks FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_profiles 
      WHERE id = auth.uid() AND clinic_id IS NOT NULL
    ) OR
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update risks in their clinic"
  ON risks FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_profiles 
      WHERE id = auth.uid() AND clinic_id IS NOT NULL
    ) OR
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_profiles 
      WHERE id = auth.uid() AND clinic_id IS NOT NULL
    ) OR
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );

-- Audits policies
CREATE POLICY "Users can view audits from their clinic"
  ON audits FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents WHERE clinic_id IN (
        SELECT clinic_id FROM user_profiles 
        WHERE id = auth.uid() AND clinic_id IS NOT NULL
      ) OR clinic_id IN (
        SELECT id FROM clinics WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create audits for documents in their clinic"
  ON audits FOR INSERT
  TO authenticated
  WITH CHECK (
    audited_by = auth.uid() AND
    document_id IN (
      SELECT id FROM documents WHERE clinic_id IN (
        SELECT clinic_id FROM user_profiles 
        WHERE id = auth.uid() AND clinic_id IS NOT NULL
      ) OR clinic_id IN (
        SELECT id FROM clinics WHERE owner_id = auth.uid()
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clinics_owner_id ON clinics(owner_id);
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON clinics(slug);
CREATE INDEX IF NOT EXISTS idx_user_profiles_clinic_id ON user_profiles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_documents_clinic_id ON documents(clinic_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_risks_clinic_id ON risks(clinic_id);
CREATE INDEX IF NOT EXISTS idx_risks_risk_score ON risks(risk_score);
CREATE INDEX IF NOT EXISTS idx_audits_document_id ON audits(document_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risks_updated_at
  BEFORE UPDATE ON risks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();