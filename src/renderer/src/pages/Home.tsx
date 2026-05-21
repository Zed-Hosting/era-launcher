import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react'
import { useApp } from '../store'
import type { ModlistDiff } from '../../../shared/types'

const DEFAULT_AH_URL = 'http://whippin.zedhosting.gg:33348'

type Status = 'ok' | 'warn' | 'err' | 'pending'

interface CheckRow {
  key: string
  title: string
  status: Status
  detail: string
  tab?: 'install' | 'modlist' | 'ah' | 'settings'
  cta?: string
}

export function HomePage({ onNavigate }: { onNavigate: (t: any) => void }): JSX.Element {
  const detection = useApp((s) => s.detection)
  const prereqs = useApp((s) => s.prereqs)
  const modlist = useApp((s) => s.modlist)
  const diff = useApp((s) => s.diff) as ModlistDiff | undefined
  const [ahOnline, setAhOnline] = useState<boolean | null>(null)

  // Probe sidecar once on mount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`${DEFAULT_AH_URL}/ah/health`, { method: 'GET' })
        if (!cancelled) setAhOnline(r.ok)
      } catch {
        if (!cancelled) setAhOnline(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const installedPrereqs = prereqs.filter((p) => p.installed).length
  const allPrereqsOk = prereqs.length > 0 && installedPrereqs === prereqs.length
  const modlistOk =
    !!modlist &&
    !!diff &&
    diff.missingCount === 0 &&
    diff.wrongHashCount === 0 &&
    diff.extraPluginsEnabled.length === 0
  const modIssues = (diff?.missingCount ?? 0) + (diff?.wrongHashCount ?? 0) + (diff?.extraPluginsEnabled.length ?? 0)
  const ahMod = prereqs.find((p) => p.id === 'era-ah')
  const papyrusOk = !!prereqs.find((p) => p.id === 'papyrus-util')?.installed
  const ahReady = !!ahMod?.installed && papyrusOk && ahOnline === true

  const checks: CheckRow[] = [
    {
      key: 'skyrim',
      title: 'Skyrim Special Edition',
      status: !detection?.installPath ? 'err' : detection.problems.length > 0 ? 'warn' : 'ok',
      detail: !detection?.installPath
        ? 'Not detected — set an override path in Settings.'
        : detection.problems.length > 0
          ? `${detection.problems.length} issue(s): ${detection.problems.join('; ')}`
          : `Detected · v${detection.exeVersion ?? '?'}`,
      tab: 'settings',
      cta: 'Settings'
    },
    {
      key: 'prereqs',
      title: 'Prerequisites',
      status: prereqs.length === 0 ? 'pending' : allPrereqsOk ? 'ok' : 'warn',
      detail: prereqs.length === 0
        ? 'Loading…'
        : allPrereqsOk
          ? `All ${prereqs.length} installed (SKSE, Address Library, STR, PapyrusUtil, UIExtensions, ERA-AH).`
          : `${installedPrereqs} / ${prereqs.length} installed.`,
      tab: 'install',
      cta: 'Open'
    },
    {
      key: 'modlist',
      title: 'Modlist',
      status: !modlist ? 'pending' : modlistOk ? 'ok' : modIssues > 0 ? 'warn' : 'ok',
      detail: !modlist
        ? 'Loading official modlist…'
        : modlistOk
          ? `${modlist.mods.length} approved mods synced and verified.`
          : `${diff?.missingCount ?? 0} missing · ${diff?.wrongHashCount ?? 0} mismatched · ${diff?.extraPluginsEnabled.length ?? 0} unapproved enabled.`,
      tab: 'modlist',
      cta: 'Sync'
    },
    {
      key: 'ah',
      title: 'Auction House',
      status: ahOnline === null
        ? 'pending'
        : !ahReady
          ? (ahMod?.installed && papyrusOk ? 'warn' : 'err')
          : 'ok',
      detail: ahOnline === null
        ? 'Checking sidecar…'
        : !ahMod?.installed
          ? 'ERA-AH mod not installed — install it from Prerequisites.'
          : !papyrusOk
            ? 'PapyrusUtil SE missing — install it from Prerequisites.'
            : !ahOnline
              ? 'Sidecar offline (auction server unreachable).'
              : 'Mod installed and sidecar online.',
      tab: 'ah',
      cta: 'Open'
    }
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-4xl">Tamriel, together.</h1>
        <p className="mt-1 text-muted-foreground">
          Install, sync, and launch Skyrim Together Reborn — without the headache.
        </p>
      </header>

      <div className="panel divide-y divide-border">
        {checks.map((c) => (
          <CheckRowView key={c.key} row={c} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  )
}

function CheckRowView({
  row,
  onNavigate
}: {
  row: CheckRow
  onNavigate: (t: any) => void
}): JSX.Element {
  const Icon =
    row.status === 'ok' ? CheckCircle2
    : row.status === 'pending' ? Loader2
    : AlertCircle
  const iconClass =
    row.status === 'ok' ? 'text-emerald-400'
    : row.status === 'warn' ? 'text-amber-300'
    : row.status === 'err' ? 'text-red-400'
    : 'text-muted-foreground animate-spin'

  return (
    <div className="flex items-center gap-4 px-4 py-4">
      <Icon size={20} className={iconClass} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{row.title}</div>
        <div className="text-xs text-muted-foreground">{row.detail}</div>
      </div>
      {row.tab && (
        <button
          onClick={() => onNavigate(row.tab!)}
          className="btn-outline shrink-0 text-xs"
        >
          {row.cta ?? 'Open'}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  )
}
