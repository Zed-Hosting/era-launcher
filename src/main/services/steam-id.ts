// SteamID resolution for the local Windows machine.
//
// Steam writes the currently-signed-in account's 32-bit "accountId" to:
//   HKCU\Software\Valve\Steam\ActiveProcess\ActiveUser   (REG_DWORD)
//
// SteamID64 = 76561197960265728 + accountId (Steam's universe+type bits OR'd
// with the accountId; for individuals the constant offset is correct).
//
// We use SteamID64 as the stable per-user identity for the AH backend so that
// players whose STR display name collides ("Prisoner" being the most common)
// can still be told apart. The launcher reads it once at startup and includes
// it as an "X-ERA-Steam-Id" header on every sidecar request, plus a steamId
// field in JSON bodies for endpoints that already parse JSON.

import { spawnSync } from 'node:child_process'

// Steam's individual-account SteamID64 offset:
//   0x110000100000000 == 76561197960265728n
const STEAMID64_OFFSET = 76561197960265728n

export interface LocalSteamId {
  /** 32-bit account id as found in HKCU\Software\Valve\Steam\ActiveProcess\ActiveUser. */
  accountId: number
  /** Full 64-bit SteamID as a decimal string (BigInt-safe). */
  steamId64: string
}

let _cached: LocalSteamId | null | undefined  // undefined = not yet attempted

/**
 * Reads HKCU\Software\Valve\Steam\ActiveProcess\ActiveUser and returns the
 * resolved SteamID64. Returns null if Steam is not installed, no user is
 * signed in, or the key cannot be read. Result is memoised so repeated calls
 * are cheap.
 *
 * Windows-only by design — STR is Windows-only and the launcher build only
 * ships on Windows.
 */
export function getLocalSteamId(): LocalSteamId | null {
  if (_cached !== undefined) return _cached
  _cached = readSteamIdFromRegistry()
  return _cached
}

function readSteamIdFromRegistry(): LocalSteamId | null {
  if (process.platform !== 'win32') return null
  try {
    const r = spawnSync('reg.exe', [
      'query',
      'HKCU\\Software\\Valve\\Steam\\ActiveProcess',
      '/v',
      'ActiveUser',
    ], { encoding: 'utf8', windowsHide: true })
    if (r.status !== 0 || !r.stdout) return null
    // Output looks like: "    ActiveUser    REG_DWORD    0x1234abcd"
    const m = r.stdout.match(/ActiveUser\s+REG_DWORD\s+0x([0-9a-fA-F]+)/)
    if (!m) return null
    const accountId = parseInt(m[1], 16)
    if (!accountId) return null  // 0 means no one is signed in
    const steamId64 = (BigInt(accountId) + STEAMID64_OFFSET).toString()
    return { accountId, steamId64 }
  } catch {
    return null
  }
}
