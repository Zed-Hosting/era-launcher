// src/format.js — Shared formatting helpers

export function formatGold(amount) {
  if (amount == null) return '0g'
  return `${amount.toLocaleString()}g`
}

export function formatTimeLeft(expiresAt) {
  const secs = expiresAt - Math.floor(Date.now() / 1000)
  if (secs <= 0) return 'Expired'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0)   return `${h}h ${m}m`
  return `${m}m`
}
