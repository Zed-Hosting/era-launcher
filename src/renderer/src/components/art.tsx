// ─────────────────────────────────────────────────────────────────────────────
// Inline-SVG art for the launcher. Everything uses theme tokens so the gold
// and parchment colors stay in sync with styles.css.
// ─────────────────────────────────────────────────────────────────────────────

const GOLD = 'hsl(36, 70%, 58%)'
const GOLD_DIM = 'hsl(36, 45%, 38%)'
const GOLD_DARK = 'hsl(28, 50%, 22%)'
const IRON = 'hsl(24, 18%, 8%)'

// ── Ornate compass-eye logo ─────────────────────────────────────────────────
export function OrnateLogo({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ filter: 'drop-shadow(0 3px 4px hsl(0 0% 0% / 0.7))' }}
    >
      <defs>
        <radialGradient id="lg-bg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="hsl(28 40% 20%)" />
          <stop offset="100%" stopColor={IRON} />
        </radialGradient>
        <linearGradient id="lg-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(40 80% 70%)" />
          <stop offset="50%" stopColor={GOLD} />
          <stop offset="100%" stopColor={GOLD_DIM} />
        </linearGradient>
        <radialGradient id="lg-eye" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(36 90% 70%)" />
          <stop offset="40%" stopColor={GOLD} />
          <stop offset="100%" stopColor={GOLD_DARK} />
        </radialGradient>
      </defs>

      {/* Outer dark disc */}
      <circle cx="50" cy="50" r="42" fill="url(#lg-bg)" stroke="url(#lg-gold)" strokeWidth="1.8" />
      {/* Inner gold ring */}
      <circle cx="50" cy="50" r="36" fill="none" stroke="url(#lg-gold)" strokeWidth="0.8" opacity="0.7" />

      {/* Four cardinal ornaments (pointed leaves outside the disc) */}
      {[0, 90, 180, 270].map((a) => (
        <g key={a} transform={`rotate(${a} 50 50)`}>
          <path
            d="M50 4 L46 10 L50 16 L54 10 Z"
            fill="url(#lg-gold)"
            stroke={GOLD_DARK}
            strokeWidth="0.4"
          />
          <circle cx="50" cy="6" r="1.2" fill={GOLD} />
        </g>
      ))}

      {/* Diagonal ornaments (smaller flourishes) */}
      {[45, 135, 225, 315].map((a) => (
        <g key={a} transform={`rotate(${a} 50 50)`}>
          <path
            d="M50 8 Q47 12 50 14 Q53 12 50 8 Z"
            fill={GOLD_DIM}
            stroke={GOLD_DARK}
            strokeWidth="0.3"
          />
        </g>
      ))}

      {/* Compass star (8-point) */}
      <g opacity="0.9">
        {[0, 90, 180, 270].map((a) => (
          <polygon
            key={a}
            transform={`rotate(${a} 50 50)`}
            points="50,18 53,50 50,82 47,50"
            fill="url(#lg-gold)"
            stroke={GOLD_DARK}
            strokeWidth="0.3"
          />
        ))}
        {[45, 135, 225, 315].map((a) => (
          <polygon
            key={a}
            transform={`rotate(${a} 50 50)`}
            points="50,28 52,50 50,72 48,50"
            fill={GOLD_DIM}
            opacity="0.85"
          />
        ))}
      </g>

      {/* Central eye */}
      <ellipse cx="50" cy="50" rx="14" ry="9" fill={IRON} stroke="url(#lg-gold)" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="6" fill="url(#lg-eye)" />
      <circle cx="50" cy="50" r="2.5" fill={IRON} />
      <circle cx="48.5" cy="48.5" r="0.9" fill="hsl(40 90% 80%)" />

      {/* Brow lash strokes */}
      <path d="M36 47 Q43 42 50 42 Q57 42 64 47" stroke={GOLD} strokeWidth="0.7" fill="none" opacity="0.6" />
      <path d="M36 53 Q43 58 50 58 Q57 58 64 53" stroke={GOLD} strokeWidth="0.7" fill="none" opacity="0.5" />
    </svg>
  )
}

// ── Stylized dragon-head sigil (for the sidebar center diamond) ─────────────
export function DragonSigil({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="ds-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GOLD} />
          <stop offset="100%" stopColor={GOLD_DIM} />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke="url(#ds-gold)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Coiled Skyrim-style dragon: body spiral + head + wings */}
        {/* Central body spiral */}
        <path d="M50 50 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0" />
        <path d="M50 42 C 62 42, 68 50, 64 60 C 60 70, 46 70, 40 62 C 34 54, 38 44, 46 42" />
        {/* Outer ring */}
        <circle cx="50" cy="50" r="30" opacity="0.5" />
        {/* Wings spread */}
        <path d="M30 36 C 22 28, 14 30, 12 38 C 18 38, 24 40, 30 44" />
        <path d="M70 36 C 78 28, 86 30, 88 38 C 82 38, 76 40, 70 44" />
        {/* Tail flick */}
        <path d="M50 80 C 48 86, 52 90, 56 88" />
        {/* Head with horn */}
        <path d="M44 24 C 46 18, 54 18, 56 24 L 58 30 L 50 34 L 42 30 Z" fill="url(#ds-gold)" />
        {/* Eye dot */}
        <circle cx="50" cy="26" r="1.2" fill={IRON} stroke="none" />
      </g>
    </svg>
  )
}

// ── Heraldic hanging banner (sidebar center ornament) ────────────────────────
export function HeraldBanner() {
  return (
    <svg
      width="110"
      height="155"
      viewBox="0 0 110 155"
      style={{ filter: 'drop-shadow(0 4px 12px hsl(0 0% 0% / 0.7))' }}
    >
      <defs>
        <linearGradient id="hb-fab" x1="0.12" y1="0" x2="0.88" y2="1">
          <stop offset="0%" stopColor="hsl(215 55% 22%)" />
          <stop offset="50%" stopColor="hsl(215 60% 16%)" />
          <stop offset="100%" stopColor="hsl(215 55% 11%)" />
        </linearGradient>
        <linearGradient id="hb-rod" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={GOLD_DIM} />
          <stop offset="40%" stopColor={GOLD} />
          <stop offset="100%" stopColor={GOLD_DIM} />
        </linearGradient>
      </defs>
      {/* Hanging ring */}
      <circle cx="55" cy="5" r="4" fill="none" stroke={GOLD_DIM} strokeWidth="1.5" />
      <line x1="55" y1="9" x2="55" y2="13" stroke={GOLD_DIM} strokeWidth="1.5" />
      {/* Horizontal rod */}
      <rect x="6" y="11" width="98" height="5" rx="2.5" fill="url(#hb-rod)" />
      <circle cx="6" cy="13.5" r="4.5" fill={GOLD_DIM} />
      <circle cx="104" cy="13.5" r="4.5" fill={GOLD_DIM} />
      {/* Banner fabric with forked/pointed bottom */}
      <path d="M14 16 L96 16 L96 118 L55 150 L14 118 Z" fill="url(#hb-fab)" />
      {/* Shading folds */}
      <path d="M14 16 L20 118 L55 150" fill="none" stroke="hsl(215 50% 30%)" strokeWidth="0.8" opacity="0.45" />
      <path d="M96 16 L90 118 L55 150" fill="none" stroke="hsl(215 25% 8%)" strokeWidth="0.8" opacity="0.45" />
      {/* Outer gold border */}
      <path d="M16 18 L94 18 L94 116 L55 147 L16 116 Z" fill="none" stroke={GOLD_DIM} strokeWidth="0.9" opacity="0.8" />
      {/* Inner gold border */}
      <path d="M22 24 L88 24 L88 113 L55 142 L22 113 Z" fill="none" stroke={GOLD_DIM} strokeWidth="0.5" opacity="0.4" />
      {/* Radiant sun sigil */}
      <g transform="translate(55 76)">
        {([0, 45, 90, 135, 180, 225, 270, 315] as number[]).map((a, i) => (
          <line
            key={i}
            x1="0" y1={i % 2 === 0 ? -26 : -20}
            x2="0" y2={i % 2 === 0 ? -17 : -14}
            stroke={GOLD}
            strokeWidth={i % 2 === 0 ? '1.3' : '0.85'}
            transform={`rotate(${a})`}
            opacity="0.9"
          />
        ))}
        <circle r="14" fill="none" stroke={GOLD_DIM} strokeWidth="0.7" opacity="0.65" />
        <circle r="7" fill="hsl(215 55% 20%)" stroke={GOLD} strokeWidth="0.9" />
        <circle r="3" fill={GOLD} opacity="0.85" />
      </g>
    </svg>
  )
}

// ── Knotwork top border (repeating pattern) ─────────────────────────────────
export function KnotBorder({ height = 18 }: { height?: number }) {
  return (
    <svg
      width="100%"
      height={height}
      preserveAspectRatio="none"
      viewBox="0 0 800 18"
      style={{ display: 'block' }}
    >
      <defs>
        <pattern id="knot" x="0" y="0" width="60" height="18" patternUnits="userSpaceOnUse">
          {/* Horizontal rails */}
          <line x1="0" y1="3" x2="60" y2="3" stroke={GOLD_DIM} strokeWidth="0.6" opacity="0.6" />
          <line x1="0" y1="15" x2="60" y2="15" stroke={GOLD_DIM} strokeWidth="0.6" opacity="0.6" />
          {/* Interlaced loops */}
          <path
            d="M0 9 C 10 0, 20 18, 30 9 C 40 0, 50 18, 60 9"
            stroke={GOLD}
            strokeWidth="0.9"
            fill="none"
            opacity="0.85"
          />
          <path
            d="M0 9 C 10 18, 20 0, 30 9 C 40 18, 50 0, 60 9"
            stroke={GOLD_DIM}
            strokeWidth="0.7"
            fill="none"
            opacity="0.7"
          />
          {/* Diamond accents */}
          <g fill={GOLD}>
            <rect x="14.5" y="7.5" width="3" height="3" transform="rotate(45 16 9)" opacity="0.9" />
            <rect x="44.5" y="7.5" width="3" height="3" transform="rotate(45 46 9)" opacity="0.9" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="18" fill={IRON} />
      <rect width="100%" height="18" fill="url(#knot)" />
    </svg>
  )
}

// ── Corner ornament for panels ──────────────────────────────────────────────
export function CornerOrnament({
  size = 18,
  corner,
}: {
  size?: number
  corner: 'tl' | 'tr' | 'bl' | 'br'
}) {
  const rotations = { tl: 0, tr: 90, br: 180, bl: 270 }
  const positions: Record<typeof corner, React.CSSProperties> = {
    tl: { top: -1, left: -1 },
    tr: { top: -1, right: -1 },
    br: { bottom: -1, right: -1 },
    bl: { bottom: -1, left: -1 },
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      className="pointer-events-none absolute"
      style={{ ...positions[corner], transform: `rotate(${rotations[corner]}deg)` }}
    >
      <g stroke={GOLD} strokeWidth="1" fill="none" opacity="0.85">
        <path d="M0 0 L8 0 M0 0 L0 8" />
        <path d="M3 3 L7 3 L7 7" opacity="0.6" />
        <circle cx="0" cy="0" r="1" fill={GOLD} />
      </g>
    </svg>
  )
}

// ── Hero scene: layered moonlit mountain city ───────────────────────────────
export function HeroScene() {
  return (
    <svg
      viewBox="0 0 600 300"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(220 35% 18%)" />
          <stop offset="55%" stopColor="hsl(220 28% 10%)" />
          <stop offset="100%" stopColor="hsl(220 28% 5%)" />
        </linearGradient>
        <radialGradient id="hs-moon" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(220 25% 80%)" stopOpacity="0.7" />
          <stop offset="60%" stopColor="hsl(220 25% 60%)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(220 25% 50%)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hs-fog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(220 20% 30%)" stopOpacity="0" />
          <stop offset="100%" stopColor="hsl(220 25% 14%)" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="hs-aurora" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(160 50% 40%)" stopOpacity="0" />
          <stop offset="50%" stopColor="hsl(160 60% 50%)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(280 50% 50%)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="600" height="300" fill="url(#hs-sky)" />

      {/* Aurora streak */}
      <path d="M0 80 Q 200 30, 400 70 T 600 60 L 600 110 Q 400 80, 200 100 T 0 120 Z" fill="url(#hs-aurora)" />

      {/* Moon */}
      <circle cx="430" cy="90" r="22" fill="hsl(220 25% 88%)" opacity="0.35" />
      <circle cx="430" cy="90" r="80" fill="url(#hs-moon)" />

      {/* Stars */}
      <g fill="hsl(220 25% 85%)">
        {[
          [60, 40, 0.9], [120, 20, 0.6], [180, 55, 0.7], [240, 25, 0.5],
          [300, 50, 0.8], [340, 30, 0.6], [490, 50, 0.9], [540, 30, 0.5],
          [580, 75, 0.7], [80, 75, 0.5], [220, 90, 0.4], [380, 25, 0.7],
          [560, 110, 0.5], [110, 110, 0.4],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x as number} cy={y as number} r={r as number} opacity={0.5 + (r as number) * 0.4} />
        ))}
      </g>

      {/* Far mountains */}
      <path
        d="M0 200 L80 130 L150 175 L230 110 L320 165 L400 120 L490 160 L560 130 L600 145 L600 300 L0 300 Z"
        fill="hsl(220 25% 14%)"
        opacity="0.9"
      />

      {/* Fog over far mountains */}
      <rect x="0" y="140" width="600" height="100" fill="url(#hs-fog)" opacity="0.5" />

      {/* Mid mountains */}
      <path
        d="M0 230 L70 185 L160 225 L260 170 L370 220 L470 180 L560 215 L600 200 L600 300 L0 300 Z"
        fill="hsl(220 22% 9%)"
      />

      {/* Castle complex on the central peak */}
      <g fill="hsl(20 15% 5%)" stroke="hsl(36 35% 22%)" strokeWidth="0.4">
        {/* Main keep */}
        <rect x="310" y="178" width="100" height="50" />
        {/* Crenellations */}
        <g>
          {[310, 318, 326, 334, 342, 350, 358, 366, 374, 382, 390, 398].map((x, i) => (
            <rect key={i} x={x} y="174" width="5" height="6" />
          ))}
        </g>
        {/* Towers */}
        <rect x="306" y="158" width="14" height="40" />
        <polygon points="306,158 313,144 320,158" fill="hsl(215 35% 22%)" />
        <rect x="396" y="148" width="18" height="50" />
        <polygon points="396,148 405,128 414,148" fill="hsl(215 35% 22%)" />
        <rect x="346" y="138" width="20" height="50" />
        <polygon points="346,138 356,116 366,138" fill="hsl(215 35% 22%)" />
        {/* Wall extension */}
        <rect x="278" y="200" width="40" height="20" />
        <rect x="402" y="195" width="48" height="25" />
        {/* Bridge to outer tower */}
        <rect x="450" y="200" width="40" height="6" />
        <rect x="486" y="185" width="12" height="35" />
        <polygon points="486,185 492,172 498,185" fill="hsl(215 35% 22%)" />
      </g>

      {/* Castle lantern windows */}
      <g fill="hsl(36 90% 65%)">
        {[
          [310, 192, 1.2], [314, 196, 0.9], [320, 192, 1.0],
          [352, 156, 1.4], [358, 160, 1.0], [352, 168, 0.9],
          [402, 168, 1.3], [408, 172, 1.0], [402, 180, 0.9],
          [402, 205, 1.0], [414, 207, 0.8], [428, 205, 1.0], [440, 207, 0.8],
          [284, 208, 1.0], [298, 210, 0.8],
          [488, 195, 1.1], [488, 205, 0.9],
          [340, 210, 0.9], [368, 210, 0.9], [388, 210, 0.9],
        ].map(([x, y, r], i) => (
          <g key={i}>
            <circle cx={x as number} cy={y as number} r={(r as number) * 2.5} fill="hsl(36 90% 60%)" opacity="0.18" />
            <circle cx={x as number} cy={y as number} r={r as number} opacity="0.95" />
          </g>
        ))}
      </g>

      {/* Foreground cliff */}
      <path
        d="M0 260 L70 240 L140 258 L230 232 L320 252 L410 235 L500 252 L600 240 L600 300 L0 300 Z"
        fill="hsl(20 18% 4%)"
      />

      {/* Trees on foreground */}
      <g fill="hsl(20 18% 3%)">
        {[40, 95, 165, 200, 280, 355, 430, 470, 540, 575].map((x, i) => (
          <polygon key={i} points={`${x},${260 + (i % 3)} ${x - 4},${275 + (i % 3)} ${x + 4},${275 + (i % 3)}`} />
        ))}
        {[60, 130, 210, 340, 460, 510].map((x, i) => (
          <polygon key={i} points={`${x},${268 + (i % 2)} ${x - 5},${285} ${x + 5},${285}`} />
        ))}
      </g>

      {/* Subtle left fade for blending with panel */}
      <rect x="0" y="0" width="120" height="300" fill="url(#hs-fade-l)" />
      <defs>
        <linearGradient id="hs-fade-l" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(28 22% 13%)" stopOpacity="1" />
          <stop offset="100%" stopColor="hsl(28 22% 13%)" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}
