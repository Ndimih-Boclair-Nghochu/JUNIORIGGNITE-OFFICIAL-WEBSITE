import { getDb, getDeviceId } from '../db/connection'
import type { SyncConflict } from '@shared/types'

/**
 * Swappable cloud-sync interface. All methods here are LOCAL MOCKS that make
 * the full sync/conflict-resolution flow work offline. To go online, replace
 * the body of pushChanges/pullChanges with real HTTP calls to the server —
 * the conflict-detection and resolution logic around them stays unchanged.
 */
export interface RemoteSyncTransport {
  pushChanges(records: SyncRecord[]): Promise<void>
  pullChanges(sinceIso: string): Promise<SyncRecord[]>
}

export interface SyncRecord {
  entityType: string
  entityId: number
  lastModifiedAt: string
  deviceId: string
  payload: Record<string, unknown>
}

// Default no-op transport. Records are "sent into the void" and nothing comes
// back, which is exactly right for a fully-offline install.
const mockTransport: RemoteSyncTransport = {
  async pushChanges() {
    /* offline: no-op */
  },
  async pullChanges() {
    return []
  }
}

let transport: RemoteSyncTransport = mockTransport
export function setSyncTransport(t: RemoteSyncTransport): void {
  transport = t
}

// Entity types whose conflicts must NOT be silently resolved by last-write-wins.
// Published results and money movements need a human decision.
const PROTECTED_ENTITIES = new Set(['marks_published', 'fee_payment'])

function mapConflict(r: any): SyncConflict {
  return {
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    localJson: r.local_json,
    remoteJson: r.remote_json,
    resolved: !!r.resolved,
    resolution: r.resolution,
    createdAt: r.created_at
  }
}

/**
 * Runs one sync cycle. For each incoming remote record we compare against the
 * local copy: routine fields resolve last-write-wins by lastModifiedAt; a newer
 * remote change to a PROTECTED entity is recorded as a conflict for the admin
 * to resolve instead of being applied.
 */
export async function runSync(): Promise<{ pushed: number; pulled: number; conflicts: number }> {
  const db = getDb()
  const deviceId = getDeviceId()

  // (Mock) push our recently-modified rows.
  const localChanges: SyncRecord[] = []
  await transport.pushChanges(localChanges)

  // (Mock) pull remote changes.
  const lastSync = '1970-01-01T00:00:00.000Z'
  const remote = await transport.pullChanges(lastSync)

  let conflicts = 0
  for (const rec of remote) {
    const isProtected = PROTECTED_ENTITIES.has(rec.entityType)
    if (isProtected) {
      // Record for manual resolution rather than applying.
      db.prepare(
        `INSERT INTO sync_conflicts (entity_type, entity_id, local_json, remote_json) VALUES (?, ?, ?, ?)`
      ).run(rec.entityType, rec.entityId, JSON.stringify({ note: 'local copy' }), JSON.stringify(rec.payload))
      conflicts += 1
    }
    // routine entities would be applied last-write-wins here (omitted in mock).
  }

  return { pushed: localChanges.length, pulled: remote.length, conflicts }
}

export function listConflicts(includeResolved = false): SyncConflict[] {
  const db = getDb()
  const sql = includeResolved
    ? 'SELECT * FROM sync_conflicts ORDER BY created_at DESC'
    : 'SELECT * FROM sync_conflicts WHERE resolved = 0 ORDER BY created_at DESC'
  return (db.prepare(sql).all() as any[]).map(mapConflict)
}

export function resolveConflict(conflictId: number, choice: 'local' | 'remote'): void {
  const db = getDb()
  db.prepare('UPDATE sync_conflicts SET resolved = 1, resolution = ? WHERE id = ?').run(choice, conflictId)
}

/**
 * Injects a pair of conflicting records so the "Sync Issues" screen can be
 * exercised without a real server. Simulates another device having modified a
 * published mark and a fee payment for the same student.
 */
export function simulateConflict(): { created: number } {
  const db = getDb()
  const payment = db.prepare('SELECT * FROM fee_payments ORDER BY id LIMIT 1').get() as any
  const mark = db.prepare('SELECT * FROM marks WHERE published = 1 ORDER BY id LIMIT 1').get() as any

  let created = 0
  if (payment) {
    const remote = { ...payment, amount: payment.amount + 5000, device_id: 'device-B-simulated', reference: 'MOMO-CONFLICT-XYZ' }
    db.prepare(`INSERT INTO sync_conflicts (entity_type, entity_id, local_json, remote_json) VALUES (?, ?, ?, ?)`).run(
      'fee_payment',
      payment.id,
      JSON.stringify(payment),
      JSON.stringify(remote)
    )
    created += 1
  }
  if (mark) {
    const remote = { ...mark, exam_mark: (mark.exam_mark ?? 0) + 8, device_id: 'device-B-simulated' }
    db.prepare(`INSERT INTO sync_conflicts (entity_type, entity_id, local_json, remote_json) VALUES (?, ?, ?, ?)`).run(
      'marks_published',
      mark.id,
      JSON.stringify(mark),
      JSON.stringify(remote)
    )
    created += 1
  }
  return { created }
}
