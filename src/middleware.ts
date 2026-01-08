import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { getSchoolSlugFromHost } from '@/lib/tenant'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Extract school slug from subdomain
    const host = req.headers.get('host') || ''
    const schoolSlug = getSchoolSlugFromHost(host)

    // Create response with school context header
    const response = NextResponse.next()

    if (schoolSlug) {
      // Set school slug header for downstream use
      response.headers.set('x-school-slug', schoolSlug)

      // Verify user belongs to this school (if logged in)
      // Note: Full verification happens in API routes with database lookup
    }

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

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow public access to health check
        if (req.nextUrl.pathname === '/api/health') {
          return true
        }
        return !!token
      },
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
    '/api/health',
  ],
}
