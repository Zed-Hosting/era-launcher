/**
 * IPC channel names. Keep in sync between main and preload.
 */
export const IPC = {
  App: {
    Version: 'app:version'
  },
  Detect: {
    Scan: 'detect:scan',
    Health: 'detect:health'
  },
  Config: {
    Get: 'config:get',
    Set: 'config:set'
  },
  Prereq: {
    Status: 'prereq:status',
    Install: 'prereq:install'
  },
  Modlist: {
    Fetch: 'modlist:fetch',
    Diff: 'modlist:diff',
    Apply: 'modlist:apply',
    Export: 'modlist:export',
    Enforce: 'modlist:enforce',
    ScanPlugins: 'modlist:scanPlugins',
    BuildTemplate: 'modlist:buildTemplate',
    Example: 'modlist:example'
  },
  ModManager: {
    Detect: 'modmanager:detect',
    ImportStaging: 'modmanager:importStaging'
  },
  Dialog: {
    SaveFile: 'dialog:saveFile',
    PickFolder: 'dialog:pickFolder'
  },
  Server: {
    LoadToml: 'server:loadToml',
    SaveToml: 'server:saveToml',
    Start: 'server:start',
    Stop: 'server:stop',
    Status: 'server:status'
  },
  Launch: {
    Play: 'launch:play'
  },
  Backup: {
    Snapshot: 'backup:snapshot',
    Restore: 'backup:restore',
    List: 'backup:list'
  },
  AhMod: {
    Status:    'ahmod:status',
    Install:   'ahmod:install',
    Uninstall: 'ahmod:uninstall',
    Test:      'ahmod:test',
    Identity:  'ahmod:identity'
  },
  Credentials: {
    SetNexusKey: 'creds:setNexusKey',
    HasNexusKey: 'creds:hasNexusKey',
    ClearNexusKey: 'creds:clearNexusKey'
  },
  Updater: {
    Check: 'updater:check',
    Quit: 'updater:quitAndInstall'
  },
  Events: {
    Progress: 'events:progress',
    ServerLog: 'events:serverLog',
    UpdateStatus: 'events:updateStatus'
  }
} as const

export type IpcChannels = typeof IPC
