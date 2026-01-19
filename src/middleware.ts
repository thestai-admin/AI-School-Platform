import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { getSchoolSlugFromHost } from '@/lib/tenant'

// Security headers for all responses
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  // Enable XSS filter
  response.headers.set('X-XSS-Protection', '1; mode=block')
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Permissions policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://generativelanguage.googleapis.com",
      "media-src 'self' blob: data:",
      "worker-src 'self' blob:",
    ].join('; ')
  )
  // Strict Transport Security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }
  return response
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Extract school slug from subdomain
    const host = req.headers.get('host') || ''
    const schoolSlug = getSchoolSlugFromHost(host)

    // Create response with school context header
    let response = NextResponse.next()

    // Add security headers to all responses
    response = addSecurityHeaders(response)

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
