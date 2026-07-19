import crypto from 'node:crypto'

const DEFAULT_SECRET = 'change-me-in-production'
const SECRET = process.env.TOKEN_SECRET ?? DEFAULT_SECRET

// Founder tokens are signed with this secret. Shipping the placeholder to a
// public server would let anyone forge a founder session, so refuse to boot.
if (process.env.NODE_ENV === 'production' && SECRET === DEFAULT_SECRET) {
  console.error(
    '\nFATAL: TOKEN_SECRET is still the default placeholder.\n' +
      'Anyone could forge a founder login. Set a strong random value, e.g.\n' +
      "  TOKEN_SECRET=$(node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\")\n"
  )
  process.exit(1)
}

// ---- password hashing (scrypt, no native deps) ----
export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): { salt: string; hash: string } {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return { salt, hash }
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const h = crypto.scryptSync(password, salt, 64).toString('hex')
  const a = Buffer.from(h, 'hex')
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// ---- stateless signed tokens (HMAC) ----
function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function signToken(payload: object, ttlSeconds = 60 * 60 * 12): string {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }
  const data = b64url(JSON.stringify(body))
  const sig = b64url(crypto.createHmac('sha256', SECRET).update(data).digest())
  return `${data}.${sig}`
}

export function verifyToken(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null
  const [data, sig] = token.split('.')
  if (!data || !sig) return null
  const expected = b64url(crypto.createHmac('sha256', SECRET).update(data).digest())
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expected)
  // timingSafeEqual throws on a length mismatch, so a junk Authorization header
  // would crash the request with a 500. Compare lengths first and fail cleanly.
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null
  try {
    const payload = JSON.parse(Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString())
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
