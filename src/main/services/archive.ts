import { promises as fs } from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { ensureDir, exists } from './fs-util'

/**
 * Resolve the absolute path to the bundled 7za.exe.
 *
 * `7zip-bin`'s exported `path7za` is computed from its own `__dirname`, which
 * after bundling points inside `out/main/chunks/` — completely wrong. We do
 * not use it. Instead we look for `node_modules/7zip-bin/win/x64/7za.exe`
 * inside the `app.asar.unpacked` tree (production) or the workspace root (dev).
 */
async function resolve7zaPath(): Promise<string> {
  const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'ia32' ? 'ia32' : 'x64'
  const platform =
    process.platform === 'win32'
      ? 'win'
      : process.platform === 'darwin'
        ? 'mac'
        : 'linux'
  const exe = process.platform === 'win32' ? '7za.exe' : '7za'
  const rel = path.join('node_modules', '7zip-bin', platform, arch, exe)

  const candidates: string[] = []
  // 1) production: resourcesPath/app.asar.unpacked/node_modules/...
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'app.asar.unpacked', rel))
  }
  // 2) dev / unpacked: appPath() may be the source tree
  try {
    const appPath = app.getAppPath()
    candidates.push(path.join(appPath, rel))
    // appPath may itself be app.asar — try the sibling unpacked dir
    if (appPath.endsWith('.asar')) {
      candidates.push(path.join(`${appPath}.unpacked`, rel))
    }
  } catch {
    /* not initialized in test contexts */
  }
  // 3) workspace cwd fallback
  candidates.push(path.join(process.cwd(), rel))

  for (const c of candidates) {
    if (await exists(c)) return c
  }
  throw new Error(
    `Could not locate 7za executable. Looked in:\n  ${candidates.join('\n  ')}\n` +
      `Make sure 7zip-bin is installed and listed under asarUnpack in electron-builder.yml.`
  )
}

/**
 * node-7z exports `extractFull` / `list` as either top-level named exports
 * (when required from CJS) or properties of `.default` (when reached via
 * Node's ESM `import()` interop on a CJS module). This helper normalizes both
 * so we can call the API safely.
 */
async function load7z(): Promise<{ extractFull: any; list: any; bin: string }> {
  const Seven: any = await import('node-7z')
  const sevenApi = Seven?.extractFull ? Seven : Seven?.default
  if (!sevenApi || typeof sevenApi.extractFull !== 'function') {
    throw new Error('node-7z module loaded but extractFull is missing. (Check that node-7z installed correctly.)')
  }
  const bin = await resolve7zaPath()
  return { extractFull: sevenApi.extractFull.bind(sevenApi), list: sevenApi.list?.bind(sevenApi), bin }
}

/** Extract a .zip or .7z archive into destDir using 7zip-bin. */
export async function extractArchive(archivePath: string, destDir: string): Promise<void> {
  await ensureDir(destDir)
  const { extractFull, bin } = await load7z()
  return await new Promise<void>((resolve, reject) => {
    const stream = extractFull(archivePath, destDir, {
      $bin: bin,
      $progress: false,
      recursive: true
    })
    stream.on('end', () => resolve())
    stream.on('error', (err: Error) => reject(err))
  })
}

export async function listArchive(archivePath: string): Promise<string[]> {
  const { list, bin } = await load7z()
  if (!list) throw new Error('node-7z module loaded but list is missing.')
  return await new Promise<string[]>((resolve, reject) => {
    const files: string[] = []
    const stream = list(archivePath, { $bin: bin })
    stream.on('data', (d: { file: string }) => files.push(d.file))
    stream.on('end', () => resolve(files))
    stream.on('error', reject)
  })
}

/** Best-effort cleanup. */
export async function rimraf(target: string): Promise<void> {
  await fs.rm(target, { recursive: true, force: true })
}
