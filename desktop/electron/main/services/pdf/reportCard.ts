import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib'
import type Database from 'better-sqlite3-multiple-ciphers'
import { computeClassResults } from '../marksCompute'
import { embedImageFile, savePdf } from './helpers'

// Palette taken from the approved report-card design.
const INK = rgb(0.059, 0.09, 0.165) // #0f172a
const SLATE = rgb(0.2, 0.255, 0.333) // #334155
const MUTED = rgb(0.392, 0.455, 0.545) // #64748b
const GREEN = rgb(0.086, 0.502, 0.239) // #15803d
const RED = rgb(0.72, 0.11, 0.11)
const BORDER = rgb(0.804, 0.839, 0.882) // #cbd5e1
const HEAD_BG = rgb(0.945, 0.961, 0.976) // #f1f5f9
const BOX_BG = rgb(0.973, 0.98, 0.988) // #f8fafc

const PASS_MARK = 10

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th", 11 → "11th" … */
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

const fmt2 = (n: number): string => n.toFixed(2)

/**
 * Generates a pupil's terminal report card (A5 portrait) matching the official
 * JuniorIgnite design: bilingual Cameroon header, marks table with
 * TEST/EXAMS/COEF/AVERAGE/COEF*AVRG/STATUS, totals, grading legend, terminal
 * summary, an annual academic summary on the final term, and signature lines.
 *
 * Arithmetic (verified against the approved design):
 *   average    = (test + exams) / 2
 *   coef*avrg  = average × coefficient
 *   terminal   = Σ(coef*avrg) / Σ(coefficient)
 *   annual     = mean of the academic year's terminal averages
 */
export async function generateReportCard(
  db: Database.Database,
  studentId: number,
  termId: number
): Promise<string> {
  const student = db
    .prepare(
      `SELECT s.*, c.name as class_name, c.subsystem, c.id as class_id, c.class_teacher_id FROM students s
       JOIN classes c ON c.id = s.class_id WHERE s.id = ?`
    )
    .get(studentId) as any
  if (!student) throw new Error('Student not found.')

  const school = db.prepare('SELECT * FROM schools WHERE id = 1').get() as any
  const term = db
    .prepare(
      'SELECT t.*, ay.label as year_label, ay.id as year_id FROM terms t JOIN academic_years ay ON ay.id = t.academic_year_id WHERE t.id = ?'
    )
    .get(termId) as any

  const classResults = computeClassResults(db, student.class_id, termId)
  const result = classResults.find((r) => r.studentId === studentId)
  if (!result) throw new Error('No results for this student.')

  const meta = db.prepare('SELECT * FROM report_card_meta WHERE student_id = ? AND term_id = ?').get(studentId, termId) as any

  const daysAbsent = (
    db.prepare("SELECT COUNT(*) as n FROM attendance WHERE student_id = ? AND status = 'absent'").get(studentId) as {
      n: number
    }
  ).n

  const classTeacher = student.class_teacher_id
    ? (db.prepare('SELECT first_name, last_name FROM teachers WHERE id = ?').get(student.class_teacher_id) as
        | { first_name: string; last_name: string }
        | undefined)
    : undefined
  const classTeacherName = classTeacher ? `${classTeacher.first_name} ${classTeacher.last_name}` : ''
  const principalName: string = school?.principal_name ?? ''

  // ---- Totals (only graded subjects count toward the terminal average) ----
  const graded = result.subjectResults.filter((s) => s.average !== null)
  const totalCoef = graded.reduce((sum, s) => sum + s.coefficient, 0)
  const totalCoefAvg = graded.reduce((sum, s) => sum + Math.round(s.average! * s.coefficient * 100) / 100, 0)
  const terminalAverage = result.overallAverage
  const roll = result.subjectResults[0]?.classSize ?? classResults.length

  // ---- Annual summary (final term of the academic year only) ----
  const yearTerms = db
    .prepare('SELECT id, name, order_index FROM terms WHERE academic_year_id = ? ORDER BY order_index')
    .all(term?.year_id) as { id: number; name: string; order_index: number }[]
  const isFinalTerm = yearTerms.length > 1 && yearTerms[yearTerms.length - 1]?.id === termId

  let termAverages: (number | null)[] = []
  let annualAverage: number | null = null
  if (isFinalTerm) {
    termAverages = yearTerms.map((t) => {
      if (t.id === termId) return terminalAverage
      const res = computeClassResults(db, student.class_id, t.id).find((r) => r.studentId === studentId)
      return res?.overallAverage ?? null
    })
    const present = termAverages.filter((a): a is number => a !== null)
    if (present.length > 0) {
      annualAverage = Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 100) / 100
    }
  }

  const decisionRaw: string | null = meta?.promotion_decision ?? null
  const finalDecision =
    decisionRaw === 'promoted'
      ? 'PROMOTED'
      : decisionRaw === 'repeat'
        ? 'REPEATED'
        : annualAverage !== null && annualAverage >= PASS_MARK
          ? 'PROMOTED'
          : annualAverage !== null
            ? 'REPEATED'
            : '—'

  // ---------------------------------------------------------------- document
  const doc = await PDFDocument.create()
  const page: PDFPage = doc.addPage([420, 595]) // A5 portrait
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const boldItalic = await doc.embedFont(StandardFonts.HelveticaBoldOblique)
  const { width, height } = page.getSize()
  const M = 20
  const CW = width - M * 2 // content width = 380

  const logo = await embedImageFile(doc, school?.logo_path ?? null)

  const w = (t: string, s: number, f: PDFFont = font): number => f.widthOfTextAtSize(t, s)
  const text = (t: string, x: number, y: number, s: number, f: PDFFont = font, color = INK): void => {
    page.drawText(t, { x, y, size: s, font: f, color })
  }
  const center = (t: string, cx: number, y: number, s: number, f: PDFFont = font, color = INK): void =>
    text(t, cx - w(t, s, f) / 2, y, s, f, color)
  const right = (t: string, rx: number, y: number, s: number, f: PDFFont = font, color = INK): void =>
    text(t, rx - w(t, s, f), y, s, f, color)
  const wrap = (t: string, maxW: number, s: number, f: PDFFont = font): string[] => {
    const words = String(t).split(/\s+/)
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (w(test, s, f) > maxW && line) {
        lines.push(line)
        line = word
      } else line = test
    }
    if (line) lines.push(line)
    return lines
  }
  const hLine = (x1: number, x2: number, y: number, color = BORDER, thickness = 0.6): void =>
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color })
  const vLine = (x: number, y1: number, y2: number, color = BORDER, thickness = 0.6): void =>
    page.drawLine({ start: { x, y: y1 }, end: { x, y: y2 }, thickness, color })
  const dotted = (x1: number, x2: number, y: number): void =>
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.5, color: BORDER, dashArray: [1, 1.4] })

  let y = height - 24

  // ======================= bilingual government header =======================
  text('REPUBLIC OF CAMEROON', M, y, 6.2, bold, INK)
  text('Peace - Work - Fatherland', M, y - 8.5, 5.6, italic, SLATE)
  text('MINISTRY OF BASIC', M, y - 19, 6.2, bold, INK)
  text('EDUCATION', M, y - 27, 6.2, bold, INK)

  right('RÉPUBLIQUE DU CAMEROUN', width - M, y, 6.2, bold, INK)
  right('Paix - Travail - Patrie', width - M, y - 8.5, 5.6, italic, SLATE)
  right("MINISTÈRE DE L'ÉDUCATION DE", width - M, y - 19, 6.2, bold, INK)
  right('BASE', width - M, y - 27, 6.2, bold, INK)

  // Centre emblem — the national mark (medal), always drawn.
  const ecx = width / 2
  const ecy = y - 12
  page.drawCircle({ x: ecx, y: ecy, size: 16, borderColor: INK, borderWidth: 1.4, color: rgb(1, 1, 1) })
  page.drawCircle({ x: ecx, y: ecy + 3, size: 6, borderColor: INK, borderWidth: 1.2 })
  page.drawLine({ start: { x: ecx - 3.5, y: ecy - 2 }, end: { x: ecx - 2, y: ecy - 9 }, thickness: 1.2, color: INK })
  page.drawLine({ start: { x: ecx + 3.5, y: ecy - 2 }, end: { x: ecx + 2, y: ecy - 9 }, thickness: 1.2, color: INK })

  y -= 44

  // ============================== school identity =============================
  // The school's own logo is centred directly above its name.
  const schoolName = String(school?.name ?? 'School').toUpperCase()
  if (logo) {
    const d = logo.scaleToFit(44, 44) // aspect preserved — never stretched
    page.drawImage(logo, { x: width / 2 - d.width / 2, y: y - d.height, width: d.width, height: d.height })
    y -= d.height + 8
  }

  // With the logo above the name, the name can use the full content width.
  const nameMaxW = CW
  let nameSize = 15
  while (w(schoolName, nameSize, bold) > nameMaxW && nameSize > 9) nameSize -= 0.5
  for (const line of wrap(schoolName, nameMaxW, nameSize, bold)) {
    center(line, width / 2, y, nameSize, bold, INK)
    y -= nameSize + 3
  }

  y -= 2

  const poParts = [school?.po_box ? `P.O. Box ${school.po_box}` : null, school?.village_town || school?.address || null].filter(
    Boolean
  )
  if (poParts.length) {
    center(poParts.join(', '), width / 2, y, 7, font, SLATE)
    y -= 10
  }

  hLine(M, width - M, y, INK, 2)
  y -= 18

  // ================================== title ==================================
  const title = "PUPIL'S TERMINAL REPORT CARD"
  center(title, width / 2, y, 10.5, bold, INK)
  hLine(width / 2 - w(title, 10.5, bold) / 2, width / 2 + w(title, 10.5, bold) / 2, y - 2.5, INK, 0.8)
  y -= 13
  center('Bulletin de Notes du Trimestre', width / 2, y, 8, boldItalic, SLATE)
  y -= 16

  // ============================== pupil info box ==============================
  const infoH = 54
  page.drawRectangle({ x: M, y: y - infoH, width: CW, height: infoH, color: BOX_BG, borderColor: BORDER, borderWidth: 0.8 })
  const pad = 10
  const labelSize = 7
  const valueSize = 8.2
  const field = (label: string, value: string, lx: number, ly: number, valueX: number, lineEnd: number): void => {
    text(label, lx, ly, labelSize, bold, SLATE)
    text(value || '—', valueX, ly, valueSize, bold, INK)
    dotted(valueX, lineEnd, ly - 3)
  }
  let iy = y - 16
  field('Name of Pupil:', `${student.first_name} ${student.last_name}`.toUpperCase(), M + pad, iy, M + pad + 78, width - M - pad)
  iy -= 17
  const halfX = M + CW / 2
  field('Class:', student.class_name ?? '', M + pad, iy, M + pad + 50, halfX - 12)
  field('Term:', term?.name ?? '', halfX, iy, halfX + 40, width - M - pad)
  iy -= 17
  field('Academic Year:', term?.year_label ?? '', M + pad, iy, M + pad + 78, halfX - 12)
  field('Roll:', String(roll), halfX, iy, halfX + 40, width - M - pad)
  y -= infoH + 12

  // ================================ marks table ===============================
  type Col = { x: number; w: number; lines: string[]; align: 'left' | 'center' }
  const cols: Col[] = [
    { x: M, w: 118, lines: ['SUBJECT'], align: 'left' },
    { x: M + 118, w: 40, lines: ['TEST', '(/20)'], align: 'center' },
    { x: M + 158, w: 42, lines: ['EXAMS', '(/20)'], align: 'center' },
    { x: M + 200, w: 32, lines: ['COEF'], align: 'center' },
    { x: M + 232, w: 48, lines: ['AVERAGE'], align: 'center' },
    { x: M + 280, w: 48, lines: ['COEF', '*AVRG'], align: 'center' },
    { x: M + 328, w: 52, lines: ['STATUS'], align: 'center' }
  ]
  const tableTop = y
  const headH = 21

  page.drawRectangle({ x: M, y: y - headH, width: CW, height: headH, color: HEAD_BG })
  for (const c of cols) {
    const s = 6
    if (c.lines.length === 1) {
      const ty = y - headH + (headH - s) / 2 + 1
      if (c.align === 'left') text(c.lines[0], c.x + 6, ty, s, bold, SLATE)
      else center(c.lines[0], c.x + c.w / 2, ty, s, bold, SLATE)
    } else {
      center(c.lines[0], c.x + c.w / 2, y - 8.5, s, bold, SLATE)
      center(c.lines[1], c.x + c.w / 2, y - 16, s, bold, SLATE)
    }
  }
  y -= headH

  for (const s of result.subjectResults) {
    const nameLines = wrap(s.subjectName, cols[0].w - 12, 7)
    const rowH = nameLines.length > 1 ? 21 : 16
    const bottom = y - rowH
    const passed = s.average !== null && s.average >= PASS_MARK
    const coefAvg = s.average !== null ? Math.round(s.average * s.coefficient * 100) / 100 : null

    // subject name (wraps to at most two lines, like the design)
    if (nameLines.length > 1) {
      text(nameLines[0], cols[0].x + 6, bottom + rowH - 8, 7, font, INK)
      text(nameLines[1], cols[0].x + 6, bottom + rowH - 15.5, 7, font, INK)
    } else {
      text(nameLines[0], cols[0].x + 6, bottom + (rowH - 7) / 2 + 1, 7, font, INK)
    }

    const cy = bottom + (rowH - 7) / 2 + 1
    const cell = (i: number, value: string, f: PDFFont = font, color = INK, size = 7): void =>
      center(value, cols[i].x + cols[i].w / 2, cy, size, f, color)

    cell(1, s.caMark !== null ? String(s.caMark) : '—', font, MUTED)
    cell(2, s.examMark !== null ? String(s.examMark) : '—', font, MUTED)
    cell(3, String(s.coefficient), font, INK)
    cell(4, s.average !== null ? fmt2(s.average) : '—', bold, INK)
    cell(5, coefAvg !== null ? fmt2(coefAvg) : '—', bold, INK)
    cell(6, s.average === null ? '—' : passed ? 'PASSED' : 'FAILED', bold, s.average === null ? MUTED : passed ? GREEN : RED, 6.5)

    hLine(M, width - M, bottom)
    y = bottom
  }

  // column separators across the subject rows
  for (let i = 1; i < cols.length; i++) vLine(cols[i].x, tableTop, y)

  // ---- TOTAL row (label merged across SUBJECT..EXAMS) ----
  const totalH = 17
  const totalBottom = y - totalH
  page.drawRectangle({ x: M, y: totalBottom, width: CW, height: totalH, color: HEAD_BG })
  const ty = totalBottom + (totalH - 7) / 2 + 1
  right('TOTAL:', cols[3].x - 8, ty, 7, bold, INK)
  center(String(totalCoef), cols[3].x + cols[3].w / 2, ty, 7, bold, INK)
  center(fmt2(totalCoefAvg), cols[5].x + cols[5].w / 2, ty, 7, bold, INK)
  for (const i of [3, 4, 5, 6]) vLine(cols[i].x, y, totalBottom)
  hLine(M, width - M, totalBottom)
  y = totalBottom

  // outer table border
  page.drawRectangle({ x: M, y, width: CW, height: tableTop - y, borderColor: BORDER, borderWidth: 0.8 })
  y -= 12

  // =============================== grading legend =============================
  const legend = ['0-9: Fail', '10-11: Pass', '12-13: Fairly Good', '14-15: Good', '16-17: Very Good', '18-20: Excellent']
  const legendSize = 5.6
  const legendTotal = legend.reduce((sum, l) => sum + w(l, legendSize, italic), 0)
  const gap = (CW - legendTotal) / (legend.length - 1)
  let lx = M
  for (const item of legend) {
    text(item, lx, y, legendSize, italic, MUTED)
    lx += w(item, legendSize, italic) + gap
  }
  y -= 14

  // ============================== summary boxes ===============================
  const boxGap = 10
  const boxW = (CW - boxGap) / 2
  const boxH = 66
  page.drawRectangle({ x: M, y: y - boxH, width: boxW, height: boxH, borderColor: BORDER, borderWidth: 0.8 })
  page.drawRectangle({ x: M + boxW + boxGap, y: y - boxH, width: boxW, height: boxH, borderColor: BORDER, borderWidth: 0.8 })

  // left: terminal average / result / position
  let ly2 = y - 18
  text('TERMINAL', M + 10, ly2 + 5, 7, bold, INK)
  text('AVERAGE:', M + 10, ly2 - 3, 7, bold, INK)
  right(terminalAverage !== null ? `${fmt2(terminalAverage)} / 20` : '—', M + boxW - 10, ly2 - 1, 12, bold, INK)
  ly2 -= 22
  text('OVERALL RESULT:', M + 10, ly2, 7, bold, INK)
  {
    const passed = terminalAverage !== null && terminalAverage >= PASS_MARK
    right(terminalAverage === null ? '—' : passed ? 'PASSED' : 'FAILED', M + boxW - 10, ly2 - 1, 10, bold, passed ? GREEN : RED)
  }
  ly2 -= 18
  text('CLASS POSITION:', M + 10, ly2, 7, bold, INK)
  right(result.overallRank !== null ? `${ordinal(result.overallRank)} out of ${roll}` : '—', M + boxW - 10, ly2, 8, bold, INK)

  // right: conduct / days absent
  const rbx = M + boxW + boxGap
  let ry = y - 18
  text('CONDUCT:', rbx + 10, ry, 7, bold, INK)
  right(meta?.conduct || '—', rbx + boxW - 10, ry, 8.5, font, INK)
  ry -= 20
  text('DAYS ABSENT:', rbx + 10, ry, 7, bold, INK)
  right(`${daysAbsent} ${daysAbsent === 1 ? 'Day' : 'Days'}`, rbx + boxW - 10, ry, 8.5, font, INK)

  y -= boxH + 12

  // ========================= annual summary (final term) ======================
  if (isFinalTerm) {
    const annH = 52
    page.drawRectangle({ x: M, y: y - annH, width: CW, height: annH, borderColor: BORDER, borderWidth: 0.8 })
    const at = 'ANNUAL ACADEMIC SUMMARY'
    center(at, width / 2, y - 12, 7.5, bold, INK)
    hLine(width / 2 - w(at, 7.5, bold) / 2, width / 2 + w(at, 7.5, bold) / 2, y - 14.5, INK, 0.7)

    const inX = M + 8
    const inW = CW - 16
    const nCols = 5
    const cw = inW / nCols
    const rowTop = y - 20
    const hh = 14
    const rh = 15

    page.drawRectangle({ x: inX, y: rowTop - hh, width: inW, height: hh, color: HEAD_BG })
    const heads = ['TERM 1', 'TERM 2', 'TERM 3', 'ANNUAL AVG', 'FINAL DECISION']
    heads.forEach((h, i) => center(h, inX + cw * i + cw / 2, rowTop - hh + 4.5, 5.6, bold, SLATE))

    const vals = [
      termAverages[0] !== null && termAverages[0] !== undefined ? fmt2(termAverages[0]) : '—',
      termAverages[1] !== null && termAverages[1] !== undefined ? fmt2(termAverages[1]) : '—',
      termAverages[2] !== null && termAverages[2] !== undefined ? fmt2(termAverages[2]) : '—',
      annualAverage !== null ? fmt2(annualAverage) : '—',
      finalDecision
    ]
    vals.forEach((v, i) => {
      const isDecision = i === 4
      const isAnnual = i === 3
      center(
        v,
        inX + cw * i + cw / 2,
        rowTop - hh - rh + 5,
        isDecision ? 6.5 : 7,
        isDecision || isAnnual ? bold : font,
        isDecision ? (v === 'PROMOTED' ? GREEN : v === '—' ? MUTED : RED) : INK
      )
    })

    page.drawRectangle({ x: inX, y: rowTop - hh - rh, width: inW, height: hh + rh, borderColor: BORDER, borderWidth: 0.6 })
    hLine(inX, inX + inW, rowTop - hh)
    for (let i = 1; i < nCols; i++) vLine(inX + cw * i, rowTop, rowTop - hh - rh)

    y -= annH + 12
  }

  // ================================ signatures =================================
  const sigLabels = ['CLASS TEACHER', 'PARENT / GUARDIAN', 'PRINCIPAL']
  const sigNames = [classTeacherName, '', principalName]
  const colW = CW / 3
  const labelY = Math.max(y - 6, 56)
  sigLabels.forEach((label, i) => {
    const cx = M + colW * i + colW / 2
    center(label, cx, labelY, 7, bold, INK)
    hLine(cx - colW / 2 + 14, cx + colW / 2 - 14, labelY - 22, BORDER, 0.8)
    if (sigNames[i]) center(sigNames[i], cx, labelY - 32, 6.5, font, SLATE)
  })

  const bytes = await doc.save()
  return savePdf(`report-${student.admission_no}`, bytes)
}
