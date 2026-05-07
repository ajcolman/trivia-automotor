import { NextRequest } from 'next/server'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Name of the cookie that identifies a player session across page loads. */
export const SESSION_COOKIE_NAME = 'trivia_session_id'

/** How long the session cookie should live: 1 year in seconds. */
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 365 days

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Reads the `trivia_session_id` cookie value from an incoming Next.js request.
 *
 * Returns `null` when the cookie is absent or empty.
 *
 * @example
 * // In a Route Handler or middleware:
 * const sessionId = getSessionId(request)
 * if (!sessionId) {
 *   // No active session — generate a new one and set it in the response cookie
 * }
 */
export function getSessionId(req: NextRequest): string | null {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)
  const value = cookie?.value?.trim()
  return value && value.length > 0 ? value : null
}

/**
 * Builds a `Set-Cookie` header value for the session cookie.
 *
 * Marked `HttpOnly`, `SameSite=Lax`, and `Path=/` so it is sent on every
 * same-site request but not exposed to client-side JavaScript.
 *
 * @param sessionId  The UUID or CUID to store.
 * @param maxAge     Override the default 1-year TTL (seconds).
 */
export function buildSessionCookieHeader(
  sessionId: string,
  maxAge: number = SESSION_COOKIE_MAX_AGE,
): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${sessionId}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ]

  // Add Secure flag in production
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure')
  }

  return parts.join('; ')
}

/**
 * Builds a `Set-Cookie` header that clears the session cookie by setting
 * `Max-Age=0`.
 */
export function clearSessionCookieHeader(): string {
  return [
    `${SESSION_COOKIE_NAME}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ].join('; ')
}
