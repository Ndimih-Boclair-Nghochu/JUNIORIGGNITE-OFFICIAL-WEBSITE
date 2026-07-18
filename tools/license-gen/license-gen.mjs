#!/usr/bin/env node
// ---------------------------------------------------------------------------
// JuniorIgnite offline license generator (ELIGNITE-only tool)
//
// Signs activation codes with the Ed25519 PRIVATE key. This tool and its
// private key MUST stay with ELIGNITE and never ship inside the app — the app
// carries only the matching PUBLIC key and verifies codes offline.
//
// Usage:
//   node license-gen.mjs keygen
//       Generate a fresh key pair into ./keys and print the PUBLIC key to paste
//       into electron/main/services/licensing/crypto.ts (LICENSE_PUBLIC_KEY_PEM).
//
//   node license-gen.mjs issue --school JI-4F9A-2C7B --device <deviceId> [--until YYYY-MM-DD] [--out school.lic]
//       Sign an activation code bound to that School ID + Device ID. Without
//       --until, it runs to the next end-of-February (the annual deadline).
//
// The private key is read from $JUNIORIGNITE_LICENSE_KEY or ./keys/license-private.pem.
// ---------------------------------------------------------------------------
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const KEYS_DIR = path.join(__dirname, 'keys')
const PRIV_PATH = process.env.JUNIORIGNITE_LICENSE_KEY || path.join(KEYS_DIR, 'license-private.pem')
const PUB_PATH = path.join(KEYS_DIR, 'license-public.pem')

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2)
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'
      args[key] = val
    }
  }
  return args
}

function lastDayOfFebruary(year) {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  return leap ? 29 : 28
}

/** Next end-of-February (23:59:59.999 local) on/after `from`. */
function endOfFebruaryDeadline(from = new Date()) {
  const year = from.getFullYear()
  const thisYear = new Date(year, 1, lastDayOfFebruary(year), 23, 59, 59, 999)
  if (from.getTime() <= thisYear.getTime()) return thisYear
  const next = year + 1
  return new Date(next, 1, lastDayOfFebruary(next), 23, 59, 59, 999)
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64url')
}

function keygen() {
  fs.mkdirSync(KEYS_DIR, { recursive: true })
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  const pub = publicKey.export({ type: 'spki', format: 'pem' })
  const priv = privateKey.export({ type: 'pkcs8', format: 'pem' })
  fs.writeFileSync(PUB_PATH, pub)
  fs.writeFileSync(PRIV_PATH, priv, { mode: 0o600 })
  console.log('Key pair written to ./keys (keep license-private.pem SECRET — never commit or ship it).\n')
  console.log('Paste this PUBLIC key into electron/main/services/licensing/crypto.ts → LICENSE_PUBLIC_KEY_PEM:\n')
  console.log(pub)
}

function issue(args) {
  const schoolId = args.school
  const deviceId = args.device
  if (!schoolId || !deviceId) {
    console.error('Error: --school <SchoolID> and --device <DeviceID> are required.')
    process.exit(1)
  }
  if (!fs.existsSync(PRIV_PATH)) {
    console.error(`Error: private key not found at ${PRIV_PATH}. Run "node license-gen.mjs keygen" first.`)
    process.exit(1)
  }

  const expiresDate = args.until ? new Date(`${args.until}T23:59:59.999`) : endOfFebruaryDeadline()
  if (Number.isNaN(expiresDate.getTime())) {
    console.error('Error: --until must be a valid date (YYYY-MM-DD).')
    process.exit(1)
  }

  const payload = {
    v: 1,
    schoolId,
    deviceId,
    issuedAt: new Date().toISOString(),
    expiresAt: expiresDate.toISOString()
  }

  const privateKey = crypto.createPrivateKey(fs.readFileSync(PRIV_PATH))
  const bodyBuf = Buffer.from(JSON.stringify(payload))
  const sig = crypto.sign(null, bodyBuf, privateKey)
  const code = `${base64url(bodyBuf)}.${base64url(sig)}`

  console.log('\n=== JuniorIgnite Activation Code ===')
  console.log(`School ID : ${schoolId}`)
  console.log(`Device ID : ${deviceId}`)
  console.log(`Valid until: ${expiresDate.toDateString()}`)
  console.log('\nActivation code (send this to the school):\n')
  console.log(code)

  if (args.out) {
    fs.writeFileSync(args.out, code)
    console.log(`\nAlso written to ${args.out}`)
  }
}

const [cmd, ...rest] = process.argv.slice(2)
const args = parseArgs(rest)

if (cmd === 'keygen') keygen()
else if (cmd === 'issue') issue(args)
else {
  console.log('JuniorIgnite license generator\n')
  console.log('Commands:')
  console.log('  keygen                                   generate a new signing key pair')
  console.log('  issue --school <id> --device <id>        sign an activation code')
  console.log('        [--until YYYY-MM-DD] [--out file]  (defaults to next end-of-February)')
}
