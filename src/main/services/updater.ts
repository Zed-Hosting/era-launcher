import { BrowserWindow, app } from 'electron'

let initialized = false

export function initAutoUpdate(win: BrowserWindow): void {
  if (initialized) return
  initialized = true
  if (!app.isPackaged) return
  // Lazy-load to avoid module init in dev.
  void (async () => {
    try {
      const { autoUpdater } = await import('electron-updater')
      autoUpdater.autoDownload = true
      autoUpdater.on('checking-for-update', () => win.webContents.send('events:updateStatus', { state: 'checking' }))
      autoUpdater.on('update-available', (info) =>
        win.webContents.send('events:updateStatus', { state: 'available', version: info.version })
      )
      autoUpdater.on('update-not-available', () =>
        win.webContents.send('events:updateStatus', { state: 'none' })
      )
      autoUpdater.on('download-progress', (p) =>
        win.webContents.send('events:updateStatus', { state: 'downloading', percent: p.percent })
      )
      autoUpdater.on('update-downloaded', () =>
        win.webContents.send('events:updateStatus', { state: 'ready' })
      )
      autoUpdater.on('error', (err) =>
        win.webContents.send('events:updateStatus', { state: 'error', message: String(err?.message ?? err) })
      )
      await autoUpdater.checkForUpdates()
    } catch (err) {
      console.warn('auto-update init failed:', err)
    }
  })()
}

export async function quitAndInstall(): Promise<void> {
  try {
    const { autoUpdater } = await import('electron-updater')
    autoUpdater.quitAndInstall()
  } catch {
    /* ignore */
  }
}
