import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

const SALT_ROUNDS = 10

export async function hashSecret(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

export async function verifySecret(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/** Generates a human-typeable class access code, e.g. "482913". */
export function generateAccessCode(): string {
  const n = crypto.randomInt(0, 1_000_000)
  return n.toString().padStart(6, '0')
}
