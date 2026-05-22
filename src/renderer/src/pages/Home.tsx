import { ExternalLink, Wrench, ScrollText, Gavel, Bug, Sparkles } from 'lucide-react'

interface PatchNote {
  version: string
  date: string
  highlights: { icon?: 'feat' | 'fix' | 'tweak'; text: string }[]
}

const PATCH_NOTES: PatchNote[] = [
  {
    version: '0.1.34',
    date: 'Latest',
    highlights: [
      { icon: 'feat', text: 'New Elder Scrolls–styled UI with parchment theme and ornate dividers.' },
      { icon: 'feat', text: "Auction House gained a 'How it works' help tab." },
    ],
  },
  {
    version: '0.1.33',
    date: '',
    highlights: [
      { icon: 'feat', text: 'New welcome / patch notes Home screen.' },
      { icon: 'tweak', text: 'Sell tab removed — all listings go through the in-game F4 hotkey.' },
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
      { icon: 'feat', text: 'Play button moved to the sidebar.' },
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
]

export function HomePage({ onNavigate }: { onNavigate?: (tab: 'install' | 'modlist' | 'ah' | 'settings') => void }) {
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto pr-1">
      {/* Hero panel */}
      <div className="panel relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_42%]">
          {/* Left: text */}
          <div className="flex flex-col gap-4 px-7 py-7">
            <div>
              <h1
                className="display text-3xl uppercase leading-tight tracking-[0.08em]"
                style={{ color: 'hsl(var(--parchment))', textShadow: '0 1px 3px hsl(0 0% 0% / 0.7)' }}
              >
                Welcome to ERA Launcher
              </h1>
              <div className="mt-2 ornate-divider">
                <span style={{ color: 'hsl(var(--gold))' }}>◆</span>
              </div>
            </div>
            <p className="serif text-base leading-relaxed" style={{ color: 'hsl(var(--parchment) / 0.85)' }}>
              A unified launcher for the ERA Skyrim Together server — handles mod prerequisites,
              modlist sync, and the player-driven Auction House.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <button onClick={() => onNavigate?.('install')} className="btn-primary px-6 py-2.5">
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

          {/* Right: hero artwork (falls back to a moody gradient if hero.jpg isn't present) */}
          <div
            className="relative min-h-[220px]"
            style={{
              background:
                "linear-gradient(90deg, hsl(28 22% 14%) 0%, transparent 18%), \
                 linear-gradient(180deg, hsl(28 22% 14% / 0.2), hsl(20 30% 8% / 0.6)), \
                 radial-gradient(ellipse at 60% 80%, hsl(20 50% 25% / 0.6), transparent 60%), \
                 linear-gradient(180deg, hsl(220 30% 10%), hsl(280 25% 8%))"
            }}
          >
            {/* Subtle silhouette evocation: spires */}
            <svg
              viewBox="0 0 400 240"
              preserveAspectRatio="xMidYMax slice"
              className="absolute inset-0 h-full w-full opacity-70"
            >
              <defs>
                <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(30 50% 20%)" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="hsl(20 40% 6%)" stopOpacity="1" />
                </linearGradient>
              </defs>
              <rect width="400" height="240" fill="url(#sky)" />
              {/* Distant mountains */}
              <path d="M0 180 L60 130 L110 165 L170 110 L230 160 L300 120 L360 155 L400 140 L400 240 L0 240 Z"
                fill="hsl(24 25% 10%)" opacity="0.8" />
              {/* Foreground silhouettes — towers and mushroom-tower spires */}
              <path d="M0 200 L40 200 L48 160 L56 200 L80 200 L86 145 L92 200 L130 200 L140 175 L155 200 L200 200 L210 130 L222 200 L260 200 L268 155 L280 200 L320 200 L330 170 L345 200 L400 200 L400 240 L0 240 Z"
                fill="hsl(20 30% 6%)" />
              {/* Tiny lantern glows */}
              <circle cx="90" cy="180" r="1.5" fill="hsl(36 80% 60%)" opacity="0.8" />
              <circle cx="215" cy="170" r="1.5" fill="hsl(36 80% 60%)" opacity="0.9" />
              <circle cx="272" cy="185" r="1.5" fill="hsl(36 80% 60%)" opacity="0.7" />
              <circle cx="338" cy="190" r="1.5" fill="hsl(36 80% 60%)" opacity="0.7" />
            </svg>
            {/* Left-edge fade into panel */}
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
      <div className="panel-parchment relative">
        <div className="px-6 pt-5 pb-3">
          <h2 className="ornate-title text-base">
            <span style={{ color: 'hsl(var(--gold))' }}>◆◆</span>
            <span>What&apos;s new in ERA</span>
            <span style={{ color: 'hsl(var(--gold))' }}>◆◆</span>
          </h2>
        </div>

        <div className="relative px-6 pb-6">
          {/* Vertical timeline rail */}
          <div className="absolute left-[34px] top-0 bottom-0 w-px ornate-rail" />

          <div className="flex flex-col gap-5">
            {PATCH_NOTES.map((n) => (
              <div key={n.version} className="relative pl-12">
                {/* Diamond marker */}
                <div
                  className="absolute left-[28px] top-1 h-3 w-3 rotate-45"
                  style={{
                    background: 'hsl(var(--gold))',
                    boxShadow: '0 0 0 2px hsl(20 30% 8%), 0 0 8px hsl(var(--gold) / 0.4)'
                  }}
                />
                <div className="mb-2 flex items-baseline gap-3">
                  <span
                    className="display text-lg uppercase tracking-[0.1em]"
                    style={{ color: 'hsl(var(--parchment))' }}
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
                <ul className="flex flex-col gap-1.5">
                  {n.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Tag kind={h.icon} />
                      <span style={{ color: 'hsl(var(--parchment) / 0.92)' }} className="serif">{h.text}</span>
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
      className="panel group flex flex-col gap-2 p-5 text-left transition-all hover:scale-[1.01]"
      style={{ minHeight: '140px' }}
    >
      <div className="flex items-center gap-3">
        <div className="heraldic-icon">{icon}</div>
        <span
          className="display text-lg uppercase tracking-[0.12em]"
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

function Tag({ kind }: { kind?: 'feat' | 'fix' | 'tweak' }) {
  const base =
    'mt-0.5 inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest'
  const style = { fontFamily: "'Cinzel', serif", border: '1px solid hsl(var(--gold-dim) / 0.6)' }
  if (kind === 'fix') {
    return (
      <span className={base} style={{ ...style, background: 'hsl(36 50% 25% / 0.6)', color: 'hsl(36 70% 70%)' }}>
        <Bug size={9} /> Fix
      </span>
    )
  }
  if (kind === 'feat') {
    return (
      <span className={base} style={{ ...style, background: 'hsl(0 55% 25% / 0.65)', color: 'hsl(36 70% 70%)' }}>
        <Sparkles size={9} /> New
      </span>
    )
  }
  return (
    <span className={base} style={{ ...style, background: 'hsl(28 18% 18% / 0.7)', color: 'hsl(var(--parchment) / 0.7)' }}>
      <Wrench size={9} /> Tweak
    </span>
  )
}
