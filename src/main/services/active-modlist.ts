import path from 'node:path'
import { promises as fs } from 'node:fs'
import { app } from 'electron'
import { modlistManifestSchema } from '@shared/schema'
import type { ModlistManifest } from '@shared/types'

/**
 * Persistent cache of the currently-active modlist so we can re-enforce it on
 * every launch even offline. The cache is updated whenever the renderer
 * successfully fetches/diffs a manifest.
 */
function cachePath(): string {
  return path.join(app.getPath('userData'), 'active-modlist.json')
}

export async function saveActiveModlist(manifest: ModlistManifest): Promise<void> {
  // Re-parse so we never persist garbage.
  const safe = modlistManifestSchema.parse(manifest)
  await fs.writeFile(cachePath(), JSON.stringify(safe, null, 2), 'utf8')
}

export async function loadActiveModlist(): Promise<ModlistManifest | undefined> {
  try {
    const text = await fs.readFile(cachePath(), 'utf8')
    return modlistManifestSchema.parse(JSON.parse(text)) as ModlistManifest
  } catch {
    return undefined
  }
}

/** Read the bundled example modlist as a last-resort fallback. */
export async function loadBundledExample(): Promise<ModlistManifest | undefined> {
  const candidates = [
    path.join(process.resourcesPath ?? '', 'resources', 'modlist.example.json'),
    path.join(app.getAppPath(), 'resources', 'modlist.example.json'),
    path.join(__dirname, '../../resources/modlist.example.json')
  ]
  for (const c of candidates) {
    try {
      const text = await fs.readFile(c, 'utf8')
      return modlistManifestSchema.parse(JSON.parse(text)) as ModlistManifest
    } catch {
      /* try next */
    }
  }
  return undefined
}
