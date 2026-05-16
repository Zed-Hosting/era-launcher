// src/db.js — SQLite schema and all data-access functions

import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.AH_DB_PATH ?? path.join(__dirname, '..', 'ah.db')

export const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  -- Players and their gold balances
  CREATE TABLE IF NOT EXISTS players (
    username      TEXT PRIMARY KEY,
    gold          INTEGER NOT NULL DEFAULT 100,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Active and historical listings
  CREATE TABLE IF NOT EXISTS listings (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    seller        TEXT    NOT NULL REFERENCES players(username),
    item_name     TEXT    NOT NULL,
    item_form_id  TEXT,               -- for future SKSE custody verification
    quantity      INTEGER NOT NULL DEFAULT 1,
    deposit_fee   INTEGER NOT NULL DEFAULT 0,
    buyout_price  INTEGER,            -- NULL = bid-only
    min_bid       INTEGER NOT NULL,
    current_bid   INTEGER,
    current_bidder TEXT REFERENCES players(username),
    status        TEXT    NOT NULL DEFAULT 'active',
                  -- active | sold | expired | cancelled
    expires_at    INTEGER NOT NULL,   -- unix timestamp
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Full bid history
  CREATE TABLE IF NOT EXISTS bids (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id    INTEGER NOT NULL REFERENCES listings(id),
    bidder        TEXT    NOT NULL REFERENCES players(username),
    amount        INTEGER NOT NULL,
    placed_at     INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Pending deliveries (gold or items to be claimed)
  CREATE TABLE IF NOT EXISTS deliveries (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient     TEXT    NOT NULL REFERENCES players(username),
    type          TEXT    NOT NULL,   -- 'gold' | 'item'
    gold_amount   INTEGER,
    item_name     TEXT,
    item_form_id  TEXT,
    quantity      INTEGER,
    note          TEXT,
    claimed       INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_listings_status   ON listings(status);
  CREATE INDEX IF NOT EXISTS idx_listings_seller   ON listings(seller);
  CREATE INDEX IF NOT EXISTS idx_listings_expires  ON listings(expires_at);
  CREATE INDEX IF NOT EXISTS idx_deliveries_recip  ON deliveries(recipient, claimed);
`)

// ── Constants ────────────────────────────────────────────────────────────────
export const HOUSE_CUT_PCT   = 0.05   // 5% of sale price
export const DEPOSIT_PCT     = 0.01   // 1% of min_bid per 12h
export const LISTING_DURATION_H = 48  // default listing duration
export const STARTING_GOLD   = 100    // gold given to new players

// ── Player ops ───────────────────────────────────────────────────────────────
export function ensurePlayer(username) {
  db.prepare(`INSERT OR IGNORE INTO players (username, gold) VALUES (?, ?)`)
    .run(username, STARTING_GOLD)
}

export function getBalance(username) {
  return db.prepare(`SELECT gold FROM players WHERE username=?`).get(username)?.gold ?? 0
}

export function addGold(username, amount) {
  db.prepare(`UPDATE players SET gold=gold+? WHERE username=?`).run(amount, username)
}

export function deductGold(username, amount) {
  // Returns false if insufficient funds
  const row = db.prepare(`SELECT gold FROM players WHERE username=?`).get(username)
  if (!row || row.gold < amount) return false
  db.prepare(`UPDATE players SET gold=gold-? WHERE username=?`).run(amount, username)
  return true
}

// ── Listing ops ──────────────────────────────────────────────────────────────
export function createListing({ seller, itemName, itemFormId, quantity, minBid, buyoutPrice, durationHours }) {
  const hours = durationHours ?? LISTING_DURATION_H
  const deposit = Math.max(1, Math.floor(minBid * DEPOSIT_PCT * (hours / 12)))
  const expiresAt = Math.floor(Date.now() / 1000) + hours * 3600

  if (!deductGold(seller, deposit)) {
    return { ok: false, error: `Not enough gold for deposit fee (${deposit}g).` }
  }

  const result = db.prepare(`
    INSERT INTO listings (seller, item_name, item_form_id, quantity, deposit_fee,
                          buyout_price, min_bid, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(seller, itemName, itemFormId ?? null, quantity, deposit, buyoutPrice ?? null, minBid, expiresAt)

  return { ok: true, listingId: result.lastInsertRowid, deposit }
}

export function getActiveListings({ search, page = 0, pageSize = 10 } = {}) {
  const now = Math.floor(Date.now() / 1000)
  if (search) {
    return db.prepare(`
      SELECT * FROM listings
      WHERE status='active' AND expires_at > ?
        AND item_name LIKE ? ESCAPE '\\'
      ORDER BY expires_at ASC
      LIMIT ? OFFSET ?
    `).all(now, `%${search.replace(/[%_\\]/g, '\\$&')}%`, pageSize, page * pageSize)
  }
  return db.prepare(`
    SELECT * FROM listings
    WHERE status='active' AND expires_at > ?
    ORDER BY expires_at ASC
    LIMIT ? OFFSET ?
  `).all(now, pageSize, page * pageSize)
}

export function getListing(id) {
  return db.prepare(`SELECT * FROM listings WHERE id=?`).get(id)
}

export function getBidHistory(listingId) {
  return db.prepare(`SELECT * FROM bids WHERE listing_id=? ORDER BY placed_at DESC`).all(listingId)
}

export function getMyListings(username) {
  return db.prepare(`SELECT * FROM listings WHERE seller=? ORDER BY created_at DESC LIMIT 20`).all(username)
}

export function getMyBids(username) {
  return db.prepare(`
    SELECT l.*, b.amount AS my_bid FROM listings l
    JOIN bids b ON b.listing_id = l.id AND b.bidder = ?
    WHERE l.status='active'
    ORDER BY b.placed_at DESC
  `).all(username)
}

// ── Bid op (transactional) ───────────────────────────────────────────────────
export const placeBid = db.transaction((bidder, listingId, amount) => {
  const now = Math.floor(Date.now() / 1000)
  const listing = db.prepare(`SELECT * FROM listings WHERE id=? AND status='active'`).get(listingId)
  if (!listing) return { ok: false, error: 'Listing not found or not active.' }
  if (listing.expires_at <= now) return { ok: false, error: 'Listing has expired.' }
  if (listing.seller === bidder) return { ok: false, error: 'You cannot bid on your own listing.' }

  const minRequired = (listing.current_bid ?? listing.min_bid - 1) + 1
  if (amount < minRequired) return { ok: false, error: `Minimum bid is ${minRequired}g.` }

  const balance = getBalance(bidder)
  if (balance < amount) return { ok: false, error: `Not enough gold (need ${amount}g, have ${balance}g).` }

  // Refund outbid player
  if (listing.current_bidder) {
    addGold(listing.current_bidder, listing.current_bid)
    db.prepare(`INSERT INTO deliveries (recipient, type, gold_amount, note) VALUES (?,?,?,?)`)
      .run(listing.current_bidder, 'gold', listing.current_bid,
        `Outbid refund on listing #${listingId} (${listing.item_name})`)
  }

  // Hold new bid amount
  deductGold(bidder, amount)
  db.prepare(`UPDATE listings SET current_bid=?, current_bidder=? WHERE id=?`).run(amount, bidder, listingId)
  db.prepare(`INSERT INTO bids (listing_id, bidder, amount) VALUES (?,?,?)`).run(listingId, bidder, amount)

  return { ok: true, newBid: amount, seller: listing.seller, itemName: listing.item_name }
})

// ── Buyout op (transactional) ────────────────────────────────────────────────
export const executeBuyout = db.transaction((buyer, listingId) => {
  const now = Math.floor(Date.now() / 1000)
  const listing = db.prepare(`SELECT * FROM listings WHERE id=? AND status='active'`).get(listingId)
  if (!listing) return { ok: false, error: 'Listing not found or not active.' }
  if (listing.expires_at <= now) return { ok: false, error: 'Listing has expired.' }
  if (!listing.buyout_price) return { ok: false, error: 'This listing has no buyout price.' }
  if (listing.seller === buyer) return { ok: false, error: 'You cannot buy your own listing.' }

  const balance = getBalance(buyer)
  if (balance < listing.buyout_price) {
    return { ok: false, error: `Not enough gold (need ${listing.buyout_price}g, have ${balance}g).` }
  }

  // Refund any existing bidder
  if (listing.current_bidder && listing.current_bidder !== buyer) {
    addGold(listing.current_bidder, listing.current_bid)
    db.prepare(`INSERT INTO deliveries (recipient, type, gold_amount, note) VALUES (?,?,?,?)`)
      .run(listing.current_bidder, 'gold', listing.current_bid,
        `Outbid refund (buyout) on listing #${listingId} (${listing.item_name})`)
  }

  deductGold(buyer, listing.buyout_price)
  const houseCut = Math.max(1, Math.floor(listing.buyout_price * HOUSE_CUT_PCT))
  const sellerReceives = listing.buyout_price - houseCut

  addGold(listing.seller, sellerReceives)
  db.prepare(`UPDATE listings SET status='sold', current_bidder=? WHERE id=?`).run(buyer, listingId)

  // Item delivery to buyer
  db.prepare(`INSERT INTO deliveries (recipient, type, item_name, item_form_id, quantity, note) VALUES (?,?,?,?,?,?)`)
    .run(buyer, 'item', listing.item_name, listing.item_form_id, listing.quantity,
      `Purchased via buyout from ${listing.seller}`)

  return {
    ok: true,
    itemName: listing.item_name,
    quantity: listing.quantity,
    price: listing.buyout_price,
    houseCut,
    sellerReceives,
    seller: listing.seller
  }
})

// ── Cancel listing ───────────────────────────────────────────────────────────
export const cancelListing = db.transaction((username, listingId) => {
  const listing = db.prepare(`SELECT * FROM listings WHERE id=? AND status='active'`).get(listingId)
  if (!listing) return { ok: false, error: 'Listing not found or not active.' }
  if (listing.seller !== username) return { ok: false, error: 'You do not own this listing.' }
  if (listing.current_bid) return { ok: false, error: 'Cannot cancel: listing has active bids.' }

  // Forfeit deposit (no refund on cancel, like WoW)
  db.prepare(`UPDATE listings SET status='cancelled' WHERE id=?`).run(listingId)
  return { ok: true, itemName: listing.item_name }
})

// ── Expire listings (called periodically) ───────────────────────────────────
export const expireListings = db.transaction(() => {
  const now = Math.floor(Date.now() / 1000)
  const expired = db.prepare(`
    SELECT * FROM listings WHERE status='active' AND expires_at <= ?
  `).all(now)

  for (const listing of expired) {
    db.prepare(`UPDATE listings SET status='expired' WHERE id=?`).run(listing.id)

    if (listing.current_bidder) {
      // Auction won by highest bidder
      const houseCut = Math.max(1, Math.floor(listing.current_bid * HOUSE_CUT_PCT))
      const sellerReceives = listing.current_bid - houseCut
      addGold(listing.seller, sellerReceives)

      db.prepare(`INSERT INTO deliveries (recipient, type, item_name, item_form_id, quantity, note) VALUES (?,?,?,?,?,?)`)
        .run(listing.current_bidder, 'item', listing.item_name, listing.item_form_id, listing.quantity,
          `Won auction from ${listing.seller} for ${listing.current_bid}g`)
      db.prepare(`UPDATE listings SET status='sold' WHERE id=?`).run(listing.id)
    } else {
      // No bids — return item to seller (deposit already forfeited)
      db.prepare(`INSERT INTO deliveries (recipient, type, item_name, item_form_id, quantity, note) VALUES (?,?,?,?,?,?)`)
        .run(listing.seller, 'item', listing.item_name, listing.item_form_id, listing.quantity,
          `Expired listing #${listing.id} — no bids`)
    }
  }

  return expired.length
})

// ── Deliveries ───────────────────────────────────────────────────────────────
export function getPendingDeliveries(username) {
  return db.prepare(`
    SELECT * FROM deliveries WHERE recipient=? AND claimed=0 ORDER BY created_at ASC
  `).all(username)
}

export function claimDelivery(id, username) {
  const d = db.prepare(`SELECT * FROM deliveries WHERE id=? AND recipient=? AND claimed=0`).get(id, username)
  if (!d) return { ok: false }
  db.prepare(`UPDATE deliveries SET claimed=1 WHERE id=?`).run(id)
  if (d.type === 'gold') addGold(username, d.gold_amount)
  return { ok: true, delivery: d }
}
