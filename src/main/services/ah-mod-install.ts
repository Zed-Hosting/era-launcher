// src/main/services/ah-mod-install.ts
//
// Installs the ERA Auction House Papyrus mod into the Skyrim Data folder.
// The bundled files are shipped under <resources>/ah-mod/.
//
//   Data/
//   ├── ERA-AH.esp
//   ├── Scripts/ERA_AH_Inbox.pex
//   └── SKSE/Plugins/StorageUtilData/ERA-AH/{inbox,confirmed}.json
//
// The Papyrus script will not work without PapyrusUtil SE — we only check for
// the presence of its known dll/swfs and report status; we do NOT install it.

import { app } from 'electron'
import { promises as fs, existsSync } from 'node:fs'
import path from 'node:path'

const ESP_NAME    = 'ERA-AH.esp'
const PEX_NAME    = 'ERA_AH_Inbox.pex'
const STATE_REL   = path.join('SKSE', 'Plugins', 'StorageUtilData', 'ERA-AH')
const INBOX_JSON  = 'inbox.json'
const CONFIRM_JSON = 'confirmed.json'

// Resources bundled with the launcher (loaded from build output)
function bundledModDir(): string {
  // Packaged: <resources>/resources/ah-mod (electron-builder copies resources/ into process.resourcesPath/resources)
  // Dev:      <repo>/resources/ah-mod
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'resources')
    : path.join(app.getAppPath(), 'resources')
  return path.join(base, 'ah-mod')
}

async function copyIfExists(src: string, dst: string): Promise<boolean> {
  if (!existsSync(src)) return false
  await fs.mkdir(path.dirname(dst), { recursive: true })
  await fs.copyFile(src, dst)
  return true
}

export interface AhModInstallStatus {
  installed: boolean
  espPresent: boolean
  pexPresent: boolean
  papyrusUtilPresent: boolean
  dataPath?: string
}

export async function getAhModStatus(skyrimInstallPath: string | undefined): Promise<AhModInstallStatus> {
  if (!skyrimInstallPath) {
    return { installed: false, espPresent: false, pexPresent: false, papyrusUtilPresent: false }
  }
  const data = path.join(skyrimInstallPath, 'Data')
  const esp  = path.join(data, ESP_NAME)
  const pex  = path.join(data, 'Scripts', PEX_NAME)
  // PapyrusUtil ships as PapyrusUtil.dll under SKSE/Plugins
  const pUtil = path.join(data, 'SKSE', 'Plugins', 'PapyrusUtil.dll')

  const espPresent = existsSync(esp)
  const pexPresent = existsSync(pex)
  const papyrusUtilPresent = existsSync(pUtil)
  return {
    installed: espPresent && pexPresent,
    espPresent,
    pexPresent,
    papyrusUtilPresent,
    dataPath: data,
  }
}

export async function installAhMod(skyrimInstallPath: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const data = path.join(skyrimInstallPath, 'Data')
  const modDir = bundledModDir()

  const espSrc = path.join(modDir, ESP_NAME)
  const pexSrc = path.join(modDir, PEX_NAME)

  if (!existsSync(espSrc) || !existsSync(pexSrc)) {
    return {
      ok: false,
      error:
        'Bundled mod files not found. The launcher build is missing ah-mod/. ' +
        'Either build the mod via Creation Kit and place ' +
        `${ESP_NAME} and ${PEX_NAME} under resources/ah-mod/, or wait for a release that ships them.`,
    }
  }

  await copyIfExists(espSrc, path.join(data, ESP_NAME))
  await copyIfExists(pexSrc, path.join(data, 'Scripts', PEX_NAME))

  // Ensure the JSON state files exist so the script and the launcher poller
  // both start from a known state.
  const stateDir = path.join(data, STATE_REL)
  await fs.mkdir(stateDir, { recursive: true })
  const inbox     = path.join(stateDir, INBOX_JSON)
  const confirmed = path.join(stateDir, CONFIRM_JSON)
  if (!existsSync(inbox))     await fs.writeFile(inbox,     JSON.stringify({ items: [] }), 'utf8')
  if (!existsSync(confirmed)) await fs.writeFile(confirmed, JSON.stringify({ ids:   [] }), 'utf8')

  return { ok: true }
}

export async function uninstallAhMod(skyrimInstallPath: string): Promise<void> {
  const data = path.join(skyrimInstallPath, 'Data')
  const targets = [
    path.join(data, ESP_NAME),
    path.join(data, 'Scripts', PEX_NAME),
  ]
  for (const t of targets) {
    try { await fs.unlink(t) } catch { /* not present */ }
  }
}
