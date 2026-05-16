import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, promises as fs } from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  await pipeline(createReadStream(filePath), hash)
  return hash.digest('hex')
}

export async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true })
}

export async function copyFile(src: string, dst: string): Promise<void> {
  await ensureDir(path.dirname(dst))
  await fs.copyFile(src, dst)
}

export async function moveFile(src: string, dst: string): Promise<void> {
  await ensureDir(path.dirname(dst))
  try {
    await fs.rename(src, dst)
  } catch {
    await fs.copyFile(src, dst)
    await fs.unlink(src)
  }
}

export async function* walk(root: string): AsyncGenerator<string> {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => [])
  for (const e of entries) {
    const full = path.join(root, e.name)
    if (e.isDirectory()) yield* walk(full)
    else if (e.isFile()) yield full
  }
}

/** Stream-download via got, hashing on the fly. Returns the actual sha256. */
export async function downloadToFile(
  url: string,
  destPath: string,
  onProgress?: (bytes: number, totalBytes?: number) => void,
  headers?: Record<string, string>
): Promise<string> {
  const { default: got } = await import('got')
  await ensureDir(path.dirname(destPath))
  const hash = createHash('sha256')
  const stream = got.stream(url, { headers, https: { rejectUnauthorized: true } })

  let total: number | undefined
  let received = 0

  stream.on('response', (res) => {
    const len = res.headers['content-length']
    if (len) total = Number(len)
  })
  stream.on('data', (chunk: Buffer) => {
    received += chunk.length
    hash.update(chunk)
    onProgress?.(received, total)
  })

  const out = createWriteStream(destPath)
  await pipeline(stream, out)
  return hash.digest('hex')
}
