// Rate limiting utility for API routes
// Uses in-memory storage (for single instance) - use Redis for multi-instance

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Max requests per window
}

// In-memory store - replace with Redis in production for multi-instance
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean every minute

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // If no entry or expired, create new
  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(identifier, newEntry)
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // Increment counter
  entry.count++
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

// Pre-configured rate limiters
export const rateLimiters = {
  // General API: 100 requests per minute
  api: (identifier: string) =>
    checkRateLimit(`api:${identifier}`, { windowMs: 60000, maxRequests: 100 }),

  // AI endpoints: 20 requests per minute (expensive)
  ai: (identifier: string) =>
    checkRateLimit(`ai:${identifier}`, { windowMs: 60000, maxRequests: 20 }),

  // Auth endpoints: 10 requests per minute (prevent brute force)
  auth: (identifier: string) =>
    checkRateLimit(`auth:${identifier}`, { windowMs: 60000, maxRequests: 10 }),

  // Login specifically: 5 attempts per 15 minutes
  login: (identifier: string) =>
    checkRateLimit(`login:${identifier}`, { windowMs: 900000, maxRequests: 5 }),

  // Registration: 3 per hour
  register: (identifier: string) =>
    checkRateLimit(`register:${identifier}`, { windowMs: 3600000, maxRequests: 3 }),
}

// Helper to get client IP from request
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  return 'unknown'
}

// Rate limit response helper
export function rateLimitResponse(resetTime: number) {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(resetTime),
      },
    }
  )
}
