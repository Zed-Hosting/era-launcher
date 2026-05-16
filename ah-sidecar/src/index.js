// src/index.js — Entry point: start queue watcher, REST API, expiry timer

import { initQueue } from './queue.js'
import { startApi } from './api.js'
import { expireListings } from './db.js'

console.log('[AH] ERA Auction House Sidecar starting...')

// Process expired listings every 60 seconds
expireListings()
setInterval(() => {
  const count = expireListings()
  if (count > 0) console.log(`[AH] Expired ${count} listing(s)`)
}, 60_000)

initQueue()
startApi()

console.log('[AH] Ready.')
