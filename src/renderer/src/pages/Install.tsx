import { useEffect, useState } from 'react'
import { Check, Download, Loader2 } from 'lucide-react'
import { useApp } from '../store'
import { fmtBytes } from '../lib/utils'

export function InstallPage(): JSX.Element {
  const prereqs = useApp((s) => s.prereqs)
  const refresh = useApp((s) => s.refreshPrereqs)
  const progress = useApp((s) => s.progress)
  const [busy, setBusy] = useState<string | null>(null)
  const [installAllBusy, setInstallAllBusy] = useState(false)
  const [hasNexusKey, setHasNexusKey] = useState(false)

  useEffect(() => {
    void refresh()
    void window.str.creds.hasNexusKey().then((value) => setHasNexusKey(!!value))
  }, [refresh])

  const installOne = async (id: string) => {
    await window.str.prereq.install({ id })
    await refresh()
  }

  const install = async (id: string) => {
    setBusy(id)
    try {
      await installOne(id)
    } catch (err: any) {
      alert(String(err?.message ?? err))
    } finally {
      setBusy(null)
    }
  }

  const installAll = async () => {
    const order = ['skse64', 'addrlib', 'str', 'papyrus-util', 'ui-extensions', 'era-ah'] as const
    setInstallAllBusy(true)
    try {
      for (const id of order) {
        const prereq = prereqs.find((entry) => entry.id === id)
        if (!prereq || prereq.installed) continue
        setBusy(id)
        await installOne(id)
      }
    } catch (err: any) {
      alert(String(err?.message ?? err))
    } finally {
      setBusy(null)
      setInstallAllBusy(false)
    }
  }

  const labelFor = (id: string): string => {
    switch (id) {
      case 'skse64': return 'SKSE64'
      case 'addrlib': return 'Address Library'
      case 'str': return 'STR Client'
      case 'papyrus-util': return 'PapyrusUtil SE'
      case 'ui-extensions': return 'UIExtensions'
      case 'era-ah': return 'ERA Auction House Mod'
      default: return id
    }
  }

  const missingCount = prereqs.filter((p) => !p.installed).length
  const anyBusy = installAllBusy || busy !== null

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex items-start justify-between gap-4">
        <h1 className="text-3xl">Prerequisites</h1>
        <button className="btn-primary" disabled={anyBusy || missingCount === 0} onClick={installAll}>
          {installAllBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Install All
        </button>
      </header>

      <p className="text-sm text-muted-foreground">
        SKSE, Address Library, Skyrim Together Reborn, PapyrusUtil, UIExtensions, and the ERA Auction House mod.
      </p>

      {!hasNexusKey && (
        <p className="text-xs" style={{ color: 'hsl(36 70% 60%)' }}>
          Address Library, PapyrusUtil, and UIExtensions need a Nexus API key to auto-install. Add one in Settings → Nexus API key.
        </p>
      )}

      <div className="panel divide-y divide-border">
        {prereqs.map((p) => {
          const prog = progress[p.id]
          const pct =
            prog?.bytes && prog?.totalBytes ? Math.floor((prog.bytes / prog.totalBytes) * 100) : undefined
          return (
            <div key={p.id} className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{labelFor(p.id)}</div>
                  <div className="text-xs text-muted-foreground">
                    Required: {p.requiredVersion}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.installed ? (
                    <span className="badge-ok"><Check size={12} /> Installed</span>
                  ) : (
                    <span className="badge-warn">Missing</span>
                  )}
                  <button
                    className="btn-primary"
                    disabled={anyBusy}
                    onClick={() => install(p.id)}
                  >
                    {busy === p.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {p.installed ? 'Reinstall' : 'Install'}
                  </button>
                </div>
              </div>
              {prog && (
                <div className="mt-3 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>
                      {prog.phase} — {prog.label}
                    </span>
                    <span>
                      {fmtBytes(prog.bytes)} {prog.totalBytes ? `/ ${fmtBytes(prog.totalBytes)}` : ''}
                    </span>
                  </div>
                  {pct !== undefined && (
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-muted">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              )}
              {p.id === 'era-ah' && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Installs <code>ERA-AH.esp</code> + <code>ERA_AH_Inbox.pex</code> bundled with this launcher into your Skyrim <code>Data/</code> folder.
                  Requires PapyrusUtil SE to be installed first.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
