// src/db.js — MySQL schema and all data-access functions

import mysql from 'mysql2/promise'
import 'dotenv/config'

export const pool = mysql.createPool({
  host:               process.env.DB_HOST ?? '127.0.0.1',
  port:               Number(process.env.DB_PORT ?? 3306),
  user:               process.env.DB_USER ?? 'root',
  password:           process.env.DB_PASS ?? '',
  database:           process.env.DB_NAME ?? 'era_ah',
  waitForConnections: true,
  connectionLimit:    10,
})

// ── Constants ────────────────────────────────────────────────────────────────
export const HOUSE_CUT_PCT      = 0.05
export const DEPOSIT_PCT        = 0.01
export const LISTING_DURATION_H = 48
export const STARTING_GOLD      = 100

// ── Schema init (called once at startup) ─────────────────────────────────────
export async function initDb() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS players (
       username   VARCHAR(64)  NOT NULL PRIMARY KEY,
       steam_id   BIGINT UNSIGNED DEFAULT NULL,
       gold       INT          NOT NULL DEFAULT 100,
       created_at BIGINT       NOT NULL DEFAULT 0,
       INDEX idx_steam_id (steam_id)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS listings (
       id             INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
       seller         VARCHAR(64)  NOT NULL,
       seller_steam_id BIGINT UNSIGNED DEFAULT NULL,
       item_name      VARCHAR(255) NOT NULL,
       item_form_id   VARCHAR(64)  DEFAULT NULL,
       quantity       INT          NOT NULL DEFAULT 1,
       deposit_fee    INT          NOT NULL DEFAULT 0,
       buyout_price   INT          DEFAULT NULL,
       min_bid        INT          NOT NULL,
       current_bid    INT          DEFAULT NULL,
       current_bidder VARCHAR(64)  DEFAULT NULL,
       current_bidder_steam_id BIGINT UNSIGNED DEFAULT NULL,
       status         VARCHAR(16)  NOT NULL DEFAULT 'active',
       expires_at     BIGINT       NOT NULL,
       created_at     BIGINT       NOT NULL DEFAULT 0,
       INDEX idx_status  (status),
       INDEX idx_seller  (seller),
       INDEX idx_seller_steam (seller_steam_id),
       INDEX idx_expires (expires_at)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS bids (
       id         INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
       listing_id INT         NOT NULL,
       bidder     VARCHAR(64) NOT NULL,
       amount     INT         NOT NULL,
       placed_at  BIGINT      NOT NULL DEFAULT 0,
       INDEX idx_listing (listing_id)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS deliveries (
       id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
       recipient    VARCHAR(64)  NOT NULL,
       type         VARCHAR(8)   NOT NULL,
       gold_amount  INT          DEFAULT NULL,
       item_name    VARCHAR(255) DEFAULT NULL,
       item_form_id VARCHAR(64)  DEFAULT NULL,
       quantity     INT          DEFAULT NULL,
       note         TEXT         DEFAULT NULL,
       claimed      TINYINT      NOT NULL DEFAULT 0,
       created_at   BIGINT       NOT NULL DEFAULT 0,
       INDEX idx_recip (recipient, claimed)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS removals (
       id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
       recipient    VARCHAR(64)  NOT NULL,
       listing_id   INT          DEFAULT NULL,
       item_name    VARCHAR(255) NOT NULL,
       item_form_id VARCHAR(64)  DEFAULT NULL,
       quantity     INT          NOT NULL DEFAULT 1,
       status       VARCHAR(16)  NOT NULL DEFAULT 'pending',
       reason       VARCHAR(64)  DEFAULT NULL,
       created_at   BIGINT       NOT NULL DEFAULT 0,
       resolved_at  BIGINT       DEFAULT NULL,
       INDEX idx_recip_status (recipient, status),
       INDEX idx_listing (listing_id)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ]
  for (const sql of stmts) await pool.execute(sql)
  // Idempotent migrations for pre-existing deployments (CREATE TABLE IF NOT
  // EXISTS doesn't alter an existing table). Each ALTER is wrapped in a
  // try/catch so re-running on an already-migrated DB is harmless.
  const migrations = [
    `ALTER TABLE players  ADD COLUMN steam_id BIGINT UNSIGNED DEFAULT NULL`,
    `ALTER TABLE players  ADD INDEX idx_steam_id (steam_id)`,
    `ALTER TABLE listings ADD COLUMN seller_steam_id BIGINT UNSIGNED DEFAULT NULL`,
    `ALTER TABLE listings ADD INDEX idx_seller_steam (seller_steam_id)`,
    `ALTER TABLE listings ADD COLUMN current_bidder_steam_id BIGINT UNSIGNED DEFAULT NULL`,
  ]
  for (const sql of migrations) {
    try { await pool.execute(sql) } catch (e) {
      // 1060 = duplicate column, 1061 = duplicate index — both expected on rerun.
      if (e.errno !== 1060 && e.errno !== 1061) throw e
    }
  }
  console.log('[AH] Database schema verified.')
}

// ── Transaction helper ────────────────────────────────────────────────────────
async function withTx(fn) {
  const conn = await pool.getConnection()
  await conn.beginTransaction()
  try {
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

// Internal helpers used inside transactions (take explicit connection)
async function _addGold(conn, username, amount) {
  await conn.execute('UPDATE players SET gold=gold+? WHERE username=?', [amount, username])
}

async function _deductGold(conn, username, amount) {
  const [[row]] = await conn.execute(
    'SELECT gold FROM players WHERE username=? FOR UPDATE', [username]
  )
  if (!row || row.gold < amount) return false
  await conn.execute('UPDATE players SET gold=gold-? WHERE username=?', [amount, username])
  return true
}

// ── Player ops ───────────────────────────────────────────────────────────────
// ensurePlayer accepts an optional steamId. When provided we treat it as the
// stable identity: if a row already exists for that steam_id under a different
// username (display-name change), we rename it; otherwise we stamp the steam_id
// onto the username row so future lookups by either key resolve consistently.
export async function ensurePlayer(username, steamId = null) {
  const now = Math.floor(Date.now() / 1000)
  await pool.execute(
    'INSERT IGNORE INTO players (username, gold, created_at) VALUES (?, ?, ?)',
    [username, STARTING_GOLD, now]
  )
  if (steamId) {
    // 1) If another username already owns this steam_id, rename it to the new display name.
    const [[existing]] = await pool.execute(
      'SELECT username FROM players WHERE steam_id=? LIMIT 1', [steamId]
    )
    if (existing && existing.username !== username) {
      try {
        await pool.execute('UPDATE players SET username=? WHERE steam_id=?', [username, steamId])
      } catch {
        // Username collision (PK conflict) — both names exist. Keep the steam_id on the
        // current row instead and drop the stale one. Rare edge case during transition.
        await pool.execute('DELETE FROM players WHERE steam_id=? AND username<>?', [steamId, username])
        await pool.execute('UPDATE players SET steam_id=? WHERE username=?', [steamId, username])
      }
    } else {
      // 2) Stamp the steam_id onto the (new or existing) row keyed by username.
      await pool.execute('UPDATE players SET steam_id=? WHERE username=? AND (steam_id IS NULL OR steam_id=?)', [steamId, username, steamId])
    }
  }
}

// Resolve a username -> steam_id from the players table, or null if not linked.
export async function getSteamIdFor(username) {
  const [[row]] = await pool.execute('SELECT steam_id FROM players WHERE username=?', [username])
  return row?.steam_id ?? null
}

export async function getBalance(username) {
  const [[row]] = await pool.execute('SELECT gold FROM players WHERE username=?', [username])
  return row?.gold ?? 0
}

export async function addGold(username, amount) {
  await pool.execute('UPDATE players SET gold=gold+? WHERE username=?', [amount, username])
}

export async function deductGold(username, amount) {
  const [[row]] = await pool.execute('SELECT gold FROM players WHERE username=?', [username])
  if (!row || row.gold < amount) return false
  await pool.execute('UPDATE players SET gold=gold-? WHERE username=?', [amount, username])
  return true
}

// ── Listing ops ──────────────────────────────────────────────────────────────
export async function createListing({ seller, sellerSteamId, itemName, itemFormId, quantity, minBid, buyoutPrice, durationHours }) {
  const hours     = durationHours ?? LISTING_DURATION_H
  const deposit   = Math.max(1, Math.floor(minBid * DEPOSIT_PCT * (hours / 12)))
  const expiresAt = Math.floor(Date.now() / 1000) + hours * 3600
  const now       = Math.floor(Date.now() / 1000)

  if (!await deductGold(seller, deposit)) {
    return { ok: false, error: `Not enough gold for deposit fee (${deposit}g).` }
  }

  // Backfill seller_steam_id from the players table if the caller didn't pass it.
  const stampSteamId = sellerSteamId ?? (await getSteamIdFor(seller))

  // If we have a FormID we can ask the in-game mod to escrow the item; the
  // listing starts as pending_escrow and is promoted to active only after the
  // Papyrus script confirms the item was removed from inventory. Without a
  // FormID (custom item, free-text), we fall back to active immediately so the
  // existing chest-drop flow still works.
  const status = itemFormId ? 'pending_escrow' : 'active'

  const [res] = await pool.execute(
    `INSERT INTO listings
       (seller, seller_steam_id, item_name, item_form_id, quantity, deposit_fee, buyout_price, min_bid, status, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [seller, stampSteamId ?? null, itemName, itemFormId ?? null, quantity, deposit, buyoutPrice ?? null, minBid, status, expiresAt, now]
  )

  let removalId = null
  if (itemFormId) {
    const [r] = await pool.execute(
      `INSERT INTO removals (recipient, listing_id, item_name, item_form_id, quantity, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [seller, res.insertId, itemName, itemFormId, quantity, now]
    )
    removalId = r.insertId
  }
  return { ok: true, listingId: res.insertId, deposit, removalId, pendingEscrow: !!itemFormId }
}

// ── Escrow / removal ops ─────────────────────────────────────────────────────
export async function getPendingRemovals(username) {
  const [rows] = await pool.execute(
    `SELECT id, listing_id, item_name, item_form_id, quantity
       FROM removals
      WHERE recipient=? AND status='pending'
      ORDER BY created_at ASC`,
    [username]
  )
  return rows
}

export async function confirmRemoval(removalId, username) {
  return withTx(async conn => {
    const [[row]] = await conn.execute(
      `SELECT * FROM removals WHERE id=? AND recipient=? FOR UPDATE`,
      [removalId, username]
    )
    if (!row) return { ok: false, error: 'Removal not found.' }
    if (row.status !== 'pending') return { ok: true, alreadyResolved: true }
    const now = Math.floor(Date.now() / 1000)
    await conn.execute(
      `UPDATE removals SET status='confirmed', resolved_at=? WHERE id=?`,
      [now, removalId]
    )
    if (row.listing_id) {
      await conn.execute(
        `UPDATE listings SET status='active' WHERE id=? AND status='pending_escrow'`,
        [row.listing_id]
      )
    }
    return { ok: true }
  })
}

export async function failRemoval(removalId, username, reason) {
  return withTx(async conn => {
    const [[row]] = await conn.execute(
      `SELECT * FROM removals WHERE id=? AND recipient=? FOR UPDATE`,
      [removalId, username]
    )
    if (!row) return { ok: false, error: 'Removal not found.' }
    if (row.status !== 'pending') return { ok: true, alreadyResolved: true }
    const now = Math.floor(Date.now() / 1000)
    await conn.execute(
      `UPDATE removals SET status='failed', reason=?, resolved_at=? WHERE id=?`,
      [String(reason || 'unknown').slice(0, 60), now, removalId]
    )
    if (row.listing_id) {
      const [[listing]] = await conn.execute(
        `SELECT * FROM listings WHERE id=? FOR UPDATE`, [row.listing_id]
      )
      if (listing && listing.status === 'pending_escrow') {
        await conn.execute(
          `UPDATE listings SET status='cancelled' WHERE id=?`, [row.listing_id]
        )
        // Refund deposit (the only gold deducted before escrow confirmation).
        await _addGold(conn, listing.seller, listing.deposit_fee)
      }
    }
    return { ok: true, refunded: true }
  })
}

/** Auto-fail any escrow removal still pending after the timeout (default 5 min). */
export async function expireStaleRemovals(maxAgeSeconds = 300) {
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeSeconds
  const [rows] = await pool.execute(
    `SELECT id, recipient FROM removals WHERE status='pending' AND created_at < ?`,
    [cutoff]
  )
  for (const r of rows) {
    await failRemoval(r.id, r.recipient, 'timeout').catch(() => {})
  }
  return rows.length
}

export async function getActiveListings({ search, page = 0, pageSize = 10 } = {}) {
  const now = Math.floor(Date.now() / 1000)
  if (search) {
    const like = `%${search.replace(/[%_\\]/g, '\\$&')}%`
    const [rows] = await pool.execute(
      `SELECT * FROM listings WHERE status='active' AND expires_at > ?
       AND item_name LIKE ? ESCAPE '\\\\' ORDER BY expires_at ASC LIMIT ? OFFSET ?`,
      [now, like, pageSize, page * pageSize]
    )
    return rows
  }
  const [rows] = await pool.execute(
    `SELECT * FROM listings WHERE status='active' AND expires_at > ?
     ORDER BY expires_at ASC LIMIT ? OFFSET ?`,
    [now, pageSize, page * pageSize]
  )
  return rows
}

export async function getListing(id) {
  const [[row]] = await pool.execute('SELECT * FROM listings WHERE id=?', [id])
  return row ?? null
}

export async function getBidHistory(listingId) {
  const [rows] = await pool.execute(
    'SELECT * FROM bids WHERE listing_id=? ORDER BY placed_at DESC', [listingId]
  )
  return rows
}

// Return the player's active+recent listings. When a steam_id is known we use
// it for the lookup so a player whose STR display name collides with another
// player ("Prisoner") still sees only their own listings.
export async function getMyListings(username, steamId = null) {
  const effectiveSteamId = steamId ?? (await getSteamIdFor(username))
  if (effectiveSteamId) {
    const [rows] = await pool.execute(
      `SELECT * FROM listings
         WHERE seller_steam_id = ?
            OR (seller_steam_id IS NULL AND seller = ?)
         ORDER BY created_at DESC LIMIT 20`,
      [effectiveSteamId, username]
    )
    return rows
  }
  const [rows] = await pool.execute(
    'SELECT * FROM listings WHERE seller=? ORDER BY created_at DESC LIMIT 20', [username]
  )
  return rows
}

export async function getMyBids(username) {
  const [rows] = await pool.execute(
    `SELECT l.*, b.amount AS my_bid FROM listings l
     JOIN bids b ON b.listing_id = l.id AND b.bidder = ?
     WHERE l.status='active' ORDER BY b.placed_at DESC`,
    [username]
  )
  return rows
}

// ── Bid op (transactional) ───────────────────────────────────────────────────
export async function placeBid(bidder, listingId, amount) {
  return withTx(async (conn) => {
    const now = Math.floor(Date.now() / 1000)
    const [[listing]] = await conn.execute(
      `SELECT * FROM listings WHERE id=? AND status='active' FOR UPDATE`, [listingId]
    )
    if (!listing) return { ok: false, error: 'Listing not found or not active.' }
    if (listing.expires_at <= now) return { ok: false, error: 'Listing has expired.' }
    if (listing.seller === bidder) return { ok: false, error: 'You cannot bid on your own listing.' }

    const minRequired = (listing.current_bid ?? listing.min_bid - 1) + 1
    if (amount < minRequired) return { ok: false, error: `Minimum bid is ${minRequired}g.` }

    const [[bidderRow]] = await conn.execute(
      'SELECT gold FROM players WHERE username=? FOR UPDATE', [bidder]
    )
    if (!bidderRow || bidderRow.gold < amount) {
      return { ok: false, error: `Not enough gold (need ${amount}g, have ${bidderRow?.gold ?? 0}g).` }
    }

    // Refund outbid player
    if (listing.current_bidder) {
      await _addGold(conn, listing.current_bidder, listing.current_bid)
      await conn.execute(
        'INSERT INTO deliveries (recipient, type, gold_amount, note, created_at) VALUES (?,?,?,?,?)',
        [listing.current_bidder, 'gold', listing.current_bid,
          `Outbid refund on listing #${listingId} (${listing.item_name})`, now]
      )
    }

    // Hold new bid amount
    await conn.execute('UPDATE players SET gold=gold-? WHERE username=?', [amount, bidder])
    await conn.execute(
      'UPDATE listings SET current_bid=?, current_bidder=? WHERE id=?', [amount, bidder, listingId]
    )
    await conn.execute(
      'INSERT INTO bids (listing_id, bidder, amount, placed_at) VALUES (?,?,?,?)',
      [listingId, bidder, amount, now]
    )
    return { ok: true, newBid: amount, seller: listing.seller, itemName: listing.item_name }
  })
}

// ── Buyout op (transactional) ────────────────────────────────────────────────
export async function executeBuyout(buyer, listingId) {
  return withTx(async (conn) => {
    const now = Math.floor(Date.now() / 1000)
    const [[listing]] = await conn.execute(
      `SELECT * FROM listings WHERE id=? AND status='active' FOR UPDATE`, [listingId]
    )
    if (!listing) return { ok: false, error: 'Listing not found or not active.' }
    if (listing.expires_at <= now) return { ok: false, error: 'Listing has expired.' }
    if (!listing.buyout_price) return { ok: false, error: 'This listing has no buyout price.' }
    if (listing.seller === buyer) return { ok: false, error: 'You cannot buy your own listing.' }

    const [[buyerRow]] = await conn.execute(
      'SELECT gold FROM players WHERE username=? FOR UPDATE', [buyer]
    )
    if (!buyerRow || buyerRow.gold < listing.buyout_price) {
      return { ok: false, error: `Not enough gold (need ${listing.buyout_price}g, have ${buyerRow?.gold ?? 0}g).` }
    }

    // Refund existing bidder
    if (listing.current_bidder && listing.current_bidder !== buyer) {
      await _addGold(conn, listing.current_bidder, listing.current_bid)
      await conn.execute(
        'INSERT INTO deliveries (recipient, type, gold_amount, note, created_at) VALUES (?,?,?,?,?)',
        [listing.current_bidder, 'gold', listing.current_bid,
          `Outbid refund (buyout) on listing #${listingId} (${listing.item_name})`, now]
      )
    }

    await conn.execute('UPDATE players SET gold=gold-? WHERE username=?', [listing.buyout_price, buyer])
    const houseCut       = Math.max(1, Math.floor(listing.buyout_price * HOUSE_CUT_PCT))
    const sellerReceives = listing.buyout_price - houseCut
    await _addGold(conn, listing.seller, sellerReceives)
    await conn.execute(`UPDATE listings SET status='sold', current_bidder=? WHERE id=?`, [buyer, listingId])
    await conn.execute(
      'INSERT INTO deliveries (recipient, type, item_name, item_form_id, quantity, note, created_at) VALUES (?,?,?,?,?,?,?)',
      [buyer, 'item', listing.item_name, listing.item_form_id, listing.quantity,
        `Purchased via buyout from ${listing.seller}`, now]
    )
    return {
      ok: true, itemName: listing.item_name, quantity: listing.quantity,
      price: listing.buyout_price, houseCut, sellerReceives, seller: listing.seller
    }
  })
}

// ── Cancel listing (transactional) ───────────────────────────────────────────
export async function cancelListing(username, listingId) {
  return withTx(async (conn) => {
    const [[listing]] = await conn.execute(
      `SELECT * FROM listings WHERE id=? AND status='active' FOR UPDATE`, [listingId]
    )
    if (!listing) return { ok: false, error: 'Listing not found or not active.' }
    if (listing.seller !== username) return { ok: false, error: 'You do not own this listing.' }
    if (listing.current_bid) return { ok: false, error: 'Cannot cancel: listing has active bids.' }

    await conn.execute(`UPDATE listings SET status='cancelled' WHERE id=?`, [listingId])
    return { ok: true, itemName: listing.item_name }
  })
}

// ── Expire listings (called periodically) ────────────────────────────────────
export async function expireListings() {
  return withTx(async (conn) => {
    const now = Math.floor(Date.now() / 1000)
    const [expired] = await conn.execute(
      `SELECT * FROM listings WHERE status='active' AND expires_at <= ? FOR UPDATE`, [now]
    )

    for (const listing of expired) {
      await conn.execute(`UPDATE listings SET status='expired' WHERE id=?`, [listing.id])

      if (listing.current_bidder) {
        const houseCut       = Math.max(1, Math.floor(listing.current_bid * HOUSE_CUT_PCT))
        const sellerReceives = listing.current_bid - houseCut
        await _addGold(conn, listing.seller, sellerReceives)
        await conn.execute(
          'INSERT INTO deliveries (recipient, type, item_name, item_form_id, quantity, note, created_at) VALUES (?,?,?,?,?,?,?)',
          [listing.current_bidder, 'item', listing.item_name, listing.item_form_id, listing.quantity,
            `Won auction from ${listing.seller} for ${listing.current_bid}g`, now]
        )
        await conn.execute(`UPDATE listings SET status='sold' WHERE id=?`, [listing.id])
      } else {
        await conn.execute(
          'INSERT INTO deliveries (recipient, type, item_name, item_form_id, quantity, note, created_at) VALUES (?,?,?,?,?,?,?)',
          [listing.seller, 'item', listing.item_name, listing.item_form_id, listing.quantity,
            `Expired listing #${listing.id} — no bids`, now]
        )
      }
    }

    return expired.length
  })
}

// ── Deliveries ───────────────────────────────────────────────────────────────
export async function getPendingDeliveries(username) {
  const [rows] = await pool.execute(
    'SELECT * FROM deliveries WHERE recipient=? AND claimed=0 ORDER BY created_at ASC', [username]
  )
  return rows
}

export async function claimDelivery(id, username) {
  return withTx(async (conn) => {
    const [[d]] = await conn.execute(
      'SELECT * FROM deliveries WHERE id=? AND recipient=? AND claimed=0 FOR UPDATE', [id, username]
    )
    if (!d) return { ok: false }
    await conn.execute('UPDATE deliveries SET claimed=1 WHERE id=?', [id])
    if (d.type === 'gold') await _addGold(conn, username, d.gold_amount)
    return { ok: true, delivery: d }
  })
}
