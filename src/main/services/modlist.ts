import path from 'node:path'
import { promises as fs } from 'node:fs'
import { z } from 'zod'
import { modlistManifestSchema } from '@shared/schema'
import type { ModEntry, ModlistDiff, ModlistManifest } from '@shared/types'
import { downloadToFile, ensureDir, exists, sha256File } from './fs-util'
import { extractArchive, rimraf } from './archive'
import { getNexusKey } from './credentials'
import { findLocalArchive, findLocalNexusArchive } from './mod-manager'

/** Plugin extensions Skyrim SE recognizes. */
const PLUGIN_EXT_RE = /\.(esp|esl|esm)$/i

/** Vanilla / DLC plugins that are always loaded by the engine; never quarantine these. */
const VANILLA_PLUGINS = new Set(
  [
    'Skyrim.esm',
    'Update.esm',
    'Dawnguard.esm',
    'HearthFires.esm',
    'Dragonborn.esm',
    'ccBGSSSE001-Fish.esm',
    '_ResourcePack.esl'
  ].map((s) => s.toLowerCase())
)

/** Names of every plugin file currently sitting in Skyrim's Data folder. */
export async function scanInstalledPlugins(skyrimPath: string): Promise<string[]> {
  const dataDir = path.join(skyrimPath, 'Data')
  const entries = await fs.readdir(dataDir).catch(() => [])
  return entries.filter((n) => PLUGIN_EXT_RE.test(n))
}

/** Parse a Skyrim SE plugins.txt body into { enabled, listed }. */
export function parsePluginsTxt(text: string): { enabled: string[]; listed: string[] } {
  const enabled: string[] = []
  const listed: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const isEnabled = line.startsWith('*')
    const name = (isEnabled ? line.slice(1) : line).trim()
    if (!PLUGIN_EXT_RE.test(name)) continue
    listed.push(name)
    if (isEnabled) enabled.push(name)
  }
  return { enabled, listed }
}

async function readCurrentPluginsTxt(): Promise<{ enabled: string[]; listed: string[] }> {
  const localAppData = process.env.LOCALAPPDATA
  if (!localAppData) return { enabled: [], listed: [] }
  const target = path.join(localAppData, 'Skyrim Special Edition', 'plugins.txt')
  try {
    return parsePluginsTxt(await fs.readFile(target, 'utf8'))
  } catch {
    return { enabled: [], listed: [] }
  }
}

/** Fetch a modlist JSON from a URL or local path. */
export async function fetchModlist(source: string): Promise<ModlistManifest> {
  let text: string
  if (/^https?:\/\//i.test(source)) {
    const { default: got } = await import('got')
    text = await got(source).text()
  } else {
    text = await fs.readFile(source, 'utf8')
  }
  const json = JSON.parse(text)
  return modlistManifestSchema.parse(json) as ModlistManifest
}

/**
 * Compute a diff between the modlist and what's currently on disk in skyrimPath.
 * Pure-ish: only reads files, no writes.
 */
export async function diffModlist(
  manifest: ModlistManifest,
  skyrimPath: string
): Promise<ModlistDiff> {
  const entries: ModlistDiff['entries'] = []
  let missing = 0
  let wrong = 0
  let ok = 0
  for (const mod of manifest.mods) {
    const fileResults: { path: string; status: 'missing' | 'wrong-hash' | 'ok' }[] = []
    for (const f of mod.files) {
      const abs = path.join(skyrimPath, f.path)
      if (!(await exists(abs))) {
        fileResults.push({ path: f.path, status: 'missing' })
      } else {
        const sha = await sha256File(abs)
        fileResults.push({ path: f.path, status: sha === f.sha256 ? 'ok' : 'wrong-hash' })
      }
    }
    const status: 'missing' | 'wrong-hash' | 'ok' = fileResults.every((r) => r.status === 'ok')
      ? 'ok'
      : fileResults.some((r) => r.status === 'wrong-hash')
        ? 'wrong-hash'
        : 'missing'
    if (status === 'ok') ok++
    else if (status === 'wrong-hash') wrong++
    else missing++
    entries.push({ modId: mod.id, displayName: mod.displayName, status, files: fileResults })
  }

  // Detect extras: any plugin in Data/ that is not declared in the manifest and isn't vanilla.
  const approvedPlugins = new Set(
    manifest.mods.map((m) => m.plugin?.toLowerCase()).filter((p): p is string => !!p)
  )
  const onDisk = await scanInstalledPlugins(skyrimPath)
  const extraPluginsOnDisk = onDisk.filter(
    (p) => !approvedPlugins.has(p.toLowerCase()) && !VANILLA_PLUGINS.has(p.toLowerCase())
  )
  const { enabled } = await readCurrentPluginsTxt()
  const enabledLc = new Set(enabled.map((p) => p.toLowerCase()))
  const extraPluginsEnabled = extraPluginsOnDisk.filter((p) => enabledLc.has(p.toLowerCase()))

  return {
    entries,
    missingCount: missing,
    wrongHashCount: wrong,
    okCount: ok,
    extraPluginsOnDisk,
    extraPluginsEnabled
  }
}

/**
 * Build a plugins.txt body that enforces the manifest:
 *   - Each manifest plugin appears in load order with '*' (enabled).
 *   - Each extra plugin on disk is listed WITHOUT '*' (explicitly disabled), so the
 *     game knows about them but won't load them.
 * `extraPlugins` should be the list of plugin filenames in Data/ that aren't in the manifest.
 */
export function buildPluginsTxt(manifest: ModlistManifest, extraPlugins: string[] = []): string {
  const ordered = manifest.mods
    .filter((m) => !!m.plugin)
    .sort((a, b) => (a.loadOrderIndex ?? 9999) - (b.loadOrderIndex ?? 9999))
  const lines: string[] = []
  for (const m of ordered) lines.push(`*${m.plugin}`)
  for (const p of extraPlugins) {
    if (VANILLA_PLUGINS.has(p.toLowerCase())) continue
    lines.push(p) // no '*' => explicitly disabled
  }
  return lines.join('\r\n') + '\r\n'
}

/**
 * Rewrite plugins.txt so ONLY manifest plugins are enabled. Any extras present in Data/
 * are listed without '*' (disabled). Returns the path written, or undefined if we can't
 * resolve %LOCALAPPDATA% (non-Windows dev).
 */
export async function writePluginsTxt(
  manifest: ModlistManifest,
  skyrimPath?: string
): Promise<string | undefined> {
  const localAppData = process.env.LOCALAPPDATA
  if (!localAppData) return undefined
  const target = path.join(localAppData, 'Skyrim Special Edition', 'plugins.txt')
  let extras: string[] = []
  if (skyrimPath) {
    const onDisk = await scanInstalledPlugins(skyrimPath)
    const approved = new Set(
      manifest.mods.map((m) => m.plugin?.toLowerCase()).filter((p): p is string => !!p)
    )
    extras = onDisk.filter((p) => !approved.has(p.toLowerCase()))
  }
  await ensureDir(path.dirname(target))
  await fs.writeFile(target, buildPluginsTxt(manifest, extras), 'utf8')
  return target
}

/**
 * Enforce the manifest as the single source of truth: rewrite plugins.txt with only
 * approved plugins enabled. Does not modify or delete files on disk.
 */
export async function enforceModlist(
  manifest: ModlistManifest,
  skyrimPath: string
): Promise<{ enabled: string[]; disabled: string[]; path?: string }> {
  const written = await writePluginsTxt(manifest, skyrimPath)
  const onDisk = await scanInstalledPlugins(skyrimPath)
  const approved = new Set(
    manifest.mods.map((m) => m.plugin?.toLowerCase()).filter((p): p is string => !!p)
  )
  const enabled: string[] = []
  const disabled: string[] = []
  for (const m of manifest.mods) if (m.plugin) enabled.push(m.plugin)
  for (const p of onDisk) {
    if (!approved.has(p.toLowerCase()) && !VANILLA_PLUGINS.has(p.toLowerCase())) disabled.push(p)
  }
  return { enabled, disabled, path: written }
}

/**
 * Build a starter modlist manifest from the current Skyrim install. The host uses this
 * as a skeleton to fill in `source`/`sourceRef` and per-file paths/hashes, then publishes.
 */
export async function buildTemplateFromInstall(
  skyrimPath: string,
  meta: { name: string; version: string; gameVersion: string; strVersion: string }
): Promise<ModlistManifest> {
  const onDisk = await scanInstalledPlugins(skyrimPath)
  const approved = onDisk.filter((p) => !VANILLA_PLUGINS.has(p.toLowerCase()))
  return {
    schemaVersion: 1,
    name: meta.name,
    version: meta.version,
    gameVersion: meta.gameVersion,
    strVersion: meta.strVersion,
    publishedAt: new Date().toISOString(),
    mods: approved.map((plugin, i) => ({
      id: plugin.replace(/\W+/g, '-').toLowerCase(),
      displayName: plugin,
      source: 'url' as const,
      sourceRef: 'https://REPLACE_ME/path/to/archive.zip',
      files: [
        {
          path: `Data/${plugin}`,
          sha256: '0'.repeat(64),
          size: 0
        }
      ],
      plugin,
      loadOrderIndex: (i + 1) * 10,
      notes: 'TODO: replace sourceRef + add all archive files with real sha256/size.'
    }))
  }
}

export interface ApplyProgress {
  (modId: string, phase: 'download' | 'verify' | 'extract' | 'install' | 'done' | 'error', message?: string, bytes?: number, total?: number): void
}

/**
 * Resolve a Nexus download URL via the v1 API. Requires the user's Nexus API key.
 * sourceRef format: "<game>/<modId>/<fileId>" or "<modId>/<fileId>" (defaults game).
 *
 * If `<fileId>` is a placeholder (non-numeric, e.g. `REPLACE_FILE_ID`) we self-heal
 * by listing the mod's files and picking the newest MAIN-category file. This keeps
 * sync working when the host shipped a modlist that wasn't fully auto-resolved.
 */
async function resolveNexusUrl(sourceRef: string): Promise<string> {
  const apiKey = await getNexusKey()
  if (!apiKey) throw new Error('Nexus API key required for nexus: sources. Set it in Settings.')
  const parts = sourceRef.split('/')
  let game = 'skyrimspecialedition'
  let modId: string
  let fileId: string
  if (parts.length === 3) [game, modId, fileId] = parts
  else if (parts.length === 2) [modId, fileId] = parts
  else throw new Error(`Invalid nexus sourceRef: ${sourceRef}`)
  const { default: got } = await import('got')

  // Heal placeholder / non-numeric file ids by picking the newest MAIN file.
  if (!/^\d+$/.test(fileId)) {
    const listUrl = `https://api.nexusmods.com/v1/games/${game}/mods/${modId}/files.json`
    const body: any = await got(listUrl, {
      headers: { apikey: apiKey, accept: 'application/json' }
    }).json()
    const files: any[] = body?.files ?? []
    if (files.length === 0) {
      throw new Error(
        `Modlist entry for Nexus mod ${modId} has placeholder file id "${fileId}" and the mod has no files. Ask the host to re-export with a valid Nexus API key.`
      )
    }
    const mains = files.filter((f) => f.category_id === 1)
    const pool = mains.length > 0 ? mains : files
    pool.sort((a, b) => (b.uploaded_timestamp ?? 0) - (a.uploaded_timestamp ?? 0))
    fileId = String(pool[0].file_id)
  }

  const url = `https://api.nexusmods.com/v1/games/${game}/mods/${modId}/files/${fileId}/download_link.json`
  const links: any = await got(url, {
    headers: { apikey: apiKey, accept: 'application/json' }
  }).json()
  if (!Array.isArray(links) || links.length === 0) throw new Error('Nexus returned no download URI.')
  return links[0].URI
}

async function resolveGithubUrl(sourceRef: string): Promise<string> {
  // Format: owner/repo@tag/assetName
  const m = sourceRef.match(/^([^/]+)\/([^@]+)@([^/]+)\/(.+)$/)
  if (!m) throw new Error(`Invalid github sourceRef: ${sourceRef}`)
  const [, owner, repo, tag, asset] = m
  return `https://github.com/${owner}/${repo}/releases/download/${tag}/${asset}`
}

async function resolveDownloadUrl(mod: ModEntry): Promise<string> {
  if (mod.source === 'url') return mod.sourceRef
  if (mod.source === 'github') return resolveGithubUrl(mod.sourceRef)
  if (mod.source === 'nexus') return resolveNexusUrl(mod.sourceRef)
  throw new Error(`Unknown source: ${(mod as any).source}`)
}

/**
 * Look for an already-downloaded archive on disk (Vortex/MO2 downloads dirs)
 * matching this mod. Returns the absolute path or undefined.
 *
 * - nexus: resolve `<game>/<modId>/<fileId>` (heal placeholder file ids) to a
 *   Nexus filename and look for that exact name locally.
 * - url: check if any local downloads dir contains a file with the basename of
 *   the URL (common when the host re-hosted a Nexus archive).
 * - github: skip (asset names rarely collide with Vortex downloads).
 */
async function findLocalArchiveForMod(mod: ModEntry): Promise<string | undefined> {
  if (mod.source === 'nexus') {
    const parts = mod.sourceRef.split('/')
    let game = 'skyrimspecialedition'
    let modId: string
    let fileId: string
    if (parts.length === 3) [game, modId, fileId] = parts
    else if (parts.length === 2) [modId, fileId] = parts
    else return undefined
    // If the file id is a placeholder, resolve it to the newest MAIN file via
    // the Nexus API first (same logic as resolveNexusUrl).
    if (!/^\d+$/.test(fileId)) {
      const apiKey = await getNexusKey()
      if (!apiKey) return undefined
      try {
        const { default: got } = await import('got')
        const listUrl = `https://api.nexusmods.com/v1/games/${game}/mods/${modId}/files.json`
        const body: any = await got(listUrl, {
          headers: { apikey: apiKey, accept: 'application/json' }
        }).json()
        const files: any[] = body?.files ?? []
        if (files.length === 0) return undefined
        const mains = files.filter((f) => f.category_id === 1)
        const pool = mains.length > 0 ? mains : files
        pool.sort((a, b) => (b.uploaded_timestamp ?? 0) - (a.uploaded_timestamp ?? 0))
        fileId = String(pool[0].file_id)
      } catch {
        return undefined
      }
    }
    return findLocalNexusArchive(game, modId, fileId)
  }
  if (mod.source === 'url') {
    try {
      const basename = path.basename(new URL(mod.sourceRef).pathname)
      if (basename) return findLocalArchive(decodeURIComponent(basename))
    } catch {
      /* ignored */
    }
    return undefined
  }
  return undefined
}

/**
 * Apply: download missing/wrong-hash mods, extract, and copy files into place at
 * skyrimPath. Verifies per-file sha256 from the manifest after install.
 */
export async function applyModlist(
  manifest: ModlistManifest,
  skyrimPath: string,
  downloadsDir: string,
  toApply: ModEntry[],
  onProgress?: ApplyProgress
): Promise<{ installed: string[]; failed: { id: string; error: string }[] }> {
  await ensureDir(downloadsDir)
  const installed: string[] = []
  const failed: { id: string; error: string }[] = []

  for (const mod of toApply) {
    try {
      // 1) Try a local mod-manager downloads folder first. Avoids hitting the
      //    Nexus download_link.json endpoint (which requires Premium for direct
      //    download URLs) and avoids re-downloading bytes the user already has.
      onProgress?.(mod.id, 'download', `Looking up ${mod.displayName}`)
      const local = await findLocalArchiveForMod(mod)
      let archivePath: string
      let archiveSha: string
      if (local) {
        archivePath = local
        archiveSha = await sha256File(archivePath)
        onProgress?.(mod.id, 'download', `Using local archive: ${path.basename(local)}`)
      } else {
        onProgress?.(mod.id, 'download', `Resolving ${mod.displayName}`)
        const url = await resolveDownloadUrl(mod)
        const filename = `${mod.id}-${path.basename(new URL(url).pathname) || 'archive'}`
        archivePath = path.join(downloadsDir, filename)
        if (await exists(archivePath)) {
          archiveSha = await sha256File(archivePath)
        } else {
          archiveSha = await downloadToFile(url, archivePath, (bytes, total) =>
            onProgress?.(mod.id, 'download', mod.displayName, bytes, total)
          )
        }
      }
      if (mod.archiveSha256 && archiveSha !== mod.archiveSha256) {
        throw new Error(`Archive hash mismatch for ${mod.displayName}. Expected ${mod.archiveSha256}, got ${archiveSha}.`)
      }
      onProgress?.(mod.id, 'extract', mod.displayName)
      const staging = path.join(downloadsDir, `mod-${mod.id}-staging`)
      await rimraf(staging)
      await extractArchive(archivePath, staging)

      onProgress?.(mod.id, 'install', mod.displayName)
      for (const f of mod.files) {
        // Try direct path in staging first, then search by basename as a fallback.
        let src = await findInStaging(staging, f.path)
        if (!src) throw new Error(`File ${f.path} not found in archive for ${mod.displayName}.`)
        const dst = path.join(skyrimPath, f.path)
        await ensureDir(path.dirname(dst))
        await fs.copyFile(src, dst)
        const sha = await sha256File(dst)
        if (sha !== f.sha256) {
          throw new Error(`Installed file hash mismatch: ${f.path} (got ${sha}, expected ${f.sha256}).`)
        }
      }
      onProgress?.(mod.id, 'done', mod.displayName)
      installed.push(mod.id)
    } catch (err: any) {
      failed.push({ id: mod.id, error: String(err?.message ?? err) })
      onProgress?.(mod.id, 'error', String(err?.message ?? err))
    }
  }

  return { installed, failed }
}

async function findInStaging(staging: string, relTarget: string): Promise<string | undefined> {
  // 1) exact match
  const direct = path.join(staging, relTarget)
  if (await exists(direct)) return direct
  // 2) basename match anywhere
  const wanted = path.basename(relTarget).toLowerCase()
  async function search(dir: string): Promise<string | undefined> {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        const found = await search(full)
        if (found) return found
      } else if (e.isFile() && e.name.toLowerCase() === wanted) {
        return full
      }
    }
    return undefined
  }
  return search(staging)
}

export { z }
