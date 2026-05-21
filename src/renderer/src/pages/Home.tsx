import { Download, ListChecks, Shield } from 'lucide-react'
import { useApp } from '../store'
import type { ModlistDiff } from '../../../shared/types'

export function HomePage({ onNavigate }: { onNavigate: (t: any) => void }): JSX.Element {
  const detection = useApp((s) => s.detection)
  const prereqs = useApp((s) => s.prereqs)
  const modlist = useApp((s) => s.modlist)
  const diff = useApp((s) => s.diff) as ModlistDiff | undefined
  const allPrereqsOk = prereqs.length > 0 && prereqs.every((p) => p.installed)
  const modlistOk =
    !!modlist &&
    !!diff &&
    diff.missingCount === 0 &&
    diff.wrongHashCount === 0 &&
    diff.extraPluginsEnabled.length === 0

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-4xl">Tamriel, together.</h1>
        <p className="mt-1 text-muted-foreground">
          Install, sync, and launch Skyrim Together Reborn — without the headache.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card
          icon={<Download size={18} />}
          title="Prerequisites"
          status={allPrereqsOk ? 'ok' : prereqs.length === 0 ? 'warn' : 'err'}
          description={
            prereqs.length === 0
              ? 'Detect Skyrim first to see prerequisites.'
              : `${prereqs.filter((p) => p.installed).length} / ${prereqs.length} installed.`
          }
          cta="Open"
          onClick={() => onNavigate('install')}
        />
        <Card
          icon={<ListChecks size={18} />}
          title="Modlist"
          status={modlist ? (modlistOk ? 'ok' : 'warn') : 'err'}
          description={
            !modlist
              ? 'Loading official modlist…'
              : modlistOk
                ? `${modlist.mods.length} approved mods installed and verified.`
                : `${(diff?.missingCount ?? 0) + (diff?.wrongHashCount ?? 0)} mod issue(s); ${diff?.extraPluginsEnabled.length ?? 0} unapproved plugin(s) enabled.`
          }
          cta="Open"
          onClick={() => onNavigate('modlist')}
        />
        <Card
          icon={<Shield size={18} />}
          title="Backups"
          status="ok"
          description="Snapshot your Skyrim Data/ before installing mods. Restore vanilla any time."
          cta="Settings"
          onClick={() => onNavigate('settings')}
        />
      </div>
      {detection?.installPath && detection.problems.length > 0 && (
        <div className="panel border-amber-700/40 bg-amber-700/10 p-4 text-sm">
          <div className="mb-1 font-medium text-amber-300">Skyrim install issues</div>
          <ul className="list-disc pl-5 text-amber-200/90">
            {detection.problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {!detection?.installPath && (
        <div className="panel border-red-700/40 bg-red-700/10 p-4 text-sm text-red-200">
          Skyrim Special Edition was not detected. Set an override path in Settings.
        </div>
      )}
    </div>
  )
}

function Card({
  icon,
  title,
  description,
  status,
  cta,
  onClick
}: {
  icon: React.ReactNode
  title: string
  description: string
  status: 'ok' | 'warn' | 'err'
  cta: string
  onClick: () => void
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-primary">{icon}</span>
          <span>{title}</span>
        </div>
        <span
          className={
            status === 'ok' ? 'badge-ok' : status === 'warn' ? 'badge-warn' : 'badge-err'
          }
        >
          {status === 'ok' ? 'Ready' : status === 'warn' ? 'Action' : 'Issue'}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed">{description}</p>
      <button onClick={onClick} className="btn-outline mt-4">
        {cta}
      </button>
    </div>
  )
}
