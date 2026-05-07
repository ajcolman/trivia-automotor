import { LRUCache } from 'lru-cache'

interface RateLimitOptions {
  /** Maximum number of requests allowed within the window */
  limit: number
  /** Time window in milliseconds */
  windowMs: number
}

interface TokenEntry {
  count: number
  resetAt: number
}

// One shared cache instance; keys are strings like "ip:route"
const tokenCache = new LRUCache<string, TokenEntry>({
  max: 500,
  // TTL for each entry equals the longest possible window we'll ever use.
  // Individual entries track their own resetAt for accuracy.
  ttl: 60 * 60 * 1000, // 1 hour max TTL
})

/**
 * Check whether a key is currently rate-limited.
 *
 * @param key       Unique identifier (e.g. IP address, user ID, route combo)
 * @param limit     Max number of requests allowed inside the window
 * @param windowMs  Window length in milliseconds
 * @returns `true` if the caller is rate-limited (request should be rejected)
 *          `false` if the caller is within the allowed rate
 */
export function check(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const existing = tokenCache.get(key)

  if (!existing || now >= existing.resetAt) {
    // First request in a new window
    tokenCache.set(key, { count: 1, resetAt: now + windowMs }, { ttl: windowMs })
    return false
  }

  if (existing.count >= limit) {
    // Over the limit — do NOT increment (avoid overflow)
    return true
  }

  // Still within limit — increment counter
  existing.count += 1
  tokenCache.set(key, existing, { ttl: existing.resetAt - now })
  return false
}

/**
 * Returns the remaining number of requests for a key within the current window.
 * Returns `limit` if no requests have been made yet.
 */
export function remaining(key: string, limit: number): number {
  const entry = tokenCache.get(key)
  if (!entry) return limit
  return Math.max(0, limit - entry.count)
}

/**
 * Returns the Unix timestamp (ms) when the current window resets for a key.
 * Returns `null` if the key is not tracked.
 */
export function resetTime(key: string): number | null {
  const entry = tokenCache.get(key)
  return entry?.resetAt ?? null
}

/**
 * Convenience rate-limiter factory for route handlers.
 *
 * @example
 * const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 })
 * if (limiter.check(ip)) return new Response('Too Many Requests', { status: 429 })
 */
export function createRateLimiter(options: RateLimitOptions) {
  const { limit, windowMs } = options
  return {
    check: (key: string) => check(key, limit, windowMs),
    remaining: (key: string) => remaining(key, limit),
    resetTime: (key: string) => resetTime(key),
  }
}
