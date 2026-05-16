import { useEffect } from 'react'
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react'
import { useApp } from '../store'

export function HealthPage(): JSX.Element {
  const detection = useApp((s) => s.detection)
  const refresh = useApp((s) => s.refreshDetection)
  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl">Health Check</h1>
          <p className="text-sm text-muted-foreground">Skyrim install detection and version validation.</p>
        </div>
        <button onClick={() => void refresh()} className="btn-outline">
          <RefreshCw size={14} />
          Rescan
        </button>
      </header>

      <div className="panel divide-y divide-border">
        <Row
          label="Skyrim install path"
          ok={!!detection?.installPath}
          detail={detection?.installPath ?? 'Not found'}
        />
        <Row
          label="Steam library"
          ok={!!detection?.steamLibrary}
          detail={detection?.steamLibrary ?? 'Not found'}
        />
        <Row
          label="Skyrim version (must be 1.6.x)"
          ok={!!detection?.exeVersion && /^1\.6\./.test(detection.exeVersion)}
          detail={detection?.exeVersion ?? 'Unknown'}
        />
        <Row
          label="Game launched once via Steam"
          ok={!!detection?.hasBeenLaunched}
          detail={detection?.hasBeenLaunched ? 'Yes' : 'Launch SkyrimSE via Steam first'}
        />
      </div>

      {detection?.problems && detection.problems.length > 0 && (
        <div className="panel border-red-700/30 bg-red-950/20 p-4 text-sm text-red-200">
          <div className="font-semibold mb-1">Issues</div>
          <ul className="list-disc list-inside space-y-1">
            {detection.problems.map((p: string, i: number) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Row({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        {ok ? (
          <CheckCircle2 size={18} className="text-emerald-400" />
        ) : (
          <XCircle size={18} className="text-red-400" />
        )}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground max-w-[60%] truncate" title={detail}>
        {detail}
      </span>
    </div>
  )
}
