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
  // Bypass rate limiting in test environment
  if (process.env.RATE_LIMIT_BYPASS === 'true') {
    return { success: true, remaining: 999, resetTime: 0 };
  }

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

// Product tier types
type ProductTier = 'STARTER' | 'AFFORDABLE' | 'ELITE' | 'ENTERPRISE'

// Tier-based rate limit configurations
export const tierRateLimits: Record<ProductTier, {
  api: number
  ai: number
  studyCompanion: number
  practice: number
}> = {
  STARTER: {
    api: 50,           // 50 requests per minute
    ai: 10,            // 10 AI requests per minute
    studyCompanion: 0, // Disabled
    practice: 5,       // 5 practice questions per minute
  },
  AFFORDABLE: {
    api: 100,          // 100 requests per minute
    ai: 20,            // 20 AI requests per minute
    studyCompanion: 0, // Disabled
    practice: 10,      // 10 practice questions per minute
  },
  ELITE: {
    api: 200,          // 200 requests per minute
    ai: 50,            // 50 AI requests per minute
    studyCompanion: 100, // 100 companion messages per minute
    practice: 30,      // 30 practice questions per minute
  },
  ENTERPRISE: {
    api: 500,          // 500 requests per minute
    ai: 100,           // 100 AI requests per minute
    studyCompanion: 200, // 200 companion messages per minute
    practice: 100,     // 100 practice questions per minute
  },
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

// Tier-based rate limiters
export const tierRateLimiters = {
  // API rate limit based on tier
  api: (identifier: string, tier: ProductTier) =>
    checkRateLimit(`api:${tier}:${identifier}`, {
      windowMs: 60000,
      maxRequests: tierRateLimits[tier].api,
    }),

  // AI rate limit based on tier
  ai: (identifier: string, tier: ProductTier) =>
    checkRateLimit(`ai:${tier}:${identifier}`, {
      windowMs: 60000,
      maxRequests: tierRateLimits[tier].ai,
    }),

  // Study companion rate limit (elite+ only)
  studyCompanion: (identifier: string, tier: ProductTier) => {
    const limit = tierRateLimits[tier].studyCompanion
    if (limit === 0) {
      return { success: false, remaining: 0, resetTime: Date.now() + 60000 }
    }
    return checkRateLimit(`companion:${tier}:${identifier}`, {
      windowMs: 60000,
      maxRequests: limit,
    })
  },

  // Practice questions rate limit based on tier
  practice: (identifier: string, tier: ProductTier) =>
    checkRateLimit(`practice:${tier}:${identifier}`, {
      windowMs: 60000,
      maxRequests: tierRateLimits[tier].practice,
    }),
}

// Helper to get tier from school subscription
export function getTierFromSubscription(tier?: string | null): ProductTier {
  if (!tier) return 'AFFORDABLE' // Default tier
  if (['STARTER', 'AFFORDABLE', 'ELITE', 'ENTERPRISE'].includes(tier)) {
    return tier as ProductTier
  }
  return 'AFFORDABLE'
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
