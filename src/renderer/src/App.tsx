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
    // Fixed window: 1165×757 matches the mockup image dimensions
    <div className="relative overflow-hidden" style={{ width: '100vw', height: '100vh', background: '#0d0b08' }}>
      {/* ── Full-window background image ── */}
      <img
        src={appBg}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ objectFit: 'cover', objectPosition: 'center', userSelect: 'none' }}
        draggable={false}
      />

      {/* ── Sidebar nav: invisible buttons over painted nav items ── */}
      {/* Each button is transparent with a hover highlight glow */}
      <div className="absolute" style={{ top: 0, left: 0, width: '18.5%', height: '100%' }}>
        {/* Nav items — positioned to match painted rows */}
        {TABS.map((t, i) => {
          const active = tab === t.id
          const topPercent = 19.5 + i * 7.2
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={t.label}
              className="absolute transition-all"
              style={{
                top: `${topPercent}%`,
                left: '18%',
                right: 0,
                height: '6.6%',
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

        {/* PLAY button overlay */}
        <button
          onClick={play}
          disabled={!ready}
          title={ready ? 'Launch Skyrim Together' : 'Resolve prerequisites first'}
          className="absolute w-full transition-all"
          style={{
            top: '88.5%',
            height: '7.5%',
            background: 'transparent',
            cursor: ready ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={e => {
            if (ready) (e.currentTarget as HTMLElement).style.background = 'hsl(36 60% 35% / 0.22)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        />

        {/* Skyrim version text — painted at bottom of sidebar */}
        <div
          className="absolute w-full text-center text-[11px]"
          style={{ bottom: '1.5%', color: 'hsl(36 28% 55% / 0.9)', fontFamily: "'Cinzel', serif", letterSpacing: '0.06em' }}
        >
          {detection?.installPath
            ? `Skyrim: ${detection.exeVersion ?? '?'}`
            : <span style={{ color: 'hsl(36 70% 60% / 0.85)' }}>Skyrim not detected</span>}
        </div>

        {/* Launcher version — below logo in sidebar */}
        {version && (
          <div
            className="absolute w-full text-center text-[10px]"
            style={{ top: '15.5%', color: 'hsl(36 35% 55% / 0.9)', fontFamily: "'Cinzel', serif", letterSpacing: '0.08em' }}
          >
            v{version}
          </div>
        )}
      </div>

      {/* ── Info card hover areas ── */}
      <div className="absolute" style={{ top: '38%', left: '20.5%', right: '1.5%', height: '18%', display: 'flex', gap: '1%' }}>
        {(['install', 'modlist', 'ah'] as const).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id === 'install' ? 'install' : id === 'modlist' ? 'modlist' : 'ah')}
            className="flex-1 rounded transition-all"
            style={{ background: 'transparent' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(36 55% 50% / 0.08)'; (e.currentTarget as HTMLElement).style.boxShadow = 'inset 0 0 0 1px hsl(36 50% 35% / 0.5)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
          />
        ))}
      </div>

      {/* ── Hero button areas ── */}
      <div className="absolute" style={{ top: '29.5%', left: '20.5%', display: 'flex', gap: '1%' }}>
        <button
          onClick={() => setTab('install')}
          className="rounded transition-all"
          style={{ width: '10%', minWidth: 110, height: 38, background: 'transparent' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(0 50% 30% / 0.3)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        />
        <a
          href="https://github.com/Zed-Hosting/era-launcher/releases"
          target="_blank"
          rel="noreferrer"
          className="rounded transition-all"
          style={{ width: '10%', minWidth: 110, height: 38, background: 'transparent', display: 'block' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'hsl(36 30% 20% / 0.3)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        />
      </div>

      {/* ── Home: patch notes overlay in parchment slot ── */}
      {tab === 'home' && (
        <div className="absolute overflow-y-auto" style={{ top: '57.5%', left: '20.5%', right: '1.5%', bottom: '1%', paddingLeft: '3%' }}>
          <HomeOverlay />
        </div>
      )}

      {/* ── Non-Home pages: full right-panel from top to bottom ── */}
      {tab !== 'home' && (
        <div
          className="absolute overflow-y-auto"
          style={{
            top: 0,
            left: '20.5%',
            right: 0,
            bottom: 0,
            background: 'hsl(22 16% 7% / 0.97)',
            borderLeft: '1px solid hsl(36 38% 18% / 0.7)',
          }}
        >
          {/* Update banner */}
          {!dismissed && update && update.state !== 'none' && update.state !== 'checking' && (
            <div className="flex items-center gap-2 px-4 py-2 text-xs"
                 style={{ background: 'hsl(215 40% 12% / 0.92)', borderBottom: '1px solid hsl(215 50% 28% / 0.7)', color: 'hsl(36 35% 72%)' }}>
              <Download size={13} className="shrink-0" style={{ color: 'hsl(36 55% 50%)' }} />
              <span className="flex-1">
                {update.state === 'available' && `Launcher update ${update.version ? `v${update.version}` : ''} available — downloading…`}
                {update.state === 'downloading' && `Downloading… ${typeof update.percent === 'number' ? `${Math.round(update.percent)}%` : ''}`}
                {update.state === 'ready' && `Update ${update.version ? `v${update.version}` : ''} ready. Relaunch to install.`}
                {update.state === 'error' && <span style={{ color: '#fcd34d' }}>Update failed: {update.message}</span>}
              </span>
              {update.state === 'ready' && (
                <button onClick={() => void window.str.updater.quitAndInstall()}
                        className="rounded px-2 py-0.5 text-[10px]"
                        style={{ background: 'hsl(36 55% 38%)', color: '#1a1008', fontFamily: "'Cinzel',serif" }}>
                  Relaunch
                </button>
              )}
              <button onClick={() => setDismissed(true)} style={{ opacity: 0.6 }}><X size={12} /></button>
            </div>
          )}
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

