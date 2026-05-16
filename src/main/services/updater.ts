import { BrowserWindow, app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

let initialized = false

function logLine(line: string): void {
  try {
    const file = path.join(app.getPath('userData'), 'updater.log')
    fs.appendFileSync(file, `[${new Date().toISOString()}] ${line}\n`)
  } catch {
    /* ignore */
  }
}

export function initAutoUpdate(win: BrowserWindow): void {
  if (initialized) return
  initialized = true
  if (!app.isPackaged) {
    logLine('skip: not packaged (dev mode)')
    win.webContents.send('events:updateStatus', { state: 'error', message: 'Dev mode — updates disabled' })
    return
  }
  // Lazy-load to avoid module init in dev.
  void (async () => {
    try {
      const { autoUpdater } = await import('electron-updater')
      autoUpdater.autoDownload = true
      autoUpdater.logger = {
        info: (m: unknown) => logLine(`info: ${String(m)}`),
        warn: (m: unknown) => logLine(`warn: ${String(m)}`),
        error: (m: unknown) => logLine(`error: ${String(m)}`),
        debug: (m: unknown) => logLine(`debug: ${String(m)}`)
      } as never
      logLine(`starting check; currentVersion=${app.getVersion()}`)
      autoUpdater.on('checking-for-update', () => {
        logLine('checking-for-update')
        win.webContents.send('events:updateStatus', { state: 'checking' })
      })
      autoUpdater.on('update-available', (info) => {
        logLine(`update-available v${info.version}`)
        win.webContents.send('events:updateStatus', { state: 'available', version: info.version })
      })
      autoUpdater.on('update-not-available', (info) => {
        logLine(`update-not-available currentRemote=v${info?.version ?? '?'}`)
        win.webContents.send('events:updateStatus', { state: 'none', version: info?.version })
      })
      autoUpdater.on('download-progress', (p) =>
        win.webContents.send('events:updateStatus', { state: 'downloading', percent: p.percent })
      )
      autoUpdater.on('update-downloaded', (info) => {
        logLine(`update-downloaded v${info.version}`)
        win.webContents.send('events:updateStatus', { state: 'ready', version: info.version })
      })
      autoUpdater.on('error', (err) => {
        logLine(`error: ${String(err?.stack ?? err?.message ?? err)}`)
        win.webContents.send('events:updateStatus', {
          state: 'error',
          message: String(err?.message ?? err)
        })
      })
      const result = await autoUpdater.checkForUpdates()
      logLine(`checkForUpdates returned: ${JSON.stringify(result?.updateInfo ?? null)}`)
    } catch (err) {
      logLine(`init failed: ${String((err as Error)?.stack ?? err)}`)
      win.webContents.send('events:updateStatus', {
        state: 'error',
        message: String((err as Error)?.message ?? err)
      })
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
