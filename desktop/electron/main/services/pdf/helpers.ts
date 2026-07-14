import fs from 'node:fs'
import { app } from 'electron'
import path from 'node:path'
import crypto from 'node:crypto'
import QRCode from 'qrcode'
import { PDFDocument, PDFImage } from 'pdf-lib'

/** Embeds a JPG/PNG file from disk into the document, returning null on any failure. */
export async function embedImageFile(doc: PDFDocument, filePath: string | null): Promise<PDFImage | null> {
  if (!filePath || !fs.existsSync(filePath)) return null
  try {
    const bytes = fs.readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    if (ext === '.jpg' || ext === '.jpeg') return await doc.embedJpg(bytes)
    return await doc.embedPng(bytes)
  } catch {
    return null
  }
}

export async function embedQrCode(doc: PDFDocument, text: string): Promise<PDFImage> {
  const dataUrl = await QRCode.toDataURL(text, { margin: 0, width: 256 })
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
  return doc.embedPng(Buffer.from(base64, 'base64'))
}

/** Writes generated PDF bytes to userData/exports and returns the absolute path. */
export function savePdf(prefix: string, bytes: Uint8Array): string {
  const dir = path.join(app.getPath('userData'), 'exports')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, `${prefix}-${crypto.randomUUID().slice(0, 8)}.pdf`)
  fs.writeFileSync(filePath, bytes)
  return filePath
}
