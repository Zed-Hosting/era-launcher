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

// ── Hero scene: detailed moonlit castle landscape ────────────────────────────
export function HeroScene() {
  // Windows: [cx, cy, brightness-radius]
  const wins: [number,number,number][] = [
    // Great keep – 4 columns
    [588,208,2.4],[602,208,2.2],[588,223,2.2],[602,223,2.1],[588,238,2.0],[602,238,2.0],
    [588,252,1.8],[602,252,1.8],[588,266,1.6],[602,266,1.6],
    // Left inner tower
    [549,246,1.9],[557,246,1.7],[549,262,1.7],[557,262,1.5],
    // Right inner tower
    [652,238,1.9],[661,238,1.7],[652,254,1.7],[661,254,1.5],
    // Back tower
    [635,220,1.6],[635,236,1.4],[635,252,1.4],
    // Curtain wall level
    [536,294,1.3],[545,294,1.2],[622,290,1.3],[631,290,1.2],
    // Outer towers
    [511,294,1.4],[690,284,1.4],
    // Chapel
    [534,268,1.4],
    // Watch tower
    [498,270,1.2],
  ]
  return (
    <svg
      viewBox="0 0 900 380"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        {/* Deep night sky */}
        <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="hsl(230 62% 9%)" />
          <stop offset="28%"  stopColor="hsl(226 55% 7%)" />
          <stop offset="65%"  stopColor="hsl(222 46% 5%)" />
          <stop offset="100%" stopColor="hsl(218 38% 3%)" />
        </linearGradient>
        {/* Moon outer corona */}
        <radialGradient id="hs-moon-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="hsl(215 30% 96%)" stopOpacity="1"    />
          <stop offset="10%"  stopColor="hsl(216 28% 86%)" stopOpacity="0.88" />
          <stop offset="28%"  stopColor="hsl(218 26% 72%)" stopOpacity="0.45" />
          <stop offset="55%"  stopColor="hsl(220 22% 58%)" stopOpacity="0.14" />
          <stop offset="100%" stopColor="hsl(220 20% 48%)" stopOpacity="0"    />
        </radialGradient>
        {/* Moonbeam */}
        <linearGradient id="hs-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="hsl(215 45% 78%)" stopOpacity="0.18" />
          <stop offset="60%"  stopColor="hsl(215 40% 72%)" stopOpacity="0.06" />
          <stop offset="100%" stopColor="hsl(215 40% 72%)" stopOpacity="0"    />
        </linearGradient>
        {/* Aurora 1 – green/teal */}
        <linearGradient id="hs-aur1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="hsl(162 70% 44%)" stopOpacity="0"    />
          <stop offset="25%"  stopColor="hsl(162 72% 50%)" stopOpacity="0.32" />
          <stop offset="55%"  stopColor="hsl(185 65% 50%)" stopOpacity="0.28" />
          <stop offset="80%"  stopColor="hsl(272 58% 52%)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(272 58% 52%)" stopOpacity="0"    />
        </linearGradient>
        {/* Aurora 2 – teal/purple softer */}
        <linearGradient id="hs-aur2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="hsl(155 65% 42%)" stopOpacity="0"    />
          <stop offset="35%"  stopColor="hsl(168 68% 48%)" stopOpacity="0.22" />
          <stop offset="70%"  stopColor="hsl(285 55% 50%)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(285 55% 50%)" stopOpacity="0"    />
        </linearGradient>
        {/* Moonlit snow cap highlight */}
        <linearGradient id="hs-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="hsl(216 38% 70%)" />
          <stop offset="100%" stopColor="hsl(220 28% 44%)" />
        </linearGradient>
        {/* Blur filters */}
        <filter id="hs-b2"  x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2"  /></filter>
        <filter id="hs-b5"  x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"  /></filter>
        <filter id="hs-b10" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="10" /></filter>
        <filter id="hs-b18" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="18" /></filter>
        {/* Left-edge text fade */}
        <linearGradient id="hs-fade-l" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="hsl(24 18% 6%)" stopOpacity="1"   />
          <stop offset="48%"  stopColor="hsl(24 18% 6%)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="hsl(24 18% 6%)" stopOpacity="0"   />
        </linearGradient>
      </defs>

      {/* ── Sky ── */}
      <rect width="900" height="380" fill="url(#hs-sky)" />

      {/* ── Aurora bands ── */}
      <path d="M-20 55 Q200 18,500 50 T920 38 L920 108 Q640 88,360 102 T-20 125 Z"
        fill="url(#hs-aur1)" opacity="0.9" />
      <path d="M-20 112 Q270 74,600 100 T920 88 L920 154 Q650 142,370 150 T-20 168 Z"
        fill="url(#hs-aur2)" opacity="0.9" />

      {/* ── Moon ── */}
      {/* Deepest outer glow */}
      <circle cx="718" cy="62" r="140" fill="hsl(218 35% 62%)" opacity="0.12" filter="url(#hs-b18)" />
      {/* Mid corona */}
      <circle cx="718" cy="62" r="80"  fill="hsl(216 32% 76%)" opacity="0.22" filter="url(#hs-b10)" />
      {/* Inner halo */}
      <circle cx="718" cy="62" r="46"  fill="hsl(215 28% 86%)" opacity="0.42" filter="url(#hs-b5)"  />
      {/* Visible disc */}
      <circle cx="718" cy="62" r="28"  fill="hsl(214 22% 88%)" opacity="0.95" />
      <circle cx="718" cy="62" r="22"  fill="hsl(212 18% 94%)" opacity="1.00" />
      {/* Disc surface detail */}
      <circle cx="710" cy="57" r="5.5" fill="hsl(218 16% 78%)" opacity="0.22" />
      <circle cx="724" cy="70" r="4"   fill="hsl(218 16% 78%)" opacity="0.18" />
      <circle cx="720" cy="53" r="3"   fill="hsl(218 16% 78%)" opacity="0.14" />
      {/* Halo rings */}
      <circle cx="718" cy="62" r="33"  fill="none" stroke="hsl(215 32% 82%)" strokeWidth="0.8" opacity="0.35" />
      <circle cx="718" cy="62" r="50"  fill="none" stroke="hsl(215 28% 72%)" strokeWidth="0.5" opacity="0.18" />

      {/* Moonbeam shaft */}
      <rect x="684" y="62" width="68" height="318" fill="url(#hs-beam)" opacity="0.9" />

      {/* ── Stars ── */}
      {/* Field stars */}
      <g fill="hsl(215 28% 88%)">
        {([
          [28,11,0.8,0.88],[70,27,0.65,0.78],[106,9,0.9,0.92],[150,34,0.6,0.72],[192,15,0.8,0.86],
          [236,29,0.65,0.76],[276,8,0.95,0.95],[322,21,0.72,0.82],[365,37,0.6,0.70],[410,13,0.85,0.88],
          [453,39,0.65,0.74],[490,18,0.75,0.82],[526,33,0.6,0.70],[564,11,0.80,0.86],[604,38,0.65,0.74],
          [808,26,0.72,0.80],[846,9,0.85,0.88],[855,38,0.62,0.72],[886,20,0.75,0.82],
          [42,52,0.55,0.66],[96,43,0.65,0.74],[186,56,0.55,0.64],[268,44,0.70,0.78],
          [370,50,0.55,0.63],[466,60,0.65,0.73],[544,46,0.55,0.63],[608,58,0.62,0.70],
          [820,70,0.55,0.63],[14,72,0.55,0.63],[136,78,0.62,0.70],[234,66,0.55,0.62],
          [438,80,0.50,0.58],[556,72,0.50,0.58],[826,66,0.50,0.58],
        ] as [number,number,number,number][]).map(([x,y,r,op],i) => (
          <circle key={i} cx={x} cy={y} r={r} opacity={op} />
        ))}
      </g>
      {/* Sparkle cross-stars */}
      <g fill="hsl(218 28% 96%)" stroke="hsl(218 28% 92%)">
        {([[88,21,2.8],[264,14,2.5],[500,27,2.8],[834,44,2.5],[144,7,2.5],[356,38,2.3],[170,22,2.4]] as [number,number,number][]).map(([x,y,s],i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <line x1="0" y1={-s} x2="0" y2={s} strokeWidth="0.45" />
            <line x1={-s} y1="0" x2={s} y2="0" strokeWidth="0.45" />
            <circle r="0.9" stroke="none" opacity="0.96" />
          </g>
        ))}
      </g>

      {/* ── Mountains – 4 layers ── */}

      {/* L1: farthest – pale steel-blue */}
      <path
        d="M0 265 L62 210 L122 244 L196 185 L278 230 L365 178 L448 216 L532 172 L615 206 L700 182 L764 212 L836 188 L900 204 L900 380 L0 380 Z"
        fill="hsl(226 42% 19%)" opacity="0.7"
      />
      {/* Snow caps L1 */}
      <g fill="url(#hs-snow)" opacity="0.65">
        <polygon points="196,185 207,177 222,185 213,183" />
        <polygon points="365,178 388,168 411,178 396,175" />
        <polygon points="532,172 558,160 584,172 567,169" />
        <polygon points="700,182 722,172 744,182 729,178" />
      </g>
      {/* Snow highlight edge */}
      <g fill="hsl(216 30% 76%)" opacity="0.28">
        <polygon points="196,185 202,181 207,177 214,181 222,185" />
        <polygon points="365,178 376,172 388,168 400,172 411,178" />
        <polygon points="532,172 544,166 558,160 572,166 584,172" />
        <polygon points="700,182 710,176 722,172 732,176 744,182" />
      </g>

      {/* Fog pool between L1 and L2 */}
      <ellipse cx="450" cy="234" rx="460" ry="62" fill="hsl(222 28% 10%)" opacity="0.55" />

      {/* L2: mid-distance */}
      <path
        d="M0 288 L80 248 L165 270 L260 237 L355 264 L450 232 L544 256 L636 236 L726 260 L818 242 L900 254 L900 380 L0 380 Z"
        fill="hsl(223 28% 8%)"
      />
      {/* Snow L2 */}
      <g fill="hsl(220 22% 46%)" opacity="0.45">
        <polygon points="260,237 280,228 300,237 288,233" />
        <polygon points="450,232 473,222 496,232 482,228" />
        <polygon points="636,236 658,226 680,236 666,232" />
      </g>

      {/* Fog strip L2→L3 */}
      <path
        d="M0 282 Q225 268,450 278 Q680 288,900 276 L900 312 Q680 326,450 314 Q225 302,0 318 Z"
        fill="hsl(222 22% 7%)" opacity="0.6"
      />

      {/* L3: near ridgeline */}
      <path
        d="M0 314 L92 286 L188 308 L308 278 L428 302 L532 279 L630 296 L754 284 L856 298 L900 290 L900 380 L0 380 Z"
        fill="hsl(220 22% 5%)"
      />

      {/* ── Castle complex ── */}

      {/* Rocky hill base under castle */}
      <path
        d="M502 342 L512 300 L532 282 L568 268 L610 264 L652 268 L688 278 L710 294 L722 342 Z"
        fill="hsl(220 20% 4%)"
      />

      <g fill="hsl(220 18% 4%)" stroke="hsl(36 28% 13%)" strokeWidth="0.4">

        {/* ── Outer left flanking tower ── */}
        <rect x="503" y="275" width="24" height="50" />
        <polygon points="503,275 515,252 527,275" fill="hsl(215 34% 16%)" />
        {[503,510,517,524].map((x,i) => <rect key={`olt${i}`} x={x} y="271" width="4.5" height="5" />)}

        {/* ── Outer right flanking tower ── */}
        <rect x="678" y="268" width="26" height="56" />
        <polygon points="678,268 691,244 704,268" fill="hsl(215 34% 16%)" />
        {[678,686,694,702].map((x,i) => <rect key={`ort${i}`} x={x} y="264" width="4.5" height="5" />)}

        {/* ── Main curtain wall ── */}
        <rect x="527" y="284" width="151" height="24" />
        {[527,534,541,548,555,562,569,576,583,590,597,604,611,618,625,632,639,646,653,660,667].map((x,i) => (
          <rect key={`cw${i}`} x={x} y="280" width="4" height="5" />
        ))}
        {/* Gate arch */}
        <path d="M595 308 L595 288 Q604 279 613 288 L613 308 Z" fill="hsl(220 16% 2%)" />

        {/* ── Inner ward wall ── */}
        <rect x="548" y="254" width="112" height="32" />
        {[548,556,564,572,580,588,596,604,612,620,628,636,644,652].map((x,i) => (
          <rect key={`iw${i}`} x={x} y="250" width="4" height="5" />
        ))}

        {/* ── Left inner tower ── */}
        <rect x="538" y="220" width="26" height="72" />
        <polygon points="538,220 551,196 564,220" fill="hsl(215 36% 15%)" />
        {[538,546,554,562].map((x,i) => <rect key={`lit${i}`} x={x} y="216" width="4.5" height="5" />)}

        {/* ── Right inner tower ── */}
        <rect x="644" y="212" width="28" height="80" />
        <polygon points="644,212 658,186 672,212" fill="hsl(215 36% 15%)" />
        {[644,653,662,671].map((x,i) => <rect key={`rit${i}`} x={x} y="208" width="4.5" height="5" />)}

        {/* ── Great Central Keep ── */}
        <rect x="577" y="180" width="54" height="92" />
        {[577,586,595,604,613,622].map((x,i) => <rect key={`gk${i}`} x={x} y="176" width="4.5" height="5" />)}
        {/* Keep tall spire */}
        <polygon points="577,180 604,130 631,180" fill="hsl(215 32% 14%)" />
        {/* Spire finial cross */}
        <line x1="604" y1="130" x2="604" y2="110" stroke="hsl(36 55% 34%)" strokeWidth="1.2" />
        <line x1="596" y1="120" x2="612" y2="120" stroke="hsl(36 55% 34%)" strokeWidth="1.1" />
        {/* Keep buttresses */}
        <polygon points="577,248 566,268 577,268" stroke="none" />
        <polygon points="631,248 642,268 631,268" stroke="none" />

        {/* ── Side chapel / annex ── */}
        <rect x="524" y="248" width="24" height="38" />
        <polygon points="524,248 536,232 548,248" fill="hsl(215 32% 15%)" />

        {/* ── Back keep tower ── */}
        <rect x="634" y="196" width="20" height="72" />
        <polygon points="634,196 644,172 654,196" fill="hsl(215 34% 16%)" />

        {/* ── North watch-post ── */}
        <rect x="490" y="255" width="16" height="38" />
        <polygon points="490,255 498,240 506,255" fill="hsl(215 30% 15%)" />

        {/* ── Connecting bridges ── */}
        <rect x="527" y="278" width="34" height="8" />
        <rect x="678" y="273" width="8" height="8" />

        {/* ── Wall walk arch cutouts ── */}
        <rect x="556" y="270" width="6" height="12" fill="hsl(220 16% 2%)" stroke="none" />
        <rect x="574" y="268" width="6" height="14" fill="hsl(220 16% 2%)" stroke="none" />

      </g>

      {/* ── Castle window bloom lighting ── */}
      {wins.map(([x,y,r],i) => (
        <g key={i}>
          {/* Wide bloom */}
          <circle cx={x} cy={y} r={r * 9}  fill="hsl(38 90% 60%)" opacity="0.09" filter="url(#hs-b5)" />
          {/* Mid glow */}
          <circle cx={x} cy={y} r={r * 3.8} fill="hsl(40 92% 66%)" opacity="0.30" />
          {/* Bright core */}
          <circle cx={x} cy={y} r={r}       fill="hsl(46 98% 82%)" opacity="0.98" />
        </g>
      ))}
      {/* Gate archway warm spill */}
      <ellipse cx="604" cy="310" rx="18" ry="6" fill="hsl(40 90% 62%)" opacity="0.18" filter="url(#hs-b5)" />

      {/* ── Ground mist at castle base ── */}
      <ellipse cx="612" cy="342" rx="105" ry="12" fill="hsl(215 40% 16%)" opacity="0.50" />
      <ellipse cx="612" cy="342" rx="52"  ry="5"  fill="hsl(215 42% 26%)" opacity="0.18" />

      {/* ── Lower valley fog band ── */}
      <path
        d="M0 312 Q185 296,370 308 Q560 320,755 304 Q848 296,900 306 L900 348 Q820 338,655 344 Q445 354,240 338 Q118 330,0 346 Z"
        fill="hsl(220 22% 6%)" opacity="0.68"
      />

      {/* ── Foreground cliff edge ── */}
      <path
        d="M0 350 L52 330 L124 346 L210 324 L312 342 L412 324 L516 342 L618 326 L716 344 L816 328 L900 338 L900 380 L0 380 Z"
        fill="hsl(220 16% 3%)"
      />

      {/* ── Trees: 3 depth layers across the full base ── */}
      {/* Layer 1 – tallest silhouettes */}
      <g fill="hsl(220 14% 3%)">
        {([20,48,76,108,140,170,200,228,258,288,316,614,642,672,704,734,762,790,820,848,876] as number[]).map((x,i) => {
          const h = 34 + (i % 5) * 5
          return <polygon key={`t1_${i}`} points={`${x},${364-h} ${x-12},${376} ${x+12},${376}`} />
        })}
      </g>
      {/* Layer 2 – mid trees */}
      <g fill="hsl(220 12% 2%)">
        {([34,62,94,124,156,186,216,244,274,302,628,658,688,718,748,776,804,834,862,890] as number[]).map((x,i) => {
          const h = 24 + (i % 4) * 4
          return <polygon key={`t2_${i}`} points={`${x},${368-h} ${x-8},${376} ${x+8},${376}`} />
        })}
      </g>
      {/* Layer 3 – dense undergrowth */}
      <g fill="hsl(220 10% 2%)">
        {([44,72,104,136,166,196,226,256,286,636,666,698,728,758,786,816,846] as number[]).map((x,i) => {
          const h = 16 + (i % 3) * 3
          return <polygon key={`t3_${i}`} points={`${x},${372-h} ${x-6},${379} ${x+6},${379}`} />
        })}
      </g>

      {/* ── Left-edge text fade ── */}
      <rect x="0" y="0" width="260" height="380" fill="url(#hs-fade-l)" />
    </svg>
  )
}
