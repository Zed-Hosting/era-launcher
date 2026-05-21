// src/api.js — REST API consumed by the ERA Launcher AH tab

import express from 'express'
import cors from 'cors'
import {
  ensurePlayer, getBalance, getActiveListings, getListing,
  getMyListings, getMyBids, getBidHistory, getPendingDeliveries,
  placeBid, executeBuyout, cancelListing, createListing, expireListings,
  getPendingRemovals, confirmRemoval, failRemoval,
  HOUSE_CUT_PCT, LISTING_DURATION_H, pool
} from './db.js'
import { formatTimeLeft } from './format.js'
import { loadItems, lookupItem, packFormRef, unpackFormRef } from './items.js'

const PORT = process.env.AH_PORT ?? 33348

// Extract the caller's SteamID64 from either the X-ERA-Steam-Id header or a
// steamId field in the JSON body. The launcher sends both on every request.
// Returns null for chat-originated calls (STR Lua doesn't have access to it).
function extractSteamId(req) {
  const hdr = req.get?.('x-era-steam-id')
  const body = req.body?.steamId
  const raw = hdr || body
  if (!raw) return null
  const s = String(raw).trim()
  if (!/^\d{15,20}$/.test(s)) return null
  return s
}

export function startApi() {
  loadItems()

  const app = express()
  app.use(cors())
  app.use(express.json())

  // ── Listings ───────────────────────────────────────────────────────────────

  // GET /ah/listings?search=&page=0&pageSize=20
  app.get('/ah/listings', async (req, res) => {
    await expireListings() // lazily expire on each request
    const { search, page = 0, pageSize = 20 } = req.query
    const listings = await getActiveListings({ search, page: +page, pageSize: +pageSize })
    res.json(listings.map(enrichListing))
  })

  // GET /ah/listings/:id
  app.get('/ah/listings/:id', async (req, res) => {
    const listing = await getListing(+req.params.id)
    if (!listing) return res.status(404).json({ error: 'Not found' })
    const bids = await getBidHistory(+req.params.id)
    res.json({ ...enrichListing(listing), bids })
  })

  // ── Player ─────────────────────────────────────────────────────────────────

  // GET /ah/player/:username  (header X-ERA-Steam-Id is preferred)
  app.get('/ah/player/:username', async (req, res) => {
    const { username } = req.params
    const steamId = extractSteamId(req)
    await ensurePlayer(username, steamId)
    const balance  = await getBalance(username)
    const listings = await getMyListings(username, steamId)
    const bids     = await getMyBids(username)
    const mailbox  = await getPendingDeliveries(username)
    res.json({ username, steamId, balance, listings: listings.map(enrichListing), bids: bids.map(enrichListing), mailbox })
  })

  // ── Actions ────────────────────────────────────────────────────────────────

  // POST /ah/sell  { username, steamId?, itemName, itemFormId, quantity, minBid, buyoutPrice, durationHours }
  app.post('/ah/sell', async (req, res) => {
    let { username, itemName, itemFormId, quantity, minBid, buyoutPrice, durationHours } = req.body
    const steamId = extractSteamId(req)
    if (!username || !itemName || !minBid) {
      return res.status(400).json({ error: 'username, itemName and minBid are required.' })
    }
    // Auto-fill FormID from items.json if not provided
    if (!itemFormId) {
      const found = lookupItem(itemName)
      if (found) itemFormId = packFormRef(found.plugin, found.formId)
    }
    await ensurePlayer(username, steamId)
    const result = await createListing({ seller: username, sellerSteamId: steamId, itemName, itemFormId, quantity, minBid, buyoutPrice, durationHours })
    res.status(result.ok ? 200 : 400).json({ ...result, itemFormId, autoDelivery: !!itemFormId })
  })

  // POST /ah/bid  { username, listingId, amount }
  app.post('/ah/bid', async (req, res) => {
    const { username, listingId, amount } = req.body
    if (!username || !listingId || !amount) {
      return res.status(400).json({ error: 'username, listingId and amount are required.' })
    }
    await ensurePlayer(username)
    const result = await placeBid(username, +listingId, +amount)
    res.status(result.ok ? 200 : 400).json(result)
  })

  // POST /ah/buyout  { username, listingId }
  app.post('/ah/buyout', async (req, res) => {
    const { username, listingId } = req.body
    if (!username || !listingId) return res.status(400).json({ error: 'username and listingId required.' })
    await ensurePlayer(username)
    const result = await executeBuyout(username, +listingId)
    res.status(result.ok ? 200 : 400).json(result)
  })

  // POST /ah/cancel  { username, listingId }
  app.post('/ah/cancel', async (req, res) => {
    const { username, listingId } = req.body
    if (!username || !listingId) return res.status(400).json({ error: 'username and listingId required.' })
    await ensurePlayer(username)
    const result = await cancelListing(username, +listingId)
    res.status(result.ok ? 200 : 400).json(result)
  })

  // POST /ah/claim  { username, deliveryId }
  app.post('/ah/claim', async (req, res) => {
    const { username, deliveryId } = req.body
    if (!username || !deliveryId) return res.status(400).json({ error: 'username and deliveryId required.' })
    await ensurePlayer(username)
    const { claimDelivery } = await import('./db.js')
    const result = await claimDelivery(+deliveryId, username)
    res.status(result.ok ? 200 : 400).json(result)
  })

  // ── Inbox (Papyrus auto-delivery) ──────────────────────────────────────────

  // GET /ah/inbox/:username  → list of unclaimed item deliveries with FormID set
  app.get('/ah/inbox/:username', async (req, res) => {
    const { username } = req.params
    const [rows] = await pool.execute(
      `SELECT id, item_name, item_form_id, quantity, created_at
         FROM deliveries
        WHERE recipient=? AND claimed=0 AND type='item' AND item_form_id IS NOT NULL
        ORDER BY created_at ASC`,
      [username]
    )
    const items = rows.map(r => {
      const ref = unpackFormRef(r.item_form_id)
      return {
        deliveryId: r.id,
        itemName:   r.item_name,
        plugin:     ref?.plugin || null,
        formId:     ref?.formId || null,
        quantity:   r.quantity || 1,
      }
    }).filter(x => x.plugin && x.formId)
    res.json({ username, items })
  })

  // POST /ah/inbox/confirm  { username, deliveryId }  → marks delivery claimed
  app.post('/ah/inbox/confirm', async (req, res) => {
    const { username, deliveryId } = req.body
    if (!username || !deliveryId) return res.status(400).json({ error: 'username and deliveryId required.' })
    const { claimDelivery } = await import('./db.js')
    const result = await claimDelivery(+deliveryId, username)
    res.status(result.ok ? 200 : 400).json(result)
  })

  // GET /ah/items/lookup?name=Iron+Sword  → FormID lookup
  app.get('/ah/items/lookup', (req, res) => {
    const found = lookupItem(req.query.name)
    if (!found) return res.status(404).json({ ok: false, error: 'Unknown item' })
    res.json({ ok: true, ...found, formRef: packFormRef(found.plugin, found.formId) })
  })

  // ── Removals (Papyrus escrow on post) ──────────────────────────────────────

  // GET /ah/removals/:username → items the player still owes the AH
  app.get('/ah/removals/:username', async (req, res) => {
    const rows = await getPendingRemovals(req.params.username)
    const items = rows.map(r => {
      const ref = unpackFormRef(r.item_form_id)
      return ref ? {
        removalId: r.id,
        listingId: r.listing_id,
        itemName:  r.item_name,
        plugin:    ref.plugin,
        formId:    ref.formId,
        quantity:  r.quantity || 1,
      } : null
    }).filter(Boolean)
    res.json({ username: req.params.username, items })
  })

  // POST /ah/removals/confirm { username, removalId }
  app.post('/ah/removals/confirm', async (req, res) => {
    const { username, removalId } = req.body
    if (!username || !removalId) return res.status(400).json({ error: 'username and removalId required.' })
    const r = await confirmRemoval(+removalId, username)
    res.status(r.ok ? 200 : 400).json(r)
  })

  // POST /ah/removals/fail { username, removalId, reason }
  app.post('/ah/removals/fail', async (req, res) => {
    const { username, removalId, reason } = req.body
    if (!username || !removalId) return res.status(400).json({ error: 'username and removalId required.' })
    const r = await failRemoval(+removalId, username, reason)
    res.status(r.ok ? 200 : 400).json(r)
  })

  // ── Diagnostics ────────────────────────────────────────────────────────────

  // POST /ah/test/ping { username, steamId? }
  //   Inserts a one-time test delivery (1 Septim, Skyrim.esm:0000000F) for the
  //   user. Also links the username to the supplied steamId so subsequent
  //   ownership checks work. If the in-game mod is alive, the player should
  //   receive the delivery within ~10 seconds via the inbox poller.
  app.post('/ah/test/ping', async (req, res) => {
    const { username } = req.body
    const steamId = extractSteamId(req)
    if (!username) return res.status(400).json({ error: 'username required.' })
    await ensurePlayer(username, steamId)
    const now = Math.floor(Date.now() / 1000)
    await pool.execute(
      `INSERT INTO deliveries (recipient, type, item_name, item_form_id, quantity, note, created_at)
       VALUES (?, 'item', 'Gold (test)', 'Skyrim.esm:0000000F', 1, 'AH self-test ping', ?)`,
      [username, now]
    )
    res.json({ ok: true, steamIdLinked: !!steamId, message: 'Test delivery queued. You should receive 1 Septim within ~10 seconds if the mod is loaded.' })
  })

  // ── Health ─────────────────────────────────────────────────────────────────
  app.get('/ah/health', (_req, res) => res.json({ ok: true, time: Date.now() }))

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AH] REST API listening on 0.0.0.0:${PORT}`)
  })
}

function enrichListing(l) {
  return {
    ...l,
    timeLeft: formatTimeLeft(l.expires_at),
    houseCutPct: HOUSE_CUT_PCT * 100
  }
}
