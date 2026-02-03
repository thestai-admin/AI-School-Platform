import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { UserRole, UserStatus } from '@prisma/client'
import { getSchoolSlugFromHost } from '@/lib/tenant'

/**
 * Feature-gated route patterns
 * These routes require specific feature access (checked at API level)
 */
export const FEATURE_GATED_ROUTES: Record<string, string> = {
  '/teacher/training': 'teacher_training_basic',
  '/api/training': 'teacher_training_basic',
  '/teacher/community': 'community_read',
  '/api/community': 'community_read',
  '/student/companion': 'ai_study_companion_24x7',
  '/student/competitive': 'competitive_exam_prep',
  '/student/learning-path': 'personalized_learning_paths',
  '/api/study': 'ai_study_companion_24x7',
}

// Security headers for all responses
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: https://*.googleusercontent.com",
      "font-src 'self' data:",
      "connect-src 'self' https://generativelanguage.googleapis.com https://accounts.google.com https://oauth2.googleapis.com",
      "media-src 'self' blob: data:",
      "worker-src 'self' blob:",
      "frame-src 'self' https://accounts.google.com",
    ].join('; ')
  )
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

    // Trust Cloudflare headers for real client IP
    // cf-connecting-ip is set by Cloudflare and contains the original client IP
    const cfConnectingIP = req.headers.get('cf-connecting-ip')
    const realIP = cfConnectingIP || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()

    // Create response with school context header
    let response = NextResponse.next()
    response = addSecurityHeaders(response)

    // Pass real IP to downstream for rate limiting and logging
    if (realIP) {
      response.headers.set('x-real-ip', realIP)
    }

    if (schoolSlug) {
      response.headers.set('x-school-slug', schoolSlug)
    }

    // Check user status - block access for non-active users
    const userStatus = token?.status as UserStatus | undefined

    if (userStatus === UserStatus.PENDING_VERIFICATION) {
      return NextResponse.redirect(new URL('/verify-email-required', req.url))
    }

    if (userStatus === UserStatus.PENDING_APPROVAL) {
      // Allow teachers to see a pending approval page
      if (path !== '/pending-approval' && !path.startsWith('/api/auth')) {
        return NextResponse.redirect(new URL('/pending-approval', req.url))
      }
    }

    if (userStatus === UserStatus.SUSPENDED) {
      return NextResponse.redirect(new URL('/account-suspended', req.url))
    }

    if (userStatus === UserStatus.REJECTED) {
      return NextResponse.redirect(new URL('/account-rejected', req.url))
    }

    // Role-based route protection (only for ACTIVE users)
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
        // Allow access to status pages
        const publicPaths = [
          '/pending-approval',
          '/verify-email-required',
          '/account-suspended',
          '/account-rejected',
        ]
        if (publicPaths.some((p) => req.nextUrl.pathname.startsWith(p))) {
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
    '/pending-approval',
    '/verify-email-required',
    '/account-suspended',
    '/account-rejected',
    '/api/health',
  ],
}
