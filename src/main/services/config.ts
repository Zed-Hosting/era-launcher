import Store from 'electron-store'
import { launcherConfigSchema } from '@shared/schema'
import type { LauncherConfig } from '@shared/types'

const defaults: LauncherConfig = {
  autoUpdateEnabled: true,
  defaultServerPort: 10578,
  favorites: []
}

const store = new Store<LauncherConfig>({ name: 'launcher-config', defaults })

export function getConfig(): LauncherConfig {
  return launcherConfigSchema.parse(store.store)
}

export function updateConfig(patch: Partial<LauncherConfig>): LauncherConfig {
  const merged = launcherConfigSchema.parse({ ...store.store, ...patch })
  store.store = merged
  return merged
}
