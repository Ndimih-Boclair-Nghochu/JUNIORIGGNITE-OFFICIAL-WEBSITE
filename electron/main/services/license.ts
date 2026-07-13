import crypto from 'node:crypto'
import { getDb } from '../db/connection'
import type { LicenseInfo, LicenseStatus } from '@shared/types'

// In a real deployment the signing secret lives on the licensing server and
// only signed tokens are shipped to the client; here we keep a local secret so
// the whole validate/renew cycle works fully offline. Swap signToken/verifyToken
// for a call that fetches a server-signed token to go online later.
const LICENSE_SECRET = 'juniorignite-local-dev-secret-v1'
const GRACE_DAYS = 14

interface LicensePayload {
  issuedAt: string
  expiresAt: string
}

function signToken(payload: LicensePayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', LICENSE_SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}

function verifyToken(token: string): LicensePayload | null {
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = crypto.createHmac('sha256', LICENSE_SECRET).update(body).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expected)
  // timingSafeEqual throws on length mismatch — guard so a corrupted token
  // fails verification cleanly instead of crashing the license check.
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'))
  } catch {
    return null
  }
}

/** Ensures a license row exists; issues a default 1-year token on first call. */
export function ensureLicense(): void {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM license WHERE id = 1').get()
  if (existing) return
  issueLicense(365)
}

function issueLicense(days: number): LicensePayload {
  const db = getDb()
  const issuedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
  const payload: LicensePayload = { issuedAt, expiresAt }
  const token = signToken(payload)
  db.prepare(
    `INSERT INTO license (id, token, issued_at, expires_at) VALUES (1, @token, @issuedAt, @expiresAt)
     ON CONFLICT(id) DO UPDATE SET token=excluded.token, issued_at=excluded.issued_at, expires_at=excluded.expires_at`
  ).run({ token, issuedAt, expiresAt })
  return payload
}

export function getLicenseInfo(): LicenseInfo {
  const db = getDb()
  const row = db.prepare('SELECT * FROM license WHERE id = 1').get() as
    | { token: string; issued_at: string; expires_at: string }
    | undefined

  if (!row || !verifyToken(row.token)) {
    return { status: 'expired', issuedAt: '', expiresAt: '', daysRemaining: 0 }
  }

  const daysRemaining = Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  let status: LicenseStatus
  if (daysRemaining > 0) status = 'active'
  else if (daysRemaining > -GRACE_DAYS) status = 'grace'
  else status = 'expired'

  return { status, issuedAt: row.issued_at, expiresAt: row.expires_at, daysRemaining }
}

/**
 * True when the app should block creation of new records. Per spec, once the
 * license is past its expiry the app enters a read-only "grace mode": existing
 * data stays viewable/exportable, but new records/marks/report cards cannot be
 * created. This applies to both 'grace' and fully 'expired' states.
 */
export function isReadOnlyMode(): boolean {
  return getLicenseInfo().status !== 'active'
}

/** Throws in read-only/grace mode. Write-path IPC handlers call this first. */
export function assertNotReadOnly(): void {
  if (isReadOnlyMode()) {
    throw new Error(
      'Your license has expired. The app is in read-only mode — existing data can still be viewed and exported, but new records cannot be created until the license is renewed.'
    )
  }
}

/** Mock renewal — locally re-issues a 1-year token. Replace with a server call later. */
export function renewLicense(): LicenseInfo {
  issueLicense(365)
  return getLicenseInfo()
}
