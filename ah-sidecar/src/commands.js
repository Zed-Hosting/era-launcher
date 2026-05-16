// src/commands.js — All commands dispatched from the Lua bridge

import {
  ensurePlayer, getBalance, getActiveListings, getListing,
  getMyListings, getMyBids, getBidHistory, getPendingDeliveries,
  claimDelivery, placeBid, executeBuyout, cancelListing, createListing,
  HOUSE_CUT_PCT, LISTING_DURATION_H
} from './db.js'
import { formatGold, formatTimeLeft } from './format.js'

export function handleCommand(cmd) {
  try {
    switch (cmd.type) {
      case 'register':  return cmdRegister(cmd)
      case 'balance':   return cmdBalance(cmd)
      case 'list':      return cmdList(cmd)
      case 'detail':    return cmdDetail(cmd)
      case 'sell':      return cmdSell(cmd)
      case 'bid':       return cmdBid(cmd)
      case 'buyout':    return cmdBuyout(cmd)
      case 'cancel':    return cmdCancel(cmd)
      case 'mylistings':return cmdMyListings(cmd)
      case 'mybids':    return cmdMyBids(cmd)
      case 'mailbox':   return cmdMailbox(cmd)
      case 'claim':     return cmdClaim(cmd)
      default:
        return { message: `Unknown AH command: ${cmd.type}` }
    }
  } catch (err) {
    return { message: `[AH Error] ${err.message}` }
  }
}

function cmdRegister({ user }) {
  ensurePlayer(user)
  const bal = getBalance(user)
  return { message: `Welcome to the Auction House, ${user}! Balance: ${formatGold(bal)}.` }
}

function cmdBalance({ user }) {
  ensurePlayer(user)
  return { message: `Your balance: ${formatGold(getBalance(user))}` }
}

function cmdList({ user, search, page }) {
  ensurePlayer(user)
  const listings = getActiveListings({ search, page: page ?? 0 })
  if (!listings.length) {
    return { message: search ? `No listings found for "${search}".` : 'No active listings.' }
  }
  const lines = listings.map(l => {
    const buyout = l.buyout_price ? ` | Buyout: ${formatGold(l.buyout_price)}` : ''
    const bid    = l.current_bid  ? ` | Top bid: ${formatGold(l.current_bid)}`
                                  : ` | Min bid: ${formatGold(l.min_bid)}`
    return `[${l.id}] ${l.item_name} x${l.quantity}${bid}${buyout} | ${formatTimeLeft(l.expires_at)}`
  }).join('\n')
  return { message: `── Auction House ──\n${lines}\n/ah detail <id> for more info` }
}

function cmdDetail({ user, listingId }) {
  ensurePlayer(user)
  const l = getListing(listingId)
  if (!l || l.status !== 'active') return { message: 'Listing not found.' }
  const history = getBidHistory(listingId).slice(0, 5)
  const bidLines = history.length
    ? history.map(b => `  ${b.bidder}: ${formatGold(b.amount)}`).join('\n')
    : '  No bids yet.'
  const buyout = l.buyout_price ? `\nBuyout: ${formatGold(l.buyout_price)}` : ''
  return {
    message: `── Listing #${l.id}: ${l.item_name} x${l.quantity} ──
Seller: ${l.seller} | Expires: ${formatTimeLeft(l.expires_at)}
Min bid: ${formatGold(l.min_bid)}${buyout}
Current bid: ${l.current_bid ? `${formatGold(l.current_bid)} by ${l.current_bidder}` : 'None'}
Recent bids:\n${bidLines}
/ah bid ${l.id} <amount>  |  /ah buyout ${l.id}`
  }
}

function cmdSell({ user, itemName, itemFormId, quantity, minBid, buyoutPrice, durationHours }) {
  ensurePlayer(user)
  if (!itemName || !minBid) return { message: 'Usage: /ah sell <item> <minBid> [buyout] [hours]' }
  const qty = Math.max(1, quantity ?? 1)
  const dur = Math.min(72, Math.max(12, durationHours ?? LISTING_DURATION_H))

  const result = createListing({
    seller: user, itemName, itemFormId, quantity: qty,
    minBid, buyoutPrice, durationHours: dur
  })
  if (!result.ok) return { message: `[AH] ${result.error}` }

  return {
    message: [
      `[AH] Listed "${itemName}" x${qty}`,
      `Min bid: ${formatGold(minBid)}${buyoutPrice ? ` | Buyout: ${formatGold(buyoutPrice)}` : ''}`,
      `Duration: ${dur}h | Deposit fee: ${formatGold(result.deposit)} (non-refundable on cancel)`,
      `Listing ID: #${result.listingId}`,
      `⚠ Place the item in the Auction Chest now!`
    ].join('\n')
  }
}

function cmdBid({ user, listingId, amount }) {
  ensurePlayer(user)
  const result = placeBid(user, listingId, amount)
  if (!result.ok) return { message: `[AH] ${result.error}` }
  return {
    message: `[AH] You bid ${formatGold(result.newBid)} on "${result.itemName}" (#${listingId}).`,
    broadcast: `[AH] ${user} placed a bid of ${formatGold(result.newBid)} on "${result.itemName}"!`
  }
}

function cmdBuyout({ user, listingId }) {
  ensurePlayer(user)
  const result = executeBuyout(user, listingId)
  if (!result.ok) return { message: `[AH] ${result.error}` }
  return {
    message: [
      `[AH] You bought "${result.itemName}" x${result.quantity} for ${formatGold(result.price)}.`,
      `Collect your item from the Auction Chest. Type /ah mailbox to check deliveries.`
    ].join('\n'),
    broadcast: `[AH] ${user} bought "${result.itemName}" from ${result.seller} for ${formatGold(result.price)}!`
  }
}

function cmdCancel({ user, listingId }) {
  ensurePlayer(user)
  const result = cancelListing(user, listingId)
  if (!result.ok) return { message: `[AH] ${result.error}` }
  return {
    message: `[AH] Cancelled listing "${result.itemName}". Note: deposit fee was forfeited. Retrieve your item from the Auction Chest.`
  }
}

function cmdMyListings({ user }) {
  ensurePlayer(user)
  const listings = getMyListings(user)
  if (!listings.length) return { message: 'You have no listings.' }
  const lines = listings.map(l => {
    const status = l.status === 'active' ? formatTimeLeft(l.expires_at) : l.status
    const bid = l.current_bid ? ` | Top: ${formatGold(l.current_bid)}` : ''
    return `[${l.id}] ${l.item_name} x${l.quantity}${bid} | ${status}`
  }).join('\n')
  return { message: `── Your Listings ──\n${lines}` }
}

function cmdMyBids({ user }) {
  ensurePlayer(user)
  const bids = getMyBids(user)
  if (!bids.length) return { message: 'You have no active bids.' }
  const lines = bids.map(l =>
    `[${l.id}] ${l.item_name} | Your bid: ${formatGold(l.my_bid)}${l.current_bidder === user ? ' (winning)' : ' (outbid!)'} | ${formatTimeLeft(l.expires_at)}`
  ).join('\n')
  return { message: `── Your Bids ──\n${lines}` }
}

function cmdMailbox({ user }) {
  ensurePlayer(user)
  const deliveries = getPendingDeliveries(user)
  if (!deliveries.length) return { message: 'Your AH mailbox is empty.' }
  const lines = deliveries.map(d => {
    if (d.type === 'gold') return `[${d.id}] Gold: ${formatGold(d.gold_amount)} — ${d.note}`
    return `[${d.id}] Item: ${d.item_name} x${d.quantity} — ${d.note}`
  }).join('\n')
  return { message: `── AH Mailbox ──\n${lines}\n/ah claim <id> to collect` }
}

function cmdClaim({ user, deliveryId }) {
  ensurePlayer(user)
  const result = claimDelivery(deliveryId, user)
  if (!result.ok) return { message: 'Delivery not found or already claimed.' }
  const d = result.delivery
  if (d.type === 'gold') return { message: `Collected ${formatGold(d.gold_amount)} from AH mailbox.` }
  return { message: `Collect "${d.item_name}" x${d.quantity} from the Auction Chest. (${d.note})` }
}
