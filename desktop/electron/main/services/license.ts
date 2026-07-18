import crypto from 'node:crypto'
import type Database from 'better-sqlite3-multiple-ciphers'
import { getDb, getDeviceId } from '../db/connection'
import type { LicenseInfo, LicenseStatus, RegistrationInfo, StartupNotices } from '@shared/types'
import { LICENSE_FEE_PER_STUDENT_XAF } from '@shared/constants'
import { verifyActivationCode } from './licensing/crypto'
import { endOfFebruaryDeadline, daysUntil, warningThresholdFor } from './licensing/dates'

// ---------------------------------------------------------------------------
// Offline licensing (v2)
//
// A license is an Ed25519-signed token issued by ELIGNITE, bound to this
// install's permanent School ID *and* Device ID. Verification is fully local
// (see ./licensing/crypto) — the app never contacts the network to validate a
// license. A freshly set-up install runs on an auto-issued PROVISIONAL license
// (valid until the next end-of-February) so schools can work during onboarding;
// renewing requires a signed activation code.
// ---------------------------------------------------------------------------

interface LicenseRow {
  token: string
  issued_at: string
  expires_at: string
  school_id: string | null
  device_id: string | null
  activated_at: string | null
  provisional: number
}

function getLicenseRow(db: Database.Database): LicenseRow | undefined {
  return db.prepare('SELECT * FROM license WHERE id = 1').get() as LicenseRow | undefined
}

// ---- School ID -------------------------------------------------------------

function formatSchoolId(): string {
  // Human-quotable permanent id, e.g. "JI-4F9A-2C7B". Not secret; the school
  // reads it to ELIGNITE (with the Device ID) to obtain an activation code.
  const hex = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `JI-${hex.slice(0, 4)}-${hex.slice(4, 8)}`
}

/**
 * Returns the school's permanent School ID, generating and persisting one on
 * first call. Requires the school row to exist (i.e. after setup); returns ''
 * before then.
 */
export function ensureSchoolId(): string {
  const db = getDb()
  const row = db.prepare('SELECT school_id FROM schools WHERE id = 1').get() as
    | { school_id: string | null }
    | undefined
  if (!row) return ''
  if (row.school_id) return row.school_id
  const schoolId = formatSchoolId()
  db.prepare('UPDATE schools SET school_id = ? WHERE id = 1').run(schoolId)
  return schoolId
}

function getSchoolId(): string {
  const db = getDb()
  const row = db.prepare('SELECT school_id FROM schools WHERE id = 1').get() as
    | { school_id: string | null }
    | undefined
  return row?.school_id ?? ''
}

function getSchoolName(): string {
  const db = getDb()
  const row = db.prepare('SELECT name FROM schools WHERE id = 1').get() as { name: string } | undefined
  return row?.name ?? ''
}

/**
 * Count of enrolled students the annual licence fee applies to. Excludes pupils
 * who have left (withdrawn/graduated/transferred) so the school is only charged
 * for its currently-enrolled population.
 */
export function getEnrolledStudentCount(): number {
  const db = getDb()
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM students WHERE status NOT IN ('withdrawn','graduated','transferred')")
    .get() as { n: number } | undefined
  return row?.n ?? 0
}

/** Fee fields shared by every LicenseInfo result. */
function feeFields(): { studentCount: number; feeTotalXaf: number } {
  const studentCount = getEnrolledStudentCount()
  return { studentCount, feeTotalXaf: studentCount * LICENSE_FEE_PER_STUDENT_XAF }
}

// ---- Issuing the provisional license ---------------------------------------

/**
 * Writes the auto-issued first-year provisional license (valid until the next
 * end-of-February). Only call when no license row exists yet, or to migrate a
 * legacy pre-v2 row — never on a real provisional/signed row, or expiry could
 * be reset indefinitely.
 */
function writeProvisionalLicense(): void {
  const db = getDb()
  const issuedAt = new Date().toISOString()
  const expiresAt = endOfFebruaryDeadline().toISOString()
  db.prepare(
    `INSERT INTO license (id, token, issued_at, expires_at, school_id, device_id, activated_at, provisional)
     VALUES (1, '', @issuedAt, @expiresAt, @schoolId, @deviceId, NULL, 1)
     ON CONFLICT(id) DO UPDATE SET
       token='', issued_at=excluded.issued_at, expires_at=excluded.expires_at,
       school_id=excluded.school_id, device_id=excluded.device_id, activated_at=NULL, provisional=1`
  ).run({ issuedAt, expiresAt, schoolId: ensureSchoolId(), deviceId: getDeviceId() })
}

/** A leftover pre-v2 HMAC license row (no school binding, non-verifiable token). */
function isLegacyRow(row: LicenseRow): boolean {
  return row.provisional === 0 && !row.school_id && !!row.token && verifyActivationCode(row.token) === null
}

/**
 * Boot-time hook: ensure a set-up install has a usable license. Issues the
 * provisional license the first time, and migrates a legacy pre-v2 row once.
 * Deliberately does nothing to an existing provisional or signed row, so a
 * genuinely expired license stays expired.
 */
export function ensureLicensingReady(): void {
  const db = getDb()
  const school = db.prepare('SELECT setup_complete FROM schools WHERE id = 1').get() as
    | { setup_complete: number }
    | undefined
  if (!school?.setup_complete) return
  ensureSchoolId()
  const row = getLicenseRow(db)
  if (!row || isLegacyRow(row)) writeProvisionalLicense()
}

/** Called right after first-run setup completes so the app is licensed at once. */
export function issueInitialLicense(): void {
  const db = getDb()
  ensureSchoolId()
  if (!getLicenseRow(db)) writeProvisionalLicense()
}

// ---- Status ----------------------------------------------------------------

function emptyInfo(status: LicenseStatus): LicenseInfo {
  return {
    status,
    issuedAt: '',
    expiresAt: '',
    daysRemaining: 0,
    schoolId: getSchoolId(),
    deviceId: getDeviceId(),
    provisional: false,
    warningThreshold: null,
    ...feeFields()
  }
}

/** Current license status. Pure/local — safe to call as often as needed. */
export function getLicenseInfo(): LicenseInfo {
  const db = getDb()
  const row = getLicenseRow(db)
  if (!row) return emptyInfo('expired')

  const deviceId = getDeviceId()
  const schoolId = getSchoolId()

  let valid: boolean
  if (row.provisional === 1) {
    // Provisional: trust the stored (encrypted-at-rest) expiry.
    valid = row.device_id === deviceId
  } else {
    // Signed: re-verify the Ed25519 signature and both bindings on every check.
    const payload = verifyActivationCode(row.token)
    valid =
      !!payload &&
      payload.schoolId === schoolId &&
      payload.deviceId === deviceId &&
      payload.expiresAt === row.expires_at
  }

  if (!valid) return { ...emptyInfo('expired'), issuedAt: row.issued_at, expiresAt: row.expires_at }

  const daysRemaining = daysUntil(row.expires_at)
  const status: LicenseStatus = daysRemaining > 0 ? 'active' : 'expired'

  return {
    status,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    daysRemaining,
    schoolId,
    deviceId,
    provisional: row.provisional === 1,
    warningThreshold: status === 'active' ? warningThresholdFor(daysRemaining) : null,
    ...feeFields()
  }
}

// ---- Activation ------------------------------------------------------------

export class ActivationError extends Error {}

/**
 * Applies a signed activation code. Verifies the signature and that it is bound
 * to *this* School ID and Device ID, then stores it — unlocking the app
 * immediately with no reinstall. Throws ActivationError with a friendly message
 * on any failure.
 */
export function activateLicense(code: string): LicenseInfo {
  const payload = verifyActivationCode(code)
  if (!payload) {
    throw new ActivationError('This activation code is invalid or has been altered. Check it and try again.')
  }

  const schoolId = ensureSchoolId()
  const deviceId = getDeviceId()

  if (payload.schoolId !== schoolId) {
    throw new ActivationError('This code was issued for a different school. Contact ELIGNITE with your School ID.')
  }
  if (payload.deviceId !== deviceId) {
    throw new ActivationError('This code was issued for a different computer. A license cannot be moved between devices.')
  }
  if (daysUntil(payload.expiresAt) <= 0) {
    throw new ActivationError('This activation code has already expired. Contact ELIGNITE for a current code.')
  }

  const db = getDb()
  db.prepare(
    `INSERT INTO license (id, token, issued_at, expires_at, school_id, device_id, activated_at, provisional)
     VALUES (1, @token, @issuedAt, @expiresAt, @schoolId, @deviceId, @activatedAt, 0)
     ON CONFLICT(id) DO UPDATE SET
       token=excluded.token, issued_at=excluded.issued_at, expires_at=excluded.expires_at,
       school_id=excluded.school_id, device_id=excluded.device_id, activated_at=excluded.activated_at, provisional=0`
  ).run({
    token: code.trim(),
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    schoolId,
    deviceId,
    activatedAt: new Date().toISOString()
  })

  return getLicenseInfo()
}

// ---- Registration info (shown at setup / on the license page) --------------

export function getRegistrationInfo(): RegistrationInfo {
  return { schoolId: ensureSchoolId(), deviceId: getDeviceId(), schoolName: getSchoolName() }
}

// ---- Write-path gating (defense-in-depth behind the UI lock) ---------------

/** True once the license has expired; write-path IPC handlers refuse in this state. */
export function isLocked(): boolean {
  return getLicenseInfo().status !== 'active'
}

/** Throws when the license has expired. Called first by every write handler. */
export function assertNotReadOnly(): void {
  if (isLocked()) {
    throw new Error('Your JuniorIgnite license has expired. Activate a new license to continue making changes.')
  }
}

// ---- Startup update reminders (app_meta bookkeeping) -----------------------

function getMeta(db: Database.Database, key: string): string | null {
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

function setMeta(db: Database.Database, key: string, value: string): void {
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value)
}

const META_MONTHLY = 'lastMonthlyUpdateReminder' // "YYYY-MM"
const META_ANNUAL = 'lastAnnualUpdateReminder' // "YYYY"

/**
 * Notices to surface at launch: the current license status (the renderer shows
 * an escalating warning whenever warningThreshold is set) plus once-per-period
 * "check for updates" nudges. The annual nudge is marked shown immediately (it
 * has no snooze); the monthly one is only marked once the user dismisses it, so
 * "Check Later" lets it reappear next launch.
 */
export function getStartupNotices(): StartupNotices {
  const db = getDb()
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const year = String(now.getFullYear())

  const showMonthlyUpdate = getMeta(db, META_MONTHLY) !== month
  const showAnnualUpdate = getMeta(db, META_ANNUAL) !== year
  if (showAnnualUpdate) setMeta(db, META_ANNUAL, year)

  return { license: getLicenseInfo(), showMonthlyUpdate, showAnnualUpdate }
}

/** Suppress an update reminder for the current period. */
export function dismissUpdateReminder(kind: 'monthly' | 'annual'): void {
  const db = getDb()
  const now = new Date()
  if (kind === 'monthly') {
    setMeta(db, META_MONTHLY, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  } else {
    setMeta(db, META_ANNUAL, String(now.getFullYear()))
  }
}
