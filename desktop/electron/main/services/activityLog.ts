import { getDb } from '../db/connection'
import type { ActivityLogEntry, ActorType } from '@shared/types'

export function logActivity(params: {
  actorType: ActorType
  actorLabel: string
  action: string
  entityType?: string
  entityId?: number
  details?: string
}): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO activity_log (actor_type, actor_label, action, entity_type, entity_id, details)
     VALUES (@actorType, @actorLabel, @action, @entityType, @entityId, @details)`
  ).run({
    actorType: params.actorType,
    actorLabel: params.actorLabel,
    action: params.action,
    entityType: params.entityType ?? null,
    entityId: params.entityId ?? null,
    details: params.details ?? null
  })
}

export function listActivity(limit = 50): ActivityLogEntry[] {
  const db = getDb()
  const rows = db
    .prepare(`SELECT * FROM activity_log ORDER BY created_at DESC, id DESC LIMIT ?`)
    .all(limit) as any[]
  return rows.map((r) => ({
    id: r.id,
    actorType: r.actor_type,
    actorLabel: r.actor_label,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    details: r.details,
    createdAt: r.created_at
  }))
}
