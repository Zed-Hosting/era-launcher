import { ExternalLink, Shield, Swords, Scale } from 'lucide-react'
import { CornerOrnament } from '../components/art'
import heroBg from '../assets/hero-bg.jpg'
import React from 'react'

interface PatchNote {
  version: string
  date: string
  highlights: { kind?: 'feat' | 'fix' | 'tweak'; text: string }[]
}

const PATCH_NOTES: PatchNote[] = [
  {
    version: '0.1.72',
    date: 'Latest',
    highlights: [
      { kind: 'new', text: 'Address Library, PapyrusUtil, and UIExtensions now install with a single click using your saved Nexus API key — no more pasting archive paths. Added an Install All button.' },
      { kind: 'fix', text: 'Clearer error if Nexus refuses the download (Nexus Premium is required for direct API downloads; otherwise the launcher reuses Vortex/MO2 archives).' },
    ],
  },
  {
    version: '0.1.71',
    date: '',
    highlights: [
      { kind: 'fix', text: 'Tuned sidebar nav hit-areas: Prerequisites shortened, Modlist shortened half as much.' },
    ],
  },
  {
    version: '0.1.70',
    date: '',
    highlights: [
      { kind: 'fix', text: 'Removed native Windows title bar — the launcher now uses the title bar painted in the background art. Window is draggable from the top strip and the painted close/minimize buttons are functional.' },
    ],
  },
  {
    version: '0.1.69',
    date: '',
    highlights: [
      { kind: 'fix', text: 'Installer switched to one-click / per-user mode — auto-updates now apply silently to %LOCALAPPDATA% with no UAC prompt and no antivirus interference.' },
    ],
  },
  {
    version: '0.1.68',
    date: '',
    highlights: [
      { kind: 'feat', text: 'Update notification replaced with a modal dialog — when a download is ready, a popup appears. Click “Install & Restart” to apply, or “Later” to postpone. Download progress shows silently in the sidebar.' },
    ],
  },
  {
    version: '0.1.67',
    date: '',
    highlights: [
      { kind: 'fix', text: 'Info card and hero button hover areas shifted up ~5% — boxes now align with the painted card borders and GET STARTED / RELEASES buttons.' },
    ],
  },
  {
    version: '0.1.54',
    date: '',
    highlights: [
      { kind: 'fix', text: 'Nav hover/active overlay rows realigned — HOME button no longer lands on Modlist row.' },
      { kind: 'fix', text: 'Patch notes left padding added so version numbers and diamonds are no longer clipped.' },
      { kind: 'fix', text: 'Removed stale LATEST badges from v0.1.49–v0.1.52.' },
    ],
  },
  {
    version: '0.1.56',
    date: '',
    highlights: [
      { kind: 'feat', text: "What's New section redesigned to match reference: ornate diamond-chain header, large ◈ version markers, ◈ New/Tweak/Fix tag rows with flowing body text." },
      { kind: 'fix', text: 'Removed stale Latest badge from v0.1.53.' },
    ],
  },
  {
    version: '0.1.55',
    date: '',
    highlights: [
      { kind: 'fix', text: 'Nav rows shifted up — active HOME highlight now lands on HOME row instead of Prerequisites.' },
      { kind: 'fix', text: 'Version number moved into logo area, no longer overlapping nav.' },
    ],
  },
  {
    version: '0.1.53',
    date: '',
    highlights: [
      { kind: 'feat', text: 'Background approach: app-bg.jpg shown at full resolution, UI is invisible overlays only. Patch notes render over the painted parchment region.' },
      { kind: 'tweak', text: 'Window locked to 1165×757 to match mockup pixel-perfect.' },
    ],
  },
  {
    version: '0.1.52',
    date: '',
    highlights: [
      { kind: 'feat', text: 'Mockup artwork now lives behind the UI as a dimmed/blurred atmosphere layer — castle-stone ambience without doubling the chrome.' },
      { kind: 'tweak', text: 'Panels slightly more translucent so the atmosphere reads through subtly.' },
    ],
  },
  {
    version: '0.1.51',
    date: '',
    highlights: [
      { kind: 'tweak', text: 'Aging pass: tarnished the gold, dirtied the panels with grime and inset vignettes, heavily stained the parchment with rust spots and darkened edges.' },
      { kind: 'tweak', text: 'Background noise grain bumped up so the dark surfaces no longer read as flat plastic.' },
    ],
  },
  {
    version: '0.1.50',
    date: '',
    highlights: [
      { kind: 'feat', text: 'Ornate corner brackets on hero buttons and PLAY; burgundy filled Get Started button.' },
      { kind: 'feat', text: 'Sidebar herald banner repainted from blue to deep burgundy to match the warm theme.' },
      { kind: 'tweak', text: 'Sidebar logo locked to ERA LAUNCHER uppercase with ornate diamond underline.' },
      { kind: 'tweak', text: 'Corner ornaments enlarged from 18px to 32px so they\u2019re actually visible.' },
      { kind: 'tweak', text: 'Hero title fits on a single line; lighter gradient lets the castle bleed further left.' },
      { kind: 'tweak', text: 'What\u2019s New heading uses a proper diamond-chain divider.' },
    ],
  },
  {
    version: '0.1.49',
    date: '',
    highlights: [
      { kind: 'feat', text: 'Restored dark bordered panels, cream parchment patch notes, knotwork top border, sidebar herald banner, and corner ornaments on every panel.' },
      { kind: 'tweak', text: 'Hero castle artwork now positioned right-center so the castle is actually visible.' },
      { kind: 'fix', text: 'Reverted window to 1360×880 resizable.' },
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

export function HomePage({ onNavigate, overlayOnly }: { onNavigate?: (tab: 'install' | 'modlist' | 'ah' | 'settings') => void; overlayOnly?: boolean }) {
  if (overlayOnly) {
    return <PatchNotesOverlay />
  }
  return (
    <div className="flex flex-col gap-4">
      {/* Hero panel — full-bleed art with text overlay */}
      <div className="panel relative overflow-hidden" style={{ minHeight: '300px' }}>
        <CornerOrnament corner="tl" />
        <CornerOrnament corner="tr" />
        <CornerOrnament corner="bl" />
        <CornerOrnament corner="br" />
        {/* Hero background image */}
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: 'cover', objectPosition: 'right center' }}
        />
        {/* Dark gradient: opaque left (text area) → transparent right (image shows) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(100deg, hsl(24 16% 6% / 0.95) 0%, hsl(24 16% 6% / 0.85) 32%, hsl(24 16% 6% / 0.35) 58%, transparent 85%)' }}
        />
        {/* Text overlaid on left */}
        <div className="relative z-10 flex flex-col gap-3 px-8 py-7" style={{ maxWidth: '560px' }}>
          <h1
            className="text-[34px] leading-[1.05] tracking-[0.04em]"
            style={{ color: 'hsl(var(--parchment))', textShadow: '0 2px 8px hsl(0 0% 0% / 0.95)', fontFamily: "'Cinzel', serif", fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            Welcome to ERA Launcher
          </h1>
          {/* Ornate diamond divider */}
          <div className="flex items-center gap-2">
            <span style={{ flex: 1, height: '1px', maxWidth: '6rem', background: 'linear-gradient(90deg, transparent, hsl(var(--gold-dim) / 0.85))' }} />
            <span style={{ fontSize: '10px', color: 'hsl(var(--gold))' }}>◆</span>
            <span style={{ flex: 1, height: '1px', maxWidth: '6rem', background: 'linear-gradient(90deg, hsl(var(--gold-dim) / 0.85), transparent)' }} />
          </div>
          <p className="serif text-base leading-relaxed" style={{ color: 'hsl(var(--parchment) / 0.9)', textShadow: '0 1px 4px hsl(0 0% 0% / 0.9)' }}>
            A unified launcher for the ERA Skyrim Together server — handles mod prerequisites,
            modlist sync, and the player-driven Auction House.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <OrnateButton onClick={() => onNavigate?.('install')} variant="primary">
              Get Started
            </OrnateButton>
            <OrnateButton href="https://github.com/Zed-Hosting/era-launcher/releases" variant="outline">
              Releases <ExternalLink size={12} />
            </OrnateButton>
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
        <CornerOrnament corner="tl" />
        <CornerOrnament corner="tr" />
        <CornerOrnament corner="bl" />
        <CornerOrnament corner="br" />
        <div className="px-6 pt-5 pb-3">
          <h2 className="flex items-center justify-center gap-3 text-base"
              style={{ color: 'hsl(28 55% 20%)', fontFamily: "'Cinzel', serif", letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            <span style={{ flex: 1, maxWidth: '7rem', height: '1px', background: 'linear-gradient(90deg, transparent, hsl(28 50% 28% / 0.9))' }} />
            <span style={{ fontSize: '9px', color: 'hsl(28 55% 26%)' }}>◆</span>
            <span style={{ flex: '0 0 0.6rem', height: '1px', background: 'hsl(28 50% 28% / 0.9)' }} />
            <span style={{ fontSize: '9px', color: 'hsl(28 55% 26%)' }}>◇</span>
            <span>What&apos;s new in ERA</span>
            <span style={{ fontSize: '9px', color: 'hsl(28 55% 26%)' }}>◇</span>
            <span style={{ flex: '0 0 0.6rem', height: '1px', background: 'hsl(28 50% 28% / 0.9)' }} />
            <span style={{ fontSize: '9px', color: 'hsl(28 55% 26%)' }}>◆</span>
            <span style={{ flex: 1, maxWidth: '7rem', height: '1px', background: 'linear-gradient(90deg, hsl(28 50% 28% / 0.9), transparent)' }} />
          </h2>
        </div>

        <div className="px-7 pb-6">
          <div className="flex flex-col divide-y" style={{ borderColor: 'hsl(28 40% 30% / 0.35)' }}>
            {PATCH_NOTES.map((n) => (
              <div key={n.version} className="py-3 first:pt-1">
                <div className="mb-1.5 flex items-baseline gap-3">
                <span style={{ color: 'hsl(28 60% 28%)', fontSize: '12px', lineHeight: 1 }}>◆</span>
                  <span
                    className="display text-lg lowercase"
                    style={{ color: 'hsl(28 50% 18%)', letterSpacing: '0.02em', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}
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
                      <span className="serif" style={{ color: 'hsl(28 45% 16%)' }}>{h.text}</span>
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
      <CornerOrnament corner="tl" size={22} />
      <CornerOrnament corner="tr" size={22} />
      <CornerOrnament corner="bl" size={22} />
      <CornerOrnament corner="br" size={22} />
      {/* Left icon block */}
      <div
        className="flex w-[70px] shrink-0 items-center justify-center border-r"
        style={{
          borderColor: 'hsl(var(--gold-dim) / 0.4)',
          background: 'hsl(28 16% 8% / 0.65)',
        }}
      >
        <span style={{ color: 'hsl(var(--gold))', transform: 'scale(1.5)', display: 'block' }}>{icon}</span>
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
      style={{ color: 'hsl(28 60% 30%)', fontFamily: "'Cinzel', serif", minWidth: '4.25rem' }}
    >
      <span style={{ fontSize: '11px' }}>✦</span>
      {text}
    </span>
  )
}

function OrnateButton({
  children,
  onClick,
  href,
  variant = 'outline',
}: {
  children: React.ReactNode
  onClick?: () => void
  href?: string
  variant?: 'primary' | 'outline'
}) {
  const isPrimary = variant === 'primary'
  const baseStyle: React.CSSProperties = {
    fontFamily: "'Cinzel', serif",
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    fontSize: '13px',
    color: isPrimary ? 'hsl(36 60% 78%)' : 'hsl(36 50% 70%)',
    background: isPrimary
      ? 'linear-gradient(180deg, hsl(0 55% 24%) 0%, hsl(0 60% 14%) 100%)'
      : 'linear-gradient(180deg, hsl(24 18% 11% / 0.92) 0%, hsl(22 16% 7% / 0.95) 100%)',
    border: `1px solid ${isPrimary ? 'hsl(36 55% 38%)' : 'hsl(var(--gold-dim) / 0.7)'}`,
    boxShadow: isPrimary
      ? 'inset 0 1px 0 hsl(0 60% 35% / 0.45), 0 2px 8px hsl(0 0% 0% / 0.55)'
      : 'inset 0 1px 0 hsl(36 40% 30% / 0.3), 0 2px 8px hsl(0 0% 0% / 0.5)',
  }
  const bracket = (pos: 'tl' | 'tr' | 'bl' | 'br'): React.CSSProperties => {
    const c = 'hsl(var(--gold))'
    const s: React.CSSProperties = { position: 'absolute', width: 8, height: 8 }
    if (pos === 'tl') return { ...s, top: -2, left: -2, borderTop: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` }
    if (pos === 'tr') return { ...s, top: -2, right: -2, borderTop: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` }
    if (pos === 'bl') return { ...s, bottom: -2, left: -2, borderBottom: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` }
    return { ...s, bottom: -2, right: -2, borderBottom: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` }
  }
  const inner = (
    <>
      <span style={bracket('tl')} />
      <span style={bracket('tr')} />
      <span style={bracket('bl')} />
      <span style={bracket('br')} />
      <span className="inline-flex items-center gap-2">{children}</span>
    </>
  )
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="relative inline-flex items-center justify-center px-7 py-3" style={baseStyle}>
        {inner}
      </a>
    )
  }
  return (
    <button onClick={onClick} className="relative inline-flex items-center justify-center px-7 py-3" style={baseStyle}>
      {inner}
    </button>
  )
}

// ── Overlay-only component: just the patch notes text, no backgrounds ────────
export function PatchNotesOverlay() {
  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'hsl(28 40% 26% / 0.8) transparent',
        /* Fade in from left so the wash doesn't bleed outside the parchment border */
        background: 'linear-gradient(90deg, transparent 0%, hsl(38 45% 72% / 0.22) 8%, hsl(38 45% 72% / 0.28) 100%)',
        borderRadius: '2px',
      }}
    >
      {/* What's New header */}
      <div className="flex items-center gap-2 px-4 pt-2 pb-2">
        <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(60,30,8,0.55))' }} />
        <span style={{ color: 'rgba(60,28,6,0.75)', fontSize: '10px', letterSpacing: '0.25em' }}>&#x25C8;&#x25C8;&#x25C8;</span>
        <span
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#1a0b04',
            textShadow: '0 1px 0 rgba(210,175,110,0.5)',
          }}
        >
          What&apos;s New in ERA
        </span>
        <span style={{ color: 'rgba(60,28,6,0.75)', fontSize: '10px', letterSpacing: '0.25em' }}>&#x25C8;&#x25C8;&#x25C8;</span>
        <span style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(60,30,8,0.55), transparent)' }} />
      </div>

      <div className="flex flex-col px-3">
        {PATCH_NOTES.map((n) => (
          <div key={n.version} style={{ borderTop: '1px solid rgba(50,25,6,0.35)', paddingTop: '9px', paddingBottom: '9px' }}>
            {/* Version header row */}
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: 'rgba(55,25,5,0.8)', fontSize: '15px', lineHeight: 1 }}>&#x25C8;</span>
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 800,
                  fontSize: '20px',
                  color: '#140804',
                  letterSpacing: '0.01em',
                  lineHeight: 1,
                  textShadow: '0 1px 0 rgba(210,175,110,0.45)',
                }}
              >
                v{n.version}
              </span>
              {n.date && (
                <span
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#1a0c04',
                    background: 'linear-gradient(180deg, hsl(42 80% 64%), hsl(36 68% 48%))',
                    border: '1px solid hsl(28 52% 28%)',
                    boxShadow: 'inset 0 1px 0 hsl(42 90% 82% / 0.55), 0 1px 3px hsl(0 0% 0% / 0.35)',
                    padding: '2px 9px',
                    borderRadius: '2px',
                  }}
                >
                  {n.date}
                </span>
              )}
            </div>
            {/* Highlight rows */}
            <div className="flex flex-col" style={{ gap: '4px', paddingLeft: '4px' }}>
              {n.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span style={{ color: 'rgba(55,25,5,0.75)', fontSize: '11px', paddingTop: '2px', lineHeight: 1.2, flexShrink: 0 }}>&#x25C8;</span>
                  <span
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: '#2a1006',
                      flexShrink: 0,
                      minWidth: '3.8rem',
                      paddingTop: '1px',
                    }}
                  >
                    {h.kind === 'feat' ? 'New' : h.kind === 'fix' ? 'Fix' : 'Tweak'}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: '14px',
                      fontWeight: 700,
                      lineHeight: 1.45,
                      color: '#120804',
                      textShadow: '0 1px 0 rgba(210,175,110,0.35)',
                    }}
                  >
                    {h.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

