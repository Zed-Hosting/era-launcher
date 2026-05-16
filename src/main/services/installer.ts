import path from 'node:path'
import { promises as fs } from 'node:fs'
import { app } from 'electron'
import { downloadToFile, ensureDir, exists, sha256File } from './fs-util'
import { extractArchive, rimraf } from './archive'
import type { PrereqStatus } from '@shared/types'

interface PrereqsConfig {
  schemaVersion: number
  skse64: { requiredVersion: string; downloadUrl: string; archiveSha256?: string; marker: string }
  addrlib: {
    requiredVersion: string
    downloadUrl: string
    nexus?: { game: string; modId: number }
    marker: string
  }
  str: {
    requiredVersion: string
    githubRepo: string
    fallbackNexus: string
    marker: string
  }
}

function resourcePath(): string {
  // When packaged, electron-builder copies resources/ to process.resourcesPath/resources.
  // In dev, fall back to project root.
  if (app.isPackaged) return path.join(process.resourcesPath, 'resources')
  return path.join(process.cwd(), 'resources')
}

let cached: PrereqsConfig | null = null
export async function loadPrereqsConfig(): Promise<PrereqsConfig> {
  if (cached) return cached
  const text = await fs.readFile(path.join(resourcePath(), 'prereqs.json'), 'utf8')
  cached = JSON.parse(text) as PrereqsConfig
  return cached
}

export async function getPrereqStatuses(skyrimPath: string): Promise<PrereqStatus[]> {
  const cfg = await loadPrereqsConfig()
  const probe = async (marker: string) => exists(path.join(skyrimPath, marker))
  return [
    {
      id: 'skse64',
      installed: await probe(cfg.skse64.marker),
      requiredVersion: cfg.skse64.requiredVersion,
      downloadUrl: cfg.skse64.downloadUrl,
      archiveSha256: cfg.skse64.archiveSha256
    },
    {
      id: 'addrlib',
      installed: await probe(cfg.addrlib.marker),
      requiredVersion: cfg.addrlib.requiredVersion,
      downloadUrl: cfg.addrlib.downloadUrl
    },
    {
      id: 'str',
      installed: await probe(cfg.str.marker),
      requiredVersion: cfg.str.requiredVersion,
      downloadUrl: `https://github.com/${cfg.str.githubRepo}/releases/latest`
    }
  ]
}

function downloadsDir(): string {
  const d = path.join(app.getPath('userData'), 'downloads')
  return d
}

export interface InstallProgress {
  (phase: 'download' | 'verify' | 'extract' | 'install' | 'done' | 'error', message: string, bytes?: number, total?: number): void
}

/**
 * Resolve the latest STR client release asset from GitHub.
 * Returns { url, version, archiveName }.
 */
async function resolveStrLatest(): Promise<{ url: string; version: string; assetName: string } | undefined> {
  const cfg = await loadPrereqsConfig()
  const { default: got } = await import('got')
  try {
    const api = `https://api.github.com/repos/${cfg.str.githubRepo}/releases/latest`
    const release: any = await got(api, {
      headers: { 'user-agent': 'era-launcher', accept: 'application/vnd.github+json' }
    }).json()
    const asset = (release.assets ?? []).find((a: any) =>
      /skyrim.?together.*\.(zip|7z)$/i.test(a.name)
    )
    if (!asset) return undefined
    return { url: asset.browser_download_url, version: release.tag_name, assetName: asset.name }
  } catch {
    return undefined
  }
}

/** Download a URL to userData/downloads and return the resolved path + hash. */
async function fetchToDownloads(
  url: string,
  filename: string,
  onProgress?: InstallProgress
): Promise<{ archivePath: string; sha256: string }> {
  await ensureDir(downloadsDir())
  const archivePath = path.join(downloadsDir(), filename)
  // Resume support: if file exists and is non-empty, skip re-download and rehash.
  if (await exists(archivePath)) {
    const existing = await sha256File(archivePath)
    return { archivePath, sha256: existing }
  }
  onProgress?.('download', `Downloading ${filename}…`)
  const sha = await downloadToFile(url, archivePath, (bytes, total) => {
    onProgress?.('download', filename, bytes, total)
  })
  return { archivePath, sha256: sha }
}

export async function installSkse(skyrimPath: string, onProgress?: InstallProgress): Promise<void> {
  const cfg = await loadPrereqsConfig()
  const { archivePath, sha256 } = await fetchToDownloads(
    cfg.skse64.downloadUrl,
    path.basename(cfg.skse64.downloadUrl),
    onProgress
  )
  if (cfg.skse64.archiveSha256 && cfg.skse64.archiveSha256.length === 64 && sha256 !== cfg.skse64.archiveSha256) {
    throw new Error(`SKSE archive hash mismatch (got ${sha256}).`)
  }
  onProgress?.('extract', 'Extracting SKSE…')
  const stagingDir = path.join(downloadsDir(), 'skse-staging')
  await rimraf(stagingDir)
  await extractArchive(archivePath, stagingDir)

  onProgress?.('install', 'Installing SKSE files…')
  // SKSE archives contain a top-level skse64_* folder; copy its contents (skipping src/).
  const top = (await fs.readdir(stagingDir, { withFileTypes: true })).find((e) => e.isDirectory())
  const src = top ? path.join(stagingDir, top.name) : stagingDir
  await copyTree(src, skyrimPath, (rel) => !rel.startsWith('src'))
  onProgress?.('done', 'SKSE installed.')
}

/**
 * Installing Address Library from Nexus requires the user's Nexus session — we cannot
 * legally auto-bypass that. We open the Nexus page and let the user drop the archive
 * into the launcher. This function only validates a user-provided archive path.
 */
export async function installAddrLibFromArchive(
  skyrimPath: string,
  archivePath: string,
  onProgress?: InstallProgress
): Promise<void> {
  if (!(await exists(archivePath))) throw new Error(`Archive not found: ${archivePath}`)
  onProgress?.('extract', 'Extracting Address Library…')
  const stagingDir = path.join(downloadsDir(), 'addrlib-staging')
  await rimraf(stagingDir)
  await extractArchive(archivePath, stagingDir)
  onProgress?.('install', 'Installing Address Library files…')
  // AddrLib archive layout: SKSE/Plugins/*.bin -> place under Data/SKSE/Plugins/.
  // Detect whether archive starts at Data/ or at SKSE/.
  const top: string[] = await fs.readdir(stagingDir).catch<string[]>(() => [])
  const hasData = top.includes('Data')
  const src = hasData ? stagingDir : path.join(stagingDir)
  const dst = hasData ? skyrimPath : path.join(skyrimPath, 'Data')
  await copyTree(src, dst)
  onProgress?.('done', 'Address Library installed.')
}

export async function installStr(skyrimPath: string, onProgress?: InstallProgress): Promise<void> {
  const latest = await resolveStrLatest()
  if (!latest) throw new Error('Could not resolve latest STR release from GitHub.')
  const { archivePath } = await fetchToDownloads(latest.url, latest.assetName, onProgress)
  onProgress?.('extract', 'Extracting STR…')
  const stagingDir = path.join(downloadsDir(), 'str-staging')
  await rimraf(stagingDir)
  await extractArchive(archivePath, stagingDir)
  onProgress?.('install', 'Installing STR files…')
  await copyTree(stagingDir, skyrimPath)
  onProgress?.('done', 'STR installed.')
}

/** Recursively copy src tree into dst, optionally filtered by relative path. */
async function copyTree(
  src: string,
  dst: string,
  filter?: (relPath: string) => boolean,
  relRoot = ''
): Promise<void> {
  const entries = await fs.readdir(src, { withFileTypes: true }).catch(() => [])
  for (const e of entries) {
    const srcPath = path.join(src, e.name)
    const rel = path.join(relRoot, e.name).split(path.sep).join('/')
    if (filter && !filter(rel)) continue
    const dstPath = path.join(dst, e.name)
    if (e.isDirectory()) {
      await ensureDir(dstPath)
      await copyTree(srcPath, dstPath, filter, rel)
    } else if (e.isFile()) {
      await ensureDir(path.dirname(dstPath))
      await fs.copyFile(srcPath, dstPath)
    }
  }
}
