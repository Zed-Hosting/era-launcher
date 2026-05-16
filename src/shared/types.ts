export type ModSource = 'nexus' | 'url' | 'github'

export interface ModFile {
  /** Path relative to the Skyrim install root (e.g. "Data/SKSE/Plugins/foo.dll"). */
  path: string
  sha256: string
  size: number
}

export interface ModEntry {
  id: string
  displayName: string
  source: ModSource
  /**
   * nexus: "<game>/<modId>/<fileId>" (game defaults to skyrimspecialedition).
   * url:   direct download URL to an archive or single file.
   * github:"owner/repo@tag/assetName".
   */
  sourceRef: string
  archiveSha256?: string
  files: ModFile[]
  /** ESP/ESL/ESM filename inside Data/, if this mod ships a plugin. */
  plugin?: string
  /** Lower indices load first. */
  loadOrderIndex?: number
  notes?: string
}

export interface ModlistManifest {
  schemaVersion: 1
  name: string
  version: string
  gameVersion: string
  strVersion: string
  publishedAt: string
  serverHint?: { host: string; port: number; password?: string }
  mods: ModEntry[]
}

export interface LauncherConfig {
  skyrimPathOverride?: string
  autoUpdateEnabled: boolean
  defaultServerPort: number
  favorites: ServerFavorite[]
  lastModlistUrl?: string
}

export interface ServerFavorite {
  id: string
  name: string
  host: string
  port: number
  modlistUrl?: string
  password?: string
}

export interface ServerConfig {
  name: string
  port: number
  maxPlayers: number
  password?: string
  adminPassword?: string
  motd?: string
  /** Free-form extra keys preserved on TOML round-trip. */
  extras?: Record<string, unknown>
}

export type HealthLevel = 'ok' | 'warn' | 'error' | 'unknown'

export interface HealthRow {
  id: string
  label: string
  level: HealthLevel
  detail?: string
}

export interface SkyrimDetection {
  installPath?: string
  exeVersion?: string
  steamLibrary?: string
  hasBeenLaunched: boolean
  problems: string[]
}

export interface PrereqStatus {
  id: 'skse64' | 'addrlib' | 'str'
  installed: boolean
  installedVersion?: string
  requiredVersion: string
  downloadUrl: string
  archiveSha256?: string
}

export interface ModlistDiffEntry {
  modId: string
  displayName: string
  status: 'missing' | 'wrong-hash' | 'extra' | 'ok'
  files: { path: string; status: 'missing' | 'wrong-hash' | 'ok' }[]
}

export interface ModlistDiff {
  entries: ModlistDiffEntry[]
  missingCount: number
  wrongHashCount: number
  okCount: number
  /** Plugins (.esp/.esl/.esm) present in Data/ that the modlist does NOT list. */
  extraPluginsOnDisk: string[]
  /** Subset of extras that are currently *enabled* in plugins.txt. */
  extraPluginsEnabled: string[]
}

export interface ProgressEvent {
  id: string
  label: string
  phase: 'download' | 'verify' | 'extract' | 'install' | 'done' | 'error'
  bytes?: number
  totalBytes?: number
  message?: string
}
