import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Gavel,
  HardDriveDownload,
  Home as HomeIcon,
  ListChecks,
  Settings as SettingsIcon,
} from 'lucide-react'
import { useApp } from './store'
import { HomePage } from './pages/Home'
import { InstallPage } from './pages/Install'
import { ModlistPage } from './pages/Modlist'
import { SettingsPage } from './pages/Settings'
import { AuctionHousePage } from './pages/AuctionHouse'
import appBg from './assets/app-bg.jpg'

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

// HomeOverlay — renders only patch notes over the painted parchment area
function HomeOverlay() {
  return <HomePage onNavigate={() => {}} overlayOnly />
}

export function App(): JSX.Element {
  const [tab, setTab] = useState<Tab>('home')
  const loadInitial = useApp((s) => s.loadInitial)
  const detection = useApp((s) => s.detection)
  const prereqs = useApp((s) => s.prereqs)
  const [update, setUpdate] = useState<UpdateStatus | null>(null)
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    void loadInitial()
    void window.str.app.version().then(setVersion)
  }, [loadInitial])

  useEffect(() => {
    const off = window.str.events.onUpdateStatus((s) => {
      setUpdate(s as UpdateStatus)
      if ((s as UpdateStatus).state === 'ready') {
        setUpdateDismissed(false)
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
    // Fixed window: 1165×757 matches the mockup image dimensions
    <div className="relative overflow-hidden" style={{ width: '100vw', height: '100vh', background: '#0d0b08' }}>
      {/* ── Full-window background image ── */}
      <img
        src={appBg}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ objectFit: 'cover', objectPosition: 'center top', userSelect: 'none' }}
        draggable={false}
      />

      {/* ── Frameless title bar: drag region + window controls ── */}
      <div
        className="absolute"
        style={{ top: 0, left: 0, right: 0, height: 28, WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Minimize */}
        <button
          onClick={() => window.str.win.minimize()}
          style={{ position: 'absolute', top: 0, right: 92, width: 46, height: 28, background: 'transparent', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        />
        {/* Close */}
        <button
          onClick={() => window.str.win.close()}
          style={{ position: 'absolute', top: 0, right: 0, width: 46, height: 28, background: 'transparent', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        />
      </div>

      {/* ── Sidebar nav: invisible buttons over painted nav items ── */}
      {/* Each button is transparent with a hover highlight glow */}
      <div className="absolute" style={{ top: 0, left: 0, width: '18.5%', height: '100%' }}>
        {/* Nav items — uniform formula, all rows equally spaced */}
        {TABS.map((t, i) => {
          const active = tab === t.id
          const topPercent = 21.5 + i * 7.0
          // Prerequisites (i=1) and Modlist (i=2) painted items are shorter than the others
          const heightPercent = i === 1 ? 5.5 : i === 2 ? 6.0 : 6.4
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={t.label}
              className="absolute transition-all"
              style={{
                top: `${topPercent}%`,
                left: '8%',
                right: 0,
                height: `${heightPercent}%`,
                background: active
                  ? 'linear-gradient(90deg, hsl(36 55% 30% / 0.55) 0%, hsl(36 45% 20% / 0.25) 100%)'
                  : 'transparent',
                borderLeft: active ? '3px solid hsl(36 70% 58% / 0.95)' : '3px solid transparent',
                boxShadow: active ? 'inset 0 0 24px hsl(36 55% 15% / 0.4)' : undefined,
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'hsl(36 40% 25% / 0.3)'
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            />
          )
        })}

        {/* Launcher version — below logo in sidebar */}
        {version && (
          <div
            className="absolute w-full text-center text-[10px]"
            style={{ top: '17.6%', color: 'hsl(36 35% 55% / 0.9)', fontFamily: "'Cinzel', serif", letterSpacing: '0.08em' }}
          >
            v{version}
          </div>
        )}

        {/* Skyrim version text — painted at bottom of sidebar */}
        <div
          className="absolute w-full text-center text-[11px]"
          style={{ bottom: '1.5%', color: 'hsl(36 28% 55% / 0.9)', fontFamily: "'Cinzel', serif", letterSpacing: '0.06em' }}
        >
          {detection?.installPath
            ? `Skyrim: ${detection.exeVersion ?? '?'}`
            : <span style={{ color: 'hsl(36 70% 60% / 0.85)' }}>Skyrim not detected</span>}
        </div>
      </div>

      {/* PLAY button overlay — window-relative (painted plaque extends past sidebar wrapper width) */}
      <button
        onClick={play}
        disabled={!ready}
        title={ready ? 'Launch Skyrim Together' : 'Resolve prerequisites first'}
        className="paint-hit paint-hit-play"
        style={{
          top: '82.5%',
          left: '1.3%',
          width: '19.5%',
          height: '13.5%',
          cursor: ready ? 'pointer' : 'not-allowed',
        }}
      />

      {/* ── Info card hit-areas (painted in bg) ── */}
      <div className="absolute" style={{ top: '37%', left: '22.7%', right: '5.8%', height: '19.5%', display: 'flex', gap: '2.6%' }}>
        {(['install', 'modlist', 'ah'] as const).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id === 'install' ? 'install' : id === 'modlist' ? 'modlist' : 'ah')}
            className="paint-hit flex-1"
          />
        ))}
      </div>

      {/* ── Hero button hit-areas (painted in bg) ── */}
      <div className="absolute" style={{ top: '27%', left: '27%', display: 'flex', gap: '2.9%' }}>
        <button
          onClick={() => setTab('install')}
          className="paint-hit"
          style={{ width: '13.3%', minWidth: 150, height: 42 }}
        />
        <a
          href="https://github.com/Zed-Hosting/era-launcher/releases"
          target="_blank"
          rel="noreferrer"
          className="paint-hit"
          style={{ width: '11.1%', minWidth: 125, height: 42, display: 'block' }}
        />
      </div>

      {/* ── Update-ready modal ── */}
      {update?.state === 'ready' && !updateDismissed && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'hsl(0 0% 0% / 0.72)' }}
        >
          <div
            className="panel relative flex flex-col gap-4 px-8 py-6"
            style={{ maxWidth: 400, width: '90%' }}
          >
            <h2
              className="text-base uppercase tracking-widest"
              style={{ color: 'hsl(var(--gold))', fontFamily: "'Cinzel', serif" }}
            >
              Update Ready
            </h2>
            <p className="serif text-sm leading-relaxed" style={{ color: 'hsl(var(--parchment) / 0.85)' }}>
              Version {update.version ? `v${update.version}` : 'latest'} has been downloaded.
              The launcher will restart to apply the update.
            </p>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => setUpdateDismissed(true)}
                className="btn-outline px-4 py-1.5 text-xs"
              >
                Later
              </button>
              <button
                onClick={() => void window.str.updater.quitAndInstall()}
                className="btn-primary px-5 py-1.5 text-xs"
              >
                Install &amp; Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Silent download progress indicator ── */}
      {update && (update.state === 'available' || update.state === 'downloading') && (
        <div
          className="absolute pointer-events-none"
          style={{ bottom: '3%', left: '1%', width: '17%', fontSize: '10px', color: 'hsl(36 40% 50% / 0.75)', fontFamily: "'Cinzel', serif", letterSpacing: '0.06em', textAlign: 'center' }}
        >
          {update.state === 'downloading' && typeof update.percent === 'number'
            ? `Updating… ${Math.round(update.percent)}%`
            : 'Updating…'}
        </div>
      )}

      {/* ── Home: patch notes overlay in parchment slot ── */}
      {tab === 'home' && (
        <div className="absolute overflow-y-auto" style={{ top: '58.4%', left: '20.5%', right: '1.5%', bottom: '1%', paddingLeft: '3%' }}>
          <HomeOverlay />
        </div>
      )}

      {/* ── Non-Home pages: full right-panel from top to bottom ── */}
      {tab !== 'home' && (
        <div
          className="absolute overflow-y-auto"
          style={{
            top: 0,
            left: '23%',
            right: 0,
            bottom: 0,
            background: 'hsl(22 16% 7% / 0.97)',
            borderLeft: '1px solid hsl(36 38% 18% / 0.7)',
          }}
        >
          <div className="p-6">
            {tab === 'install'  && <InstallPage />}
            {tab === 'modlist'  && <ModlistPage />}
            {tab === 'ah'       && <AuctionHousePage />}
            {tab === 'settings' && <SettingsPage />}
          </div>
        </div>
      )}
    </div>
  )
}

