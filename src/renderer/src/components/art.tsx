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
  const wins: [number, number, number][] = [
    [582,218,2.2],[596,218,1.9],[582,233,1.7],[596,233,2.0],[582,248,1.5],[596,248,1.6],
    [548,243,1.6],[556,243,1.3],[643,235,1.7],[651,235,1.5],[626,220,1.5],[634,220,1.2],
    [494,271,1.3],[522,268,1.3],[530,268,1.1],[673,279,1.3],[684,279,1.1],
    [544,268,1.1],[551,268,1.0],[628,265,1.1],[635,265,1.0],
    [496,276,1.0],[680,282,1.0],[615,252,1.2],[622,252,1.0],
  ]
  return (
    <svg
      viewBox="0 0 900 380"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        {/* Sky */}
        <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="hsl(228 50% 12%)" />
          <stop offset="25%"  stopColor="hsl(225 45% 9%)" />
          <stop offset="65%"  stopColor="hsl(222 38% 6%)" />
          <stop offset="100%" stopColor="hsl(220 30% 3%)" />
        </linearGradient>
        {/* Moon glow rings */}
        <radialGradient id="hs-moon-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="hsl(215 30% 90%)" stopOpacity="0.9" />
          <stop offset="12%"  stopColor="hsl(215 25% 80%)" stopOpacity="0.5" />
          <stop offset="35%"  stopColor="hsl(218 22% 65%)" stopOpacity="0.14" />
          <stop offset="60%"  stopColor="hsl(220 20% 55%)" stopOpacity="0.05" />
          <stop offset="100%" stopColor="hsl(220 20% 45%)" stopOpacity="0" />
        </radialGradient>
        {/* Moonbeam shaft */}
        <linearGradient id="hs-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="hsl(215 40% 70%)" stopOpacity="0.07" />
          <stop offset="100%" stopColor="hsl(215 40% 70%)" stopOpacity="0" />
        </linearGradient>
        {/* Fog between mountain layers */}
        <linearGradient id="hs-fog1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="hsl(222 28% 18%)" stopOpacity="0" />
          <stop offset="60%"  stopColor="hsl(222 24% 13%)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="hsl(220 22% 9%)"  stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="hs-fog2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="hsl(220 22% 14%)" stopOpacity="0" />
          <stop offset="100%" stopColor="hsl(220 20% 7%)"  stopOpacity="0.75" />
        </linearGradient>
        {/* Aurora bands */}
        <linearGradient id="hs-aur1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="hsl(162 55% 42%)" stopOpacity="0" />
          <stop offset="35%"  stopColor="hsl(165 60% 48%)" stopOpacity="0.11" />
          <stop offset="70%"  stopColor="hsl(195 50% 46%)" stopOpacity="0.09" />
          <stop offset="100%" stopColor="hsl(275 50% 48%)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hs-aur2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="hsl(162 55% 42%)" stopOpacity="0" />
          <stop offset="45%"  stopColor="hsl(175 60% 50%)" stopOpacity="0.07" />
          <stop offset="100%" stopColor="hsl(290 45% 46%)" stopOpacity="0" />
        </linearGradient>
        {/* Window warm glow */}
        <radialGradient id="hs-win-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="hsl(40 95% 72%)" stopOpacity="0.9" />
          <stop offset="50%"  stopColor="hsl(38 88% 62%)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="hsl(36 80% 52%)" stopOpacity="0" />
        </radialGradient>
        {/* Blur filters */}
        <filter id="hs-b3"  x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"  /></filter>
        <filter id="hs-b6"  x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6"  /></filter>
        <filter id="hs-b12" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="12" /></filter>
        {/* Left-edge text fade */}
        <linearGradient id="hs-fade-l" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="hsl(24 18% 7%)" stopOpacity="1" />
          <stop offset="100%" stopColor="hsl(24 18% 7%)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── Sky ── */}
      <rect width="900" height="380" fill="url(#hs-sky)" />

      {/* Aurora */}
      <path d="M0 85 Q220 42,480 72 T900 58 L900 125 Q620 105,380 118 T0 140 Z" fill="url(#hs-aur1)" />
      <path d="M0 128 Q300 88,620 112 T900 98 L900 160 Q650 148,400 155 T0 165 Z" fill="url(#hs-aur2)" />

      {/* Moon – outer deep glow */}
      <circle cx="660" cy="72" r="160" fill="url(#hs-moon-halo)" filter="url(#hs-b12)" opacity="0.8" />
      {/* Moon – mid halo ring */}
      <circle cx="660" cy="72" r="52" fill="none" stroke="hsl(215 25% 72%)" strokeWidth="0.6" opacity="0.18" />
      <circle cx="660" cy="72" r="42" fill="none" stroke="hsl(215 25% 78%)" strokeWidth="0.4" opacity="0.12" />
      {/* Moon – disc */}
      <circle cx="660" cy="72" r="26" fill="hsl(220 28% 88%)" opacity="0.28" />
      <circle cx="660" cy="72" r="20" fill="hsl(218 25% 92%)" opacity="0.35" />
      {/* Moon – subtle crater suggestion */}
      <circle cx="653" cy="68" r="4" fill="none" stroke="hsl(218 15% 75%)" strokeWidth="0.5" opacity="0.12" />
      <circle cx="665" cy="78" r="3" fill="none" stroke="hsl(218 15% 75%)" strokeWidth="0.4" opacity="0.10" />

      {/* Moonbeam shaft */}
      <rect x="625" y="72" width="70" height="308" fill="url(#hs-beam)" opacity="0.5" />

      {/* Stars – faint field */}
      <g fill="hsl(218 30% 82%)" opacity="0.55">
        {([
          [38,18,0.6],[80,34,0.5],[118,15,0.7],[160,40,0.45],[202,22,0.65],
          [248,36,0.5],[288,14,0.8],[332,26,0.55],[372,42,0.45],[418,18,0.7],
          [462,46,0.5],[498,24,0.6],[534,38,0.45],[572,16,0.65],[608,44,0.5],
          [728,36,0.55],[768,14,0.7],[808,42,0.5],[848,20,0.65],[888,38,0.5],
          [55,58,0.4],[105,50,0.5],[192,66,0.4],[282,52,0.55],[378,60,0.4],
          [472,68,0.5],[552,52,0.4],[612,66,0.5],[692,56,0.55],[778,62,0.4],
          [850,50,0.5],[22,82,0.4],[145,86,0.45],[242,74,0.4],[448,88,0.35],
          [718,80,0.4],[840,76,0.45],
        ] as [number,number,number][]).map(([x,y,r],i) => (
          <circle key={i} cx={x} cy={y} r={r} opacity={0.4 + r * 0.55} />
        ))}
      </g>
      {/* Stars – bright sparkle crosses */}
      <g stroke="hsl(220 25% 90%)" strokeWidth="0.35" opacity="0.75">
        {([[96,28],[274,20],[508,32],[740,26],[820,52],[148,13],[362,46],[178,24]] as [number,number][]).map(([x,y],i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <line x1="0" y1="-2.2" x2="0" y2="2.2" /><line x1="-2.2" y1="0" x2="2.2" y2="0" />
            <circle r="0.65" fill="hsl(220 25% 95%)" stroke="none" />
          </g>
        ))}
      </g>

      {/* ── Mountains – 4 layers ── */}
      {/* Layer 1: farthest, palest */}
      <path
        d="M0 268 L65 218 L125 248 L200 195 L282 238 L368 188 L450 222 L534 180 L615 212 L698 190 L762 218 L832 196 L900 210 L900 380 L0 380 Z"
        fill="hsl(226 28% 17%)" opacity="0.65"
      />
      {/* Snow caps on L1 peaks */}
      <g fill="hsl(220 18% 44%)" opacity="0.32">
        <polygon points="200,195 216,188 232,195 222,195" />
        <polygon points="368,188 390,180 412,188 399,188" />
        <polygon points="534,180 558,170 582,180 568,180" />
        <polygon points="698,190 718,182 738,190 726,190" />
      </g>

      {/* Fog over L1 */}
      <ellipse cx="450" cy="232" rx="450" ry="55" fill="hsl(222 22% 12%)" opacity="0.45" />

      {/* Layer 2 */}
      <path
        d="M0 290 L85 255 L172 278 L268 245 L362 272 L458 240 L548 264 L638 244 L728 268 L818 250 L900 262 L900 380 L0 380 Z"
        fill="hsl(223 23% 11%)" opacity="0.92"
      />
      {/* Snow L2 */}
      <g fill="hsl(220 16% 36%)" opacity="0.22">
        <polygon points="268,245 286,238 304,245 293,245" />
        <polygon points="458,240 480,232 502,240 489,240" />
        <polygon points="638,244 658,236 678,244 665,244" />
      </g>

      {/* Fog strip between L2 and L3 */}
      <path
        d="M0 285 Q225 272,450 282 Q675 292,900 280 L900 308 Q675 320,450 310 Q225 300,0 314 Z"
        fill="hsl(222 20% 10%)" opacity="0.48"
      />

      {/* Layer 3: near */}
      <path
        d="M0 318 L98 292 L196 312 L316 284 L435 308 L536 287 L634 304 L758 292 L860 306 L900 298 L900 380 L0 380 Z"
        fill="hsl(220 20% 7%)"
      />

      {/* ── Castle complex (right-centre, sitting on peak of L2) ── */}
      <g fill="hsl(220 16% 5%)" stroke="hsl(36 28% 16%)" strokeWidth="0.35">

        {/* Rocky cliff base */}
        <path d="M488 335 L496 298 L520 286 L558 278 L600 282 L640 278 L678 285 L706 295 L718 335 Z"
          fill="hsl(218 16% 5%)" stroke="none" />

        {/* Outer curtain wall */}
        <rect x="504" y="278" width="26" height="42" />
        <rect x="672" y="271" width="26" height="48" />
        {[504,510,516,522].map((x,i) => <rect key={i} x={x} y="274" width="4" height="5" />)}
        {[672,678,684,690].map((x,i) => <rect key={i} x={x} y="267" width="4" height="5" />)}
        {/* Wall walk */}
        <rect x="530" y="288" width="142" height="20" />
        {[530,537,544,551,558,565,572,579,586,593,600,607,614,621,628,635,642,649,656,663].map((x,i) => (
          <rect key={i} x={x} y="284" width="4" height="5" />
        ))}
        {/* Gate arch */}
        <path d="M592 308 L592 288 Q600 280 608 288 L608 308 Z" fill="hsl(218 16% 3%)" />

        {/* Inner ward wall */}
        <rect x="542" y="258" width="118" height="32" />
        {[542,549,556,563,570,577,584,591,598,605,612,619,626,633,640,647,654].map((x,i) => (
          <rect key={i} x={x} y="254" width="4" height="5" />
        ))}

        {/* Left gate tower */}
        <rect x="537" y="232" width="22" height="62" />
        <polygon points="537,232 548,214 559,232" fill="hsl(215 32% 20%)" />
        {[537,543,549,555].map((x,i) => <rect key={i} x={x} y="228" width="4" height="5" />)}

        {/* Right gate tower */}
        <rect x="642" y="224" width="24" height="70" />
        <polygon points="642,224 654,204 666,224" fill="hsl(215 32% 20%)" />
        {[642,649,656,663].map((x,i) => <rect key={i} x={x} y="220" width="4" height="5" />)}

        {/* Great central tower */}
        <rect x="577" y="192" width="48" height="78" />
        {[577,584,591,598,605,617].map((x,i) => <rect key={i} x={x} y="188" width="4" height="5" />)}
        {/* Great tower spire */}
        <polygon points="577,192 601,152 625,192" fill="hsl(215 28% 17%)" />
        {/* Spire finial */}
        <line x1="601" y1="152" x2="601" y2="136" stroke="hsl(36 45% 28%)" strokeWidth="0.9" />
        <line x1="595" y1="142" x2="607" y2="142" stroke="hsl(36 45% 28%)" strokeWidth="0.9" />

        {/* Side annex / chapel */}
        <rect x="518" y="260" width="26" height="30" />
        <polygon points="518,260 531,246 544,260" fill="hsl(215 28% 17%)" />

        {/* Back tower */}
        <rect x="618" y="207" width="20" height="58" />
        <polygon points="618,207 628,186 638,207" fill="hsl(215 32% 20%)" />

        {/* Tiny outer watch-post tower */}
        <rect x="490" y="262" width="14" height="30" />
        <polygon points="490,262 497,250 504,262" fill="hsl(215 28% 17%)" />

        {/* Bridge from ward to outer */}
        <rect x="504" y="283" width="36" height="7" />
        <rect x="666" y="278" width="10" height="7" />

        {/* Buttresses on great tower */}
        <polygon points="577,252 568,268 577,268" />
        <polygon points="625,252 634,268 625,268" />
      </g>

      {/* ── Castle warm-window lighting ── */}
      {wins.map(([x,y,r],i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r * 7}  fill="hsl(38 92% 62%)" opacity="0.08" filter="url(#hs-b3)" />
          <circle cx={x} cy={y} r={r * 2.8} fill="hsl(40 90% 65%)" opacity="0.22" />
          <circle cx={x} cy={y} r={r}        fill="hsl(46 96% 78%)" opacity="0.9" />
        </g>
      ))}
      {/* Gate spill */}
      <ellipse cx="600" cy="310" rx="14" ry="5" fill="hsl(40 90% 62%)" opacity="0.1" filter="url(#hs-b6)" />

      {/* ── Ground mist pool at castle base ── */}
      <ellipse cx="603" cy="338" rx="90" ry="9" fill="hsl(215 36% 16%)" opacity="0.38" />
      <ellipse cx="603" cy="338" rx="45" ry="4" fill="hsl(215 38% 26%)" opacity="0.14" />

      {/* Lower fog band */}
      <path
        d="M0 316 Q190 303,380 313 Q570 323,760 308 Q850 302,900 310 L900 340 Q820 332,660 338 Q450 347,240 334 Q120 328,0 340 Z"
        fill="hsl(220 20% 9%)" opacity="0.58"
      />

      {/* ── Foreground cliff ── */}
      <path
        d="M0 352 L58 336 L135 350 L218 332 L318 346 L418 330 L520 346 L622 331 L720 347 L820 333 L900 342 L900 380 L0 380 Z"
        fill="hsl(220 14% 4%)"
      />

      {/* ── Dense tree silhouettes ── */}
      <g fill="hsl(220 12% 3%)">
        {([28,60,92,132,162,192,222,252,778,808,838,868,895] as number[]).map((x,i) => (
          <polygon key={i} points={`${x},${342+(i%3)*3} ${x-8},${368} ${x+8},${368}`} />
        ))}
        {([44,76,110,148,178,208,238,762,795,825,856,882] as number[]).map((x,i) => (
          <polygon key={i} points={`${x},${348+(i%2)*3} ${x-5},${365} ${x+5},${365}`} />
        ))}
        {([55,88,120,138,165,195,225,775,812,844] as number[]).map((x,i) => (
          <polygon key={i} points={`${x},${354+(i%2)*2} ${x-4},${368} ${x+4},${368}`} />
        ))}
      </g>

      {/* ── Left-edge text fade ── */}
      <rect x="0" y="0" width="220" height="380" fill="url(#hs-fade-l)" />
    </svg>
  )
}
