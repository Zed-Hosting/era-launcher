import { ExternalLink, Shield, Swords, Scale } from 'lucide-react'

interface PatchNote {
  version: string
  date: string
  highlights: { kind?: 'feat' | 'fix' | 'tweak'; text: string }[]
}

const PATCH_NOTES: PatchNote[] = [
  {
    version: '0.1.35',
    date: 'Latest',
    highlights: [
      { kind: 'feat', text: 'Elder Scrolls–styled UI overhaul: parchment + gold theme, Cinzel display font, ornate dividers.' },
    ],
  },
  {
    version: '0.1.34',
    date: '',
    highlights: [
      { kind: 'feat', text: "Auction House gained a 'How it works' help tab." },
    ],
  },
  {
    version: '0.1.33',
    date: '',
    highlights: [
      { kind: 'feat', text: 'New welcome / patch notes Home screen.' },
      { kind: 'tweak', text: 'Sell tab removed — all listings go through the in-game F4 hotkey.' },
      { kind: 'tweak', text: 'Launcher updates itself automatically (toggle removed).' },
    ],
  },
  {
    version: '0.1.32',
    date: '',
    highlights: [
      { kind: 'tweak', text: 'Consolidated Auction House mod install into the Prerequisites page.' },
    ],
  },
  {
    version: '0.1.31',
    date: '',
    highlights: [
      { kind: 'feat', text: 'Play button moved to the sidebar.' },
      { kind: 'tweak', text: 'Health tab removed; Install renamed to Prerequisites.' },
    ],
  },
]

export function HomePage({ onNavigate }: { onNavigate?: (tab: 'install' | 'modlist' | 'ah' | 'settings') => void }) {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      {/* Hero panel */}
      <div className="panel relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_45%]">
          {/* Left: text */}
          <div className="flex flex-col gap-4 px-7 py-7">
            <div>
              <h1
                className="display text-3xl uppercase leading-tight tracking-[0.04em]"
                style={{ color: 'hsl(var(--parchment))', textShadow: '0 1px 3px hsl(0 0% 0% / 0.7)' }}
              >
                Welcome to ERA Launcher
              </h1>
            </div>
            <p className="serif text-base leading-relaxed" style={{ color: 'hsl(var(--parchment) / 0.82)' }}>
              A unified launcher for the ERA Skyrim Together server — handles mod prerequisites,
              modlist sync, and the player-driven Auction House.
            </p>
            <div className="mt-1 flex flex-wrap gap-3">
              <button onClick={() => onNavigate?.('install')} className="btn-outline px-6 py-2.5">
                Get started
              </button>
              <a
                href="https://github.com/Zed-Hosting/era-launcher/releases"
                target="_blank"
                rel="noreferrer"
                className="btn-outline px-6 py-2.5"
              >
                Releases <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Right: cold-mountain hero (SVG until real art is dropped at resources/hero.jpg) */}
          <div className="relative min-h-[230px]">
            <svg
              viewBox="0 0 500 260"
              preserveAspectRatio="xMidYMax slice"
              className="absolute inset-0 h-full w-full"
            >
              <defs>
                <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(220 30% 22%)" />
                  <stop offset="60%" stopColor="hsl(220 25% 12%)" />
                  <stop offset="100%" stopColor="hsl(220 25% 6%)" />
                </linearGradient>
                <linearGradient id="moon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(220 20% 75%)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="hsl(220 20% 75%)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <rect width="500" height="260" fill="url(#sky2)" />
              {/* Cloud / moon haze */}
              <ellipse cx="370" cy="80" rx="120" ry="40" fill="url(#moon)" />
              {/* Far mountains */}
              <path d="M0 170 L70 110 L130 145 L200 90 L280 140 L360 95 L440 135 L500 115 L500 260 L0 260 Z"
                fill="hsl(220 22% 14%)" opacity="0.85" />
              {/* Mid mountains */}
              <path d="M0 200 L60 160 L130 195 L210 150 L300 200 L400 165 L500 195 L500 260 L0 260 Z"
                fill="hsl(220 20% 10%)" opacity="0.95" />
              {/* Castle silhouette */}
              <g fill="hsl(20 20% 6%)">
                <rect x="320" y="160" width="90" height="60" />
                <rect x="328" y="140" width="14" height="22" />
                <rect x="358" y="130" width="16" height="34" />
                <rect x="390" y="150" width="12" height="20" />
                <polygon points="328,140 335,128 342,140" />
                <polygon points="358,130 366,116 374,130" />
                <polygon points="390,150 396,140 402,150" />
              </g>
              {/* Foreground */}
              <path d="M0 230 L80 200 L160 225 L260 195 L360 225 L460 200 L500 220 L500 260 L0 260 Z"
                fill="hsl(20 18% 5%)" />
              {/* Lantern glow at castle */}
              <circle cx="365" cy="195" r="2" fill="hsl(36 90% 65%)" opacity="0.85" />
              <circle cx="395" cy="200" r="1.5" fill="hsl(36 90% 65%)" opacity="0.7" />
            </svg>
            {/* Left-edge fade */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-24"
              style={{ background: 'linear-gradient(90deg, hsl(28 22% 13%) 0%, transparent 100%)' }}
            />
          </div>
        </div>
      </div>

      {/* Quick info cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <InfoCard
          icon={<Shield size={18} />}
          title="Prerequisites"
          body="Install SKSE, JContainers, SkyUI, Address Library, and the ERA Auction House mod from one place."
          onClick={() => onNavigate?.('install')}
        />
        <InfoCard
          icon={<Swords size={18} />}
          title="Modlist"
          body="Keep your load order in sync with the official ERA modlist. The launcher fetches, diffs, and applies updates."
          onClick={() => onNavigate?.('modlist')}
        />
        <InfoCard
          icon={<Scale size={18} />}
          title="Auction House"
          body="Browse listings, place bids, and manage your mailbox. List items in-game with the F4 hotkey while in your inventory."
          onClick={() => onNavigate?.('ah')}
        />
      </div>

      {/* Patch notes */}
      <div className="panel-parchment">
        <div className="px-6 pt-5 pb-3">
          <h2 className="ornate-title text-base">
            <span style={{ color: 'hsl(var(--gold))', letterSpacing: '0.2em' }}>◇◇◇</span>
            <span>What&apos;s new</span>
            <span style={{ color: 'hsl(var(--gold))', letterSpacing: '0.2em' }}>◇◇◇</span>
          </h2>
        </div>

        <div className="px-7 pb-6">
          <div className="flex flex-col divide-y" style={{ borderColor: 'hsl(var(--gold-dim) / 0.35)' }}>
            {PATCH_NOTES.map((n) => (
              <div key={n.version} className="py-3 first:pt-1">
                <div className="mb-1.5 flex items-baseline gap-3">
                  <span
                    className="display text-lg lowercase"
                    style={{ color: 'hsl(var(--parchment))', letterSpacing: '0.02em', fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}
                  >
                    v{n.version}
                  </span>
                  {n.date && (
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                      style={{
                        color: 'hsl(var(--parchment))',
                        background: 'hsl(0 55% 28%)',
                        border: '1px solid hsl(var(--gold-dim))',
                        fontFamily: "'Cinzel', serif"
                      }}
                    >
                      {n.date}
                    </span>
                  )}
                </div>
                <ul className="flex flex-col gap-1">
                  {n.highlights.map((h, i) => (
                    <li key={i} className="flex items-baseline gap-3 text-sm">
                      <TagLabel kind={h.kind} />
                      <span className="serif" style={{ color: 'hsl(var(--parchment) / 0.9)' }}>{h.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
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
      className="panel group flex flex-col gap-2 p-5 text-left transition-colors"
      style={{ minHeight: '140px' }}
    >
      <div className="flex items-center gap-2.5">
        <span style={{ color: 'hsl(var(--gold))' }}>{icon}</span>
        <span
          className="display text-lg uppercase tracking-[0.1em]"
          style={{ color: 'hsl(var(--parchment))' }}
        >
          {title}
        </span>
      </div>
      <p className="serif text-sm leading-relaxed" style={{ color: 'hsl(var(--parchment) / 0.78)' }}>
        {body}
      </p>
    </button>
  )
}

function TagLabel({ kind }: { kind?: 'feat' | 'fix' | 'tweak' }) {
  const text = kind === 'fix' ? 'Fix' : kind === 'feat' ? 'New' : 'Tweak'
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
      style={{ color: 'hsl(var(--gold))', fontFamily: "'Cinzel', serif", minWidth: '4.25rem' }}
    >
      <span style={{ fontSize: '11px' }}>✦</span>
      {text}
    </span>
  )
}
