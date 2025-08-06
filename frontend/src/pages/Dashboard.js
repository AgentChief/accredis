import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/supabase'
import {
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    totalDocuments: 0,
    draftDocuments: 0,
    publishedDocuments: 0,
    totalRisks: 0,
    highRisks: 0,
    openRisks: 0
  })
  const [recentDocuments, setRecentDocuments] = useState([])
  const [highRisks, setHighRisks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.clinic_id) {
      loadDashboardData()
    }
  }, [profile])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Load documents
      const { data: documents, error: docsError } = await db.getDocuments(profile.clinic_id)
      if (docsError) throw docsError

      // Load risks
      const { data: risks, error: risksError } = await db.getRisks(profile.clinic_id)
      if (risksError) throw risksError

      // Calculate stats
      const draftDocs = documents?.filter(doc => doc.status === 'draft').length || 0
      const publishedDocs = documents?.filter(doc => doc.status === 'published').length || 0
      const openRisks = risks?.filter(risk => risk.status === 'open').length || 0
      const highRiskItems = risks?.filter(risk => risk.risk_score >= 15) || []

      setStats({
        totalDocuments: documents?.length || 0,
        draftDocuments: draftDocs,
        publishedDocuments: publishedDocs,
        totalRisks: risks?.length || 0,
        highRisks: highRiskItems.length,
        openRisks: openRisks
      })

      // Set recent documents (last 5)
      setRecentDocuments(documents?.slice(0, 5) || [])
      
      // Set high risks (top 5)
      setHighRisks(highRiskItems.slice(0, 5))

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
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

  const getRiskColor = (score) => {
    if (score >= 15) return 'bg-red-100 text-red-800'
    if (score >= 10) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  if (!profile?.clinic_id) {
    return (
      <div className="text-center py-12">
        <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No clinic assigned</h3>
        <p className="mt-1 text-sm text-gray-500">
          You need to be assigned to a clinic or create one to access the dashboard.
        </p>
        <div className="mt-6">
          <Link
            to="/clinics/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create Clinic
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {profile?.first_name}! Here's what's happening at {profile?.clinic?.name}.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            to="/documents/generate"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Generate Document
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Documents</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalDocuments}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Draft Documents</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.draftDocuments}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Published Documents</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.publishedDocuments}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Risks</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalRisks}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">High Risk Items</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.highRisks}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Open Risks</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.openRisks}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Documents and High Risks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Documents */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Documents</h3>
              <Link
                to="/documents"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
            
            {recentDocuments.length > 0 ? (
              <div className="space-y-3">
                {recentDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/documents/${doc.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block"
                      >
                        {doc.title}
                      </Link>
                      <p className="text-xs text-gray-500 capitalize">{doc.category}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No documents yet. Create your first document to get started.</p>
            )}
          </div>
        </div>

        {/* High Risk Items */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">High Risk Items</h3>
              <Link
                to="/risks"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
            
            {highRisks.length > 0 ? (
              <div className="space-y-3">
                {highRisks.map((risk) => (
                  <div key={risk.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{risk.title}</p>
                      <p className="text-xs text-gray-500 capitalize">{risk.category}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(risk.risk_score)}`}>
                      {risk.risk_score}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No high-risk items identified.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard