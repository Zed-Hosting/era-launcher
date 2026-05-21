// src/main/ah-poller.ts — Background poller that bridges the AH sidecar to the
// in-game Papyrus auto-delivery + escrow mod via JSON files in the Skyrim Data folder.
//
//   Sidecar  -- GET  /ah/inbox/:user        ->  write  inbox.json          (game reads)
//   Game     -- writes confirmed.json       ->  POST   /ah/inbox/confirm
//
//   Sidecar  -- GET  /ah/removals/:user     ->  write  outbox.json         (game reads)
//   Game     -- writes removed.json         ->  POST   /ah/removals/confirm
//   Game     -- writes removal_failed.json  ->  POST   /ah/removals/fail

import { promises as fs } from 'node:fs'
import path from 'node:path'

const POLL_INTERVAL_MS = 5_000
const STATE_REL = path.join('SKSE', 'Plugins', 'ERA-AH')

interface InboxItem {
  deliveryId: number
  itemName: string
  plugin: string
  formId: string
  quantity: number
}

interface RemovalItem {
  removalId: number
  listingId: number | null
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
  const inboxFile         = path.join(stateDir, 'inbox.json')
  const confirmedFile     = path.join(stateDir, 'confirmed.json')
  const outboxFile        = path.join(stateDir, 'outbox.json')
  const removedFile       = path.join(stateDir, 'removed.json')
  const removalFailedFile = path.join(stateDir, 'removal_failed.json')

  // 1a. Process inbox confirmations (Papyrus -> sidecar)
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

  // 1b. Process removal confirmations (Papyrus -> sidecar)
  try {
    const raw = await fs.readFile(removedFile, 'utf8')
    const json = JSON.parse(raw) as { ids?: number[] }
    const ids = Array.isArray(json.ids) ? json.ids : []
    for (const id of ids) {
      try {
        await fetch(`${opts.ahUrl}/ah/removals/confirm`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: user, removalId: id }),
        })
      } catch { /* offline */ }
    }
    if (ids.length) await fs.writeFile(removedFile, JSON.stringify({ ids: [] }), 'utf8')
  } catch { /* missing */ }

  // 1c. Process removal failures (Papyrus -> sidecar)
  try {
    const raw = await fs.readFile(removalFailedFile, 'utf8')
    const json = JSON.parse(raw) as { failures?: { id: number; reason?: string }[] }
    const fails = Array.isArray(json.failures) ? json.failures : []
    for (const f of fails) {
      try {
        await fetch(`${opts.ahUrl}/ah/removals/fail`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: user, removalId: f.id, reason: f.reason || 'missing' }),
        })
      } catch { /* offline */ }
    }
    if (fails.length) await fs.writeFile(removalFailedFile, JSON.stringify({ failures: [] }), 'utf8')
  } catch { /* missing */ }

  // 1d. Process pending listings from the hover-to-sell hotkey (Papyrus -> sidecar)
  //     Each entry was queued by the in-game hotkey; we forward it to /ah/sell
  //     and clear successfully-forwarded entries from the file.
  const pendingListingsFile = path.join(stateDir, 'pending_listings.json')
  try {
    const raw = await fs.readFile(pendingListingsFile, 'utf8')
    const json = JSON.parse(raw) as {
      items?: Array<{
        id: number
        name: string
        plugin: string
        formId: string
        count: number
        minBid: number
        buyout?: number
      }>
    }
    const pending = Array.isArray(json.items) ? json.items : []
    const remaining: typeof pending = []
    for (const p of pending) {
      try {
        const resp = await fetch(`${opts.ahUrl}/ah/sell`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            username:     user,
            itemName:     p.name,
            itemFormId:   `${p.plugin}:${p.formId}`,
            quantity:     p.count || 1,
            minBid:       p.minBid,
            buyoutPrice:  p.buyout && p.buyout > 0 ? p.buyout : null,
            source:       'hover-hotkey',
            clientReqId:  p.id,
          }),
        })
        if (!resp.ok && resp.status >= 500) {
          // Keep server-side transient failures for retry; drop client errors (4xx).
          remaining.push(p)
        }
      } catch {
        // Network failure — retry on next tick.
        remaining.push(p)
      }
    }
    if (remaining.length !== pending.length) {
      await fs.writeFile(pendingListingsFile, JSON.stringify({ items: remaining }, null, 2), 'utf8')
    }
  } catch { /* file may not exist yet */ }

  // 2a. Fetch fresh inbox from sidecar
  let items: InboxItem[] = []
  try {
    const r = await fetch(`${opts.ahUrl}/ah/inbox/${encodeURIComponent(user)}`)
    if (r.ok) {
      const body = await r.json() as { items?: InboxItem[] }
      items = body.items || []
    }
  } catch { return }

  await fs.writeFile(inboxFile, JSON.stringify({
    items: items.map(i => ({
      id:     i.deliveryId,
      plugin: i.plugin,
      formId: i.formId,
      name:   i.itemName,
      count:  i.quantity,
    })),
  }, null, 2), 'utf8')

  // 2b. Fetch fresh outbox (removal queue) from sidecar
  let removals: RemovalItem[] = []
  try {
    const r = await fetch(`${opts.ahUrl}/ah/removals/${encodeURIComponent(user)}`)
    if (r.ok) {
      const body = await r.json() as { items?: RemovalItem[] }
      removals = body.items || []
    }
  } catch { /* leave outbox stale; the game keeps any unprocessed entries */ }

  await fs.writeFile(outboxFile, JSON.stringify({
    items: removals.map(i => ({
      id:     i.removalId,
      plugin: i.plugin,
      formId: i.formId,
      name:   i.itemName,
      count:  i.quantity,
    })),
  }, null, 2), 'utf8')
}
