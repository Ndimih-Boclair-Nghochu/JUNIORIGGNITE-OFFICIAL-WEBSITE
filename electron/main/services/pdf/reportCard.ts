import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type Database from 'better-sqlite3-multiple-ciphers'
import { computeClassResults, gradeForScore } from '../marksCompute'
import { termsFor } from './i18n'
import { embedImageFile, embedQrCode, savePdf } from './helpers'
import type { Subsystem } from '@shared/types'

const BRAND = rgb(0.08, 0.52, 0.34)
const INK = rgb(0.11, 0.16, 0.23)
const MUTED = rgb(0.45, 0.5, 0.58)
const LINE = rgb(0.82, 0.85, 0.88)

/**
 * Generates a single-student report card PDF for a term, localised by the
 * class's subsystem. Marks must have been computed (this reuses the same
 * computeClassResults used by the marks screen so numbers always match).
 */
export async function generateReportCard(
  db: Database.Database,
  studentId: number,
  termId: number
): Promise<string> {
  const student = db
    .prepare(
      `SELECT s.*, c.name as class_name, c.subsystem, c.id as class_id FROM students s
       JOIN classes c ON c.id = s.class_id WHERE s.id = ?`
    )
    .get(studentId) as any
  if (!student) throw new Error('Student not found.')

  const school = db.prepare('SELECT * FROM schools WHERE id = 1').get() as any
  const term = db.prepare('SELECT t.*, ay.label as year_label FROM terms t JOIN academic_years ay ON ay.id = t.academic_year_id WHERE t.id = ?').get(termId) as any
  const subsystem: Subsystem = student.subsystem
  const T = termsFor(subsystem)

  const classResults = computeClassResults(db, student.class_id, termId)
  const result = classResults.find((r) => r.studentId === studentId)
  if (!result) throw new Error('No results for this student.')

  // Attendance summary for this student
  const att = db
    .prepare(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present FROM attendance WHERE student_id = ?`
    )
    .get(studentId) as { total: number; present: number }
  const attendancePct = att.total > 0 ? Math.round(((att.present ?? 0) / att.total) * 100) : null

  const meta = db.prepare('SELECT * FROM report_card_meta WHERE student_id = ? AND term_id = ?').get(studentId, termId) as any

  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4 portrait
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()
  const margin = 40

  const logo = await embedImageFile(doc, school?.logo_path ?? null)
  const photo = await embedImageFile(doc, student.photo_path ?? null)

  let y = height - margin

  // Header band
  page.drawRectangle({ x: 0, y: height - 110, width, height: 110, color: rgb(0.96, 0.98, 0.97) })
  if (logo) {
    const dims = logo.scaleToFit(64, 64)
    page.drawImage(logo, { x: margin, y: height - 92, width: dims.width, height: dims.height })
  }
  page.drawText((school?.name ?? 'School').toUpperCase(), { x: margin + 78, y: height - 48, size: 16, font: bold, color: BRAND })
  if (school?.motto) page.drawText(school.motto, { x: margin + 78, y: height - 66, size: 9, font, color: MUTED })
  const addr = [school?.address, school?.phone].filter(Boolean).join(' · ')
  if (addr) page.drawText(addr, { x: margin + 78, y: height - 80, size: 8, font, color: MUTED })

  y = height - 132
  page.drawText(T.reportCardTitle, { x: margin, y, size: 13, font: bold, color: INK })
  page.drawText(`${T.term}: ${term?.name ?? ''}   ${T.academicYear}: ${term?.year_label ?? ''}`, {
    x: width - margin - 230,
    y,
    size: 9,
    font,
    color: MUTED
  })

  y -= 24
  // Student info box
  const infoTop = y
  page.drawRectangle({ x: margin, y: y - 76, width: width - margin * 2, height: 76, borderColor: LINE, borderWidth: 1, color: rgb(1, 1, 1) })
  if (photo) {
    const dims = photo.scaleToFit(58, 68)
    page.drawImage(photo, { x: width - margin - 70, y: y - 72, width: dims.width, height: dims.height })
  }
  const infoX = margin + 12
  const infoRows: [string, string][] = [
    [T.studentName, `${student.first_name} ${student.last_name}`],
    [T.admissionNo, student.admission_no],
    [T.className, student.class_name]
  ]
  let iy = infoTop - 16
  for (const [label, value] of infoRows) {
    page.drawText(`${label}:`, { x: infoX, y: iy, size: 9, font, color: MUTED })
    page.drawText(value, { x: infoX + 100, y: iy, size: 10, font: bold, color: INK })
    iy -= 20
  }

  y -= 96

  // Marks table
  const cols = [
    { key: 'subject', label: T.subject, x: margin + 6, w: 170, align: 'left' as const },
    { key: 'ca', label: T.ca, x: margin + 182, w: 45, align: 'center' as const },
    { key: 'exam', label: T.exam, x: margin + 227, w: 45, align: 'center' as const },
    { key: 'avg', label: T.average, x: margin + 272, w: 55, align: 'center' as const },
    { key: 'coef', label: T.coefficient, x: margin + 327, w: 45, align: 'center' as const },
    { key: 'pos', label: T.position, x: margin + 372, w: 50, align: 'center' as const },
    { key: 'grade', label: T.grade, x: margin + 422, w: 45, align: 'center' as const },
    { key: 'remark', label: T.remark, x: margin + 467, w: 48, align: 'left' as const }
  ]
  const tableWidth = width - margin * 2
  const rowHeight = 20

  // header row
  page.drawRectangle({ x: margin, y: y - rowHeight, width: tableWidth, height: rowHeight, color: BRAND })
  for (const col of cols) {
    page.drawText(col.label, { x: col.x, y: y - 14, size: 8, font: bold, color: rgb(1, 1, 1) })
  }
  y -= rowHeight

  for (const s of result.subjectResults) {
    const { grade, remark } = gradeForScore(s.average)
    page.drawRectangle({ x: margin, y: y - rowHeight, width: tableWidth, height: rowHeight, borderColor: LINE, borderWidth: 0.5 })
    const cells: Record<string, string> = {
      subject: s.subjectName,
      ca: s.caMark !== null ? String(s.caMark) : '-',
      exam: s.examMark !== null ? String(s.examMark) : '-',
      avg: s.average !== null ? s.average.toFixed(2) : '-',
      coef: String(s.coefficient),
      pos: s.position !== null ? `${s.position}` : '-',
      grade,
      remark
    }
    for (const col of cols) {
      const text = cells[col.key] ?? ''
      const size = col.key === 'remark' ? 7 : 8
      let tx = col.x
      if (col.align === 'center') {
        const tw = font.widthOfTextAtSize(text, size)
        tx = col.x + col.w / 2 - tw / 2 - 3
      }
      page.drawText(text, { x: tx, y: y - 14, size, font, color: INK })
    }
    y -= rowHeight
  }

  // Summary row
  y -= 10
  const summaryItems: [string, string][] = [
    [T.overallAverage, result.overallAverage !== null ? `${result.overallAverage.toFixed(2)} / 20` : '-'],
    [T.rank, result.overallRank !== null ? `${result.overallRank} / ${result.subjectResults[0]?.classSize ?? '-'}` : '-'],
    [T.grade, result.grade],
    [T.attendance, attendancePct !== null ? `${attendancePct}%` : '-']
  ]
  const boxW = (tableWidth - 18) / 4
  summaryItems.forEach(([label, value], i) => {
    const bx = margin + i * (boxW + 6)
    page.drawRectangle({ x: bx, y: y - 44, width: boxW, height: 44, color: rgb(0.96, 0.98, 0.97), borderColor: LINE, borderWidth: 0.5 })
    page.drawText(label, { x: bx + 8, y: y - 16, size: 7, font, color: MUTED })
    page.drawText(value, { x: bx + 8, y: y - 34, size: 12, font: bold, color: BRAND })
  })
  y -= 60

  // Conduct + comments
  const drawCommentBlock = (label: string, value: string): void => {
    page.drawText(label, { x: margin, y, size: 9, font: bold, color: INK })
    y -= 14
    page.drawRectangle({ x: margin, y: y - 24, width: tableWidth, height: 24, borderColor: LINE, borderWidth: 0.5 })
    page.drawText(value || '-', { x: margin + 8, y: y - 16, size: 9, font, color: INK })
    y -= 36
  }
  drawCommentBlock(T.conduct, meta?.conduct ?? '')
  drawCommentBlock(T.teacherComment, meta?.teacher_comment ?? '')
  drawCommentBlock(T.headTeacherComment, meta?.head_teacher_comment ?? '')

  // Promotion decision
  const decision = meta?.promotion_decision ?? 'pending'
  const decisionLabel = decision === 'promoted' ? T.promoted : decision === 'repeat' ? T.repeat : T.pending
  const decisionColor = decision === 'promoted' ? BRAND : decision === 'repeat' ? rgb(0.8, 0.2, 0.2) : MUTED
  page.drawText(`${T.promotionDecision}: `, { x: margin, y, size: 10, font: bold, color: INK })
  page.drawText(decisionLabel, { x: margin + 70, y, size: 11, font: bold, color: decisionColor })

  // QR verification + signatures
  const qr = await embedQrCode(doc, `JUNIORIGNITE|${student.admission_no}|${term?.name ?? ''}|${result.overallAverage ?? ''}`)
  page.drawImage(qr, { x: width - margin - 60, y: y - 50, width: 56, height: 56 })

  y -= 70
  page.drawLine({ start: { x: margin, y }, end: { x: margin + 150, y }, thickness: 0.5, color: LINE })
  page.drawText(T.classTeacher, { x: margin, y: y - 12, size: 8, font, color: MUTED })
  page.drawLine({ start: { x: margin + 200, y }, end: { x: margin + 350, y }, thickness: 0.5, color: LINE })
  page.drawText(T.headTeacher, { x: margin + 200, y: y - 12, size: 8, font, color: MUTED })

  page.drawText('Generated by JuniorIgnite', { x: margin, y: 24, size: 7, font, color: MUTED })

  const bytes = await doc.save()
  return savePdf(`report-${student.admission_no}`, bytes)
}
