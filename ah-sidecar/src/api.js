// src/api.js — REST API consumed by the ERA Launcher AH tab

import express from 'express'
import cors from 'cors'
import {
  ensurePlayer, getBalance, getActiveListings, getListing,
  getMyListings, getMyBids, getBidHistory, getPendingDeliveries,
  placeBid, executeBuyout, cancelListing, createListing, expireListings,
  HOUSE_CUT_PCT, LISTING_DURATION_H
} from './db.js'
import { formatTimeLeft } from './format.js'

const PORT = process.env.AH_PORT ?? 3001

export function startApi() {
  const app = express()
  app.use(cors())
  app.use(express.json())

  // ── Listings ───────────────────────────────────────────────────────────────

  // GET /ah/listings?search=&page=0&pageSize=20
  app.get('/ah/listings', (req, res) => {
    expireListings() // lazily expire on each request
    const { search, page = 0, pageSize = 20 } = req.query
    const listings = getActiveListings({ search, page: +page, pageSize: +pageSize })
    res.json(listings.map(enrichListing))
  })

  // GET /ah/listings/:id
  app.get('/ah/listings/:id', (req, res) => {
    const listing = getListing(+req.params.id)
    if (!listing) return res.status(404).json({ error: 'Not found' })
    const bids = getBidHistory(+req.params.id)
    res.json({ ...enrichListing(listing), bids })
  })

  // ── Player ─────────────────────────────────────────────────────────────────

  // GET /ah/player/:username
  app.get('/ah/player/:username', (req, res) => {
    const { username } = req.params
    ensurePlayer(username)
    const balance  = getBalance(username)
    const listings = getMyListings(username)
    const bids     = getMyBids(username)
    const mailbox  = getPendingDeliveries(username)
    res.json({ username, balance, listings: listings.map(enrichListing), bids: bids.map(enrichListing), mailbox })
  })

  // ── Actions ────────────────────────────────────────────────────────────────

  // POST /ah/sell  { username, itemName, itemFormId, quantity, minBid, buyoutPrice, durationHours }
  app.post('/ah/sell', (req, res) => {
    const { username, itemName, itemFormId, quantity, minBid, buyoutPrice, durationHours } = req.body
    if (!username || !itemName || !minBid) {
      return res.status(400).json({ error: 'username, itemName and minBid are required.' })
    }
    ensurePlayer(username)
    const result = createListing({ seller: username, itemName, itemFormId, quantity, minBid, buyoutPrice, durationHours })
    res.status(result.ok ? 200 : 400).json(result)
  })

  // POST /ah/bid  { username, listingId, amount }
  app.post('/ah/bid', (req, res) => {
    const { username, listingId, amount } = req.body
    if (!username || !listingId || !amount) {
      return res.status(400).json({ error: 'username, listingId and amount are required.' })
    }
    ensurePlayer(username)
    const result = placeBid(username, +listingId, +amount)
    res.status(result.ok ? 200 : 400).json(result)
  })

  // POST /ah/buyout  { username, listingId }
  app.post('/ah/buyout', (req, res) => {
    const { username, listingId } = req.body
    if (!username || !listingId) return res.status(400).json({ error: 'username and listingId required.' })
    ensurePlayer(username)
    const result = executeBuyout(username, +listingId)
    res.status(result.ok ? 200 : 400).json(result)
  })

  // POST /ah/cancel  { username, listingId }
  app.post('/ah/cancel', (req, res) => {
    const { username, listingId } = req.body
    if (!username || !listingId) return res.status(400).json({ error: 'username and listingId required.' })
    ensurePlayer(username)
    const result = cancelListing(username, +listingId)
    res.status(result.ok ? 200 : 400).json(result)
  })

  // ── Health ─────────────────────────────────────────────────────────────────
  app.get('/ah/health', (_req, res) => res.json({ ok: true, time: Date.now() }))

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[AH] REST API listening on http://127.0.0.1:${PORT}`)
  })
}

function enrichListing(l) {
  return {
    ...l,
    timeLeft: formatTimeLeft(l.expires_at),
    houseCutPct: HOUSE_CUT_PCT * 100
  }
}
