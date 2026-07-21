import type Database from 'better-sqlite3-multiple-ciphers'

/**
 * Initialises the academic session for a brand-new school.
 *
 * This deliberately creates NO sample content — no classes, teachers, students,
 * subjects, marks or fees. A school starts completely empty and the
 * administrator enters their own data. Only the academic calendar is created,
 * because marks, fees and report cards are all keyed to a term and the app
 * cannot function without a current year/term.
 *
 * Idempotent: no-ops if an academic year already exists.
 */
export function initialiseAcademicSession(db: Database.Database): void {
  const existing = db.prepare('SELECT COUNT(*) as c FROM academic_years').get() as { c: number }
  if (existing.c > 0) return

  const yearId = db
    .prepare(`INSERT INTO academic_years (label, is_current) VALUES (?, 1)`)
    .run(currentAcademicYearLabel()).lastInsertRowid as number

  const insertTerm = db.prepare(
    `INSERT INTO terms (academic_year_id, name, cycle, order_index, is_current) VALUES (?, ?, ?, ?, ?)`
  )
  const term1Id = insertTerm.run(yearId, 'First Term', 'first', 1, 1).lastInsertRowid as number
  insertTerm.run(yearId, 'Second Term', 'first', 2, 0)
  insertTerm.run(yearId, 'Third Term', 'second', 3, 0)

  db.prepare(`UPDATE schools SET current_academic_year_id = ?, current_term_id = ? WHERE id = 1`).run(yearId, term1Id)
}

/**
 * The Cameroonian school year runs September→July, so anything from September
 * onwards belongs to the year that starts now; earlier months belong to the
 * year that started last September.
 */
function currentAcademicYearLabel(): string {
  const now = new Date()
  const y = now.getFullYear()
  const start = now.getMonth() >= 8 ? y : y - 1 // month is 0-based; 8 = September
  return `${start}/${start + 1}`
}
