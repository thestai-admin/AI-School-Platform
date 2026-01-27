'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Feature {
  id: string
  name: string
  description: string
  enabled: boolean
  tier: string
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [currentTier, setCurrentTier] = useState<string>('AFFORDABLE')
  const [enabledCount, setEnabledCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchFeatures()
  }, [])

  async function fetchFeatures() {
    try {
      const res = await fetch('/api/subscription/features')
      if (res.ok) {
        const data = await res.json()
        setFeatures(data.features)
        setCurrentTier(data.currentTier)
        setEnabledCount(data.enabledCount)
        setTotalCount(data.totalCount)
      }
    } catch (err) {
      console.error('Error fetching features:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const affordableFeatures = features.filter((f) => f.tier === 'AFFORDABLE')
  const eliteFeatures = features.filter((f) => f.tier === 'ELITE')

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Loading features...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/subscriptions" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          ← Back to Subscription
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feature Configuration</h1>
            <p className="text-gray-600 mt-1">
              {enabledCount} of {totalCount} features enabled on {currentTier} tier
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <Card variant="bordered" className="mb-8">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Features Enabled</span>
                <span className="font-medium">{enabledCount} / {totalCount}</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                  style={{ width: `${(enabledCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentTier === 'ELITE' ? 'bg-blue-100 text-blue-800' :
              currentTier === 'ENTERPRISE' ? 'bg-purple-100 text-purple-800' :
              'bg-green-100 text-green-800'
            }`}>
              {currentTier}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Affordable Features */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs">✓</span>
          Affordable Tier Features
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {affordableFeatures.map((feature) => (
            <Card key={feature.id} variant="bordered">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      feature.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {feature.enabled ? '✓' : '○'}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{feature.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    feature.enabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {feature.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Elite Features */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">⭐</span>
          Elite Tier Features
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {eliteFeatures.map((feature) => (
            <Card
              key={feature.id}
              variant="bordered"
              className={!feature.enabled ? 'opacity-60' : ''}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      feature.enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {feature.enabled ? '⭐' : '🔒'}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{feature.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    feature.enabled
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {feature.enabled ? 'Enabled' : 'Elite Only'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Upgrade CTA */}
      {currentTier !== 'ELITE' && currentTier !== 'ENTERPRISE' && (
        <Card variant="bordered" className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Unlock Elite Features</h3>
                <p className="text-gray-600 mt-1">
                  Get 24/7 AI Study Companion, JEE/NEET prep, personalized learning paths, and more
                </p>
              </div>
              <Link href="/admin/subscriptions">
                <Button variant="primary">Upgrade Now</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
