import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type Database from 'better-sqlite3-multiple-ciphers'
import { termsFor } from './i18n'
import { embedImageFile, embedQrCode, savePdf } from './helpers'
import type { Subsystem } from '@shared/types'

const BRAND = rgb(0.08, 0.52, 0.34)
const BRAND_DARK = rgb(0.06, 0.36, 0.24)
const INK = rgb(0.11, 0.16, 0.23)
const MUTED = rgb(0.45, 0.5, 0.58)
const WHITE = rgb(1, 1, 1)

export type IdCardFormat = 'paper' | 'pvc'

/**
 * Generates a two-panel student ID card (front + back). 'pvc' uses standard
 * CR80 card dimensions (85.6mm x 54mm ≈ 242.6 x 153 pt) on separate pages;
 * 'paper' lays both panels on one A4 page for easy print-and-laminate.
 */
export async function generateIdCard(
  db: Database.Database,
  studentId: number,
  format: IdCardFormat
): Promise<string> {
  const student = db
    .prepare(
      `SELECT s.*, c.name as class_name, c.subsystem FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ?`
    )
    .get(studentId) as any
  if (!student) throw new Error('Student not found.')
  const school = db.prepare('SELECT * FROM schools WHERE id = 1').get() as any
  const year = db.prepare('SELECT label FROM academic_years WHERE is_current = 1').get() as { label: string } | undefined
  const subsystem: Subsystem = student.subsystem
  const T = termsFor(subsystem)

  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const logo = await embedImageFile(doc, school?.logo_path ?? null)
  const photo = await embedImageFile(doc, student.photo_path ?? null)
  const qr = await embedQrCode(doc, `JUNIORIGNITE-ID|${student.admission_no}|${student.class_name}`)

  const CARD_W = 242.6
  const CARD_H = 153

  const drawFront = (page: any, ox: number, oy: number): void => {
    page.drawRectangle({ x: ox, y: oy, width: CARD_W, height: CARD_H, color: WHITE, borderColor: rgb(0.85, 0.87, 0.9), borderWidth: 1 })
    // top band
    page.drawRectangle({ x: ox, y: oy + CARD_H - 34, width: CARD_W, height: 34, color: BRAND })
    if (logo) {
      const d = logo.scaleToFit(24, 24)
      page.drawImage(logo, { x: ox + 6, y: oy + CARD_H - 30, width: d.width, height: d.height })
    }
    page.drawText((school?.name ?? 'School').slice(0, 30), { x: ox + 34, y: oy + CARD_H - 20, size: 8, font: bold, color: WHITE })
    page.drawText(T.idCardTitle, { x: ox + 34, y: oy + CARD_H - 30, size: 5.5, font, color: rgb(0.9, 0.95, 0.92) })

    // photo
    if (photo) {
      const d = photo.scaleToFit(56, 66)
      page.drawImage(photo, { x: ox + 10, y: oy + 34, width: d.width, height: d.height })
    } else {
      page.drawRectangle({ x: ox + 10, y: oy + 34, width: 56, height: 66, color: rgb(0.93, 0.94, 0.96) })
    }

    let ty = oy + CARD_H - 52
    const info: [string, string][] = [
      [T.studentName, `${student.first_name} ${student.last_name}`],
      [T.admissionNo, student.admission_no],
      [T.className, student.class_name],
      [T.academicYear, year?.label ?? '-']
    ]
    for (const [label, value] of info) {
      page.drawText(label.toUpperCase(), { x: ox + 76, y: ty, size: 5, font, color: MUTED })
      page.drawText(value.slice(0, 26), { x: ox + 76, y: ty - 9, size: 8, font: bold, color: INK })
      ty -= 21
    }
    // QR bottom-right
    page.drawImage(qr, { x: ox + CARD_W - 44, y: oy + 8, width: 36, height: 36 })
  }

  const drawBack = (page: any, ox: number, oy: number): void => {
    page.drawRectangle({ x: ox, y: oy, width: CARD_W, height: CARD_H, color: WHITE, borderColor: rgb(0.85, 0.87, 0.9), borderWidth: 1 })
    page.drawRectangle({ x: ox, y: oy + CARD_H - 26, width: CARD_W, height: 26, color: BRAND_DARK })
    page.drawText(school?.motto ?? school?.name ?? '', { x: ox + 8, y: oy + CARD_H - 17, size: 7, font: bold, color: WHITE })

    let ty = oy + CARD_H - 42
    const contact = [school?.address, school?.phone, school?.email].filter(Boolean).join('  ·  ')
    const lines: [string, string][] = [
      ['SCHOOL CONTACT', contact || '-'],
      [T.emergencyContact.toUpperCase(), student.emergency_contact ?? student.parent_phone ?? '-']
    ]
    for (const [label, value] of lines) {
      page.drawText(label, { x: ox + 10, y: ty, size: 5.5, font, color: MUTED })
      page.drawText(value.slice(0, 44), { x: ox + 10, y: ty - 9, size: 7, font, color: INK })
      ty -= 24
    }

    const terms =
      subsystem === 'francophone'
        ? "Cette carte reste la propriété de l'école. En cas de perte, prière de la retourner."
        : 'This card remains the property of the school. If found, please return it.'
    // wrap terms
    const words = terms.split(' ')
    let line = ''
    let ly = oy + 40
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (font.widthOfTextAtSize(test, 6) > CARD_W - 20) {
        page.drawText(line, { x: ox + 10, y: ly, size: 6, font, color: MUTED })
        line = w
        ly -= 9
      } else {
        line = test
      }
    }
    if (line) page.drawText(line, { x: ox + 10, y: ly, size: 6, font, color: MUTED })
  }

  if (format === 'pvc') {
    const front = doc.addPage([CARD_W, CARD_H])
    drawFront(front, 0, 0)
    const back = doc.addPage([CARD_W, CARD_H])
    drawBack(back, 0, 0)
  } else {
    // A4 with both panels stacked, cut-friendly
    const page = doc.addPage([595, 842])
    const ox = (595 - CARD_W) / 2
    drawFront(page, ox, 600)
    drawBack(page, ox, 420)
    page.drawText('Cut along the borders and laminate.', { x: ox, y: 400, size: 8, font, color: MUTED })
  }

  const bytes = await doc.save()
  return savePdf(`idcard-${student.admission_no}`, bytes)
}
