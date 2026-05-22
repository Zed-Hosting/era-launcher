import { BrowserWindow, app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

let initialized = false
let lastStatus: unknown = null

export function getLastUpdateStatus(): unknown {
  return lastStatus
}

function logLine(line: string): void {
  try {
    const file = path.join(app.getPath('userData'), 'updater.log')
    fs.appendFileSync(file, `[${new Date().toISOString()}] ${line}\n`)
  } catch {
    /* ignore */
  }
}

function emit(win: BrowserWindow, payload: Record<string, unknown>): void {
  lastStatus = payload
  try {
    win.webContents.send('events:updateStatus', payload)
  } catch {
    /* ignore */
  }
}

export function initAutoUpdate(win: BrowserWindow): void {
  if (initialized) {
    // Re-emit last status so a freshly-loaded renderer sees it.
    if (lastStatus) win.webContents.send('events:updateStatus', lastStatus)
    return
  }
  initialized = true
  if (!app.isPackaged) {
    logLine('skip: not packaged (dev mode)')
    emit(win, { state: 'error', message: 'Dev mode — updates disabled' })
    return
  }
  // Lazy-load to avoid module init in dev.
  void (async () => {
    try {
      const mod: any = await import('electron-updater')
      const autoUpdater = mod.autoUpdater ?? mod.default?.autoUpdater
      if (!autoUpdater) {
        throw new Error('electron-updater: autoUpdater export missing')
      }
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
        emit(win, { state: 'checking' })
      })
      autoUpdater.on('update-available', (info: any) => {
        logLine(`update-available v${info.version}`)
        emit(win, { state: 'available', version: info.version })
      })
      autoUpdater.on('update-not-available', (info: any) => {
        logLine(`update-not-available currentRemote=v${info?.version ?? '?'}`)
        emit(win, { state: 'none', version: info?.version })
      })
      autoUpdater.on('download-progress', (p: any) =>
        emit(win, { state: 'downloading', percent: p.percent })
      )
      autoUpdater.on('update-downloaded', (info: any) => {
        logLine(`update-downloaded v${info.version}`)
        emit(win, { state: 'ready', version: info.version })
      })
      autoUpdater.on('error', (err: any) => {
        logLine(`error: ${String(err?.stack ?? err?.message ?? err)}`)
        emit(win, { state: 'error', message: String(err?.message ?? err) })
      })
      const result = await autoUpdater.checkForUpdates()
      logLine(`checkForUpdates returned: ${JSON.stringify(result?.updateInfo ?? null)}`)
      // Re-check every 10 minutes while the launcher is running.
      const recheck = (reason: string) => {
        autoUpdater.checkForUpdates().catch((e: unknown) => logLine(`recheck (${reason}) failed: ${String(e)}`))
      }
      setInterval(() => recheck('interval'), 10 * 60 * 1000)
      // Also re-check whenever the window regains focus — covers the common
      // case where the user alt-tabs back to the launcher after a release.
      // Debounced so we don't hammer GitHub when toggling focus rapidly.
      let lastFocusCheck = 0
      win.on('focus', () => {
        const now = Date.now()
        if (now - lastFocusCheck < 60_000) return
        lastFocusCheck = now
        recheck('focus')
      })
    } catch (err) {
      logLine(`init failed: ${String((err as Error)?.stack ?? err)}`)
      emit(win, { state: 'error', message: String((err as Error)?.message ?? err) })
    }
  })()
}

export async function quitAndInstall(): Promise<void> {
  try {
    const mod: any = await import('electron-updater')
    const autoUpdater = mod.autoUpdater ?? mod.default?.autoUpdater
    autoUpdater?.quitAndInstall(false, true)
  } catch {
    /* ignore */
  }
}
