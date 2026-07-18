import crypto from 'node:crypto'

/**
 * Ed25519 PUBLIC verification key. The matching PRIVATE key never ships with
 * the app — it lives only in ELIGNITE's offline license generator
 * (tools/license-gen). Because verification is asymmetric, unpacking the .exe
 * reveals only this public key, which cannot be used to forge a license.
 *
 * To rotate keys: generate a new pair with the generator, paste the new public
 * key here, and re-issue outstanding licenses.
 */
const LICENSE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAwhc8ViCF4q5WthUbIfp0BDBqjbb1abi/OX7wi5Sit58=
-----END PUBLIC KEY-----`

/** The signed portion of a license — everything the signature commits to. */
export interface LicensePayload {
  /** Payload schema version, for forward compatibility. */
  v: 1
  /** Permanent School ID this license is issued to. */
  schoolId: string
  /** Device ID this license is bound to (non-transferable). */
  deviceId: string
  /** ISO date the license was issued. */
  issuedAt: string
  /** ISO date the license expires (an end-of-February date). */
  expiresAt: string
}

/**
 * An activation code is `base64url(payloadJSON).base64url(signature)`.
 * Verifies the Ed25519 signature against the embedded public key and returns
 * the payload, or null if the code is malformed or the signature is invalid.
 * Never contacts the network.
 */
export function verifyActivationCode(code: string): LicensePayload | null {
  if (!code) return null
  const trimmed = code.trim().replace(/\s+/g, '')
  const dot = trimmed.indexOf('.')
  if (dot <= 0) return null

  const bodyB64 = trimmed.slice(0, dot)
  const sigB64 = trimmed.slice(dot + 1)
  if (!bodyB64 || !sigB64) return null

  let bodyBuf: Buffer
  let sigBuf: Buffer
  try {
    bodyBuf = Buffer.from(bodyB64, 'base64url')
    sigBuf = Buffer.from(sigB64, 'base64url')
  } catch {
    return null
  }

  let ok = false
  try {
    ok = crypto.verify(null, bodyBuf, LICENSE_PUBLIC_KEY_PEM, sigBuf)
  } catch {
    return null
  }
  if (!ok) return null

  try {
    const payload = JSON.parse(bodyBuf.toString('utf-8')) as LicensePayload
    if (payload.v !== 1) return null
    if (!payload.schoolId || !payload.deviceId || !payload.issuedAt || !payload.expiresAt) return null
    return payload
  } catch {
    return null
  }
}
