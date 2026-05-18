// src/items.js — Skyrim item FormID lookup table
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ITEMS_PATH = path.join(__dirname, '..', 'data', 'items.json')

let CATALOG = {}

export function loadItems() {
  try {
    const raw = fs.readFileSync(ITEMS_PATH, 'utf8')
    CATALOG = JSON.parse(raw)
    const count = Object.keys(CATALOG).filter(k => !k.startsWith('_')).length
    console.log(`[AH] Loaded ${count} item definitions from items.json`)
  } catch (err) {
    console.warn('[AH] items.json missing or invalid — item auto-delivery disabled.', err.message)
    CATALOG = {}
  }
}

// Normalize a user-typed item name: lowercase, collapse whitespace
function normalize(name) {
  return String(name || '').toLowerCase().trim().replace(/\s+/g, ' ')
}

// Look up an item by name. Returns { plugin, formId, canonicalName } or null.
export function lookupItem(name) {
  const key = normalize(name)
  if (!key || key.startsWith('_')) return null
  const entry = CATALOG[key]
  if (!entry) return null
  return { ...entry, canonicalName: key }
}

// Build a packed "plugin:formId" string used for item_form_id column
export function packFormRef(plugin, formId) {
  if (!plugin || !formId) return null
  return `${plugin}:${formId.toUpperCase()}`
}

export function unpackFormRef(ref) {
  if (!ref || typeof ref !== 'string' || !ref.includes(':')) return null
  const [plugin, formId] = ref.split(':')
  return { plugin, formId }
}
