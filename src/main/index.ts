import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { IPC } from '@shared/ipc'
import { detectSkyrim } from './services/skyrim-detect'
import {
  getPrereqStatuses,
  installSkse,
  installAddrLibFromArchive,
  installPapyrusUtilFromArchive,
  installUIExtensionsFromArchive,
  installStr
} from './services/installer'
import {
  applyModlist,
  buildTemplateFromInstall,
  diffModlist,
  enforceModlist,
  fetchModlist,
  scanInstalledPlugins,
  writePluginsTxt
} from './services/modlist'
import {
  loadActiveModlist,
  loadBundledExample,
  saveActiveModlist
} from './services/active-modlist'
import { detectModManagers, buildTemplateFromStaging } from './services/mod-manager'
import {
  ServerController,
  loadServerConfig,
  saveServerConfig,
  serverTomlPath
} from './services/server'
import { initAutoUpdate, quitAndInstall } from './services/updater'
import { clearNexusKey, hasNexusKey, setNexusKey } from './services/credentials'
import { getConfig, updateConfig } from './services/config'
import { createSnapshot, listSnapshots, restoreSnapshot } from './services/backup'
import { getAhModStatus, installAhMod, uninstallAhMod, ensureAhModUpToDate } from './services/ah-mod-install'
import { startAhPoller, stopAhPoller } from './ah-poller'
import type { ModlistManifest, ServerConfig } from '@shared/types'

let mainWindow: BrowserWindow | null = null
const serverController = new ServerController()

/** Wrapper that always passes the OS-resolved Documents path (handles OneDrive redirect). */
function detect(override?: string) {
  return detectSkyrim(override, app.getPath('documents'))
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0c0a09',
    icon: path.join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void mainWindow.loadURL(devUrl)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function emitProgress(payload: unknown): void {
  mainWindow?.webContents.send(IPC.Events.Progress, payload)
}

function registerIpc(): void {
  ipcMain.handle(IPC.Detect.Scan, async () => {
    const cfg = getConfig()
    const det = await detect(cfg.skyrimPathOverride)
    return det
  })

  ipcMain.handle(IPC.Detect.Health, async () => {
    const cfg = getConfig()
    const det = await detect(cfg.skyrimPathOverride)
    const mm = await detectModManagers()
    return { detection: det, modManagers: mm }
  })

  ipcMain.handle(IPC.Config.Get, async () => getConfig())
  ipcMain.handle(IPC.Config.Set, async (_e, patch) => updateConfig(patch))

  ipcMain.handle(IPC.Prereq.Status, async () => {
    const det = await detect(getConfig().skyrimPathOverride)
    if (!det.installPath) return []
    return getPrereqStatuses(det.installPath)
  })

  ipcMain.handle(IPC.Prereq.Install, async (_e, payload: { id: string; archivePath?: string }) => {
    const det = await detect(getConfig().skyrimPathOverride)
    if (!det.installPath) throw new Error('Skyrim install not found.')
    const onProg = (phase: any, message: string, bytes?: number, total?: number) =>
      emitProgress({ id: payload.id, label: message, phase, bytes, totalBytes: total })
    if (payload.id === 'skse64') await installSkse(det.installPath, onProg)
    else if (payload.id === 'addrlib') {
      if (!payload.archivePath) throw new Error('addrlib requires archivePath (user-provided).')
      await installAddrLibFromArchive(det.installPath, payload.archivePath, onProg)
    } else if (payload.id === 'str') await installStr(det.installPath, onProg)
    else if (payload.id === 'papyrus-util') {
      if (!payload.archivePath) throw new Error('papyrus-util requires archivePath (user-provided).')
      await installPapyrusUtilFromArchive(det.installPath, payload.archivePath, onProg)
    } else if (payload.id === 'ui-extensions') {
      if (!payload.archivePath) throw new Error('ui-extensions requires archivePath (user-provided).')
      await installUIExtensionsFromArchive(det.installPath, payload.archivePath, onProg)
    } else if (payload.id === 'era-ah') {
      onProg('install', 'Installing ERA Auction House mod…')
      const res = await installAhMod(det.installPath)
      if (!res.ok) throw new Error(res.error)
      onProg('done', 'ERA Auction House mod installed.')
    } else throw new Error(`Unknown prereq id: ${payload.id}`)
    return { ok: true }
  })

  ipcMain.handle(IPC.Modlist.Fetch, async (_e, source: string) => {
    const manifest = await fetchModlist(source)
    await saveActiveModlist(manifest)
    return manifest
  })
  ipcMain.handle(IPC.Modlist.Diff, async (_e, manifest: ModlistManifest) => {
    const det = await detect(getConfig().skyrimPathOverride)
    if (!det.installPath) throw new Error('Skyrim install not found.')
    await saveActiveModlist(manifest)
    return diffModlist(manifest, det.installPath)
  })
  ipcMain.handle(
    IPC.Modlist.Apply,
    async (_e, payload: { manifest: ModlistManifest; modIds: string[] }) => {
      const det = await detect(getConfig().skyrimPathOverride)
      if (!det.installPath) throw new Error('Skyrim install not found.')
      const downloads = path.join(app.getPath('userData'), 'downloads')
      const toApply = payload.manifest.mods.filter((m) => payload.modIds.includes(m.id))
      const result = await applyModlist(
        payload.manifest,
        det.installPath,
        downloads,
        toApply,
        (modId, phase, message, bytes, total) =>
          emitProgress({ id: modId, label: message ?? modId, phase, bytes, totalBytes: total })
      )
      await writePluginsTxt(payload.manifest, det.installPath)
      return result
    }
  )
  ipcMain.handle(IPC.Modlist.Export, async (_e, manifest: ModlistManifest, targetPath: string) => {
    const { promises: fs } = await import('node:fs')
    await fs.writeFile(targetPath, JSON.stringify(manifest, null, 2), 'utf8')
    return { ok: true }
  })

  ipcMain.handle(IPC.Modlist.Enforce, async (_e, manifest: ModlistManifest) => {
    const det = await detect(getConfig().skyrimPathOverride)
    if (!det.installPath) throw new Error('Skyrim install not found.')
    return enforceModlist(manifest, det.installPath)
  })
  ipcMain.handle(IPC.Modlist.ScanPlugins, async () => {
    const det = await detect(getConfig().skyrimPathOverride)
    if (!det.installPath) return []
    return scanInstalledPlugins(det.installPath)
  })
  ipcMain.handle(IPC.Modlist.Example, async () => {
    const m = await loadBundledExample()
    if (!m) throw new Error('Could not locate bundled modlist.example.json')
    await saveActiveModlist(m)
    return m
  })
  ipcMain.handle(
    IPC.Modlist.BuildTemplate,
    async (
      _e,
      meta: { name: string; version: string; gameVersion: string; strVersion: string }
    ) => {
      const det = await detect(getConfig().skyrimPathOverride)
      if (!det.installPath) throw new Error('Skyrim install not found.')
      return buildTemplateFromInstall(det.installPath, meta)
    }
  )

  ipcMain.handle(IPC.ModManager.Detect, async () => detectModManagers())
  ipcMain.handle(
    IPC.ModManager.ImportStaging,
    async (
      _e,
      payload: {
        stagingPath: string
        meta: {
          name: string
          version: string
          gameVersion: string
          strVersion: string
          publishBaseUrl?: string
          bundleDir?: string
          nexusMode?: boolean
        }
      }
    ) => buildTemplateFromStaging(payload.stagingPath, payload.meta)
  )

  ipcMain.handle(
    IPC.Dialog.SaveFile,
    async (_e, opts: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
      if (!mainWindow) return { canceled: true }
      const res = await dialog.showSaveDialog(mainWindow, {
        defaultPath: opts.defaultPath,
        filters: opts.filters
      })
      return res
    }
  )
  ipcMain.handle(IPC.Dialog.PickFolder, async (_e, opts: { defaultPath?: string; title?: string }) => {
    if (!mainWindow) return { canceled: true }
    const res = await dialog.showOpenDialog(mainWindow, {
      defaultPath: opts.defaultPath,
      title: opts.title,
      properties: ['openDirectory', 'createDirectory']
    })
    return res
  })

  ipcMain.handle(IPC.Server.LoadToml, async (_e, tomlPath: string) => loadServerConfig(tomlPath))
  ipcMain.handle(IPC.Server.SaveToml, async (_e, payload: { path: string; cfg: ServerConfig }) => {
    await saveServerConfig(payload.path, payload.cfg)
    return { ok: true }
  })
  ipcMain.handle(IPC.Server.Start, async (_e, payload: { exePath: string }) => {
    serverController.removeAllListeners('log')
    serverController.on('log', (stream: string, data: string) =>
      mainWindow?.webContents.send(IPC.Events.ServerLog, { stream, data })
    )
    serverController.on('exit', (code) =>
      mainWindow?.webContents.send(IPC.Events.ServerLog, { stream: 'exit', data: String(code) })
    )
    await serverController.start(payload.exePath, path.dirname(payload.exePath))
    return { ok: true }
  })
  ipcMain.handle(IPC.Server.Stop, async () => {
    await serverController.stop()
    return { ok: true }
  })
  ipcMain.handle(IPC.Server.Status, async () => ({ running: serverController.isRunning() }))

  ipcMain.handle(IPC.Launch.Play, async () => {
    const det = await detect(getConfig().skyrimPathOverride)
    if (!det.installPath) throw new Error('Skyrim install not found.')

    // STRICT MODE: every launch re-enforces the active modlist so the user is
    // never able to run with extra plugins enabled. Falls back to the bundled
    // example so even a fresh install is locked down.
    const active = (await loadActiveModlist()) ?? (await loadBundledExample())
    if (active) {
      await enforceModlist(active, det.installPath)
    } else {
      throw new Error(
        'No active modlist and no bundled example found. Refusing to launch in strict mode.'
      )
    }

    const exe = path.join(det.installPath, 'Data', 'SkyrimTogetherReborn', 'SkyrimTogether.exe')
    spawn(exe, [], {
      cwd: path.join(det.installPath, 'Data', 'SkyrimTogetherReborn'),
      detached: true,
      stdio: 'ignore'
    }).unref()
    return { ok: true, enforced: active.name + ' v' + active.version }
  })

  ipcMain.handle(IPC.Backup.Snapshot, async () => {
    const det = await detect(getConfig().skyrimPathOverride)
    if (!det.installPath) throw new Error('Skyrim install not found.')
    return createSnapshot(det.installPath)
  })
  ipcMain.handle(IPC.Backup.List, async () => listSnapshots())
  ipcMain.handle(IPC.Backup.Restore, async (_e, snapshotId: string) => {
    const all = await listSnapshots()
    const snap = all.find((s) => s.id === snapshotId)
    if (!snap) throw new Error(`Snapshot ${snapshotId} not found.`)
    return restoreSnapshot(snap)
  })

  ipcMain.handle(IPC.Credentials.SetNexusKey, async (_e, key: string) => setNexusKey(key))
  ipcMain.handle(IPC.Credentials.HasNexusKey, async () => hasNexusKey())
  ipcMain.handle(IPC.Credentials.ClearNexusKey, async () => clearNexusKey())

  ipcMain.handle(IPC.AhMod.Status, async () => {
    const det = await detect(getConfig().skyrimPathOverride)
    return getAhModStatus(det.installPath)
  })
  ipcMain.handle(IPC.AhMod.Install, async () => {
    const det = await detect(getConfig().skyrimPathOverride)
    if (!det.installPath) return { ok: false, error: 'Skyrim install not found.' }
    return installAhMod(det.installPath)
  })
  ipcMain.handle(IPC.AhMod.Uninstall, async () => {
    const det = await detect(getConfig().skyrimPathOverride)
    if (!det.installPath) return { ok: false, error: 'Skyrim install not found.' }
    await uninstallAhMod(det.installPath)
    return { ok: true }
  })

  // Identity resolution for the Auction House renderer: returns the saved STR
  // username (if any) plus the local machine's SteamID64 so the AH page can
  // skip the manual login gate when both are known.
  ipcMain.handle(IPC.AhMod.Identity, async () => {
    const { getLocalSteamId } = await import('./services/steam-id')
    const sid = getLocalSteamId()
    return {
      username:  getConfig().ahUsername ?? null,
      steamId64: sid?.steamId64 ?? null,
      ahUrl:     getConfig().ahUrl || 'http://whippin.zedhosting.gg:33348',
    }
  })

  // Pending-pricing surface: the in-game F4 hotkey writes entries to
  // pending_listings.json with needsPricing=1 (no UIExtensions prompt is used
  // anymore — that path crashed STR's Papyrus VM). The renderer polls these
  // handlers and shows a React modal so the player can set min bid / buyout.
  const resolvePendingFile = async (): Promise<string | null> => {
    const det = await detect(getConfig().skyrimPathOverride)
    if (!det.installPath) return null
    return path.join(det.installPath, 'Data', 'SKSE', 'Plugins', 'ERA-AH', 'pending_listings.json')
  }

  type PendingEntry = {
    id: number
    name: string
    plugin: string
    formId: string
    count?: number
    minBid?: number
    buyout?: number
    needsPricing?: number | boolean
  }

  const readPending = async (): Promise<PendingEntry[]> => {
    const file = await resolvePendingFile()
    if (!file) return []
    try {
      const raw = await (await import('node:fs/promises')).readFile(file, 'utf8')
      const j = JSON.parse(raw) as { items?: PendingEntry[] }
      return Array.isArray(j.items) ? j.items : []
    } catch { return [] }
  }

  const writePending = async (items: PendingEntry[]): Promise<void> => {
    const file = await resolvePendingFile()
    if (!file) return
    const fsp = await import('node:fs/promises')
    await fsp.writeFile(file, JSON.stringify({ items }, null, 2), 'utf8')
  }

  ipcMain.handle(IPC.AhMod.GetPendingPricing, async () => {
    const items = await readPending()
    return items.filter(p => p.needsPricing === 1 || p.needsPricing === true || !p.minBid || p.minBid <= 0)
  })

  ipcMain.handle(IPC.AhMod.SubmitPendingPricing, async (_e, args: { id: number; minBid: number; buyout: number }) => {
    const { id, minBid, buyout } = args
    if (!Number.isFinite(id) || !Number.isFinite(minBid) || minBid <= 0) {
      return { ok: false, error: 'Invalid min bid.' }
    }
    const cfg = getConfig()
    const user = cfg.ahUsername
    const url  = cfg.ahUrl || 'http://whippin.zedhosting.gg:33348'
    if (!user) return { ok: false, error: 'AH username is empty.' }

    const items = await readPending()
    const idx = items.findIndex(p => p.id === id)
    if (idx < 0) return { ok: false, error: 'Listing no longer pending.' }
    const entry = items[idx]
    const safeBuyout = Number.isFinite(buyout) && buyout >= minBid ? buyout : 0

    // POST to /ah/sell synchronously so the user sees real errors (insufficient
    // deposit gold, invalid form, sidecar offline, etc.) in the modal instead
    // of the poller silently dropping a 4xx and leaving the entry stuck.
    const { getLocalSteamId } = await import('./services/steam-id')
    const sid = getLocalSteamId()
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (sid) headers['x-era-steam-id'] = sid.steamId64
    const body = {
      username:    user,
      steamId:     sid?.steamId64,
      itemName:    entry.name,
      itemFormId:  `${entry.plugin}:${entry.formId}`,
      quantity:    entry.count || 1,
      minBid,
      buyoutPrice: safeBuyout > 0 ? safeBuyout : null,
      source:      'launcher-modal',
      clientReqId: entry.id,
    }
    let resp: Response
    try {
      resp = await fetch(`${url}/ah/sell`, { method: 'POST', headers, body: JSON.stringify(body) })
    } catch (err) {
      return { ok: false, error: `Sidecar unreachable: ${(err as Error).message}` }
    }
    let payload: any = null
    try { payload = await resp.json() } catch { /* non-json body */ }
    if (!resp.ok) {
      const errMsg = payload?.error || `Sidecar returned ${resp.status}`
      return { ok: false, error: errMsg }
    }

    // Success — remove the entry from pending_listings.json so the poller
    // doesn't try to re-submit it.
    const filtered = items.filter(p => p.id !== id)
    await writePending(filtered)
    return { ok: true, deposit: payload?.deposit, listingId: payload?.listingId }
  })

  ipcMain.handle(IPC.AhMod.CancelPendingPricing, async (_e, args: { id: number }) => {
    const items = await readPending()
    const filtered = items.filter(p => p.id !== args.id)
    if (filtered.length === items.length) return { ok: false, error: 'Not found.' }
    await writePending(filtered)
    return { ok: true }
  })

  // Auction House connection self-test: verifies the sidecar is reachable and
  // reports how many pending deliveries it has queued for the configured user.
  // This is the launcher-side counterpart to the in-game 'ah ping' command.
  ipcMain.handle(IPC.AhMod.Test, async () => {
    const cfg = getConfig()
    const user = cfg.ahUsername
    const url  = cfg.ahUrl || 'http://whippin.zedhosting.gg:33348'
    if (!user) return { ok: false, error: 'AH Username is empty. Type "ah whoami" in-game and paste the result here.' }
    const started = Date.now()
    try {
      const sid = (await import('./services/steam-id')).getLocalSteamId()
      const idHeaders: Record<string, string> = { 'content-type': 'application/json' }
      if (sid) idHeaders['x-era-steam-id'] = sid.steamId64
      const baseBody: Record<string, unknown> = { username: user }
      if (sid) baseBody.steamId = sid.steamId64
      // 1) Ping the sidecar to enqueue a 1-Septim test delivery.
      const ping = await fetch(`${url}/ah/test/ping`, {
        method: 'POST',
        headers: idHeaders,
        body: JSON.stringify(baseBody),
      })
      if (!ping.ok) {
        return { ok: false, error: `Sidecar /ah/test/ping returned ${ping.status}.`, url, user }
      }
      // 2) Immediately fetch the inbox to confirm the delivery is queued.
      const inbox = await fetch(`${url}/ah/inbox/${encodeURIComponent(user)}`, { headers: idHeaders })
      if (!inbox.ok) {
        return { ok: false, error: `Sidecar /ah/inbox returned ${inbox.status}.`, url, user }
      }
      const body = await inbox.json() as { items?: unknown[] }
      const queued = Array.isArray(body.items) ? body.items.length : 0
      const elapsed = Date.now() - started
      return {
        ok: true,
        url,
        user,
        queued,
        elapsedMs: elapsed,
        steamId: sid?.steamId64 ?? null,
        message:
          `Sidecar reachable. ${queued} delivery${queued === 1 ? '' : 'ies'} queued for "${user}". ` +
          `If you remain in-game with the AH mod loaded, the test Septim should arrive within ~10s.`,
      }
    } catch (err) {
      return { ok: false, error: `Network error contacting ${url}: ${(err as Error).message}` }
    }
  })

  ipcMain.handle(IPC.Updater.Check, async () => {
    if (!mainWindow) return { ok: false }
    initAutoUpdate(mainWindow)
    return { ok: true }
  })
  ipcMain.handle(IPC.Updater.Quit, async () => quitAndInstall())
  ipcMain.handle(IPC.App.Version, async () => app.getVersion())
}

app.whenReady().then(async () => {
  registerIpc()
  createWindow()
  const cfg = getConfig()
  if (cfg.autoUpdateEnabled && mainWindow) {
    const win = mainWindow
    win.webContents.once('did-finish-load', () => initAutoUpdate(win))
  }

  // Start AH auto-delivery poller (writes inbox.json the Papyrus mod reads)
  startAhPoller({
    ahUrl: getConfig().ahUrl || 'http://whippin.zedhosting.gg:33348',
    getUsername: () => getConfig().ahUsername || null,
    getSkyrimDataPath: async () => {
      const det = await detect(getConfig().skyrimPathOverride)
      return det.installPath ? path.join(det.installPath, 'Data') : null
    },
  })

  // Auto-refresh the AH Papyrus mod if the bundled version is newer than
  // what's deployed (e.g. after a launcher auto-update). No-op if the user
  // has never installed the mod or it's already current.
  void (async () => {
    try {
      const det = await detect(getConfig().skyrimPathOverride)
      const r = await ensureAhModUpToDate(det.installPath)
      if (!r.skipped) {
        const msg = `AH mod auto-updated from ${r.from ?? 'unknown'} to ${r.to}.`
        if (mainWindow) mainWindow.webContents.send('events:updateStatus', { state: 'ahmod-updated', message: msg })
      }
    } catch (err) {
      console.warn('[ah-mod] auto-update failed:', (err as Error).message)
    }
  })()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopAhPoller()
  if (process.platform !== 'darwin') app.quit()
})
