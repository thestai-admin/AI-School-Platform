import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Role-based route protection
    if (path.startsWith('/teacher') && token?.role !== UserRole.TEACHER && token?.role !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (path.startsWith('/student') && token?.role !== UserRole.STUDENT && token?.role !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (path.startsWith('/admin') && token?.role !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (path.startsWith('/parent') && token?.role !== UserRole.PARENT && token?.role !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/teacher/:path*',
    '/student/:path*',
    '/admin/:path*',
    '/parent/:path*',
    '/dashboard/:path*',
  ],
}
