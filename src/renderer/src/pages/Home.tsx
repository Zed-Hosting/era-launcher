import { Activity, Download, ListChecks, Play, Shield } from 'lucide-react'
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
  const ready = detection?.installPath && detection.problems.length === 0 && allPrereqsOk

  const play = () => {
    if (!ready) return
    void window.str.launch.play().then((r: any) => {
      if (r?.enforced) {
        console.log('Launched with enforced modlist:', r.enforced)
      }
    }).catch((err: any) => {
      alert('Launch failed: ' + String(err?.message ?? err))
    })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl">Tamriel, together.</h1>
          <p className="mt-1 text-muted-foreground">
            Install, sync, and launch Skyrim Together Reborn — without the headache.
          </p>
        </div>
        <button
          onClick={play}
          disabled={!ready}
          className="btn-primary px-6 py-3 text-base shadow-lg shadow-primary/20"
        >
          <Play size={18} />
          Play
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card
          icon={<Activity size={18} />}
          title="Health Check"
          status={detection?.installPath ? (detection.problems.length === 0 ? 'ok' : 'warn') : 'err'}
          description={
            detection?.installPath
              ? detection.problems.length === 0
                ? 'Skyrim looks good and is supported.'
                : `${detection.problems.length} issue(s) need attention.`
              : 'Skyrim Special Edition was not detected.'
          }
          cta="Open"
          onClick={() => onNavigate('health')}
        />
        <Card
          icon={<Download size={18} />}
          title="Prerequisites"
          status={allPrereqsOk ? 'ok' : prereqs.length === 0 ? 'warn' : 'err'}
          description={
            prereqs.length === 0
              ? 'Detect Skyrim first to see prerequisites.'
              : `${prereqs.filter((p) => p.installed).length} / ${prereqs.length} installed.`
          }
          cta="Install"
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
