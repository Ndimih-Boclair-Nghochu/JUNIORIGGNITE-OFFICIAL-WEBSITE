import { app, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

function getUploadsDir(): string {
  const dir = path.join(app.getPath('userData'), 'uploads')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** Opens a native "pick image" dialog and copies the chosen file into userData/uploads. */
export async function pickAndStoreImage(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Select image',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return null

  const src = result.filePaths[0]
  const ext = path.extname(src) || '.png'
  const destName = `${crypto.randomUUID()}${ext}`
  const destPath = path.join(getUploadsDir(), destName)
  fs.copyFileSync(src, destPath)
  return destPath
}

export function toFileUrl(absPath: string): string {
  return `file:///${absPath.replace(/\\/g, '/')}`
}
