import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/supabase'
import { SparklesIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const DocumentGenerate = () => {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    prompt: '',
    category: 'policy',
    jurisdiction: 'national'
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const generateDocument = async (prompt, jurisdiction, category) => {
    // This is a mock AI generation - in production, you'd call your AI service
    const templates = {
      policy: {
        national: `# ${prompt}

## 1. Document Control

| **Document Title** | ${prompt} |
|-------------------|-----------|
| **Document Type** | Policy |
| **Version** | 1.0 |
| **Effective Date** | ${new Date().toLocaleDateString()} |
| **Review Date** | ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()} |
| **Approved By** | [To be completed] |

## 2. Purpose & Scope

This policy establishes the framework for ${prompt.toLowerCase()} within our General Practice clinic to ensure compliance with RACGP Standards for General Practices 5th Edition and relevant Australian healthcare regulations.

**Scope:** This policy applies to all staff members, contractors, and volunteers working within the clinic.

## 3. Policy Statement

Our clinic is committed to maintaining the highest standards of ${prompt.toLowerCase()} in accordance with:
- RACGP Standards for General Practices 5th Edition
- National Safety and Quality Health Service Standards
- ${jurisdiction === 'national' ? 'National' : jurisdiction} healthcare regulations
- Privacy Act 1988 and Australian Privacy Principles

## 4. Responsibilities

### Practice Manager
- Overall responsibility for policy implementation
- Ensuring staff training and compliance
- Regular review and updates

### Clinical Staff
- Adherence to policy requirements
- Reporting of incidents or concerns
- Participation in training programs

### Administrative Staff
- Support policy implementation
- Maintain accurate records
- Assist with compliance monitoring

## 5. Procedures

### 5.1 Implementation
1. All staff must be familiar with this policy
2. Training must be provided within 30 days of commencement
3. Regular refresher training annually

### 5.2 Monitoring
1. Monthly compliance checks
2. Quarterly policy reviews
3. Annual comprehensive audit

### 5.3 Documentation
1. Maintain training records
2. Document compliance activities
3. Record any incidents or deviations

## 6. Training Requirements

- Initial orientation training for all new staff
- Annual refresher training
- Specialized training as required
- Documentation of all training activities

## 7. Monitoring & Audit

### Internal Monitoring
- Monthly self-assessments
- Quarterly management reviews
- Staff feedback sessions

### External Audit
- Annual compliance audit
- RACGP accreditation requirements
- Regulatory inspections as required

## 8. Review & Updates

This policy will be reviewed:
- Annually or as required
- Following significant incidents
- When regulations change
- Based on audit findings

## 9. References

- RACGP Standards for General Practices 5th Edition
- National Safety and Quality Health Service Standards
- Privacy Act 1988
- Work Health and Safety Act 2011
- Therapeutic Goods Administration Guidelines

## 10. Related Documents

- Staff Training Register
- Incident Reporting Procedure
- Compliance Monitoring Checklist
- Risk Assessment Template

---

**Document Control:**
- **Created:** ${new Date().toLocaleDateString()}
- **Version:** 1.0
- **Next Review:** ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}
- **Approved:** [Pending]`
      }
    }

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    return templates[category]?.[jurisdiction] || templates.policy.national
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!profile?.clinic_id) {
      toast.error('No clinic selected')
      return
    }

    try {
      setLoading(true)

      // Generate AI content
      const content = await generateDocument(formData.prompt, formData.jurisdiction, formData.category)

      // Extract title from content
      const titleMatch = content.match(/^#\s*(.+)$/m)
      const title = titleMatch ? titleMatch[1].trim() : formData.prompt

      // Create document
      const documentData = {
        title,
        content,
        category: formData.category,
        jurisdiction: formData.jurisdiction,
        clinic_id: profile.clinic_id,
        created_by: user.id,
        status: 'draft',
        version: 1,
        tags: []
      }

      const { data, error } = await db.createDocument(documentData)

      if (error) throw error

      toast.success('Document generated successfully!')
      navigate(`/documents/${data.id}`)

    } catch (error) {
      console.error('Error generating document:', error)
      toast.error('Failed to generate document')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center mb-6">
            <SparklesIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Generate AI Document
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Create compliance documents using AI assistance
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
                Document Description
              </label>
              <textarea
                id="prompt"
                name="prompt"
                rows={4}
                required
                value={formData.prompt}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the document you want to create (e.g., 'Cold Chain Management Policy for vaccine storage')"
              />
              <p className="mt-2 text-sm text-gray-500">
                Be specific about what you need. Include any particular requirements or standards.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Document Type
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                >
                  <option value="policy">Policy</option>
                  <option value="procedure">Procedure</option>
                  <option value="checklist">Checklist</option>
                  <option value="risk_assessment">Risk Assessment</option>
                </select>
              </div>

              <div>
                <label htmlFor="jurisdiction" className="block text-sm font-medium text-gray-700">
                  Jurisdiction
                </label>
                <select
                  id="jurisdiction"
                  name="jurisdiction"
                  value={formData.jurisdiction}
                  onChange={handleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                >
                  <option value="national">National</option>
                  <option value="NSW">New South Wales</option>
                  <option value="VIC">Victoria</option>
                  <option value="QLD">Queensland</option>
                  <option value="SA">South Australia</option>
                  <option value="WA">Western Australia</option>
                  <option value="TAS">Tasmania</option>
                  <option value="NT">Northern Territory</option>
                  <option value="ACT">Australian Capital Territory</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <SparklesIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">AI-Powered Generation</h4>
                  <p className="mt-1 text-sm text-blue-700">
                    Our AI will create a comprehensive document following RACGP standards and Australian healthcare regulations.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/documents')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="-ml-1 mr-2 h-4 w-4" />
                    Generate Document
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default DocumentGenerate