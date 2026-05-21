import { useEffect, useState } from 'react'
import { Check, Download, Loader2 } from 'lucide-react'
import { useApp } from '../store'
import { fmtBytes } from '../lib/utils'

export function InstallPage(): JSX.Element {
  const prereqs = useApp((s) => s.prereqs)
  const refresh = useApp((s) => s.refreshPrereqs)
  const progress = useApp((s) => s.progress)
  const [busy, setBusy] = useState<string | null>(null)
  const [addrLibPath, setAddrLibPath] = useState('')
  const [papyrusUtilPath, setPapyrusUtilPath] = useState('')

  useEffect(() => {
    void refresh()
  }, [refresh])

  const install = async (id: string, archivePath?: string) => {
    setBusy(id)
    try {
      await window.str.prereq.install({ id, archivePath })
      await refresh()
    } catch (err: any) {
      alert(String(err?.message ?? err))
    } finally {
      setBusy(null)
    }
  }

  const labelFor = (id: string): string => {
    switch (id) {
      case 'skse64': return 'SKSE64'
      case 'addrlib': return 'Address Library'
      case 'str': return 'STR Client'
      case 'papyrus-util': return 'PapyrusUtil SE'
      case 'era-ah': return 'ERA Auction House Mod'
      default: return id
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-3xl">Prerequisites</h1>
        <p className="text-sm text-muted-foreground">
          SKSE, Address Library, Skyrim Together Reborn, PapyrusUtil, and the ERA Auction House mod.
        </p>
      </header>

      <div className="panel divide-y divide-border">
        {prereqs.map((p) => {
          const prog = progress[p.id]
          const pct =
            prog?.bytes && prog?.totalBytes ? Math.floor((prog.bytes / prog.totalBytes) * 100) : undefined
          const isArchive = p.id === 'addrlib' || p.id === 'papyrus-util'
          const archivePath = p.id === 'addrlib' ? addrLibPath : p.id === 'papyrus-util' ? papyrusUtilPath : ''
          const setArchivePath = p.id === 'addrlib' ? setAddrLibPath : setPapyrusUtilPath
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
                  {isArchive ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="input w-72"
                        placeholder={p.id === 'addrlib' ? 'C:\\path\\to\\addrlib-archive.7z' : 'C:\\path\\to\\PapyrusUtil.zip'}
                        value={archivePath}
                        onChange={(e) => setArchivePath(e.target.value)}
                      />
                      <button
                        className="btn-primary"
                        disabled={!archivePath || busy === p.id}
                        onClick={() => install(p.id, archivePath)}
                      >
                        {busy === p.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        Install
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-primary"
                      disabled={busy === p.id}
                      onClick={() => install(p.id)}
                    >
                      {busy === p.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      {p.installed ? 'Reinstall' : 'Install'}
                    </button>
                  )}
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
              {isArchive && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Nexus requires an account to download.{' '}
                  <a
                    className="text-primary underline"
                    href={p.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Nexus page
                  </a>{' '}
                  → download the latest archive → paste its path above.
                </p>
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
