import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
import type Database from 'better-sqlite3-multiple-ciphers'
import { embedImageFile, savePdf } from './helpers'

// Palette matched to the reference design (navy + orange on white).
const NAVY = rgb(0.118, 0.227, 0.541) // #1e3a8a
const NAVY_SPINE = rgb(0.118, 0.251, 0.686) // #1e40af
const ORANGE = rgb(0.95, 0.62, 0.05) // #f2a00d
const BLUE_ACCENT = rgb(0.15, 0.39, 0.92) // #2563eb
const GRAY = rgb(0.392, 0.455, 0.545) // #64748b
const INK = rgb(0.12, 0.16, 0.23)
const RULE = rgb(0.886, 0.91, 0.941) // #e2e8f0

/**
 * Generates a printable "Student Profile" — a report-card cover (book cover)
 * laid out as a two-panel spread with a central spine. Print it, fold along
 * the spine, and slip the student's printed report cards inside.
 * Front (right): Cameroon bilingual header, school identity, student photo and
 * key details. Inside (left): about the school, location & contact, official
 * record notice.
 */
export async function generateStudentProfile(db: Database.Database, studentId: number): Promise<string> {
  const student = db
    .prepare(
      `SELECT s.*, c.name AS class_name FROM students s
       LEFT JOIN classes c ON c.id = s.class_id WHERE s.id = ?`
    )
    .get(studentId) as any
  if (!student) throw new Error('Student not found.')
  const school = db.prepare('SELECT * FROM schools WHERE id = 1').get() as any

  const doc = await PDFDocument.create()
  const page = doc.addPage([842, 595]) // A4 landscape
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const { width, height } = page.getSize()
  const photo = await embedImageFile(doc, student.photo_path ?? null)

  const schoolName = String(school?.name ?? 'School').toUpperCase()

  // ---- helpers ----
  const textW = (t: string, s: number, f = font): number => f.widthOfTextAtSize(t, s)
  const center = (t: string, cx: number, y: number, s: number, f = font, color = INK): void =>
    page.drawText(t, { x: cx - textW(t, s, f) / 2, y, size: s, font: f, color })
  const right = (t: string, rx: number, y: number, s: number, f = font, color = INK): void =>
    page.drawText(t, { x: rx - textW(t, s, f), y, size: s, font: f, color })
  function wrap(t: string, maxW: number, s: number, f = font): string[] {
    const words = t.split(/\s+/)
    const lines: string[] = []
    let line = ''
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (textW(test, s, f) > maxW && line) {
        lines.push(line)
        line = w
      } else line = test
    }
    if (line) lines.push(line)
    return lines
  }

  // ================= LEFT PANEL (inside cover) =================
  const lx = 46
  const lRight = 350
  const lWidth = lRight - lx
  let y = height - 60

  const heading = (t: string, color = NAVY): void => {
    for (const [i, ln] of wrap(t, lWidth, 15, bold).entries()) {
      page.drawText(ln, { x: lx, y: y - i * 18, size: 15, font: bold, color })
    }
    y -= wrap(t, lWidth, 15, bold).length * 18 + 4
    page.drawLine({ start: { x: lx, y }, end: { x: lRight, y }, thickness: 1, color: RULE })
    y -= 22
  }

  heading('ABOUT THE SCHOOL')
  const about =
    school?.about_text ||
    `${school?.name ?? 'The school'} is dedicated to academic excellence, character development, and preparing pupils to become responsible citizens.`
  for (const ln of wrap(about, lWidth, 10.5)) {
    page.drawText(ln, { x: lx, y, size: 10.5, font, color: GRAY })
    y -= 16
  }
  y -= 18

  heading('LOCATION & CONTACT')
  const kv: [string, string][] = [
    ['Region:', school?.region || '—'],
    ['Division:', school?.division || '—'],
    ['Sub Division:', school?.subdivision || '—'],
    ['Village/Town:', school?.village_town || school?.address || '—']
  ]
  for (const [k, v] of kv) {
    page.drawText(k, { x: lx, y, size: 10.5, font: bold, color: INK })
    page.drawText(v, { x: lx + 110, y, size: 10.5, font, color: INK })
    y -= 20
  }
  y -= 8
  page.drawText(`Tel: ${school?.phone || '—'}`, { x: lx, y, size: 10.5, font, color: GRAY })
  y -= 18
  page.drawText('Email:', { x: lx, y, size: 10.5, font, color: GRAY })
  y -= 15
  for (const ln of wrap(school?.email || '—', lWidth, 10.5)) {
    page.drawText(ln, { x: lx, y, size: 10.5, font, color: GRAY })
    y -= 15
  }

  // Official record — anchored near the bottom of the left panel.
  let oy = 150
  page.drawText('OFFICIAL RECORD', { x: lx, y: oy, size: 13, font: bold, color: ORANGE })
  oy -= 6
  page.drawLine({ start: { x: lx, y: oy }, end: { x: lRight, y: oy }, thickness: 1, color: ORANGE })
  oy -= 18
  for (const ln of wrap(
    'This document serves as an official academic record. Any alterations or unauthorized modifications will render this document invalid.',
    lWidth,
    9.5
  )) {
    page.drawText(ln, { x: lx, y: oy, size: 9.5, font, color: GRAY })
    oy -= 14
  }

  // ================= SPINE =================
  const spineX = 362
  const spineW = 44
  page.drawRectangle({ x: spineX, y: 34, width: spineW, height: height - 68, color: NAVY_SPINE })
  const scx = spineX + spineW / 2
  // accent stripes near top & bottom
  for (const yy of [height - 70, 70]) {
    page.drawLine({ start: { x: spineX + 6, y: yy }, end: { x: spineX + spineW - 6, y: yy }, thickness: 2, color: ORANGE })
    page.drawLine({ start: { x: spineX + 6, y: yy - 6 }, end: { x: spineX + spineW - 6, y: yy - 6 }, thickness: 2, color: BLUE_ACCENT })
  }
  const spineLabel = schoolName.split('').join(' ')
  const spineTextW = textW(spineLabel, 12, bold)
  page.drawText(spineLabel, {
    x: scx + 5,
    y: height / 2 - spineTextW / 2,
    size: 12,
    font: bold,
    color: rgb(1, 1, 1),
    rotate: degrees(90)
  })

  // ================= RIGHT PANEL (front cover) =================
  const rx = 424
  const rRight = 798
  const rcx = (rx + rRight) / 2

  // --- bilingual government header ---
  let hy = height - 58
  page.drawText('REPUBLIC OF CAMEROON', { x: rx, y: hy, size: 9, font: bold, color: NAVY })
  page.drawText('Peace - Work - Fatherland', { x: rx, y: hy - 12, size: 7.5, font: italic, color: GRAY })
  page.drawText('MINISTRY OF', { x: rx, y: hy - 30, size: 8, font: bold, color: NAVY })
  page.drawText('BASIC EDUCATION', { x: rx, y: hy - 40, size: 8, font: bold, color: NAVY })

  right('RÉPUBLIQUE DU CAMEROUN', rRight, hy, 9, bold, NAVY)
  right('Paix - Travail - Patrie', rRight, hy - 12, 7.5, italic, GRAY)
  right('MINISTÈRE DE', rRight, hy - 30, 8, bold, NAVY)
  right("L'ÉDUCATION DE BASE", rRight, hy - 40, 8, bold, NAVY)

  // center emblem (circle + open book)
  const ecx = rcx
  const ecy = hy - 18
  page.drawCircle({ x: ecx, y: ecy, size: 22, borderColor: NAVY, borderWidth: 1.6, color: rgb(1, 1, 1) })
  // open book: spine + two page outlines
  page.drawLine({ start: { x: ecx, y: ecy + 8 }, end: { x: ecx, y: ecy - 7 }, thickness: 1.3, color: NAVY })
  // left page
  page.drawLine({ start: { x: ecx, y: ecy + 8 }, end: { x: ecx - 10, y: ecy + 5 }, thickness: 1.3, color: NAVY })
  page.drawLine({ start: { x: ecx - 10, y: ecy + 5 }, end: { x: ecx - 10, y: ecy - 8 }, thickness: 1.3, color: NAVY })
  page.drawLine({ start: { x: ecx - 10, y: ecy - 8 }, end: { x: ecx, y: ecy - 7 }, thickness: 1.3, color: NAVY })
  // right page
  page.drawLine({ start: { x: ecx, y: ecy + 8 }, end: { x: ecx + 10, y: ecy + 5 }, thickness: 1.3, color: NAVY })
  page.drawLine({ start: { x: ecx + 10, y: ecy + 5 }, end: { x: ecx + 10, y: ecy - 8 }, thickness: 1.3, color: NAVY })
  page.drawLine({ start: { x: ecx + 10, y: ecy - 8 }, end: { x: ecx, y: ecy - 7 }, thickness: 1.3, color: NAVY })

  page.drawLine({ start: { x: rx, y: height - 112 }, end: { x: rRight, y: height - 112 }, thickness: 1, color: RULE })

  // --- school identity ---
  let cy = height - 145
  center(schoolName, rcx, cy, 22, bold, NAVY)
  cy -= 24
  if (school?.motto) {
    center(`"${school.motto}"`, rcx, cy, 12, italic, ORANGE)
    cy -= 18
  }
  center(`P.O. BOX: ${school?.po_box || '—'}`, rcx, cy, 9, bold, NAVY)
  cy -= 22

  // --- photo ---
  const pw = 104
  const ph = 116
  const px = rcx - pw / 2
  const py = cy - ph
  page.drawRectangle({ x: px - 4, y: py - 4, width: pw + 8, height: ph + 8, color: rgb(1, 1, 1), borderColor: RULE, borderWidth: 1 })
  if (photo) {
    const dims = photo.scaleToFit(pw, ph)
    page.drawImage(photo, { x: rcx - dims.width / 2, y: py + (ph - dims.height) / 2, width: dims.width, height: dims.height })
  } else {
    page.drawRectangle({ x: px, y: py, width: pw, height: ph, color: rgb(0.93, 0.94, 0.96) })
    center('PHOTO', rcx, py + ph / 2 - 4, 9, bold, GRAY)
  }
  cy = py - 26

  // --- name ---
  center(`${student.first_name} ${student.last_name}`.toUpperCase(), rcx, cy, 20, bold, NAVY)
  cy -= 28

  // --- info rows ---
  const rows: [string, string][] = [
    ['Student ID', student.admission_no || '—'],
    ['Class', student.class_name || '—'],
    ['Date of Birth', formatDate(student.dob)],
    ['Gender', cap(student.gender)]
  ]
  for (const [label, value] of rows) {
    page.drawText(label, { x: rx + 14, y: cy, size: 11, font, color: GRAY })
    right(value, rRight - 14, cy, 12, bold, NAVY)
    page.drawLine({ start: { x: rx + 14, y: cy - 8 }, end: { x: rRight - 14, y: cy - 8 }, thickness: 0.75, color: RULE })
    cy -= 26
  }

  // --- signatures ---
  const sigX1 = rx + 40
  const sigX2 = rRight - 40
  let sy = 96
  page.drawLine({ start: { x: sigX1, y: sy }, end: { x: sigX2, y: sy }, thickness: 0.9, color: INK })
  center('CLASS MASTER / MISTRESS', rcx, sy - 14, 8.5, bold, GRAY)
  sy -= 42
  page.drawLine({ start: { x: sigX1, y: sy }, end: { x: sigX2, y: sy }, thickness: 0.9, color: INK })
  center(`DATE OF ISSUE: ${formatDate(new Date().toISOString())}`, rcx, sy - 14, 8.5, bold, GRAY)

  const bytes = await doc.save()
  return savePdf(`profile-${student.admission_no || student.id}`, bytes)
}

function cap(s: string | null | undefined): string {
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}
