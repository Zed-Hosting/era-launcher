import { useEffect, useState } from 'react'
import { Download, Gavel, Key, Loader2, Save, Shield } from 'lucide-react'
import { useApp } from '../store'

interface ManagerDetection {
  mo2: { detected: boolean; instancePaths: string[]; stagingPaths: string[] }
  vortex: { detected: boolean; stagingPaths: string[] }
}

export function SettingsPage(): JSX.Element {
  const config = useApp((s) => s.config)
  const setConfig = useApp((s) => s.setConfig)
  const [nexusKey, setNexusKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [managers, setManagers] = useState<ManagerDetection | null>(null)
  const [importBusy, setImportBusy] = useState<string | null>(null)

  useEffect(() => {
    void window.str.creds.hasNexusKey().then((v) => setHasKey(!!v))
    void window.str.backup.list().then((s: any) => setSnapshots(s ?? []))
    void window.str.modManager.detect().then((m: any) => setManagers(m))
  }, [])

  if (!config) return <div>Loading…</div>

  const saveKey = async () => {
    if (!nexusKey) return
    try {
      await window.str.creds.setNexusKey(nexusKey)
      setNexusKey('')
      setHasKey(true)
    } catch (err: any) {
      alert(`Could not save Nexus API key:\n\n${err?.message ?? err}`)
    }
  }

  const clearKey = async () => {
    await window.str.creds.clearNexusKey()
    setHasKey(false)
  }

  const snapshot = async () => {
    const snap = await window.str.backup.snapshot()
    setSnapshots((s) => [snap as any, ...s])
  }

  const restore = async (id: string) => {
    if (!confirm(`Restore snapshot ${id}? Files added after this snapshot will be removed.`)) return
    await window.str.backup.restore(id)
  }

  const importFromStaging = async (stagingPath: string, label: string) => {
    const mode = window.confirm(
      `Build a publishable modlist from:\n${stagingPath}\n\n` +
        `OK   → URL mode: every mod points at <your-host>/<archive-name>. ` +
        `You pick a base URL and (optionally) a folder where ERA will copy every source archive for upload.\n\n` +
        `Cancel → Nexus mode: every mod points at its Nexus mod+file id. ` +
        `ERA auto-resolves the file id via the Nexus API using your saved key — no manual fill-in. ` +
        `Clients install via their own Nexus API key.`
    )
      ? 'url'
      : 'nexus'

    let publishBaseUrl: string | undefined
    let bundleDir: string | undefined
    if (mode === 'url') {
      const url = window.prompt(
        'Base URL where you will host the archives.\nExample: https://my-cdn.example.com/era',
        'https://my-cdn.example.com/era'
      )
      if (!url) return
      publishBaseUrl = url
      if (window.confirm('Also copy every source archive into an "upload bundle" folder for easy upload?')) {
        const bundle = (await window.str.dialog.pickFolder({
          title: 'Pick a folder to receive the archives'
        })) as { canceled: boolean; filePaths: string[] }
        if (bundle.canceled || bundle.filePaths.length === 0) return
        bundleDir = bundle.filePaths[0]
      }
    } else {
      if (!hasKey) {
        alert(
          'Nexus mode requires a Nexus API key. Add one in the "Nexus API key" section below, then try again.'
        )
        return
      }
    }

    const save = (await window.str.dialog.saveFile({
      defaultPath: bundleDir
        ? `${bundleDir}\\modlist.json`
        : `${stagingPath}\\..\\modlist.json`,
      filters: [{ name: 'Modlist JSON', extensions: ['json'] }]
    })) as { canceled: boolean; filePath?: string }
    if (save.canceled || !save.filePath) return

    setImportBusy(stagingPath)
    try {
      const result = (await window.str.modManager.importStaging({
        stagingPath,
        meta: {
          name: `${label} export`,
          version: '1.0.0',
          gameVersion: '1.6.1170',
          strVersion: '1.8.0',
          publishBaseUrl,
          bundleDir,
          nexusMode: mode === 'nexus'
        }
      })) as {
        manifest: any
        archivesFound: number
        archivesMissing: string[]
        bundledTo?: string
        nexusResolved: number
        nexusUnresolved: string[]
      }
      await window.str.modlist.export(result.manifest, save.filePath)
      alert(
        `Wrote modlist with ${result.manifest.mods.length} mods to:\n${save.filePath}\n\n` +
          `Source archives matched: ${result.archivesFound}\n` +
          (result.archivesMissing.length
            ? `Mods with NO matching archive (no source URL set): ${result.archivesMissing.length}\n  ${result.archivesMissing.slice(0, 5).join('\n  ')}${result.archivesMissing.length > 5 ? '\n  …' : ''}\n\n`
            : '') +
          (result.bundledTo
            ? `Archives copied to:\n${result.bundledTo}\n\nUpload that whole folder to ${publishBaseUrl}.\n\n`
            : '') +
          (mode === 'nexus'
            ? `Nexus file ids auto-resolved: ${result.nexusResolved}\n` +
              (result.nexusUnresolved.length
                ? `Could not resolve (left as REPLACE_FILE_ID): ${result.nexusUnresolved.length}\n  ${result.nexusUnresolved.slice(0, 5).join('\n  ')}${result.nexusUnresolved.length > 5 ? '\n  …' : ''}\n`
                : 'All file ids resolved — nothing left to fill in.')
            : `Next: upload the archives to ${publishBaseUrl}, then host this modlist.json wherever you like and point clients at the URL.`)
      )
    } catch (err: any) {
      alert(String(err?.message ?? err))
    } finally {
      setImportBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-3xl">Settings</h1>
      </header>

      <Section title="Skyrim install">
        <label className="text-xs text-muted-foreground">Override path (optional)</label>
        <input
          className="input mt-1"
          placeholder="Leave empty to auto-detect via Steam"
          value={config.skyrimPathOverride ?? ''}
          onChange={(e) => setConfig({ skyrimPathOverride: e.target.value || undefined })}
        />
      </Section>

      <Section title="Mod manager">
        <p className="text-xs text-muted-foreground">
          ERA installs and enforces the curated modlist directly into Skyrim's <code>Data/</code> folder.
          MO2 and Vortex are not used at runtime (they conflict with strict enforcement), but if you
          already have them installed ERA will <strong>reuse archives from their downloads folders</strong>
          during sync — no Nexus Premium needed. Just download each required mod once in
          Vortex or MO2 and ERA will pick it up automatically.
        </p>
      </Section>

      <Section title="Import staged mods (host)" icon={<Download size={14} />}>
        {!managers ? (
          <p className="text-xs text-muted-foreground">Scanning for installed mod managers…</p>
        ) : (
          <div className="space-y-2">
            {managers.mo2.stagingPaths.length === 0 &&
              managers.vortex.stagingPaths.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No MO2 instance or Vortex staging folder detected.
                </p>
              )}
            {managers.mo2.stagingPaths.map((p) => (
              <StagingRow
                key={p}
                label="MO2"
                path={p}
                busy={importBusy === p}
                onImport={() => importFromStaging(p, 'MO2')}
              />
            ))}
            {managers.vortex.stagingPaths.map((p) => (
              <StagingRow
                key={p}
                label="Vortex"
                path={p}
                busy={importBusy === p}
                onImport={() => importFromStaging(p, 'Vortex')}
              />
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              Generates a publishable <code>modlist.json</code>: hashes every file in each mod
              folder, matches each to its source archive in the manager's downloads folder, and
              wires up real <code>sourceRef</code> URLs (or Nexus mod ids). Optionally copies
              every archive into an upload-ready bundle folder.
            </p>
          </div>
        )}
      </Section>

      <Section title="Nexus API key" icon={<Key size={14} />}>
        {hasKey ? (
          <div className="flex items-center gap-2">
            <span className="badge-ok">Stored</span>
            <button className="btn-outline" onClick={clearKey}>
              Clear
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className="input"
              type="password"
              placeholder="Paste your Nexus API key"
              value={nexusKey}
              onChange={(e) => setNexusKey(e.target.value)}
            />
            <button className="btn-primary" onClick={saveKey} disabled={!nexusKey}>
              <Save size={14} />
              Save
            </button>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Get a key at{' '}
          <a
            className="text-primary underline"
            href="https://www.nexusmods.com/users/myaccount?tab=api"
            target="_blank"
            rel="noreferrer"
          >
            nexusmods.com/users/myaccount?tab=api
          </a>
          .
        </p>
      </Section>

      <Section title="Updates">
        <Toggle
          label="Auto-update launcher"
          on={config.autoUpdateEnabled}
          onChange={(v) => setConfig({ autoUpdateEnabled: v })}
        />
      </Section>

      <Section title="Auction House" icon={<Gavel size={14} />}>
        <p className="mb-3 text-xs text-muted-foreground">
          Auto-delivery of bought items requires the ERA Auction House mod (with PapyrusUtil SE)
          and the username below must match your in-game STR username exactly.
        </p>

        <AhModBlock />

        <label className="mt-4 block text-xs text-muted-foreground">AH username</label>
        <input
          className="input mt-1"
          placeholder="e.g. MyCharacterName"
          value={config.ahUsername ?? ''}
          onChange={(e) => setConfig({ ahUsername: e.target.value || undefined })}
        />

        <label className="mt-3 block text-xs text-muted-foreground">AH server URL (advanced)</label>
        <input
          className="input mt-1"
          placeholder="http://whippin.zedhosting.gg:33348"
          value={config.ahUrl ?? ''}
          onChange={(e) => setConfig({ ahUrl: e.target.value || undefined })}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Leave empty to use the default ERA server. Only change this if your community runs its own sidecar.
        </p>
      </Section>

      <Section title="Backups" icon={<Shield size={14} />}>
        <button className="btn-primary" onClick={snapshot}>
          Snapshot now
        </button>
        <div className="mt-3 space-y-1">
          {snapshots.length === 0 && <p className="text-xs text-muted-foreground">No snapshots yet.</p>}
          {snapshots.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded border border-border px-3 py-2 text-xs">
              <span className="truncate">{s.id}</span>
              <button className="btn-outline" onClick={() => restore(s.id)}>
                Restore
              </button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function StagingRow({
  label,
  path,
  busy,
  onImport
}: {
  label: string
  path: string
  busy: boolean
  onImport: () => void
}): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded border border-border px-3 py-2 text-xs">
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        <div className="truncate text-muted-foreground" title={path}>
          {path}
        </div>
      </div>
      <button className="btn-outline shrink-0" disabled={busy} onClick={onImport}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        Build modlist
      </button>
    </div>
  )
}

function Section({
  title,
  icon,
  children
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="panel p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  )
}

function AhModBlock(): JSX.Element {
  const [status, setStatus] = useState<{
    installed: boolean
    espPresent: boolean
    pexPresent: boolean
    papyrusUtilPresent: boolean
    dataPath?: string
  } | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => setStatus((await window.str.ahMod.status()) as any)
  useEffect(() => { void refresh() }, [])

  const install = async () => {
    setBusy(true)
    try {
      const res = (await window.str.ahMod.install()) as { ok: boolean; error?: string }
      if (!res.ok) alert(res.error || 'Install failed.')
      await refresh()
    } finally { setBusy(false) }
  }

  const uninstall = async () => {
    if (!confirm('Remove ERA Auction House mod from your Skyrim Data folder?')) return
    setBusy(true)
    try {
      await window.str.ahMod.uninstall()
      await refresh()
    } finally { setBusy(false) }
  }

  if (!status) return <p className="text-xs text-muted-foreground">Checking mod status…</p>

  return (
    <div className="space-y-2 rounded border border-border p-3 text-xs">
      <div className="flex items-center justify-between">
        <span>ERA-AH.esp</span>
        <span className={status.espPresent ? 'badge-ok' : 'badge-warn'}>
          {status.espPresent ? 'Installed' : 'Missing'}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span>ERA_AH_Inbox.pex</span>
        <span className={status.pexPresent ? 'badge-ok' : 'badge-warn'}>
          {status.pexPresent ? 'Installed' : 'Missing'}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span>PapyrusUtil SE (required dep)</span>
        <span className={status.papyrusUtilPresent ? 'badge-ok' : 'badge-warn'}>
          {status.papyrusUtilPresent ? 'Detected' : 'Not detected'}
        </span>
      </div>

      <div className="flex gap-2 pt-2">
        <button className="btn-primary" disabled={busy} onClick={install}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {status.installed ? 'Reinstall AH mod' : 'Install AH mod'}
        </button>
        {status.installed && (
          <button className="btn-outline" disabled={busy} onClick={uninstall}>
            Remove
          </button>
        )}
      </div>

      {!status.papyrusUtilPresent && (
        <p className="pt-2 text-muted-foreground">
          PapyrusUtil SE not found. Download it from{' '}
          <a
            className="text-primary underline"
            href="https://www.nexusmods.com/skyrimspecialedition/mods/13048"
            target="_blank"
            rel="noreferrer"
          >
            Nexus
          </a>{' '}
          and install it manually, then click Install AH mod.
        </p>
      )}
    </div>
  )
}

function Toggle({
  label,
  on,
  onChange
}: {
  label: string
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between py-1.5 text-sm">
      <span>{label}</span>
      <button
        onClick={() => onChange(!on)}
        className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-muted'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-transform ${
            on ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  )
}
