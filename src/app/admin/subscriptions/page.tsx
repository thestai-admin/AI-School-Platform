'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

interface Subscription {
  id?: string
  tier: string
  startDate?: string
  endDate?: string
  maxStudents: number
  maxTeachers: number
  features: Record<string, boolean>
}

interface School {
  id: string
  name: string
  studentsCount: number
  teachersCount: number
}

const TIERS = [
  { value: 'STARTER', label: 'Starter', description: 'Basic features for small schools' },
  { value: 'AFFORDABLE', label: 'Affordable', description: 'AI-powered teaching tools' },
  { value: 'ELITE', label: 'Elite', description: 'Full suite with 24/7 AI companion' },
  { value: 'ENTERPRISE', label: 'Enterprise', description: 'Custom solutions for large institutions' },
]

export default function SubscriptionsPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const [editData, setEditData] = useState({
    tier: 'AFFORDABLE',
    maxStudents: 500,
    maxTeachers: 50,
    endDate: '',
  })

  useEffect(() => {
    fetchSubscription()
  }, [])

  async function fetchSubscription() {
    try {
      const res = await fetch('/api/subscription')
      if (res.ok) {
        const data = await res.json()
        setSubscription(data.subscription)
        setSchool(data.school)
        setEditData({
          tier: data.subscription?.tier || 'AFFORDABLE',
          maxStudents: data.subscription?.maxStudents || 500,
          maxTeachers: data.subscription?.maxTeachers || 50,
          endDate: data.subscription?.endDate
            ? new Date(data.subscription.endDate).toISOString().split('T')[0]
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
      }
    } catch (err) {
      console.error('Error fetching subscription:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function saveSubscription() {
    setIsSaving(true)
    try {
      const res = await fetch('/api/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      if (res.ok) {
        const data = await res.json()
        setSubscription(data.subscription)
        setEditMode(false)
      }
    } catch (err) {
      console.error('Error saving subscription:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const currentTier = TIERS.find((t) => t.value === subscription?.tier) || TIERS[1]

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Loading subscription...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-600 mt-1">Manage your school's subscription and features</p>
        </div>
        {!editMode && (
          <Button variant="primary" onClick={() => setEditMode(true)}>
            Edit Subscription
          </Button>
        )}
      </div>

      {/* Current Plan */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card variant="bordered" className="md:col-span-2">
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription Tier
                  </label>
                  <Select
                    value={editData.tier}
                    onChange={(e) => setEditData({ ...editData, tier: e.target.value })}
                    options={TIERS.map((tier) => ({
                      value: tier.value,
                      label: `${tier.label} - ${tier.description}`,
                    }))}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Students
                    </label>
                    <input
                      type="number"
                      value={editData.maxStudents}
                      onChange={(e) =>
                        setEditData({ ...editData, maxStudents: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Teachers
                    </label>
                    <input
                      type="number"
                      value={editData.maxTeachers}
                      onChange={(e) =>
                        setEditData({ ...editData, maxTeachers: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editData.endDate}
                    onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" onClick={saveSubscription} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl ${
                    currentTier.value === 'ENTERPRISE' ? 'bg-purple-100' :
                    currentTier.value === 'ELITE' ? 'bg-blue-100' :
                    currentTier.value === 'AFFORDABLE' ? 'bg-green-100' :
                    'bg-gray-100'
                  }`}>
                    {currentTier.value === 'ENTERPRISE' ? '👑' :
                     currentTier.value === 'ELITE' ? '⭐' :
                     currentTier.value === 'AFFORDABLE' ? '✓' : '📦'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{currentTier.label}</h3>
                    <p className="text-gray-500">{currentTier.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Start Date:</span>
                    <span className="ml-2 font-medium">
                      {subscription?.startDate
                        ? new Date(subscription.startDate).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">End Date:</span>
                    <span className="ml-2 font-medium">
                      {subscription?.endDate
                        ? new Date(subscription.endDate).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Students</span>
                <span className="font-medium">
                  {school?.studentsCount || 0} / {subscription?.maxStudents || 500}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${Math.min(
                      ((school?.studentsCount || 0) / (subscription?.maxStudents || 500)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Teachers</span>
                <span className="font-medium">
                  {school?.teachersCount || 0} / {subscription?.maxTeachers || 50}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${Math.min(
                      ((school?.teachersCount || 0) / (subscription?.maxTeachers || 50)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/admin/subscriptions/features">
          <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                ⚡
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Features</h4>
                <p className="text-sm text-gray-500">View available features</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/subscriptions/usage">
          <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                📊
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Usage Analytics</h4>
                <p className="text-sm text-gray-500">Track feature usage</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/analytics">
          <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                📈
              </div>
              <div>
                <h4 className="font-medium text-gray-900">School Analytics</h4>
                <p className="text-sm text-gray-500">View school performance</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Upgrade CTA */}
      {subscription?.tier !== 'ENTERPRISE' && (
        <Card variant="bordered" className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {subscription?.tier === 'ELITE' ? 'Need More?' : 'Upgrade to Elite'}
                </h3>
                <p className="text-gray-600 mt-1">
                  {subscription?.tier === 'ELITE'
                    ? 'Contact us for custom Enterprise solutions'
                    : 'Get 24/7 AI Study Companion, competitive exam prep, and more'}
                </p>
              </div>
              <Button variant="primary">
                {subscription?.tier === 'ELITE' ? 'Contact Sales' : 'Upgrade Now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
