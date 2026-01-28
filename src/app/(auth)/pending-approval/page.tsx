'use client'

import { signOut, useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PendingApprovalPage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card variant="elevated" className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-center">
            Hello <strong>{session?.user?.name || 'Teacher'}</strong>, your email has been verified!
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>What happens next?</strong>
            </p>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>• A school administrator will review your registration</li>
              <li>• You&apos;ll receive an email once your account is approved</li>
              <li>• This usually takes 1-2 business days</li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Why do teachers need approval?</strong>
            </p>
            <p className="mt-1 text-sm text-gray-500">
              To ensure the security of our educational platform, all teacher accounts are verified by school administrators before gaining access.
            </p>
          </div>

          <div className="text-center pt-4 border-t space-y-3">
            <p className="text-sm text-gray-500">
              Questions? Contact your school administrator or our support team.
            </p>
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
