// Shared auth helpers — uses only Web Crypto so this runs in both
// the Edge (middleware) and Node.js (API routes) runtimes.

export const SESSION_COOKIE = 'bk_session'
const PAYLOAD = 'authenticated'

async function hmacSign(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(message)
  )
  // base64url without Buffer (Edge-safe)
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/** Compute the expected cookie value for a given access code. */
export async function computeToken(code: string): Promise<string> {
  return hmacSign(code, PAYLOAD)
}

/**
 * Verify a cookie token against the configured ACCESS_CODE.
 * Returns true when no ACCESS_CODE is set (open access in dev).
 */
export async function verifyToken(token: string): Promise<boolean> {
  const code = process.env.ACCESS_CODE
  if (!code) return true
  const expected = await computeToken(code)
  return token === expected
}
