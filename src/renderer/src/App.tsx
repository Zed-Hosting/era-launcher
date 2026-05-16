import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Download,
  HardDriveDownload,
  Home as HomeIcon,
  ListChecks,
  Settings as SettingsIcon,
  X
} from 'lucide-react'
import { cn } from './lib/utils'
import { useApp } from './store'
import { HomePage } from './pages/Home'
import { HealthPage } from './pages/Health'
import { InstallPage } from './pages/Install'
import { ModlistPage } from './pages/Modlist'
import { SettingsPage } from './pages/Settings'

type Tab = 'home' | 'health' | 'install' | 'modlist' | 'settings'

type UpdateStatus =
  | { state: 'checking' }
  | { state: 'none' }
  | { state: 'available'; version?: string }
  | { state: 'downloading'; percent?: number }
  | { state: 'ready' }
  | { state: 'error'; message?: string }

const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'health', label: 'Health', Icon: Activity },
  { id: 'install', label: 'Install', Icon: HardDriveDownload },
  { id: 'modlist', label: 'Modlist', Icon: ListChecks },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon }
]

export function App(): JSX.Element {
  const [tab, setTab] = useState<Tab>('home')
  const loadInitial = useApp((s) => s.loadInitial)
  const detection = useApp((s) => s.detection)
  const [update, setUpdate] = useState<UpdateStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    void loadInitial()
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

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card/30">
        <div className="flex items-center gap-2 px-4 py-5">
          <img src="./logo.png" alt="ERA" className="h-9 w-9 rounded-md object-contain" />
          <div>
            <div className="display text-lg leading-none">ERA Launcher</div>
            <div className="text-xs text-muted-foreground">Skyrim Together Reborn</div>
          </div>
        </div>
        <nav className="mt-2 flex flex-col gap-0.5 px-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                tab === t.id
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <t.Icon size={16} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto p-3 text-[11px] text-muted-foreground">
          {detection?.installPath ? (
            <div className="truncate" title={detection.installPath}>
              Skyrim: <span className="text-foreground">{detection.exeVersion ?? '?'}</span>
            </div>
          ) : (
            <div className="text-amber-300">Skyrim not detected</div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6">
        {!dismissed && update && (update.state === 'available' || update.state === 'downloading' || update.state === 'ready') && (
          <div className="mb-4 flex items-center gap-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
            <Download size={16} className="text-primary" />
            <div className="flex-1">
              {update.state === 'available' && (
                <>Launcher update {update.version ? `v${update.version}` : ''} available — downloading…</>
              )}
              {update.state === 'downloading' && (
                <>Downloading update… {typeof update.percent === 'number' ? `${Math.round(update.percent)}%` : ''}</>
              )}
              {update.state === 'ready' && <>Update ready. Relaunch to install.</>}
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
        {tab === 'home' && <HomePage onNavigate={setTab} />}
        {tab === 'health' && <HealthPage />}
        {tab === 'install' && <InstallPage />}
        {tab === 'modlist' && <ModlistPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
