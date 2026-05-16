import { create } from 'zustand'
import { OFFICIAL_MODLIST_URL } from '../../shared/constants'
import type {
  LauncherConfig,
  ModlistDiff,
  ModlistManifest,
  PrereqStatus,
  ProgressEvent,
  SkyrimDetection
} from '../../shared/types'

interface AppState {
  config?: LauncherConfig
  detection?: SkyrimDetection
  prereqs: PrereqStatus[]
  modlist?: ModlistManifest
  diff?: ModlistDiff
  progress: Record<string, ProgressEvent>
  serverLog: string[]
  serverRunning: boolean
  loadInitial(): Promise<void>
  setProgress(p: ProgressEvent): void
  appendServerLog(line: string): void
  refreshDetection(): Promise<void>
  refreshPrereqs(): Promise<void>
  setConfig(patch: Partial<LauncherConfig>): Promise<void>
  loadModlist(source: string): Promise<void>
}

export const useApp = create<AppState>((set, get) => ({
  prereqs: [],
  progress: {},
  serverLog: [],
  serverRunning: false,
  async loadInitial() {
    const [config, detection] = await Promise.all([window.str.config.get(), window.str.detect.scan()])
    set({ config, detection })
    if (detection?.installPath) {
      const prereqs = await window.str.prereq.status()
      set({ prereqs })
    }
    // Auto-load the official modlist on startup. Strict mode: the launcher
    // doesn't accept user-supplied URLs.
    try {
      await get().loadModlist(OFFICIAL_MODLIST_URL)
    } catch (err) {
      console.warn('Failed to load official modlist:', err)
    }
    window.str.events.onProgress((payload) => {
      const ev = payload as ProgressEvent
      get().setProgress(ev)
    })
    window.str.events.onServerLog((payload) => {
      const { stream, data } = payload as { stream: string; data: string }
      const lines = String(data)
        .split(/\r?\n/)
        .filter((l) => l.length > 0)
        .map((l) => `[${stream}] ${l}`)
      lines.forEach((l) => get().appendServerLog(l))
    })
  },
  setProgress(p) {
    set((s) => ({ progress: { ...s.progress, [p.id]: p } }))
  },
  appendServerLog(line) {
    set((s) => ({ serverLog: [...s.serverLog.slice(-499), line] }))
  },
  async refreshDetection() {
    const detection = await window.str.detect.scan()
    set({ detection })
  },
  async refreshPrereqs() {
    const prereqs = await window.str.prereq.status()
    set({ prereqs })
  },
  async setConfig(patch) {
    const config = await window.str.config.set(patch)
    set({ config })
  },
  async loadModlist(source) {
    const modlist = await window.str.modlist.fetch(source)
    const diff = await window.str.modlist.diff(modlist)
    set({ modlist, diff })
  }
}))
