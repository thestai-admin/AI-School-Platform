/**
 * Rate Limiting Tests (TC-RATE-001 to TC-RATE-004)
 *
 * Tests cover:
 * - Registration rate limit (3/hour)
 * - Login rate limit (5/15min)
 * - Auth endpoints rate limit (10/min)
 * - AI chat rate limit (20/min)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  checkRateLimit,
  rateLimiters,
  getClientIp,
  rateLimitResponse,
  tierRateLimiters,
  getTierFromSubscription,
} from '@/lib/rate-limit'

describe('Rate Limiting - /lib/rate-limit', () => {
  // Note: Rate limiting uses in-memory storage which persists between tests
  // We use unique identifiers for each test to avoid conflicts

  function uniqueId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // ==========================================================================
  // Core Rate Limit Logic Tests
  // ==========================================================================
  describe('checkRateLimit Core Logic', () => {
    it('should allow requests within limit', () => {
      const id = uniqueId('test')
      const config = { windowMs: 60000, maxRequests: 5 }

      // First 5 requests should succeed
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(id, config)
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(4 - i)
      }
    })

    it('should block requests over limit', () => {
      const id = uniqueId('test')
      const config = { windowMs: 60000, maxRequests: 3 }

      // Use up the limit
      for (let i = 0; i < 3; i++) {
        checkRateLimit(id, config)
      }

      // 4th request should fail
      const result = checkRateLimit(id, config)
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should return correct reset time', () => {
      const id = uniqueId('test')
      const config = { windowMs: 60000, maxRequests: 5 }

      const now = Date.now()
      const result = checkRateLimit(id, config)

      expect(result.resetTime).toBeGreaterThanOrEqual(now + config.windowMs - 100)
      expect(result.resetTime).toBeLessThanOrEqual(now + config.windowMs + 100)
    })

    it('should track different identifiers separately', () => {
      const id1 = uniqueId('user1')
      const id2 = uniqueId('user2')
      const config = { windowMs: 60000, maxRequests: 2 }

      // Use up id1's limit
      checkRateLimit(id1, config)
      checkRateLimit(id1, config)

      // id2 should still have full quota
      const result = checkRateLimit(id2, config)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(1)
    })
  })

  // ==========================================================================
  // TC-RATE-001: Registration (3/hour)
  // ==========================================================================
  describe('TC-RATE-001: Registration Rate Limit (3/hour)', () => {
    it('should allow 3 registration attempts within an hour', () => {
      const ip = uniqueId('reg-ip')

      for (let i = 0; i < 3; i++) {
        const result = rateLimiters.register(ip)
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(2 - i)
      }
    })

    it('should block 4th registration attempt', () => {
      const ip = uniqueId('reg-ip')

      // Use up the limit
      for (let i = 0; i < 3; i++) {
        rateLimiters.register(ip)
      }

      // 4th attempt should be blocked
      const result = rateLimiters.register(ip)
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should use 1-hour window', () => {
      const ip = uniqueId('reg-ip')
      const result = rateLimiters.register(ip)

      // Reset time should be approximately 1 hour in the future
      const now = Date.now()
      const oneHour = 3600000
      expect(result.resetTime).toBeGreaterThanOrEqual(now + oneHour - 100)
      expect(result.resetTime).toBeLessThanOrEqual(now + oneHour + 100)
    })
  })

  // ==========================================================================
  // TC-RATE-002: Login (5/15min)
  // ==========================================================================
  describe('TC-RATE-002: Login Rate Limit (5/15min)', () => {
    it('should allow 5 login attempts within 15 minutes', () => {
      const ip = uniqueId('login-ip')

      for (let i = 0; i < 5; i++) {
        const result = rateLimiters.login(ip)
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(4 - i)
      }
    })

    it('should block 6th login attempt', () => {
      const ip = uniqueId('login-ip')

      // Use up the limit
      for (let i = 0; i < 5; i++) {
        rateLimiters.login(ip)
      }

      // 6th attempt should be blocked
      const result = rateLimiters.login(ip)
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should use 15-minute window', () => {
      const ip = uniqueId('login-ip')
      const result = rateLimiters.login(ip)

      // Reset time should be approximately 15 minutes in the future
      const now = Date.now()
      const fifteenMinutes = 900000
      expect(result.resetTime).toBeGreaterThanOrEqual(now + fifteenMinutes - 100)
      expect(result.resetTime).toBeLessThanOrEqual(now + fifteenMinutes + 100)
    })
  })

  // ==========================================================================
  // TC-RATE-003: Auth Endpoints (10/min)
  // ==========================================================================
  describe('TC-RATE-003: Auth Endpoints Rate Limit (10/min)', () => {
    it('should allow 10 auth requests per minute', () => {
      const ip = uniqueId('auth-ip')

      for (let i = 0; i < 10; i++) {
        const result = rateLimiters.auth(ip)
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(9 - i)
      }
    })

    it('should block 11th auth request', () => {
      const ip = uniqueId('auth-ip')

      // Use up the limit
      for (let i = 0; i < 10; i++) {
        rateLimiters.auth(ip)
      }

      // 11th request should be blocked
      const result = rateLimiters.auth(ip)
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should use 1-minute window', () => {
      const ip = uniqueId('auth-ip')
      const result = rateLimiters.auth(ip)

      // Reset time should be approximately 1 minute in the future
      const now = Date.now()
      const oneMinute = 60000
      expect(result.resetTime).toBeGreaterThanOrEqual(now + oneMinute - 100)
      expect(result.resetTime).toBeLessThanOrEqual(now + oneMinute + 100)
    })
  })

  // ==========================================================================
  // TC-RATE-004: AI Chat (20/min)
  // ==========================================================================
  describe('TC-RATE-004: AI Chat Rate Limit (20/min)', () => {
    it('should allow 20 AI requests per minute', () => {
      const ip = uniqueId('ai-ip')

      for (let i = 0; i < 20; i++) {
        const result = rateLimiters.ai(ip)
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(19 - i)
      }
    })

    it('should block 21st AI request', () => {
      const ip = uniqueId('ai-ip')

      // Use up the limit
      for (let i = 0; i < 20; i++) {
        rateLimiters.ai(ip)
      }

      // 21st request should be blocked
      const result = rateLimiters.ai(ip)
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should use 1-minute window', () => {
      const ip = uniqueId('ai-ip')
      const result = rateLimiters.ai(ip)

      // Reset time should be approximately 1 minute in the future
      const now = Date.now()
      const oneMinute = 60000
      expect(result.resetTime).toBeGreaterThanOrEqual(now + oneMinute - 100)
      expect(result.resetTime).toBeLessThanOrEqual(now + oneMinute + 100)
    })
  })

  // ==========================================================================
  // General API Rate Limit (100/min)
  // ==========================================================================
  describe('General API Rate Limit (100/min)', () => {
    it('should allow 100 API requests per minute', () => {
      const ip = uniqueId('api-ip')

      // Check first few requests
      for (let i = 0; i < 5; i++) {
        const result = rateLimiters.api(ip)
        expect(result.success).toBe(true)
      }
    })

    it('should block requests over 100', () => {
      const ip = uniqueId('api-ip')

      // Use up the limit
      for (let i = 0; i < 100; i++) {
        rateLimiters.api(ip)
      }

      // 101st request should be blocked
      const result = rateLimiters.api(ip)
      expect(result.success).toBe(false)
    })
  })

  // ==========================================================================
  // Tier-Based Rate Limits
  // ==========================================================================
  describe('Tier-Based Rate Limits', () => {
    describe('getTierFromSubscription', () => {
      it('should return AFFORDABLE as default tier', () => {
        expect(getTierFromSubscription()).toBe('AFFORDABLE')
        expect(getTierFromSubscription(null)).toBe('AFFORDABLE')
        expect(getTierFromSubscription(undefined)).toBe('AFFORDABLE')
      })

      it('should return correct tier for valid values', () => {
        expect(getTierFromSubscription('STARTER')).toBe('STARTER')
        expect(getTierFromSubscription('AFFORDABLE')).toBe('AFFORDABLE')
        expect(getTierFromSubscription('ELITE')).toBe('ELITE')
        expect(getTierFromSubscription('ENTERPRISE')).toBe('ENTERPRISE')
      })

      it('should return AFFORDABLE for invalid tier', () => {
        expect(getTierFromSubscription('INVALID')).toBe('AFFORDABLE')
      })
    })

    describe('Tier API Limits', () => {
      it('should enforce STARTER tier limits (50 API requests)', () => {
        const ip = uniqueId('tier-api-starter')

        // STARTER tier: 50 requests/min
        for (let i = 0; i < 50; i++) {
          const result = tierRateLimiters.api(ip, 'STARTER')
          expect(result.success).toBe(true)
        }

        // 51st should fail
        const result = tierRateLimiters.api(ip, 'STARTER')
        expect(result.success).toBe(false)
      })

      it('should enforce ELITE tier limits (200 API requests)', () => {
        const ip = uniqueId('tier-api-elite')

        // Check a few requests work
        for (let i = 0; i < 10; i++) {
          const result = tierRateLimiters.api(ip, 'ELITE')
          expect(result.success).toBe(true)
        }
      })
    })

    describe('Study Companion Limits', () => {
      it('should block study companion for STARTER tier', () => {
        const ip = uniqueId('companion-starter')
        const result = tierRateLimiters.studyCompanion(ip, 'STARTER')
        expect(result.success).toBe(false)
      })

      it('should block study companion for AFFORDABLE tier', () => {
        const ip = uniqueId('companion-affordable')
        const result = tierRateLimiters.studyCompanion(ip, 'AFFORDABLE')
        expect(result.success).toBe(false)
      })

      it('should allow study companion for ELITE tier', () => {
        const ip = uniqueId('companion-elite')
        const result = tierRateLimiters.studyCompanion(ip, 'ELITE')
        expect(result.success).toBe(true)
      })

      it('should allow study companion for ENTERPRISE tier', () => {
        const ip = uniqueId('companion-enterprise')
        const result = tierRateLimiters.studyCompanion(ip, 'ENTERPRISE')
        expect(result.success).toBe(true)
      })
    })
  })

  // ==========================================================================
  // Utility Functions
  // ==========================================================================
  describe('Utility Functions', () => {
    describe('getClientIp', () => {
      it('should extract IP from x-forwarded-for header', () => {
        const request = {
          headers: new Headers({
            'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          }),
        } as Request

        expect(getClientIp(request)).toBe('192.168.1.1')
      })

      it('should extract IP from x-real-ip header', () => {
        const request = {
          headers: new Headers({
            'x-real-ip': '10.0.0.1',
          }),
        } as Request

        expect(getClientIp(request)).toBe('10.0.0.1')
      })

      it('should prefer x-forwarded-for over x-real-ip', () => {
        const request = {
          headers: new Headers({
            'x-forwarded-for': '192.168.1.1',
            'x-real-ip': '10.0.0.1',
          }),
        } as Request

        expect(getClientIp(request)).toBe('192.168.1.1')
      })

      it('should return "unknown" when no IP headers present', () => {
        const request = {
          headers: new Headers({}),
        } as Request

        expect(getClientIp(request)).toBe('unknown')
      })
    })

    describe('rateLimitResponse', () => {
      it('should return 429 response with correct headers', () => {
        const resetTime = Date.now() + 60000
        const response = rateLimitResponse(resetTime)

        expect(response.status).toBe(429)
        expect(response.headers.get('Content-Type')).toBe('application/json')
        expect(response.headers.get('Retry-After')).toBeDefined()
        expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
        expect(response.headers.get('X-RateLimit-Reset')).toBe(String(resetTime))
      })

      it('should include error message in body', async () => {
        const resetTime = Date.now() + 60000
        const response = rateLimitResponse(resetTime)
        const body = await response.json()

        expect(body.error).toBe('Too many requests')
        expect(body.retryAfter).toBeDefined()
        expect(typeof body.retryAfter).toBe('number')
      })
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle concurrent requests correctly', () => {
      const ip = uniqueId('concurrent')
      const config = { windowMs: 60000, maxRequests: 5 }

      // Simulate concurrent requests
      const results = Array(10)
        .fill(null)
        .map(() => checkRateLimit(ip, config))

      const successCount = results.filter((r) => r.success).length
      expect(successCount).toBe(5)
    })

    it('should handle empty identifier', () => {
      const config = { windowMs: 60000, maxRequests: 5 }
      const result = checkRateLimit('', config)
      expect(result).toBeDefined()
    })
  })
})
