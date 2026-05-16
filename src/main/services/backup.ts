import { promises as fs } from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { ensureDir, sha256File, walk } from './fs-util'

/**
 * Snapshot of vanilla / pre-mod Skyrim state. Stores hashes + a copy of plugin/load files.
 * We intentionally do NOT copy entire Data/ (multi-GB) — instead we hash file paths so a
 * "restore vanilla" knows what to remove (anything present now but not in the snapshot).
 */
export interface Snapshot {
  id: string
  createdAt: string
  skyrimPath: string
  files: Record<string, string> // relPath -> sha256
  pluginsTxt?: string
  loadOrderTxt?: string
}

const SUBPATHS_TO_HASH = ['Data', 'SKSE']
const FILES_TO_COPY = [
  'plugins.txt' // lives in %LOCALAPPDATA%\Skyrim Special Edition
]

function backupsRoot(): string {
  return path.join(app.getPath('userData'), 'backups')
}

export async function listSnapshots(): Promise<Snapshot[]> {
  const root = backupsRoot()
  await ensureDir(root)
  const ids = await fs.readdir(root).catch(() => [])
  const out: Snapshot[] = []
  for (const id of ids) {
    const file = path.join(root, id, 'snapshot.json')
    try {
      const text = await fs.readFile(file, 'utf8')
      out.push(JSON.parse(text))
    } catch {
      // skip
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function createSnapshot(skyrimPath: string): Promise<Snapshot> {
  const id = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = path.join(backupsRoot(), id)
  await ensureDir(dir)

  const files: Record<string, string> = {}
  for (const sub of SUBPATHS_TO_HASH) {
    const root = path.join(skyrimPath, sub)
    for await (const file of walk(root)) {
      const rel = path.relative(skyrimPath, file).split(path.sep).join('/')
      files[rel] = await sha256File(file)
    }
  }

  let pluginsTxt: string | undefined
  let loadOrderTxt: string | undefined
  const localAppData = process.env.LOCALAPPDATA
  if (localAppData) {
    const base = path.join(localAppData, 'Skyrim Special Edition')
    for (const name of FILES_TO_COPY) {
      try {
        const content = await fs.readFile(path.join(base, name), 'utf8')
        if (name === 'plugins.txt') pluginsTxt = content
        if (name === 'loadorder.txt') loadOrderTxt = content
        await fs.writeFile(path.join(dir, name), content, 'utf8')
      } catch {
        // missing — fine
      }
    }
  }

  const snap: Snapshot = {
    id,
    createdAt: new Date().toISOString(),
    skyrimPath,
    files,
    pluginsTxt,
    loadOrderTxt
  }
  await fs.writeFile(path.join(dir, 'snapshot.json'), JSON.stringify(snap, null, 2), 'utf8')
  return snap
}

/**
 * Restore vanilla state: delete any file currently in Data/ or SKSE/ that wasn't in
 * the snapshot. Files whose hash differs are left in place (we don't have the original
 * bytes); the caller is warned. Plugin/load-order files are rewritten from the snapshot.
 */
export async function restoreSnapshot(snap: Snapshot): Promise<{ removed: string[]; changed: string[] }> {
  const removed: string[] = []
  const changed: string[] = []
  for (const sub of SUBPATHS_TO_HASH) {
    const root = path.join(snap.skyrimPath, sub)
    for await (const file of walk(root)) {
      const rel = path.relative(snap.skyrimPath, file).split(path.sep).join('/')
      if (!(rel in snap.files)) {
        await fs.unlink(file).catch(() => {})
        removed.push(rel)
      } else {
        const cur = await sha256File(file)
        if (cur !== snap.files[rel]) changed.push(rel)
      }
    }
  }
  const localAppData = process.env.LOCALAPPDATA
  if (localAppData && snap.pluginsTxt) {
    const target = path.join(localAppData, 'Skyrim Special Edition', 'plugins.txt')
    await fs.writeFile(target, snap.pluginsTxt, 'utf8')
  }
  return { removed, changed }
}
