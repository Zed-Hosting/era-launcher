/** Nexus API key storage via OS credential vault (keytar). */
const SERVICE = 'era-launcher'
const ACCOUNT_NEXUS = 'nexus-api-key'

interface KeytarApi {
  setPassword(service: string, account: string, password: string): Promise<void>
  getPassword(service: string, account: string): Promise<string | null>
  deletePassword(service: string, account: string): Promise<boolean>
}

let keytarLoadError: string | undefined

async function getKeytar(): Promise<KeytarApi | undefined> {
  try {
    const mod: any = await import('keytar')
    // keytar is CJS; under Node's ESM interop the real exports may live on `.default`.
    const api: KeytarApi = mod?.setPassword ? mod : mod?.default
    if (!api || typeof api.setPassword !== 'function') {
      keytarLoadError = 'keytar module loaded but setPassword is missing.'
      return undefined
    }
    return api
  } catch (err: any) {
    keytarLoadError = err?.message ?? String(err)
    return undefined
  }
}

export async function setNexusKey(key: string): Promise<void> {
  const k = await getKeytar()
  if (!k) throw new Error(`Credential storage (keytar) unavailable: ${keytarLoadError ?? 'unknown error'}`)
  await k.setPassword(SERVICE, ACCOUNT_NEXUS, key)
}

export async function getNexusKey(): Promise<string | undefined> {
  const k = await getKeytar()
  if (!k) return undefined
  return (await k.getPassword(SERVICE, ACCOUNT_NEXUS)) ?? undefined
}

export async function clearNexusKey(): Promise<void> {
  const k = await getKeytar()
  if (!k) return
  await k.deletePassword(SERVICE, ACCOUNT_NEXUS)
}

export async function hasNexusKey(): Promise<boolean> {
  return !!(await getNexusKey())
}
