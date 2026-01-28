'use client'

import { signOut } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AccountRejectedPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@thestai.com'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 px-4">
      <Card variant="elevated" className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <CardTitle className="text-2xl text-gray-700">Registration Not Approved</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-center">
            Unfortunately, your registration was not approved by the school administrator.
          </p>

          <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>Possible reasons:</strong>
            </p>
            <ul className="mt-2 text-sm text-gray-600 space-y-1">
              <li>• Unable to verify your identity or credentials</li>
              <li>• Registration information was incomplete</li>
              <li>• You may not be associated with this school</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Think this is a mistake?</strong>
            </p>
            <p className="mt-1 text-sm text-blue-700">
              Contact your school administrator or our support team to discuss your registration.
            </p>
          </div>

          <div className="text-center pt-4 border-t space-y-3">
            <a
              href={`mailto:${supportEmail}`}
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Contact Support
            </a>
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
