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
import { OrnateLogo, DragonSigil, KnotBorder, HeraldBanner } from './components/art'
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
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Ornate knotwork top border */}
      <div className="shrink-0" style={{ borderBottom: '1px solid hsl(var(--gold-dim) / 0.5)' }}>
        <KnotBorder height={16} />
      </div>
      <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside
        className="relative flex w-64 shrink-0 flex-col"
        style={{
          background: 'linear-gradient(180deg, hsl(22 20% 8% / 0.96) 0%, hsl(20 16% 5% / 0.97) 100%)',
          boxShadow: '2px 0 0 hsl(36 45% 20% / 0.7), 4px 0 16px hsl(0 0% 0% / 0.6)'
        }}
      >
        {/* Logo / header – stacked & centered */}
        <div className="flex flex-col items-center px-4 pt-6 pb-4">
          <OrnateLogo size={84} />
          <div className="mt-3 flex flex-col items-center text-center leading-tight">
            <div
              className="text-[18px] tracking-[0.16em]"
              style={{ color: 'hsl(var(--parchment))', textShadow: '0 1px 3px hsl(0 0% 0% / 0.85)', fontFamily: "'Cinzel', serif", fontWeight: 600 }}
            >
              ERA LAUNCHER
            </div>
            {/* ornate underline */}
            <div className="mt-1.5 flex w-full items-center justify-center gap-1.5">
              <span style={{ flex: 1, maxWidth: '3rem', height: '1px', background: 'linear-gradient(90deg, transparent, hsl(var(--gold-dim) / 0.9))' }} />
              <span style={{ color: 'hsl(var(--gold))', fontSize: '8px' }}>◆</span>
              <span style={{ flex: 1, maxWidth: '3rem', height: '1px', background: 'linear-gradient(90deg, hsl(var(--gold-dim) / 0.9), transparent)' }} />
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.22em]" style={{ color: 'hsl(var(--gold) / 0.8)', fontFamily: "'Cinzel', serif" }}>
              Skyrim Together Reborn
            </div>
            {version && (
              <div className="mt-1 text-[10px]" style={{ color: 'hsl(var(--gold-dim) / 0.9)' }}>v{version}</div>
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
                    background: active ? 'hsl(15 40% 12% / 0.85)' : 'transparent',
                    color: active ? 'hsl(var(--parchment))' : undefined,
                    boxShadow: active ? 'inset 3px 0 0 hsl(var(--gold)), inset 0 0 18px hsl(15 50% 8% / 0.5)' : undefined
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

        {/* Heraldic banner sigil */}
        <div className="my-4 flex items-center justify-center">
          <HeraldBanner />
        </div>

        {/* Play + status */}
        <div className="mt-auto flex flex-col gap-2 p-4">
          <div className="relative">
            {/* Corner brackets around play button */}
            <span className="pointer-events-none absolute -left-0.5 -top-0.5 z-10" style={{ width: 10, height: 10, borderTop: `1.5px solid hsl(var(--gold))`, borderLeft: `1.5px solid hsl(var(--gold))` }} />
            <span className="pointer-events-none absolute -right-0.5 -top-0.5 z-10" style={{ width: 10, height: 10, borderTop: `1.5px solid hsl(var(--gold))`, borderRight: `1.5px solid hsl(var(--gold))` }} />
            <span className="pointer-events-none absolute -left-0.5 -bottom-0.5 z-10" style={{ width: 10, height: 10, borderBottom: `1.5px solid hsl(var(--gold))`, borderLeft: `1.5px solid hsl(var(--gold))` }} />
            <span className="pointer-events-none absolute -right-0.5 -bottom-0.5 z-10" style={{ width: 10, height: 10, borderBottom: `1.5px solid hsl(var(--gold))`, borderRight: `1.5px solid hsl(var(--gold))` }} />
            <button
              onClick={play}
              disabled={!ready}
              className="btn-play w-full"
              title={ready ? 'Launch Skyrim Together' : 'Resolve prerequisites and detection issues first'}
            >
              <DragonSigil size={22} />
              Play
            </button>
          </div>
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
    </div>
  )
}

