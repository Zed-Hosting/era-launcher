import { describe, expect, it } from 'vitest'
import { isSkyrimVersionSupported } from './skyrim-detect'

describe('isSkyrimVersionSupported', () => {
  it('accepts 1.6.x', () => {
    expect(isSkyrimVersionSupported('1.6.640.0')).toBe(true)
    expect(isSkyrimVersionSupported('1.6.1170')).toBe(true)
  })
  it('rejects 1.5.x and 1.7.x', () => {
    expect(isSkyrimVersionSupported('1.5.97')).toBe(false)
    expect(isSkyrimVersionSupported('1.7.0')).toBe(false)
  })
  it('rejects empty / malformed', () => {
    expect(isSkyrimVersionSupported(undefined)).toBe(false)
    expect(isSkyrimVersionSupported('')).toBe(false)
    expect(isSkyrimVersionSupported('abc')).toBe(false)
  })
})
