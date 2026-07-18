import { app, shell, BrowserWindow } from 'electron'
import path from 'node:path'
import { getDb, closeDb } from './db/connection'
import { registerAllIpcHandlers } from './ipc/index'
import { ensureLicensingReady } from './services/license'
import { ensureClassLevels } from './ipc/classLevels'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'JuniorIgnite',
    // In production the taskbar/exe icon comes from electron-builder (build/icon.ico);
    // set it explicitly in dev so the window and taskbar show the brand mark too.
    icon: !app.isPackaged ? path.join(process.cwd(), 'build', 'icon.png') : undefined,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Opens (and if needed, creates + migrates) the encrypted local database
  // once at startup so IPC handlers can assume it's ready.
  getDb()
  // Ensure a set-up install has a usable license (issues the first-year
  // provisional on first run; migrates any legacy pre-v2 license once).
  ensureLicensingReady()
  // Gives pre-existing schools a starting promotion ladder (one level per class).
  ensureClassLevels()
  registerAllIpcHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDb()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  closeDb()
})
