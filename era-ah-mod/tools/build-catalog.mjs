// era-ah-mod/tools/build-catalog.mjs
//
// Reads ah-sidecar/data/items.json (the canonical normalized catalog) and
// produces resources/ah-mod/catalog.json — an array of entries the Papyrus
// hover-to-sell script can linear-scan against the selected InventoryMenu
// entry text. The launcher's installAhMod copies this file into the player's
// Data\SKSE\Plugins\StorageUtilData\ERA-AH\ folder.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', '..')
const src  = path.join(root, 'ah-sidecar', 'data', 'items.json')
const out  = path.join(root, 'resources', 'ah-mod', 'catalog.json')

// Title-case a lowercase normalized name: "iron sword" -> "Iron Sword".
// Skyrim item display names follow standard Title Case for the vast majority
// of vanilla items; edge cases (proper nouns, "of" preposition) can be added
// to the override table below as we discover them in-game.
const OVERRIDES = {
  // Add irregular display-name fixups here if linear-scan misses.
  // 'foo bar': 'Foo of Bar',
}

function titleCase(s) {
  if (OVERRIDES[s]) return OVERRIDES[s]
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const raw = JSON.parse(fs.readFileSync(src, 'utf8'))
const items = []
for (const [key, value] of Object.entries(raw)) {
  if (key.startsWith('_')) continue
  if (!value || !value.plugin || !value.formId) continue
  items.push({
    name:    titleCase(key),
    lname:   key,
    plugin:  value.plugin,
    formId:  String(value.formId).toUpperCase(),
  })
}

fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify({ items }, null, 2), 'utf8')
console.log(`Wrote ${out} (${items.length} items)`)
