'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
  const { data: session } = useSession()

  const roleRedirects: Record<string, { path: string; label: string }> = {
    ADMIN: { path: '/admin', label: 'Admin Dashboard' },
    TEACHER: { path: '/teacher', label: 'Teacher Dashboard' },
    STUDENT: { path: '/student', label: 'Student Dashboard' },
    PARENT: { path: '/parent', label: 'Parent Dashboard' },
  }

  const userRedirect = session?.user?.role ? roleRedirects[session.user.role] : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 px-4">
      <Card variant="elevated" className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <CardTitle className="text-2xl text-red-700">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-center">
            You don&apos;t have permission to access this page.
          </p>

          {session?.user && (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                Logged in as: <strong>{session.user.name}</strong>
              </p>
              <p className="text-sm text-gray-500">
                Role: <span className="capitalize">{session.user.role?.toLowerCase()}</span>
              </p>
            </div>
          )}

          <div className="space-y-3 pt-4">
            {userRedirect && (
              <Link href={userRedirect.path}>
                <Button className="w-full">
                  Go to {userRedirect.label}
                </Button>
              </Link>
            )}

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
