// src/index.js — Entry point: start queue watcher, REST API, expiry timer

import { initDb, expireListings, expireStaleRemovals } from './db.js'
import { initQueue } from './queue.js'
import { startApi } from './api.js'

async function main() {
  console.log('[AH] ERA Auction House Sidecar starting...')

  await initDb()

  // Process expired listings + stale escrow removals every 60 seconds
  await expireListings()
  await expireStaleRemovals()
  setInterval(async () => {
    const count = await expireListings()
    if (count > 0) console.log(`[AH] Expired ${count} listing(s)`)
    const failed = await expireStaleRemovals()
    if (failed > 0) console.log(`[AH] Auto-cancelled ${failed} listing(s) whose seller never escrowed the item`)
  }, 60_000)

  initQueue()
  startApi()

  console.log('[AH] Ready.')
}

main().catch(err => { console.error('[AH] Fatal startup error:', err); process.exit(1) })
