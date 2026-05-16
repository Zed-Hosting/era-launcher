import { describe, it, expect } from 'vitest'
import { modlistManifestSchema } from '../../shared/schema'
import { readFileSync } from 'node:fs'
import path from 'node:path'

describe('bundled modlist.example.json', () => {
  it('parses against the schema', () => {
    const p = path.join(process.cwd(), 'resources', 'modlist.example.json')
    const json = JSON.parse(readFileSync(p, 'utf8'))
    const r = modlistManifestSchema.safeParse(json)
    if (!r.success) console.error(JSON.stringify(r.error.issues.slice(0, 5), null, 2))
    expect(r.success).toBe(true)
    expect(r.data!.mods.length).toBe(3)
  })
})
