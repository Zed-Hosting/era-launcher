import path from 'node:path'
import { promises as fs } from 'node:fs'
import { app } from 'electron'
import { downloadToFile, ensureDir, exists, sha256File } from './fs-util'
import { extractArchive, rimraf } from './archive'
import { getNexusKey } from './credentials'
import { findLocalArchive } from './mod-manager'
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
  papyrusUtil: {
    requiredVersion: string
    downloadUrl: string
    nexus?: { game: string; modId: number }
    marker: string
  }
  uiExtensions: {
    requiredVersion: string
    downloadUrl: string
    nexus?: { game: string; modId: number }
    marker: string
  }
  eraAh: {
    requiredVersion: string
    downloadUrl: string
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
    },
    {
      id: 'papyrus-util',
      installed: await probe(cfg.papyrusUtil.marker),
      requiredVersion: cfg.papyrusUtil.requiredVersion,
      downloadUrl: cfg.papyrusUtil.downloadUrl,
      requiresUserArchive: true
    },
    {
      id: 'ui-extensions',
      installed: await probe(cfg.uiExtensions.marker),
      requiredVersion: cfg.uiExtensions.requiredVersion,
      downloadUrl: cfg.uiExtensions.downloadUrl,
      requiresUserArchive: true
    },
    {
      id: 'era-ah',
      installed: await probe(cfg.eraAh.marker),
      requiredVersion: cfg.eraAh.requiredVersion,
      downloadUrl: cfg.eraAh.downloadUrl
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

interface NexusFileEntry {
  file_id: number
  file_name: string
  category_id: number
  uploaded_timestamp?: number
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

async function resolveLatestNexusFile(
  game: string,
  modId: number
): Promise<{ fileId: number; fileName: string; url: string }> {
  const apiKey = await getNexusKey()
  if (!apiKey) {
    throw new Error('Nexus API key required for this prerequisite. Add it in Settings or provide a local archive path.')
  }
  const { default: got } = await import('got')
  const listUrl = `https://api.nexusmods.com/v1/games/${game}/mods/${modId}/files.json`
  const body = (await got(listUrl, {
    headers: { apikey: apiKey, accept: 'application/json' },
    timeout: { request: 15000 }
  }).json()) as { files?: NexusFileEntry[] }
  const files = body.files ?? []
  if (files.length === 0) throw new Error(`Nexus returned no files for mod ${modId}.`)
  const mains = files.filter((f) => f.category_id === 1)
  const pool = mains.length > 0 ? mains : files
  pool.sort((a, b) => (b.uploaded_timestamp ?? 0) - (a.uploaded_timestamp ?? 0))
  const file = pool[0]
  if (!file?.file_name) throw new Error(`Could not resolve a downloadable file for Nexus mod ${modId}.`)
  const linkUrl = `https://api.nexusmods.com/v1/games/${game}/mods/${modId}/files/${file.file_id}/download_link.json`
  let links: any
  try {
    links = await got(linkUrl, {
      headers: { apikey: apiKey, accept: 'application/json' },
      timeout: { request: 15000 }
    }).json()
  } catch (error: any) {
    const status = error?.response?.statusCode
    if (status === 403) {
      throw new Error(
        'Nexus rejected the download request (HTTP 403). The Nexus public API only returns direct download links to Nexus Premium accounts. ' +
        'Either upgrade to Nexus Premium, or download the archive once via Vortex/MO2 and ERA will reuse it.'
      )
    }
    throw error
  }
  if (!Array.isArray(links) || links.length === 0 || !links[0]?.URI) {
    throw new Error('Nexus returned no direct download link (Premium may be required).')
  }
  return { fileId: file.file_id, fileName: file.file_name, url: links[0].URI }
}

async function resolveNexusArchive(
  nexus: { game: string; modId: number } | undefined,
  label: string,
  onProgress?: InstallProgress
): Promise<string> {
  if (!nexus) throw new Error(`${label} is missing Nexus metadata.`)
  onProgress?.('download', `Resolving ${label}…`)
  const resolved = await resolveLatestNexusFile(nexus.game, nexus.modId)
  const local = await findLocalArchive(resolved.fileName)
  if (local) {
    onProgress?.('download', `Using local archive: ${path.basename(local)}`)
    return local
  }
  try {
    const { archivePath } = await fetchToDownloads(resolved.url, resolved.fileName, onProgress)
    return archivePath
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Could not auto-download ${label}. ${message} ` +
      'If you do not have Nexus Premium, download it once in Vortex/MO2 or provide a local archive path.'
    )
  }
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

export async function installAddrLib(
  skyrimPath: string,
  archivePath: string | undefined,
  onProgress?: InstallProgress
): Promise<void> {
  const cfg = await loadPrereqsConfig()
  const resolvedArchivePath = archivePath || await resolveNexusArchive(cfg.addrlib.nexus, 'Address Library', onProgress)
  await installAddrLibFromArchive(skyrimPath, resolvedArchivePath, onProgress)
}

/**
 * Install PapyrusUtil SE from a user-supplied archive (Nexus-gated, same flow as AddrLib).
 * Archive may be rooted at Data/ or at SKSE/ — we detect either layout.
 */
export async function installPapyrusUtilFromArchive(
  skyrimPath: string,
  archivePath: string,
  onProgress?: InstallProgress
): Promise<void> {
  if (!(await exists(archivePath))) throw new Error(`Archive not found: ${archivePath}`)
  onProgress?.('extract', 'Extracting PapyrusUtil…')
  const stagingDir = path.join(downloadsDir(), 'papyrusutil-staging')
  await rimraf(stagingDir)
  await extractArchive(archivePath, stagingDir)
  onProgress?.('install', 'Installing PapyrusUtil files…')
  const top: string[] = await fs.readdir(stagingDir).catch<string[]>(() => [])
  const hasData = top.includes('Data')
  const src = stagingDir
  const dst = hasData ? skyrimPath : path.join(skyrimPath, 'Data')
  await copyTree(src, dst)
  onProgress?.('done', 'PapyrusUtil installed.')
}

export async function installPapyrusUtil(
  skyrimPath: string,
  archivePath: string | undefined,
  onProgress?: InstallProgress
): Promise<void> {
  const cfg = await loadPrereqsConfig()
  const resolvedArchivePath = archivePath || await resolveNexusArchive(cfg.papyrusUtil.nexus, 'PapyrusUtil', onProgress)
  await installPapyrusUtilFromArchive(skyrimPath, resolvedArchivePath, onProgress)
}

/**
 * Install UIExtensions SE from a user-supplied archive (Nexus-gated).
 * Archive may be rooted at Data/ or at Interface/ — we detect either layout
 * and place everything under Data/.
 */
export async function installUIExtensionsFromArchive(
  skyrimPath: string,
  archivePath: string,
  onProgress?: InstallProgress
): Promise<void> {
  if (!(await exists(archivePath))) throw new Error(`Archive not found: ${archivePath}`)
  onProgress?.('extract', 'Extracting UIExtensions…')
  const stagingDir = path.join(downloadsDir(), 'uiextensions-staging')
  await rimraf(stagingDir)
  await extractArchive(archivePath, stagingDir)
  onProgress?.('install', 'Installing UIExtensions files…')
  const top: string[] = await fs.readdir(stagingDir).catch<string[]>(() => [])
  const hasData = top.includes('Data')
  const dst = hasData ? skyrimPath : path.join(skyrimPath, 'Data')
  await copyTree(stagingDir, dst)
  onProgress?.('done', 'UIExtensions installed.')
}

export async function installUIExtensions(
  skyrimPath: string,
  archivePath: string | undefined,
  onProgress?: InstallProgress
): Promise<void> {
  const cfg = await loadPrereqsConfig()
  const resolvedArchivePath = archivePath || await resolveNexusArchive(cfg.uiExtensions.nexus, 'UIExtensions', onProgress)
  await installUIExtensionsFromArchive(skyrimPath, resolvedArchivePath, onProgress)
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
