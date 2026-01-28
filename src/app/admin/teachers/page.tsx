'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Teacher {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  createdAt: string
  emailVerified: string | null
  approvedAt: string | null
  languagePreference: string
  teacherClasses: {
    class: { name: string; grade: number }
    subject: { name: string }
  }[]
}

interface Counts {
  total: number
  pending: number
  active: number
  suspended: number
  rejected: number
}

export default function AdminTeachersPage() {
  const { data: session } = useSession()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [counts, setCounts] = useState<Counts>({ total: 0, pending: 0, active: 0, suspended: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)

  async function fetchTeachers() {
    try {
      const params = filter !== 'all' ? `?status=${filter.toUpperCase()}` : ''
      const res = await fetch(`/api/admin/teachers${params}`)
      if (res.ok) {
        const data = await res.json()
        setTeachers(data.teachers)
        setCounts(data.counts)
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeachers()
  }, [filter])

  async function handleApprove(teacherId: string) {
    setActionLoading(teacherId)
    try {
      const res = await fetch('/api/admin/teachers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, action: 'approve' }),
      })

      if (res.ok) {
        fetchTeachers()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to approve teacher')
      }
    } catch (error) {
      console.error('Approval error:', error)
      alert('Failed to approve teacher')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(teacherId: string) {
    setActionLoading(teacherId)
    try {
      const res = await fetch('/api/admin/teachers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, action: 'reject', rejectionReason }),
      })

      if (res.ok) {
        setShowRejectModal(null)
        setRejectionReason('')
        fetchTeachers()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to reject teacher')
      }
    } catch (error) {
      console.error('Rejection error:', error)
      alert('Failed to reject teacher')
    } finally {
      setActionLoading(null)
    }
  }

  const statusColors: Record<string, string> = {
    PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-green-100 text-green-800',
    SUSPENDED: 'bg-red-100 text-red-800',
    REJECTED: 'bg-gray-100 text-gray-800',
    PENDING_VERIFICATION: 'bg-blue-100 text-blue-800',
  }

  const statusLabels: Record<string, string> = {
    PENDING_APPROVAL: 'Pending Approval',
    ACTIVE: 'Active',
    SUSPENDED: 'Suspended',
    REJECTED: 'Rejected',
    PENDING_VERIFICATION: 'Pending Verification',
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Management</h1>
          <p className="text-gray-500">Manage teacher accounts and approvals</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={`cursor-pointer ${filter === 'all' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setFilter('all')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{counts.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${filter === 'pending_approval' ? 'ring-2 ring-yellow-500' : ''}`} onClick={() => setFilter('pending_approval')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{counts.pending}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${filter === 'active' ? 'ring-2 ring-green-500' : ''}`} onClick={() => setFilter('active')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{counts.active}</div>
            <div className="text-sm text-gray-500">Active</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${filter === 'suspended' ? 'ring-2 ring-red-500' : ''}`} onClick={() => setFilter('suspended')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{counts.suspended}</div>
            <div className="text-sm text-gray-500">Suspended</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${filter === 'rejected' ? 'ring-2 ring-gray-500' : ''}`} onClick={() => setFilter('rejected')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{counts.rejected}</div>
            <div className="text-sm text-gray-500">Rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Alert */}
      {counts.pending > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <strong className="text-yellow-800">{counts.pending} teacher(s) awaiting approval</strong>
            <p className="text-sm text-yellow-700">Review and approve or reject pending registrations.</p>
          </div>
        </div>
      )}

      {/* Teachers List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === 'all' ? 'All Teachers' : `${statusLabels[filter.toUpperCase()] || filter} Teachers`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading teachers...</p>
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No teachers found.
            </div>
          ) : (
            <div className="space-y-4">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{teacher.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[teacher.status] || 'bg-gray-100'}`}>
                        {statusLabels[teacher.status] || teacher.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{teacher.email}</p>
                    {teacher.phone && <p className="text-sm text-gray-500">{teacher.phone}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      Registered: {new Date(teacher.createdAt).toLocaleDateString()}
                      {teacher.approvedAt && ` • Approved: ${new Date(teacher.approvedAt).toLocaleDateString()}`}
                    </p>
                    {teacher.teacherClasses.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {teacher.teacherClasses.map((tc, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                            {tc.class.name} - {tc.subject.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {teacher.status === 'PENDING_APPROVAL' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(teacher.id)}
                        disabled={actionLoading === teacher.id}
                      >
                        {actionLoading === teacher.id ? 'Processing...' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setShowRejectModal(teacher.id)}
                        disabled={actionLoading === teacher.id}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Reject Teacher Registration</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejection (optional). This will be sent to the teacher.
            </p>
            <textarea
              className="w-full border rounded-lg p-3 mb-4"
              rows={3}
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRejectModal(null)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={() => handleReject(showRejectModal)}
                disabled={actionLoading === showRejectModal}
              >
                {actionLoading === showRejectModal ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
