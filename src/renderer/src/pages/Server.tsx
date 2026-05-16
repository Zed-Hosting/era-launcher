import { useEffect, useState } from 'react'
import { Play, Square } from 'lucide-react'
import { useApp } from '../store'
import type { ServerConfig } from '../../../shared/types'

export function ServerPage(): JSX.Element {
  const log = useApp((s) => s.serverLog)
  const [exePath, setExePath] = useState('')
  const [tomlPath, setTomlPath] = useState('')
  const [cfg, setCfg] = useState<ServerConfig | undefined>()
  const [running, setRunning] = useState(false)

  useEffect(() => {
    void (async () => {
      const status = (await window.str.server.status()) as any
      setRunning(!!status?.running)
    })()
  }, [])

  const loadCfg = async () => {
    if (!tomlPath) return
    try {
      const c = (await window.str.server.loadToml(tomlPath)) as ServerConfig
      setCfg(c)
    } catch (err: any) {
      alert(String(err?.message ?? err))
    }
  }

  const saveCfg = async () => {
    if (!tomlPath || !cfg) return
    await window.str.server.saveToml(tomlPath, cfg)
  }

  const start = async () => {
    try {
      await window.str.server.start(exePath)
      setRunning(true)
    } catch (err: any) {
      alert(String(err?.message ?? err))
    }
  }

  const stop = async () => {
    await window.str.server.stop()
    setRunning(false)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl">Server</h1>
          <p className="text-sm text-muted-foreground">Run STServer and edit its TOML config.</p>
        </div>
        <div className="flex gap-2">
          {running ? (
            <button className="btn-outline" onClick={stop}>
              <Square size={14} />
              Stop
            </button>
          ) : (
            <button className="btn-primary" disabled={!exePath} onClick={start}>
              <Play size={14} />
              Start
            </button>
          )}
        </div>
      </header>

      <div className="panel p-4 grid grid-cols-2 gap-3">
        <label className="text-xs text-muted-foreground">
          SkyrimTogetherServer.exe
          <input
            className="input mt-1"
            placeholder="C:\path\to\SkyrimTogetherServer.exe"
            value={exePath}
            onChange={(e) => setExePath(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          STServer.toml
          <div className="mt-1 flex gap-2">
            <input
              className="input flex-1"
              placeholder="C:\path\to\STServer.toml"
              value={tomlPath}
              onChange={(e) => setTomlPath(e.target.value)}
            />
            <button className="btn-outline" onClick={loadCfg}>
              Load
            </button>
          </div>
        </label>
      </div>

      {cfg && (
        <div className="panel p-4 grid grid-cols-2 gap-3">
          <Field label="Name">
            <input className="input" value={cfg.name} onChange={(e) => setCfg({ ...cfg, name: e.target.value })} />
          </Field>
          <Field label="Port">
            <input
              type="number"
              className="input"
              value={cfg.port}
              onChange={(e) => setCfg({ ...cfg, port: Number(e.target.value) })}
            />
          </Field>
          <Field label="Max players">
            <input
              type="number"
              className="input"
              value={cfg.maxPlayers}
              onChange={(e) => setCfg({ ...cfg, maxPlayers: Number(e.target.value) })}
            />
          </Field>
          <Field label="Password">
            <input
              className="input"
              value={cfg.password ?? ''}
              onChange={(e) => setCfg({ ...cfg, password: e.target.value || undefined })}
            />
          </Field>
          <Field label="Admin password">
            <input
              className="input"
              value={cfg.adminPassword ?? ''}
              onChange={(e) => setCfg({ ...cfg, adminPassword: e.target.value || undefined })}
            />
          </Field>
          <Field label="MOTD">
            <input
              className="input"
              value={cfg.motd ?? ''}
              onChange={(e) => setCfg({ ...cfg, motd: e.target.value || undefined })}
            />
          </Field>
          <div className="col-span-2 flex justify-end">
            <button className="btn-primary" onClick={saveCfg}>
              Save TOML
            </button>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">Server log</div>
        <pre className="max-h-72 overflow-auto px-4 py-2 text-[11px] leading-relaxed text-muted-foreground">
{log.join('\n') || '(no output yet)'}
        </pre>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs text-muted-foreground">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  )
}
