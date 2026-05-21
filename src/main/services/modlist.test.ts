import { describe, expect, it } from 'vitest'
import { buildPluginsTxt, parsePluginsTxt } from './modlist'
import type { ModlistManifest } from '@shared/types'

const sample: ModlistManifest = {
  schemaVersion: 1,
  name: 'Test',
  version: '1',
  gameVersion: '1.6.1170',
  strVersion: '1.6.x',
  publishedAt: '2026-01-01T00:00:00Z',
  mods: [
    {
      id: 'b',
      displayName: 'B',
      source: 'url',
      sourceRef: 'https://example/b.zip',
      files: [],
      plugin: 'B.esp',
      loadOrderIndex: 2
    },
    {
      id: 'a',
      displayName: 'A',
      source: 'url',
      sourceRef: 'https://example/a.zip',
      files: [],
      plugin: 'A.esp',
      loadOrderIndex: 1
    },
    {
      id: 'noplug',
      displayName: 'No plugin',
      source: 'url',
      sourceRef: 'https://example/c.zip',
      files: []
    }
  ]
}

describe('buildPluginsTxt', () => {
  it('orders by loadOrderIndex and skips entries without plugin', () => {
    const out = buildPluginsTxt(sample)
    const lines = out.trim().split(/\r?\n/)
    // Launcher-managed plugins (AH mod + UIExtensions) are always appended.
    expect(lines).toEqual(['*A.esp', '*B.esp', '*ERA-AH.esp', '*UIExtensions.esp'])
  })

  it('appends extras as explicitly disabled (no leading *) and drops vanilla', () => {
    const out = buildPluginsTxt(sample, ['Random.esp', 'Skyrim.esm', 'Update.esm'])
    const lines = out.trim().split(/\r?\n/)
    expect(lines).toEqual(['*A.esp', '*B.esp', 'Random.esp', '*ERA-AH.esp', '*UIExtensions.esp'])
  })
})

describe('parsePluginsTxt', () => {
  it('parses enabled (*) and disabled entries, ignoring comments and non-plugin lines', () => {
    const text = '# a comment\r\n*A.esp\r\nB.esp\r\n*C.esl\r\n*not_a_plugin\r\n'
    const parsed = parsePluginsTxt(text)
    expect(parsed.listed).toEqual(['A.esp', 'B.esp', 'C.esl'])
    expect(parsed.enabled).toEqual(['A.esp', 'C.esl'])
  })
})

