import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/supabase'
import RichTextEditor from '../components/RichTextEditor'
import DocumentRenderer from '../components/DocumentRenderer'
import {
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const DocumentView = () => {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [document, setDocument] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadDocument()
  }, [id])

  const loadDocument = async () => {
    try {
      setLoading(true)
      const { data, error } = await db.getDocument(id)

      if (error) throw error
      setDocument(data)
      setEditContent(data.content)
    } catch (error) {
      console.error('Error loading document:', error)
      toast.error('Failed to load document')
      navigate('/documents')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { data, error } = await db.updateDocument(id, {
        content: editContent,
        updated_at: new Date().toISOString()
      })

      if (error) throw error

      setDocument(data)
      setEditing(false)
      toast.success('Document updated successfully!')
    } catch (error) {
      console.error('Error saving document:', error)
      toast.error('Failed to save document')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      const updates = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      // If publishing, add digital signature
      if (newStatus === 'published') {
        const timestamp = new Date().toISOString()
        updates.signature_hash = `sha256_${Date.now()}_${user.id}` // Simplified hash
        updates.signed_by = user.id
        updates.signed_at = timestamp
      }

      const { data, error } = await db.updateDocument(id, updates)

      if (error) throw error

      setDocument(data)
      toast.success(`Document ${newStatus} successfully!`)
    } catch (error) {
      console.error('Error updating document status:', error)
      toast.error('Failed to update document status')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'review': return 'bg-yellow-100 text-yellow-800'
      case 'published': return 'bg-green-100 text-green-800'
      case 'archived': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const canEdit = () => {
    return document?.created_by === user?.id || 
           ['manager', 'owner'].includes(profile?.role)
  }

  const canPublish = () => {
    return ['manager', 'owner'].includes(profile?.role)
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Document not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
              <span className="capitalize">{document.category.replace('_', ' ')}</span>
              <span>•</span>
              <span>{document.jurisdiction}</span>
              <span>•</span>
              <span>Version {document.version}</span>
              <span>•</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                {document.status}
              </span>
            </div>
            
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center text-sm text-gray-500">
                <UserIcon className="h-4 w-4 mr-2" />
                <span>
                  Created by {document.created_by_profile?.first_name} {document.created_by_profile?.last_name}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <ClockIcon className="h-4 w-4 mr-2" />
                <span>
                  {format(new Date(document.created_at), 'MMM d, yyyy')}
                </span>
              </div>
              {document.signed_at && (
                <div className="flex items-center text-sm text-green-600">
                  <CheckIcon className="h-4 w-4 mr-2" />
                  <span>
                    Signed {format(new Date(document.signed_at), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!editing && canEdit() && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </button>
            )}

            {editing && (
              <>
                <button
                  onClick={() => {
                    setEditing(false)
                    setEditContent(document.content)
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}

            {/* Status Actions */}
            {!editing && canPublish() && (
              <div className="flex items-center space-x-2">
                {document.status === 'draft' && (
                  <button
                    onClick={() => handleStatusChange('review')}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
                  >
                    Send for Review
                  </button>
                )}
                {document.status === 'review' && (
                  <button
                    onClick={() => handleStatusChange('published')}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Publish
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {editing ? (
            <RichTextEditor
              value={editContent}
              onChange={setEditContent}
              height="600px"
              placeholder="Edit your document content..."
            />
          ) : (
            <DocumentRenderer content={document.content} />
          )}
        </div>
      </div>

      {/* Digital Signature Info */}
      {document.signature_hash && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <CheckIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-green-800">Digitally Signed</h4>
              <div className="mt-1 text-sm text-green-700">
                <p>
                  Signed by {document.signed_by_profile?.first_name} {document.signed_by_profile?.last_name} on{' '}
                  {format(new Date(document.signed_at), 'MMMM d, yyyy \'at\' h:mm a')}
                </p>
                <p className="mt-1 font-mono text-xs">Hash: {document.signature_hash}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentView