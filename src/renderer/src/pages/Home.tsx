import { ExternalLink, Shield, Swords, Scale } from 'lucide-react'
import heroBg from '../assets/hero-bg.jpg'

interface PatchNote {
  version: string
  date: string
  highlights: { kind?: 'feat' | 'fix' | 'tweak'; text: string }[]
}

const PATCH_NOTES: PatchNote[] = [
  {
    version: '0.1.48',
    date: 'Latest',
    highlights: [
      { kind: 'tweak', text: 'Stripped all panel backgrounds, corner ornaments, border strips, and decorative banners. Clean text/buttons/logos only.' },
    ],
  },
  {
    version: '0.1.44',
    date: '',
    highlights: [
      { kind: 'feat', text: 'Real painted castle artwork replaces SVG hero scene.' },
      { kind: 'feat', text: 'Aged parchment panel: multi-layer edge staining, dark corner vignette, visible paper grain.' },
      { kind: 'tweak', text: 'Sidebar stone-texture noise overlay for deeper gothic feel.' },
    ],
  },
  {
    version: '0.1.43',
    date: '',
    highlights: [
      { kind: 'fix', text: 'Hero scene visibility pass: aurora bands now clearly visible, bright moon disc with multi-layer corona, higher-opacity stars, trees spanning full base.' },
    ],
  },
  {
    version: '0.1.42',
    date: '',
    highlights: [
      { kind: 'feat', text: 'High-detail hero scene: 4-layer mountains, multi-glow moon, aurora bands, bloom castle windows, dense tree line, atmospheric fog banks.' },
      { kind: 'tweak', text: 'Hero title now renders in natural Cinzel mixed-case instead of all-caps.' },
    ],
  },
  {
    version: '0.1.41',
    date: '',
    highlights: [
      { kind: 'fix',   text: 'Welcome panel always visible on launch — removed double-scroll container.' },
      { kind: 'feat',  text: 'Full-bleed hero art with text overlay; gold left-border active nav; larger card icons.' },
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
    <div className="flex flex-col gap-4">
      {/* Hero panel — full-bleed art with text overlay */}
      <div className="panel relative overflow-hidden" style={{ minHeight: '300px' }}>
        {/* Hero background image */}
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
        />
        {/* Dark gradient: opaque left (text area) → transparent right (image shows) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(105deg, hsl(24 16% 6% / 0.97) 0%, hsl(24 16% 6% / 0.92) 28%, hsl(24 16% 6% / 0.55) 52%, hsl(24 16% 6% / 0.12) 72%, transparent 100%)' }}
        />
        {/* Text overlaid on left */}
        <div className="relative z-10 flex flex-col gap-4 px-8 py-8" style={{ maxWidth: '520px' }}>
          <h1
            className="display text-4xl leading-tight tracking-[0.04em]"
            style={{ color: 'hsl(var(--parchment))', textShadow: '0 2px 8px hsl(0 0% 0% / 0.95)' }}
          >
            Welcome to ERA Launcher
          </h1>
          <p className="serif text-base leading-relaxed" style={{ color: 'hsl(var(--parchment) / 0.88)', textShadow: '0 1px 4px hsl(0 0% 0% / 0.9)' }}>
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
      </div>

      {/* Quick info cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <InfoCard
          icon={<Shield size={22} />}
          title="Prerequisites"
          body="Install SKSE, JContainers, SkyUI, Address Library, and the ERA Auction House mod from one place."
          onClick={() => onNavigate?.('install')}
        />
        <InfoCard
          icon={<Swords size={22} />}
          title="Modlist"
          body="Keep your load order in sync with the official ERA modlist. The launcher fetches, diffs, and applies updates."
          onClick={() => onNavigate?.('modlist')}
        />
        <InfoCard
          icon={<Scale size={22} />}
          title="Auction House"
          body="Browse listings, place bids, and manage your mailbox. List items in-game with the F4 hotkey while in your inventory."
          onClick={() => onNavigate?.('ah')}
        />
      </div>

      {/* Patch notes */}
      <div className="panel-parchment relative">
        <div className="px-6 pt-5 pb-3">
          <h2 className="ornate-title text-base" style={{ color: 'hsl(var(--gold))' }}>
            <span style={{ color: 'hsl(28 60% 30%)', letterSpacing: '0.2em' }}>◇◇◇</span>
            <span>What&apos;s new in ERA</span>
            <span style={{ color: 'hsl(28 60% 30%)', letterSpacing: '0.2em' }}>◇◇◇</span>
          </h2>
        </div>

        <div className="px-7 pb-6">
          <div className="flex flex-col divide-y" style={{ borderColor: 'hsl(28 40% 30% / 0.35)' }}>
            {PATCH_NOTES.map((n) => (
              <div key={n.version} className="py-3 first:pt-1">
                <div className="mb-1.5 flex items-baseline gap-3">
                <span style={{ color: 'hsl(var(--gold))', fontSize: '12px', lineHeight: 1 }}>◆</span>
                  <span
                    className="display text-lg lowercase"
                    style={{ color: 'hsl(var(--parchment))', letterSpacing: '0.02em', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}
                  >
                    v{n.version}
                  </span>
                  {n.date && (
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                      style={{
                        color: 'hsl(28 35% 14%)',
                        background: 'linear-gradient(180deg, hsl(40 80% 65%), hsl(36 70% 50%))',
                        border: '1px solid hsl(28 50% 28%)',
                        boxShadow: 'inset 0 1px 0 hsl(40 90% 80% / 0.6), 0 1px 2px hsl(0 0% 0% / 0.4)',
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
                      <span className="serif" style={{ color: 'hsl(var(--parchment) / 0.88)' }}>{h.text}</span>
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
      className="panel group relative flex overflow-hidden text-left transition-colors"
      style={{ minHeight: '130px' }}
    >
      {/* Left icon block */}
      <div className="flex w-[68px] shrink-0 items-center justify-center">
        <span style={{ color: 'hsl(var(--gold))', transform: 'scale(1.6)', display: 'block' }}>{icon}</span>
      </div>
      {/* Text */}
      <div className="flex flex-col gap-2 px-5 py-5">
        <span
          className="display text-base uppercase tracking-[0.1em]"
          style={{ color: 'hsl(var(--parchment))' }}
        >
          {title}
        </span>
        <p className="serif text-sm leading-relaxed" style={{ color: 'hsl(var(--parchment) / 0.78)' }}>
          {body}
        </p>
      </div>
    </button>
  )
}

function TagLabel({ kind }: { kind?: 'feat' | 'fix' | 'tweak' }) {
  const text = kind === 'fix' ? 'Fix' : kind === 'feat' ? 'New' : 'Tweak'
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
      style={{ color: 'hsl(var(--gold) / 0.9)', fontFamily: "'Cinzel', serif", minWidth: '4.25rem' }}
    >
      <span style={{ fontSize: '11px' }}>✦</span>
      {text}
    </span>
  )
}
