import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { copyFile, exists, sha256File, walk } from './fs-util'
import { getNexusKey } from './credentials'
import type { ModlistManifest } from '@shared/types'

export interface ModManagerDetection {
  mo2: { detected: boolean; instancePaths: string[]; stagingPaths: string[] }
  vortex: { detected: boolean; stagingPaths: string[] }
}

/** Detect installed mod managers in standard locations. */
export async function detectModManagers(): Promise<ModManagerDetection> {
  const mo2Instances: string[] = []
  const appData = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming')
  const localAppData = process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local')

  const mo2Root = path.join(localAppData, 'ModOrganizer')
  if (await exists(mo2Root)) {
    const dirs = await fs.readdir(mo2Root, { withFileTypes: true }).catch(() => [])
    for (const d of dirs) {
      if (d.isDirectory() && (await exists(path.join(mo2Root, d.name, 'ModOrganizer.ini')))) {
        mo2Instances.push(path.join(mo2Root, d.name))
      }
    }
  }
  const mo2Staging: string[] = []
  for (const inst of mo2Instances) {
    const staging = path.join(inst, 'mods')
    if (await exists(staging)) mo2Staging.push(staging)
  }

  const vortexBase = path.join(appData, 'Vortex')
  const vortexStaging: string[] = []
  if (await exists(vortexBase)) {
    // Vortex stores staged mods at %APPDATA%\Vortex\<gameId>\mods. For Skyrim SE the gameId is "skyrimse".
    for (const gameId of ['skyrimse', 'skyrim']) {
      const p = path.join(vortexBase, gameId, 'mods')
      if (await exists(p)) vortexStaging.push(p)
    }
  }

  return {
    mo2: { detected: mo2Instances.length > 0, instancePaths: mo2Instances, stagingPaths: mo2Staging },
    vortex: { detected: vortexStaging.length > 0, stagingPaths: vortexStaging }
  }
}

/**
 * Build a publishable modlist from a Vortex/MO2 staging dir. For each immediate
 * subdirectory (one mod):
 *   1. Locate the original archive in the same manager's downloads folder by
 *      matching folder name (Vortex names extracted folders identically to the archive
 *      sans extension).
 *   2. Hash every file in the staging folder (per-file verification on client).
 *   3. Extract the Nexus mod id from the archive name (Vortex pattern:
 *      `<name>-<modId>-<version>-<vortexTimestamp>.<ext>`). If `nexusMode` is true,
 *      output a `source: 'nexus'` ref `<modId>/REPLACE_FILE_ID` so the host fills the
 *      file id from the Nexus "Files" tab. Otherwise, build `source: 'url'` pointing
 *      at `<publishBaseUrl>/<archive-filename>`.
 *   4. If `bundleDir` is provided, copy each archive there so the host can upload
 *      the whole folder to their CDN as-is.
 *
 * Result: a fully populated, ready-to-publish modlist.json — no REPLACE_ME unless
 * Nexus mode is selected and only for the file id field.
 */
export async function buildTemplateFromStaging(
  stagingPath: string,
  meta: {
    name: string
    version: string
    gameVersion: string
    strVersion: string
    publishBaseUrl?: string
    bundleDir?: string
    nexusMode?: boolean
  }
): Promise<{
  manifest: ModlistManifest
  archivesFound: number
  archivesMissing: string[]
  bundledTo?: string
  nexusResolved: number
  nexusUnresolved: string[]
}> {
  const downloadsDir = inferDownloadsDir(stagingPath)
  const archiveIndex = downloadsDir ? await indexArchives(downloadsDir) : new Map<string, string>()
  const nexusKey = meta.nexusMode ? await getNexusKey() : undefined
  const filesCache = new Map<string, NexusFileEntry[]>()
  let nexusResolved = 0
  const nexusUnresolved: string[] = []

  const entries = await fs.readdir(stagingPath, { withFileTypes: true })
  const modDirs = entries.filter((e) => e.isDirectory())
  const mods: ModlistManifest['mods'] = []
  const archivesMissing: string[] = []
  let archivesFound = 0
  let idx = 0
  const baseUrl = (meta.publishBaseUrl ?? '').replace(/\/+$/, '')

  for (const d of modDirs) {
    const modRoot = path.join(stagingPath, d.name)
    const files: ModlistManifest['mods'][number]['files'] = []
    let plugin: string | undefined

    for await (const full of walk(modRoot)) {
      const rel = path.relative(modRoot, full).replace(/\\/g, '/')
      // skip non-game files at the mod root (metadata, screenshots, __folder_meta etc.)
      const isDataPath = rel.toLowerCase().startsWith('data/')
      const isLooseEsp = /^[^/]+\.(esp|esm|esl|bsa)$/i.test(rel)
      if (!isDataPath && !isLooseEsp) continue
      const stat = await fs.stat(full)
      files.push({
        path: isDataPath ? rel : `Data/${rel}`,
        sha256: await sha256File(full),
        size: stat.size
      })
      if (!plugin && /\.(esp|esm|esl)$/i.test(rel)) {
        plugin = path.basename(rel)
      }
    }
    if (files.length === 0) continue
    idx += 1

    // Find this mod's source archive in the downloads folder (Vortex names them identically).
    const archiveAbs = archiveIndex.get(d.name)
    const archiveName = archiveAbs ? path.basename(archiveAbs) : undefined
    if (archiveAbs) {
      archivesFound += 1
      if (meta.bundleDir) {
        await copyFile(archiveAbs, path.join(meta.bundleDir, path.basename(archiveAbs)))
      }
    } else {
      archivesMissing.push(d.name)
    }

    // Parse Nexus mod id from Vortex archive/folder name.
    // Pattern observed: <displayName>-<modId>-<version>-<timestamp>.<ext>
    // We grab the LAST numeric segment that is followed only by version-ish chunks
    // and a final 10-digit timestamp.
    const modIdMatch = d.name.match(/-(\d+)(?:-[\w.]+)*-\d{8,}$/)
    const nexusModId = modIdMatch?.[1]

    let source: 'url' | 'nexus' = 'url'
    let sourceRef: string
    if (meta.nexusMode && nexusModId) {
      source = 'nexus'
      const fileId = await resolveNexusFileId(nexusModId, archiveName, nexusKey, filesCache)
      if (fileId) {
        sourceRef = `skyrimspecialedition/${nexusModId}/${fileId}`
        nexusResolved += 1
      } else {
        sourceRef = `skyrimspecialedition/${nexusModId}/REPLACE_FILE_ID`
        nexusUnresolved.push(d.name)
      }
    } else if (archiveName && baseUrl) {
      sourceRef = `${baseUrl}/${encodeURIComponent(archiveName)}`
    } else if (archiveName) {
      sourceRef = `REPLACE_BASE_URL/${archiveName}`
    } else if (nexusModId) {
      source = 'nexus'
      sourceRef = `skyrimspecialedition/${nexusModId}/REPLACE_FILE_ID`
    } else {
      sourceRef = `REPLACE_BASE_URL/${d.name}.zip`
    }

    // Friendlier display name: strip the trailing -modId-version-timestamp tail.
    const friendly = d.name.replace(/-(\d+)(-[\w.]+)*-\d{8,}$/, '').trim() || d.name

    mods.push({
      id: friendly.replace(/\W+/g, '-').toLowerCase().slice(0, 60) || `mod-${idx}`,
      displayName: friendly,
      source,
      sourceRef,
      files,
      ...(plugin ? { plugin } : {}),
      loadOrderIndex: idx * 10,
      notes:
        (archiveName ? `Archive: ${archiveName}. ` : '') +
        (nexusModId ? `Nexus mod ${nexusModId}. ` : '') +
        `Imported from ${path.basename(path.dirname(stagingPath))}.`
    })
  }

  return {
    manifest: {
      schemaVersion: 1,
      name: meta.name,
      version: meta.version,
      gameVersion: meta.gameVersion,
      strVersion: meta.strVersion,
      publishedAt: new Date().toISOString(),
      mods
    },
    archivesFound,
    archivesMissing,
    bundledTo: meta.bundleDir,
    nexusResolved,
    nexusUnresolved
  }
}

/** Given a staging path, locate the matching downloads dir. */
function inferDownloadsDir(stagingPath: string): string | undefined {
  // Vortex: <APPDATA>/Vortex/<gameId>/mods → <APPDATA>/Vortex/downloads/<gameId>
  const norm = stagingPath.replace(/\\/g, '/')
  const m = norm.match(/^(.*\/Vortex)\/([^/]+)\/mods$/i)
  if (m) {
    const [, vortexRoot, gameId] = m
    return path.join(vortexRoot.replace(/\//g, path.sep), 'downloads', gameId)
  }
  // MO2: <inst>/mods → <inst>/downloads
  const m2 = norm.match(/^(.+)\/mods$/)
  if (m2) {
    const candidate = path.join(m2[1].replace(/\//g, path.sep), 'downloads')
    return candidate
  }
  return undefined
}

/** Build a map of "folder-name-without-extension" → absolute archive path. */
async function indexArchives(downloadsDir: string): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (!(await exists(downloadsDir))) return out
  const entries = await fs.readdir(downloadsDir, { withFileTypes: true })
  for (const e of entries) {
    if (!e.isFile()) continue
    if (!/\.(zip|7z|rar)$/i.test(e.name)) continue
    const stem = e.name.replace(/\.(zip|7z|rar)$/i, '')
    out.set(stem, path.join(downloadsDir, e.name))
  }
  return out
}

interface NexusFileEntry {
  file_id: number
  file_name: string
  category_name: string | null
  category_id: number
  is_primary?: boolean
  version?: string
  uploaded_timestamp?: number
}

/**
 * Look up the Nexus file_id for a given mod. We prefer an exact filename match
 * (Vortex preserves the original Nexus filename). If no exact match, fall back to
 * the most-recent MAIN file (`category_id === 1`).
 */
async function resolveNexusFileId(
  modId: string,
  archiveName: string | undefined,
  apiKey: string | undefined,
  cache: Map<string, NexusFileEntry[]>
): Promise<number | undefined> {
  if (!apiKey) return undefined
  try {
    let files = cache.get(modId)
    if (!files) {
      const { default: got } = await import('got')
      const url = `https://api.nexusmods.com/v1/games/skyrimspecialedition/mods/${modId}/files.json`
      const body = (await got(url, {
        headers: { apikey: apiKey, accept: 'application/json' },
        timeout: { request: 15000 }
      }).json()) as { files?: NexusFileEntry[] }
      files = body.files ?? []
      cache.set(modId, files)
    }
    if (files.length === 0) return undefined
    if (archiveName) {
      const exact = files.find((f) => f.file_name === archiveName)
      if (exact) return exact.file_id
    }
    // Fall back to newest MAIN file. category_id 1 = MAIN per Nexus API docs.
    const mains = files.filter((f) => f.category_id === 1)
    const pool = mains.length > 0 ? mains : files
    pool.sort((a, b) => (b.uploaded_timestamp ?? 0) - (a.uploaded_timestamp ?? 0))
    return pool[0]?.file_id
  } catch {
    return undefined
  }
}

// ---------------------------------------------------------------------------
// Local-archive reuse (client-side install path).
//
// If the user already has Vortex or MO2 installed AND the required archive sits
// in one of those downloads folders, we can install from disk and skip the
// Nexus download endpoint entirely. This is critical for users without Nexus
// Premium — they can manually download via Vortex/MO2 once, and ERA will
// reuse those archives forever after.
// ---------------------------------------------------------------------------

/** Enumerate every Vortex/MO2 downloads folder present on this machine. */
export async function enumerateLocalDownloadDirs(): Promise<string[]> {
  const det = await detectModManagers()
  const out: string[] = []
  for (const s of det.vortex.stagingPaths) {
    const d = inferDownloadsDir(s)
    if (d && (await exists(d))) out.push(d)
  }
  for (const s of det.mo2.stagingPaths) {
    const d = inferDownloadsDir(s)
    if (d && (await exists(d))) out.push(d)
  }
  // Dedupe
  return Array.from(new Set(out))
}

/** Look up an archive by exact filename in any local mod-manager downloads dir. */
export async function findLocalArchive(filename: string): Promise<string | undefined> {
  if (!filename) return undefined
  const dirs = await enumerateLocalDownloadDirs()
  for (const d of dirs) {
    const p = path.join(d, filename)
    if (await exists(p)) return p
  }
  return undefined
}

/**
 * Resolve a Nexus `<game>/<modId>/<fileId>` to a local archive path by:
 *   1. Asking Nexus what filename `<modId>/<fileId>` corresponds to.
 *   2. Searching all detected Vortex/MO2 downloads dirs for that exact name.
 * Requires a Nexus API key (to call `files.json`). Returns undefined on any
 * failure so callers can fall back to the normal download flow.
 */
export async function findLocalNexusArchive(
  game: string,
  modId: string,
  fileId: string
): Promise<string | undefined> {
  const apiKey = await getNexusKey()
  if (!apiKey) return undefined
  try {
    const { default: got } = await import('got')
    const url = `https://api.nexusmods.com/v1/games/${game}/mods/${modId}/files.json`
    const body = (await got(url, {
      headers: { apikey: apiKey, accept: 'application/json' },
      timeout: { request: 15000 }
    }).json()) as { files?: NexusFileEntry[] }
    const files = body.files ?? []
    const match = files.find((f) => String(f.file_id) === String(fileId))
    if (!match) return undefined
    return findLocalArchive(match.file_name)
  } catch {
    return undefined
  }
}