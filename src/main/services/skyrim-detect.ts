import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

/**
 * Read Steam install path from the HKCU\Software\Valve\Steam\SteamPath registry value.
 * Uses `reg query` to avoid native bindings.
 */
async function readSteamPath(): Promise<string | undefined> {
  if (process.platform !== 'win32') return undefined
  const { spawn } = await import('node:child_process')
  return await new Promise<string | undefined>((resolve) => {
    const proc = spawn('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], {
      windowsHide: true
    })
    let out = ''
    proc.stdout.on('data', (d) => (out += d.toString()))
    proc.on('close', () => {
      const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/i)
      resolve(m ? m[1].trim() : undefined)
    })
    proc.on('error', () => resolve(undefined))
  })
}

/** Parse libraryfolders.vdf for library root paths. */
async function readLibraryFolders(steamPath: string): Promise<string[]> {
  const libraryVdf = path.join(steamPath, 'steamapps', 'libraryfolders.vdf')
  try {
    const text = await fs.readFile(libraryVdf, 'utf8')
    const paths: string[] = []
    // libraryfolders.vdf has `"path"   "C:\\..."` entries
    const re = /"path"\s+"([^"]+)"/g
    let m
    while ((m = re.exec(text))) {
      paths.push(m[1].replace(/\\\\/g, '\\'))
    }
    // The Steam install itself is always a library too.
    if (!paths.includes(steamPath)) paths.unshift(steamPath)
    return paths
  } catch {
    return [steamPath]
  }
}

/** Find Skyrim Special Edition (AppID 489830) install dir across all Steam libraries. */
async function findSkyrimInLibrary(libRoot: string): Promise<string | undefined> {
  const acf = path.join(libRoot, 'steamapps', 'appmanifest_489830.acf')
  try {
    const text = await fs.readFile(acf, 'utf8')
    const m = text.match(/"installdir"\s+"([^"]+)"/i)
    if (!m) return undefined
    const dir = path.join(libRoot, 'steamapps', 'common', m[1])
    await fs.access(path.join(dir, 'SkyrimSE.exe'))
    return dir
  } catch {
    return undefined
  }
}

export interface SkyrimVersionInfo {
  productVersion: string
  fileVersion: string
}

/** Read the PE version of SkyrimSE.exe. */
export async function readSkyrimVersion(skyrimDir: string): Promise<SkyrimVersionInfo | undefined> {
  const exe = path.join(skyrimDir, 'SkyrimSE.exe')
  try {
    // Lazy import — only loadable on Windows.
    const mod = await import('win-version-info')
    const info = (mod as any).default ? (mod as any).default(exe) : (mod as any)(exe)
    return {
      productVersion: String(info?.ProductVersion ?? info?.FileVersion ?? ''),
      fileVersion: String(info?.FileVersion ?? '')
    }
  } catch {
    return undefined
  }
}

/** Tiny semver-ish check: must be 1.6.x */
export function isSkyrimVersionSupported(version: string | undefined): boolean {
  if (!version) return false
  const m = version.match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!m) return false
  const major = Number(m[1])
  const minor = Number(m[2])
  return major === 1 && minor === 6
}

export async function hasSkyrimBeenLaunched(documentsPath?: string): Promise<boolean> {
  // 1) plugins.txt in %LOCALAPPDATA% is the most reliable "ever launched" signal
  //    (game writes it on first launch, persists across Documents redirects).
  const localAppData = process.env.LOCALAPPDATA
  if (localAppData) {
    const lap = path.join(localAppData, 'Skyrim Special Edition')
    for (const name of ['Plugins.txt', 'plugins.txt']) {
      try {
        await fs.access(path.join(lap, name))
        return true
      } catch {
        /* keep looking */
      }
    }
  }
  // 2) Fall back to Documents\My Games\Skyrim Special Edition\SkyrimPrefs.ini.
  //    documentsPath should come from Electron's app.getPath('documents') which
  //    correctly resolves OneDrive-redirected user folders.
  const docs = documentsPath ?? path.join(os.homedir(), 'Documents')
  const candidates = [
    path.join(docs, 'My Games', 'Skyrim Special Edition', 'SkyrimPrefs.ini'),
    path.join(os.homedir(), 'OneDrive', 'Documents', 'My Games', 'Skyrim Special Edition', 'SkyrimPrefs.ini'),
    process.env.OneDrive
      ? path.join(process.env.OneDrive, 'Documents', 'My Games', 'Skyrim Special Edition', 'SkyrimPrefs.ini')
      : ''
  ].filter(Boolean) as string[]
  for (const c of candidates) {
    try {
      await fs.access(c)
      return true
    } catch {
      /* keep looking */
    }
  }
  return false
}

export interface SkyrimDetection {
  installPath?: string
  exeVersion?: string
  steamLibrary?: string
  hasBeenLaunched: boolean
  problems: string[]
}

export async function detectSkyrim(
  overridePath?: string,
  documentsPath?: string
): Promise<SkyrimDetection> {
  const problems: string[] = []
  let installPath: string | undefined
  let steamLibrary: string | undefined

  if (overridePath) {
    try {
      await fs.access(path.join(overridePath, 'SkyrimSE.exe'))
      installPath = overridePath
    } catch {
      problems.push(`Override path does not contain SkyrimSE.exe: ${overridePath}`)
    }documentsPath
  }

  if (!installPath) {
    const steamPath = await readSteamPath()
    if (!steamPath) {
      problems.push('Steam install not found in registry.')
    } else {
      const libs = await readLibraryFolders(steamPath)
      for (const lib of libs) {
        const found = await findSkyrimInLibrary(lib)
        if (found) {
          installPath = found
          steamLibrary = lib
          break
        }
      }
      if (!installPath) problems.push('Skyrim Special Edition (AppID 489830) not found in any Steam library.')
    }
  }

  let exeVersion: string | undefined
  if (installPath) {
    const v = await readSkyrimVersion(installPath)
    exeVersion = v?.productVersion || v?.fileVersion
    if (!isSkyrimVersionSupported(exeVersion)) {
      problems.push(`Skyrim version ${exeVersion ?? 'unknown'} is not supported. Need 1.6.x.`)
    }
  }

  const hasBeenLaunched = await hasSkyrimBeenLaunched()
  if (!hasBeenLaunched) {
    problems.push('Skyrim has not been launched once via Steam yet. Do that before installing STR.')
  }

  return { installPath, exeVersion, steamLibrary, hasBeenLaunched, problems }
}
