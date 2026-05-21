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

const ESP_NAME     = 'ERA-AH.esp'
const PEX_NAME     = 'ERA_AH_Inbox.pex'
const CATALOG_NAME = 'catalog.json'
const STATE_REL    = path.join('SKSE', 'Plugins', 'StorageUtilData', 'ERA-AH')
const INBOX_JSON   = 'inbox.json'
const CONFIRM_JSON = 'confirmed.json'
const PENDING_JSON = 'pending_listings.json'
const VERSION_MARK = '.installed-version'

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
  catalogPresent: boolean
  papyrusUtilPresent: boolean
  pluginActivated: boolean
  installedVersion?: string
  bundledVersion: string
  needsUpdate: boolean
  dataPath?: string
}

function installedVersionPath(skyrimInstallPath: string): string {
  return path.join(skyrimInstallPath, 'Data', STATE_REL, VERSION_MARK)
}

async function readInstalledVersion(skyrimInstallPath: string): Promise<string | undefined> {
  try {
    const txt = await fs.readFile(installedVersionPath(skyrimInstallPath), 'utf8')
    return txt.trim() || undefined
  } catch { return undefined }
}

function pluginsTxtPath(): string | undefined {
  const local = process.env.LOCALAPPDATA
  if (!local) return undefined
  return path.join(local, 'Skyrim Special Edition', 'plugins.txt')
}

async function isPluginActivated(): Promise<boolean> {
  const p = pluginsTxtPath()
  if (!p || !existsSync(p)) return false
  try {
    const txt = await fs.readFile(p, 'utf8')
    // Skyrim SE: lines starting with '*' are enabled. ESP name match is
    // case-insensitive. Strip BOM if present.
    const clean = txt.replace(/^\uFEFF/, '')
    const re = new RegExp('^\\s*\\*\\s*' + ESP_NAME.replace(/[.]/g, '\\.') + '\\s*$', 'im')
    return re.test(clean)
  } catch { return false }
}

/**
 * Ensure ERA-AH.esp is enabled in %LOCALAPPDATA%\Skyrim Special Edition\plugins.txt.
 * Without this, the engine never loads the plugin even though the .esp is on disk
 * (which is why `help "ERA_AH_Inbox" 4` returns nothing).
 */
async function activatePluginInPluginsTxt(): Promise<{ ok: boolean; reason?: string }> {
  const p = pluginsTxtPath()
  if (!p) return { ok: false, reason: 'no-LOCALAPPDATA' }
  try {
    let txt = ''
    try { txt = await fs.readFile(p, 'utf8') } catch { /* file may not exist yet */ }
    const hadBom = txt.startsWith('\uFEFF')
    if (hadBom) txt = txt.slice(1)

    const espLower = ESP_NAME.toLowerCase()
    const lines = txt.length ? txt.split(/\r?\n/) : []
    let found = false
    for (let i = 0; i < lines.length; i++) {
      const stripped = lines[i].replace(/^\s*\*?\s*/, '').trim().toLowerCase()
      if (stripped === espLower) {
        // Force-enable by prefixing '*'
        lines[i] = '*' + ESP_NAME
        found = true
        break
      }
    }
    if (!found) lines.push('*' + ESP_NAME)

    // Preserve trailing newline behaviour
    let out = lines.join('\r\n')
    if (!out.endsWith('\r\n')) out += '\r\n'
    if (hadBom) out = '\uFEFF' + out
    await fs.mkdir(path.dirname(p), { recursive: true })
    await fs.writeFile(p, out, 'utf8')
    return { ok: true }
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? String(e) }
  }
}

export async function getAhModStatus(skyrimInstallPath: string | undefined): Promise<AhModInstallStatus> {
  const bundledVersion = app.getVersion()
  if (!skyrimInstallPath) {
    return {
      installed: false, espPresent: false, pexPresent: false, catalogPresent: false,
      papyrusUtilPresent: false, pluginActivated: false, bundledVersion, needsUpdate: false,
    }
  }
  const data = path.join(skyrimInstallPath, 'Data')
  const esp  = path.join(data, ESP_NAME)
  const pex  = path.join(data, 'Scripts', PEX_NAME)
  const cat  = path.join(data, STATE_REL, CATALOG_NAME)
  // PapyrusUtil ships as PapyrusUtil.dll under SKSE/Plugins
  const pUtil = path.join(data, 'SKSE', 'Plugins', 'PapyrusUtil.dll')

  const espPresent     = existsSync(esp)
  const pexPresent     = existsSync(pex)
  const catalogPresent = existsSync(cat)
  const papyrusUtilPresent = existsSync(pUtil)
  const pluginActivated = await isPluginActivated()
  const installedVersion = await readInstalledVersion(skyrimInstallPath)
  const installed = espPresent && pexPresent && catalogPresent && pluginActivated
  const needsUpdate = installed && installedVersion !== bundledVersion
  return {
    installed,
    espPresent,
    pexPresent,
    catalogPresent,
    papyrusUtilPresent,
    pluginActivated,
    installedVersion,
    bundledVersion,
    needsUpdate,
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

  // catalog.json — the hover-to-sell Papyrus hotkey reads this to map a
  // selected InventoryMenu entry's display name back to its source plugin
  // and FormID. Always overwrite on install so updates pick up new items.
  const catalogSrc = path.join(modDir, CATALOG_NAME)
  if (existsSync(catalogSrc)) {
    await fs.copyFile(catalogSrc, path.join(stateDir, CATALOG_NAME))
  }

  const inbox     = path.join(stateDir, INBOX_JSON)
  const confirmed = path.join(stateDir, CONFIRM_JSON)
  const pending   = path.join(stateDir, PENDING_JSON)
  if (!existsSync(inbox))     await fs.writeFile(inbox,     JSON.stringify({ items: [] }), 'utf8')
  if (!existsSync(confirmed)) await fs.writeFile(confirmed, JSON.stringify({ ids:   [] }), 'utf8')
  if (!existsSync(pending))   await fs.writeFile(pending,   JSON.stringify({ items: [] }), 'utf8')

  // CRITICAL: enable the .esp in plugins.txt. Without this Skyrim loads the
  // file but ignores it, and the quest/script attached to it never starts —
  // which is why `help "ERA_AH_Inbox" 4` returns nothing in-game.
  await activatePluginInPluginsTxt()

  // Stamp the launcher version so getAhModStatus can detect when a future
  // launcher release ships newer mod files and auto-reinstall on startup.
  await fs.writeFile(path.join(stateDir, VERSION_MARK), app.getVersion(), 'utf8')

  return { ok: true }
}

/**
 * Called at launcher startup. If the AH mod has been installed before but the
 * bundled launcher version is newer (e.g. user just auto-updated), silently
 * refresh the .esp/.pex/catalog.json so the player picks up the new build
 * without having to click "Install AH mod" manually.
 */
export async function ensureAhModUpToDate(skyrimInstallPath: string | undefined): Promise<
  { skipped: true; reason: string } | { skipped: false; installed: boolean; from?: string; to: string }
> {
  if (!skyrimInstallPath) return { skipped: true, reason: 'no-skyrim-path' }
  const status = await getAhModStatus(skyrimInstallPath)
  // Only auto-refresh if the user has previously installed the mod. We never
  // install for the first time without explicit consent (the user may not
  // want auto-delivery enabled).
  if (!status.installed && !status.installedVersion) {
    return { skipped: true, reason: 'never-installed' }
  }
  if (!status.needsUpdate && status.installed) {
    return { skipped: true, reason: 'up-to-date' }
  }
  const res = await installAhMod(skyrimInstallPath)
  if (!res.ok) return { skipped: true, reason: `install-failed: ${res.error}` }
  return { skipped: false, installed: true, from: status.installedVersion, to: status.bundledVersion }
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
