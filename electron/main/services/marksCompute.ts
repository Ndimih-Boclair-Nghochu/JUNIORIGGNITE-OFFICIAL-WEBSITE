import type Database from 'better-sqlite3-multiple-ciphers'
import type { SubjectResult, StudentResult } from '@shared/types'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** 0-20 Cameroon primary-school grading bands. */
export function gradeForScore(score: number | null): { grade: string; remark: string } {
  if (score === null) return { grade: '-', remark: 'Not graded' }
  if (score >= 18) return { grade: 'A+', remark: 'Excellent' }
  if (score >= 16) return { grade: 'A', remark: 'Very Good' }
  if (score >= 14) return { grade: 'B', remark: 'Good' }
  if (score >= 12) return { grade: 'C', remark: 'Fairly Good' }
  if (score >= 10) return { grade: 'D', remark: 'Average' }
  return { grade: 'E', remark: 'Below Average' }
}

/**
 * Computes subject averages/positions and overall average/rank for every
 * active student in a class for a given term. Pure read-only computation —
 * nothing is persisted here (report cards/marks screens call this on demand).
 */
export function computeClassResults(db: Database.Database, classId: number, termId: number): StudentResult[] {
  const students = db
    .prepare(`SELECT id, first_name, last_name FROM students WHERE class_id = ? AND status IN ('active','repeating') ORDER BY last_name, first_name`)
    .all(classId) as { id: number; first_name: string; last_name: string }[]

  const classSubjects = db
    .prepare(
      `SELECT cs.subject_id, sub.name as subject_name, cs.coefficient FROM class_subjects cs
       JOIN subjects sub ON sub.id = cs.subject_id WHERE cs.class_id = ?`
    )
    .all(classId) as { subject_id: number; subject_name: string; coefficient: number }[]

  const markRows = db
    .prepare(`SELECT student_id, subject_id, ca_mark, exam_mark FROM marks WHERE class_id = ? AND term_id = ?`)
    .all(classId, termId) as { student_id: number; subject_id: number; ca_mark: number | null; exam_mark: number | null }[]

  const markMap = new Map<string, { ca: number | null; exam: number | null }>()
  for (const m of markRows) {
    markMap.set(`${m.student_id}:${m.subject_id}`, { ca: m.ca_mark, exam: m.exam_mark })
  }

  // subjectId -> list of { studentId, average }
  const subjectAverages = new Map<number, { studentId: number; average: number }[]>()

  const perStudentSubjects = new Map<number, SubjectResult[]>()

  for (const student of students) {
    const subjectResults: SubjectResult[] = []
    for (const cs of classSubjects) {
      const mark = markMap.get(`${student.id}:${cs.subject_id}`)
      const ca = mark?.ca ?? null
      const exam = mark?.exam ?? null
      let average: number | null = null
      if (ca !== null && exam !== null) average = round2((ca + exam) / 2)
      else if (ca !== null) average = ca
      else if (exam !== null) average = exam

      subjectResults.push({
        subjectId: cs.subject_id,
        subjectName: cs.subject_name,
        coefficient: cs.coefficient,
        caMark: ca,
        examMark: exam,
        average,
        position: null,
        classSize: students.length
      })

      if (average !== null) {
        if (!subjectAverages.has(cs.subject_id)) subjectAverages.set(cs.subject_id, [])
        subjectAverages.get(cs.subject_id)!.push({ studentId: student.id, average })
      }
    }
    perStudentSubjects.set(student.id, subjectResults)
  }

  // Compute subject positions (dense rank, highest average = position 1)
  for (const [subjectId, list] of subjectAverages.entries()) {
    const sorted = [...list].sort((a, b) => b.average - a.average)
    const positionByStudent = new Map<number, number>()
    let lastAverage: number | null = null
    let lastPosition = 0
    let rankCounter = 0
    for (const entry of sorted) {
      rankCounter += 1
      if (lastAverage === null || entry.average < lastAverage) {
        lastPosition = rankCounter
        lastAverage = entry.average
      }
      positionByStudent.set(entry.studentId, lastPosition)
    }
    for (const student of students) {
      const subjectResults = perStudentSubjects.get(student.id)!
      const sr = subjectResults.find((s) => s.subjectId === subjectId)
      if (sr) sr.position = positionByStudent.get(student.id) ?? null
    }
  }

  // Overall averages (coefficient-weighted) + class rank
  const overallByStudent = new Map<number, number | null>()
  for (const student of students) {
    const subjectResults = perStudentSubjects.get(student.id)!
    const graded = subjectResults.filter((s) => s.average !== null)
    if (graded.length === 0) {
      overallByStudent.set(student.id, null)
      continue
    }
    const totalCoef = graded.reduce((sum, s) => sum + s.coefficient, 0)
    const weighted = graded.reduce((sum, s) => sum + s.average! * s.coefficient, 0)
    overallByStudent.set(student.id, totalCoef > 0 ? round2(weighted / totalCoef) : null)
  }

  const rankable = students
    .map((s) => ({ studentId: s.id, average: overallByStudent.get(s.id) }))
    .filter((r): r is { studentId: number; average: number } => r.average !== null)
    .sort((a, b) => b.average - a.average)

  const rankByStudent = new Map<number, number>()
  {
    let lastAverage: number | null = null
    let lastPosition = 0
    let rankCounter = 0
    for (const entry of rankable) {
      rankCounter += 1
      if (lastAverage === null || entry.average < lastAverage) {
        lastPosition = rankCounter
        lastAverage = entry.average
      }
      rankByStudent.set(entry.studentId, lastPosition)
    }
  }

  return students.map((student) => {
    const overallAverage = overallByStudent.get(student.id) ?? null
    const { grade, remark } = gradeForScore(overallAverage)
    return {
      studentId: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      subjectResults: perStudentSubjects.get(student.id)!,
      overallAverage,
      overallRank: rankByStudent.get(student.id) ?? null,
      grade,
      remark
    }
  })
}
