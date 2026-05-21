import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'

const listeners = new Map<string, Set<(payload: unknown) => void>>()

function on(channel: string, cb: (payload: unknown) => void): () => void {
  let set = listeners.get(channel)
  if (!set) {
    set = new Set()
    listeners.set(channel, set)
    ipcRenderer.on(channel, (_e, payload) => {
      listeners.get(channel)?.forEach((fn) => fn(payload))
    })
  }
  set.add(cb)
  return () => set?.delete(cb)
}

const api = {
  app: {
    version: () => ipcRenderer.invoke(IPC.App.Version) as Promise<string>
  },
  detect: {
    scan: () => ipcRenderer.invoke(IPC.Detect.Scan),
    health: () => ipcRenderer.invoke(IPC.Detect.Health)
  },
  config: {
    get: () => ipcRenderer.invoke(IPC.Config.Get),
    set: (patch: unknown) => ipcRenderer.invoke(IPC.Config.Set, patch)
  },
  prereq: {
    status: () => ipcRenderer.invoke(IPC.Prereq.Status),
    install: (payload: { id: string; archivePath?: string }) =>
      ipcRenderer.invoke(IPC.Prereq.Install, payload)
  },
  modlist: {
    fetch: (source: string) => ipcRenderer.invoke(IPC.Modlist.Fetch, source),
    diff: (manifest: unknown) => ipcRenderer.invoke(IPC.Modlist.Diff, manifest),
    apply: (manifest: unknown, modIds: string[]) =>
      ipcRenderer.invoke(IPC.Modlist.Apply, { manifest, modIds }),
    export: (manifest: unknown, targetPath: string) =>
      ipcRenderer.invoke(IPC.Modlist.Export, manifest, targetPath),
    enforce: (manifest: unknown) => ipcRenderer.invoke(IPC.Modlist.Enforce, manifest),
    scanPlugins: () => ipcRenderer.invoke(IPC.Modlist.ScanPlugins),    buildTemplate: (meta: {
      name: string
      version: string
      gameVersion: string
      strVersion: string
    }) => ipcRenderer.invoke(IPC.Modlist.BuildTemplate, meta),
    example: () => ipcRenderer.invoke(IPC.Modlist.Example)
  },
  modManager: {
    detect: () => ipcRenderer.invoke(IPC.ModManager.Detect),
    importStaging: (payload: {
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
    }) => ipcRenderer.invoke(IPC.ModManager.ImportStaging, payload)
  },
  dialog: {
    saveFile: (opts: {
      defaultPath?: string
      filters?: { name: string; extensions: string[] }[]
    }) => ipcRenderer.invoke(IPC.Dialog.SaveFile, opts),
    pickFolder: (opts: { defaultPath?: string; title?: string }) =>
      ipcRenderer.invoke(IPC.Dialog.PickFolder, opts)
  },
  server: {
    loadToml: (p: string) => ipcRenderer.invoke(IPC.Server.LoadToml, p),
    saveToml: (path: string, cfg: unknown) =>
      ipcRenderer.invoke(IPC.Server.SaveToml, { path, cfg }),
    start: (exePath: string) => ipcRenderer.invoke(IPC.Server.Start, { exePath }),
    stop: () => ipcRenderer.invoke(IPC.Server.Stop),
    status: () => ipcRenderer.invoke(IPC.Server.Status)
  },
  launch: {
    play: () => ipcRenderer.invoke(IPC.Launch.Play)
  },
  backup: {
    snapshot: () => ipcRenderer.invoke(IPC.Backup.Snapshot),
    list: () => ipcRenderer.invoke(IPC.Backup.List),
    restore: (id: string) => ipcRenderer.invoke(IPC.Backup.Restore, id)
  },
  ahMod: {
    status:    () => ipcRenderer.invoke(IPC.AhMod.Status),
    install:   () => ipcRenderer.invoke(IPC.AhMod.Install),
    uninstall: () => ipcRenderer.invoke(IPC.AhMod.Uninstall),
    test:      () => ipcRenderer.invoke(IPC.AhMod.Test)
  },
  creds: {
    setNexusKey: (key: string) => ipcRenderer.invoke(IPC.Credentials.SetNexusKey, key),
    hasNexusKey: () => ipcRenderer.invoke(IPC.Credentials.HasNexusKey),
    clearNexusKey: () => ipcRenderer.invoke(IPC.Credentials.ClearNexusKey)
  },
  updater: {
    check: () => ipcRenderer.invoke(IPC.Updater.Check),
    quitAndInstall: () => ipcRenderer.invoke(IPC.Updater.Quit)
  },
  events: {
    onProgress: (cb: (payload: unknown) => void) => on(IPC.Events.Progress, cb),
    onServerLog: (cb: (payload: unknown) => void) => on(IPC.Events.ServerLog, cb),
    onUpdateStatus: (cb: (payload: unknown) => void) => on(IPC.Events.UpdateStatus, cb)
  }
}

contextBridge.exposeInMainWorld('str', api)

export type StrApi = typeof api
