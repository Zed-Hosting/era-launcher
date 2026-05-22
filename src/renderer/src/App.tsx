import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Download,
  Gavel,
  HardDriveDownload,
  Home as HomeIcon,
  ListChecks,
  Settings as SettingsIcon,
  X
} from 'lucide-react'
import { cn } from './lib/utils'
import { useApp } from './store'
import { HomePage } from './pages/Home'
import { InstallPage } from './pages/Install'
import { ModlistPage } from './pages/Modlist'
import { SettingsPage } from './pages/Settings'
import { AuctionHousePage } from './pages/AuctionHouse'

type Tab = 'home' | 'install' | 'modlist' | 'settings' | 'ah'

type UpdateStatus =
  | { state: 'checking' }
  | { state: 'none'; version?: string }
  | { state: 'available'; version?: string }
  | { state: 'downloading'; percent?: number }
  | { state: 'ready'; version?: string }
  | { state: 'error'; message?: string }

const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'home',     label: 'Home',            Icon: HomeIcon },
  { id: 'install',  label: 'Prerequisites',   Icon: HardDriveDownload },
  { id: 'modlist',  label: 'Modlist',         Icon: ListChecks },
  { id: 'ah',       label: 'Auction House',   Icon: Gavel },
  { id: 'settings', label: 'Settings',        Icon: SettingsIcon }
]

export function App(): JSX.Element {
  const [tab, setTab] = useState<Tab>('home')
  const loadInitial = useApp((s) => s.loadInitial)
  const detection = useApp((s) => s.detection)
  const prereqs = useApp((s) => s.prereqs)
  const [update, setUpdate] = useState<UpdateStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    void loadInitial()
    void window.str.app.version().then(setVersion)
  }, [loadInitial])

  useEffect(() => {
    const off = window.str.events.onUpdateStatus((s) => {
      setUpdate(s as UpdateStatus)
      if ((s as UpdateStatus).state === 'available' || (s as UpdateStatus).state === 'ready') {
        setDismissed(false)
      }
    })
    return off
  }, [])

  const allPrereqsOk = prereqs.length > 0 && prereqs.every((p) => p.installed)
  const ready = !!detection?.installPath && detection.problems.length === 0 && allPrereqsOk

  const play = (): void => {
    if (!ready) return
    void window.str.launch
      .play()
      .then((r: any) => {
        if (r?.enforced) {
          console.log('Launched with enforced modlist:', r.enforced)
        }
      })
      .catch((err: any) => {
        alert('Launch failed: ' + String(err?.message ?? err))
      })
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside
        className="flex w-64 shrink-0 flex-col border-r"
        style={{
          borderColor: 'hsl(36 35% 22% / 0.6)',
          background:
            'linear-gradient(180deg, hsl(28 22% 12%) 0%, hsl(24 18% 7%) 100%)',
          boxShadow: 'inset -1px 0 0 hsl(36 40% 30% / 0.25)'
        }}
      >
        {/* Logo / header */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <img
            src="./logo.png"
            alt="ERA"
            className="h-14 w-14 object-contain"
            style={{ filter: 'drop-shadow(0 2px 4px hsl(0 0% 0% / 0.7))' }}
          />
          <div className="flex flex-col leading-tight">
            <div
              className="display text-xl uppercase tracking-[0.06em]"
              style={{ color: 'hsl(var(--parchment))', textShadow: '0 1px 2px hsl(0 0% 0% / 0.7)' }}
            >
              ERA Launcher
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--gold) / 0.8)' }}>
              Skyrim Together Reborn
            </div>
            {version && (
              <div className="mt-0.5 text-[11px] text-muted-foreground">v{version}</div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col">
          <div className="mx-4 h-px" style={{ background: 'hsl(var(--gold-dim) / 0.35)' }} />
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <div key={t.id}>
                <button
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex w-full items-center gap-3 px-6 py-3 text-sm uppercase transition-colors',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                  style={{
                    background: active ? 'hsl(28 18% 16% / 0.65)' : 'transparent',
                    color: active ? 'hsl(var(--parchment))' : undefined
                  }}
                >
                  <t.Icon size={15} style={active ? { color: 'hsl(var(--gold))' } : undefined} />
                  <span style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.14em' }}>
                    {t.label}
                  </span>
                </button>
                <div className="mx-4 h-px" style={{ background: 'hsl(var(--gold-dim) / 0.35)' }} />
              </div>
            )
          })}
        </nav>

        {/* Decorative sigil: diamond with gold corner ornaments */}
        <div className="my-6 flex items-center justify-center px-6">
          <div
            className="relative flex h-28 w-28 items-center justify-center"
            style={{
              transform: 'rotate(45deg)',
              border: '1px solid hsl(var(--gold-dim) / 0.7)',
              boxShadow: 'inset 0 0 0 1px hsl(20 30% 8% / 0.4)'
            }}
          >
            {/* Corner pips */}
            {([['-4px','-4px'],['calc(100% - 4px)','-4px'],['-4px','calc(100% - 4px)'],['calc(100% - 4px)','calc(100% - 4px)']] as [string,string][]).map(([l,t], i) => (
              <span key={i}
                className="absolute h-2 w-2"
                style={{
                  left: l, top: t,
                  background: 'hsl(var(--gold))',
                  transform: 'rotate(45deg)',
                  boxShadow: '0 0 4px hsl(var(--gold) / 0.6)'
                }}
              />
            ))}
            <img
              src="./logo.png"
              alt=""
              className="h-14 w-14 object-contain opacity-40"
              style={{ transform: 'rotate(-45deg)', filter: 'grayscale(0.5)' }}
            />
          </div>
        </div>

        {/* Play + status */}
        <div className="mt-auto flex flex-col gap-2 p-4">
          <button
            onClick={play}
            disabled={!ready}
            className="btn-play"
            title={ready ? 'Launch Skyrim Together' : 'Resolve prerequisites and detection issues first'}
          >
            <img src="./logo.png" alt="" className="h-5 w-5 object-contain opacity-80" />
            Play
          </button>
          <div className="mt-1 text-center text-[11px] text-muted-foreground">
            {detection?.installPath ? (
              <div className="truncate" title={detection.installPath}>
                Skyrim: <span style={{ color: 'hsl(var(--parchment))' }}>{detection.exeVersion ?? '?'}</span>
              </div>
            ) : (
              <div className="text-amber-300">Skyrim not detected</div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6">
        {!dismissed && update && update.state !== 'none' && update.state !== 'checking' && (
          <div className="mb-4 flex items-center gap-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
            <Download size={16} className="text-primary" />
            <div className="flex-1">
              {update.state === 'available' && (
                <>Launcher update {update.version ? `v${update.version}` : ''} available — downloading…</>
              )}
              {update.state === 'downloading' && (
                <>Downloading update… {typeof update.percent === 'number' ? `${Math.round(update.percent)}%` : ''}</>
              )}
              {update.state === 'ready' && (
                <>Update {update.version ? `v${update.version}` : ''} ready. Relaunch to install.</>
              )}
              {update.state === 'error' && (
                <span className="text-amber-300">Update check failed: {update.message}</span>
              )}
            </div>
            {update.state === 'ready' && (
              <button
                onClick={() => void window.str.updater.quitAndInstall()}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Relaunch
              </button>
            )}
            <button
              onClick={() => setDismissed(true)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {tab === 'home'     && <HomePage onNavigate={setTab} />}
        {tab === 'install'  && <InstallPage />}
        {tab === 'modlist'  && <ModlistPage />}
        {tab === 'ah'       && <AuctionHousePage />}
        {tab === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
