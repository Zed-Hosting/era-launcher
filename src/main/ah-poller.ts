// src/main/ah-poller.ts — Background poller that bridges the AH sidecar to the
// in-game Papyrus auto-delivery mod via two JSON files in the Skyrim Data folder.
//
//   Sidecar  -- GET  /ah/inbox/:user        ->  write  inbox.json    (game reads)
//   Game     -- writes confirmed.json       ->  POST   /ah/inbox/confirm

import { promises as fs } from 'node:fs'
import path from 'node:path'

const POLL_INTERVAL_MS = 5_000
const STATE_REL = path.join('SKSE', 'Plugins', 'StorageUtilData', 'ERA-AH')

interface InboxItem {
  deliveryId: number
  itemName: string
  plugin: string
  formId: string
  quantity: number
}

let timer: NodeJS.Timeout | null = null
let running = false

export interface PollerOptions {
  ahUrl: string                       // e.g. http://whippin.zedhosting.gg:33348
  getUsername: () => string | null    // pulled from launcher config
  getSkyrimDataPath: () => Promise<string | null> | string | null
}

export function startAhPoller(opts: PollerOptions): void {
  stopAhPoller()
  if (running) return
  running = true
  const tick = async () => {
    if (!running) return
    try { await pollOnce(opts) }
    catch (err) { console.warn('[ah-poller] tick failed', (err as Error).message) }
    timer = setTimeout(tick, POLL_INTERVAL_MS)
  }
  tick()
}

export function stopAhPoller(): void {
  running = false
  if (timer) { clearTimeout(timer); timer = null }
}

async function pollOnce(opts: PollerOptions): Promise<void> {
  const user = opts.getUsername()
  const dataPath = await Promise.resolve(opts.getSkyrimDataPath())
  if (!user || !dataPath) return

  const stateDir = path.join(dataPath, STATE_REL)
  await fs.mkdir(stateDir, { recursive: true })
  const inboxFile     = path.join(stateDir, 'inbox.json')
  const confirmedFile = path.join(stateDir, 'confirmed.json')

  // 1. Read any confirmations the Papyrus script has written, post them, then
  //    clear the file.
  try {
    const raw = await fs.readFile(confirmedFile, 'utf8')
    const json = JSON.parse(raw) as { ids?: number[] }
    const ids = Array.isArray(json.ids) ? json.ids : []
    for (const id of ids) {
      try {
        await fetch(`${opts.ahUrl}/ah/inbox/confirm`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: user, deliveryId: id }),
        })
      } catch { /* sidecar may be temporarily unreachable */ }
    }
    if (ids.length) await fs.writeFile(confirmedFile, JSON.stringify({ ids: [] }), 'utf8')
  } catch { /* file may not exist yet */ }

  // 2. Fetch fresh inbox from sidecar
  let items: InboxItem[] = []
  try {
    const r = await fetch(`${opts.ahUrl}/ah/inbox/${encodeURIComponent(user)}`)
    if (r.ok) {
      const body = await r.json() as { items?: InboxItem[] }
      items = body.items || []
    }
  } catch { return }

  // 3. Convert to the schema the Papyrus script expects, write inbox.json
  const inbox = {
    items: items.map(i => ({
      id:     i.deliveryId,
      plugin: i.plugin,
      formId: i.formId,
      name:   i.itemName,
      count:  i.quantity,
    })),
  }
  await fs.writeFile(inboxFile, JSON.stringify(inbox, null, 2), 'utf8')
}
