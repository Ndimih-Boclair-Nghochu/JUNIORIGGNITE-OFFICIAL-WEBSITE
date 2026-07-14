import { ipcMain } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { ApiResult } from '@shared/types'
import { pickAndStoreImage } from '../services/files'

export function registerFileHandlers(): void {
  ipcMain.handle(IPC.FILE_PICK_IMAGE, async (): Promise<ApiResult<{ path: string | null }>> => {
    try {
      const path = await pickAndStoreImage()
      return { ok: true, data: { path } }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })
}
