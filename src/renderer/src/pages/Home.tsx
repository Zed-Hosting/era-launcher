import { ExternalLink, Sparkles, ScrollText, Gavel, Wrench, Bug } from 'lucide-react'

interface PatchNote {
  version: string
  date: string
  highlights: { icon?: 'feat' | 'fix' | 'tweak'; text: string }[]
}

const PATCH_NOTES: PatchNote[] = [
  {
    version: '0.1.33',
    date: 'Latest',
    highlights: [
      { icon: 'feat', text: 'New welcome / patch notes Home screen.' },
      { icon: 'tweak', text: 'Sell tab removed — all listings now go through the in-game F4 hotkey.' },
      { icon: 'tweak', text: 'Launcher updates itself automatically (toggle removed).' },
    ],
  },
  {
    version: '0.1.32',
    date: '',
    highlights: [
      { icon: 'tweak', text: 'Consolidated Auction House mod install into the Prerequisites page.' },
    ],
  },
  {
    version: '0.1.31',
    date: '',
    highlights: [
      { icon: 'feat', text: 'Play button moved to the sidebar; theme switched to blue.' },
      { icon: 'tweak', text: 'Health tab removed; Install renamed to Prerequisites.' },
    ],
  },
  {
    version: '0.1.30',
    date: '',
    highlights: [
      { icon: 'fix', text: 'Papyrus JsonUtil bridge now reloads each tick — sold/cancelled listings stop sticking.' },
      { icon: 'fix', text: 'Cancelled listings refund the item to the seller mailbox.' },
    ],
  },
  {
    version: '0.1.29',
    date: '',
    highlights: [
      { icon: 'fix', text: 'HexToInt parsing fix (Papyrus comment-character bug).' },
    ],
  },
]

export function HomePage({ onNavigate }: { onNavigate?: (tab: 'install' | 'modlist' | 'ah' | 'settings') => void }) {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      {/* Hero */}
      <div className="rounded-lg border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-md bg-primary/20 p-3 text-primary">
            <Sparkles size={28} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome to ERA Launcher</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              A unified launcher for the ERA Skyrim Together server — handles mod prerequisites,
              modlist sync, and the player-driven Auction House.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => onNavigate?.('install')}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Get started
              </button>
              <a
                href="https://github.com/Zed-Hosting/era-launcher/releases"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted"
              >
                Releases <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Quick info cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <InfoCard
          icon={<Wrench size={16} />}
          title="Prerequisites"
          body="Install SKSE, JContainers, SkyUI, Address Library, and the ERA Auction House mod from one place."
          onClick={() => onNavigate?.('install')}
        />
        <InfoCard
          icon={<ScrollText size={16} />}
          title="Modlist"
          body="Keep your load order in sync with the official ERA modlist. The launcher fetches, diffs, and applies updates."
          onClick={() => onNavigate?.('modlist')}
        />
        <InfoCard
          icon={<Gavel size={16} />}
          title="Auction House"
          body="Browse listings, place bids, and manage your mailbox. List items in-game with the F4 hotkey while in your inventory."
          onClick={() => onNavigate?.('ah')}
        />
      </div>

      {/* Patch notes */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <ScrollText size={14} className="text-primary" />
          <span className="text-sm font-semibold">What's new</span>
        </div>
        <div className="divide-y divide-border">
          {PATCH_NOTES.map((n) => (
            <div key={n.version} className="px-4 py-3">
              <div className="mb-1.5 flex items-baseline gap-2">
                <span className="text-sm font-semibold">v{n.version}</span>
                {n.date && (
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                    {n.date}
                  </span>
                )}
              </div>
              <ul className="space-y-1">
                {n.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Tag kind={h.icon} />
                    <span className="flex-1">{h.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  icon,
  title,
  body,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  body: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start gap-1.5 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
    >
      <div className="flex items-center gap-1.5 text-primary">
        {icon}
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{body}</p>
    </button>
  )
}

function Tag({ kind }: { kind?: 'feat' | 'fix' | 'tweak' }) {
  if (kind === 'fix') {
    return (
      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-500">
        <Bug size={9} /> Fix
      </span>
    )
  }
  if (kind === 'feat') {
    return (
      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-primary">
        <Sparkles size={9} /> New
      </span>
    )
  }
  return (
    <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
      <Wrench size={9} /> Tweak
    </span>
  )
}
