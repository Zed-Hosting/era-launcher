import { useState } from 'react'
import { Download, Globe, Loader2, Lock, RefreshCw, ShieldCheck } from 'lucide-react'
import { useApp } from '../store'
import { OFFICIAL_MODLIST_URL } from '../../../shared/constants'

export function ModlistPage(): JSX.Element {
  const modlist = useApp((s) => s.modlist)
  const diff = useApp((s) => s.diff)
  const load = useApp((s) => s.loadModlist)
  const [busy, setBusy] = useState(false)
  const [applying, setApplying] = useState(false)
  const [enforcing, setEnforcing] = useState(false)

  const onRefresh = async () => {
    setBusy(true)
    try {
      await load(OFFICIAL_MODLIST_URL)
    } catch (err: any) {
      alert(String(err?.message ?? err))
    } finally {
      setBusy(false)
    }
  }

  const onApply = async () => {
    if (!modlist || !diff) return
    setApplying(true)
    try {
      const toApply = diff.entries.filter((e: any) => e.status !== 'ok').map((e: any) => e.modId)
      const result = await window.str.modlist.apply(modlist, toApply)
      const r = result as any
      if (r.failed?.length)
        alert(`Some mods failed:\n${r.failed.map((f: any) => `${f.id}: ${f.error}`).join('\n')}`)
      await load(OFFICIAL_MODLIST_URL)
    } catch (err: any) {
      alert(String(err?.message ?? err))
    } finally {
      setApplying(false)
    }
  }

  const onEnforce = async () => {
    if (!modlist) return
    if (
      !confirm(
        'Enforce will rewrite plugins.txt so only modlist mods are enabled. Extra plugins on disk will be disabled. Continue?'
      )
    )
      return
    setEnforcing(true)
    try {
      const res = (await window.str.modlist.enforce(modlist)) as any
      alert(`Enforced.\nEnabled: ${res.enabled.length}\nDisabled extras: ${res.disabled.length}`)
      await load(OFFICIAL_MODLIST_URL)
    } catch (err: any) {
      alert(String(err?.message ?? err))
    } finally {
      setEnforcing(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <h1 className="text-3xl">Modlist Sync</h1>
        <p className="text-sm text-muted-foreground">
          The ERA launcher uses the official curated modlist. Only approved mods will be enabled;
          everything else is disabled automatically.
        </p>
      </header>

      <div className="panel p-4 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/15 text-primary">
          <Lock size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">Official modlist source</div>
          <a
            href={OFFICIAL_MODLIST_URL}
            target="_blank"
            rel="noreferrer"
            className="truncate block text-xs text-muted-foreground hover:text-foreground"
            title={OFFICIAL_MODLIST_URL}
          >
            <Globe size={10} className="inline mr-1" />
            {OFFICIAL_MODLIST_URL.replace(/^https?:\/\//, '')}
          </a>
        </div>
        <button className="btn-outline" disabled={busy} onClick={onRefresh}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {modlist && diff && (
        <div className="panel">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <div className="font-medium">{modlist.name}</div>
              <div className="text-xs text-muted-foreground">
                v{modlist.version} • {modlist.mods.length} mods • for Skyrim {modlist.gameVersion}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="badge-ok">{diff.okCount} ok</span>
              <span className="badge-warn">{diff.missingCount} missing</span>
              <span className="badge-err">{diff.wrongHashCount} mismatch</span>
              <span
                className={diff.extraPluginsEnabled.length > 0 ? 'badge-err' : 'badge'}
                title={diff.extraPluginsOnDisk.join('\n')}
              >
                {diff.extraPluginsEnabled.length} unapproved enabled
              </span>
              <button
                className="btn-outline"
                disabled={enforcing}
                onClick={onEnforce}
                title="Rewrite plugins.txt: only modlist mods enabled, all others disabled."
              >
                {enforcing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                Enforce
              </button>
              <button
                className="btn-primary"
                disabled={applying || diff.missingCount + diff.wrongHashCount === 0}
                onClick={onApply}
              >
                {applying ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Sync
              </button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {diff.entries.map((e: any) => (
              <div key={e.modId} className="flex items-center justify-between px-4 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm">{e.displayName}</div>
                  <div className="truncate text-xs text-muted-foreground">{e.modId}</div>
                </div>
                <span
                  className={
                    e.status === 'ok'
                      ? 'badge-ok'
                      : e.status === 'wrong-hash'
                        ? 'badge-err'
                        : 'badge-warn'
                  }
                >
                  {e.status}
                </span>
              </div>
            ))}
          </div>

          {diff.extraPluginsOnDisk.length > 0 && (
            <div className="border-t border-border px-4 py-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Lock size={12} /> Unapproved plugins in Data/ (will be disabled on Enforce)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {diff.extraPluginsOnDisk.map((p: string) => (
                  <span
                    key={p}
                    className={
                      diff.extraPluginsEnabled.includes(p)
                        ? 'badge-err font-mono text-[10px]'
                        : 'badge font-mono text-[10px] text-muted-foreground'
                    }
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
