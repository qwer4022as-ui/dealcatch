/**
 * 대시보드 히어로 캐릭터 (장식용 SVG).
 * 후드티 위에 옷걸이 비니를 쓴 '로우핏' 마스코트가 노트북 너머로 가격을 확인하는 장면.
 */
export function Mascot({ className = "" }: { className?: string }) {
  const accent = "#b9a4ff";
  const ink = "#15131d";
  const skin = "#fbeef2";
  const hair = "#3a2f55";
  const hairShade = "#2a2240";
  const hoodie = "#cbbcff";
  const hoodieShade = "#a996f2";
  const beanie = "#1f1c2b";
  const cuff = "#2b273b";

  return (
    <svg viewBox="0 0 440 260" className={className} role="img" aria-label="옷걸이 비니를 쓰고 노트북으로 옷 가격을 확인하는 캐릭터">
      <defs>
        <radialGradient id="m-glow" cx="0.5" cy="0.55" r="0.5">
          <stop offset="0" stopColor={accent} stopOpacity="0.32" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="m-iris" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2d2250" />
          <stop offset="1" stopColor="#8f74ec" />
        </linearGradient>
        <linearGradient id="m-laptop" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2c283c" />
          <stop offset="1" stopColor="#1a1824" />
        </linearGradient>
        <linearGradient id="m-coat" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3b3652" />
          <stop offset="1" stopColor="#24212f" />
        </linearGradient>
        <clipPath id="m-face">
          <ellipse cx="230" cy="152" rx="52" ry="48" />
        </clipPath>
      </defs>

      <ellipse cx="230" cy="170" rx="170" ry="100" fill="url(#m-glow)" />

      {/* 옷걸이 랙 */}
      <g>
        <path d="M352 66h80M358 66v188M426 66v188M346 254h22M416 254h22" stroke="#5a5570" strokeWidth="4" strokeLinecap="round" />
        {[
          [376, 0],
          [408, 10],
        ].map(([x, dy]) => (
          <g key={x}>
            <path d={`M${x - 3} 66q0-6 3-6t3 6v6`} stroke="#8a86a0" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path
              d={`M${x} 74 L${x - 18} 84 L${x - 20} ${162 + dy} L${x + 20} ${162 + dy} L${x + 18} 84 Z`}
              fill="url(#m-coat)"
              stroke="#57526e"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d={`M${x - 6} 78 L${x} 90 L${x + 6} 78`} stroke="#57526e" strokeWidth="1.5" fill="none" />
            <path d={`M${x} 90v${68 + dy}`} stroke="#57526e" strokeWidth="1.2" />
          </g>
        ))}
      </g>

      {/* 그래프 말풍선 */}
      <g className="animate-float">
        <rect x="24" y="34" width="112" height="70" rx="16" fill="#1a1824" stroke="#5a5570" strokeWidth="2" />
        <path d="M118 102 l18 14 -4-18" fill="#1a1824" stroke="#5a5570" strokeWidth="2" strokeLinejoin="round" />
        <rect x="116" y="96" width="14" height="6" fill="#1a1824" />
        <path d="M38 88h86" stroke="#3a3650" strokeWidth="1.5" />
        <polyline points="40,58 56,70 70,62 86,80 102,72 120,84" fill="none" stroke="#5a5570" strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" />
        <polyline points="40,78 56,66 70,72 86,54 102,62 120,46" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="120" cy="46" r="4" fill={accent} />
      </g>

      {/* ₩ 코인 */}
      <g transform="translate(78 176)">
        <circle r="21" fill={accent} />
        <circle r="16" fill="none" stroke={ink} strokeOpacity="0.2" strokeWidth="2" />
        <text y="7" textAnchor="middle" fontSize="19" fontWeight="800" fill={ink} fontFamily="system-ui, sans-serif">₩</text>
      </g>

      {/* 반짝이 */}
      {[
        [178, 34, 7],
        [320, 52, 6],
        [140, 140, 4],
        [330, 160, 4],
      ].map(([x, y, r]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`}
          fill="#e4defa"
          opacity="0.75"
        />
      ))}

      {/* ── 캐릭터 ── */}
      {/* 후드 (머리 뒤) */}
      <ellipse cx="230" cy="158" rx="74" ry="66" fill={hoodieShade} />
      {/* 몸통 */}
      <path d="M146 260c0-50 32-76 84-76s84 26 84 76z" fill={hoodie} />
      {/* 뒷머리 */}
      <path d="M174 132c-8 40-4 70 10 86h92c14-16 18-46 10-86z" fill={hairShade} />
      {/* 얼굴 */}
      <ellipse cx="230" cy="152" rx="52" ry="48" fill={skin} />
      {/* 얼굴 위쪽 그림자 (앞머리 아래) */}
      <g clipPath="url(#m-face)">
        <rect x="170" y="140" width="120" height="14" fill="#efd7e2" opacity="0.5" />
      </g>
      {/* 앞머리 */}
      <path
        d="M176 118H284C286 132 282 144 276 152C272 142 266 136 258 133C256 143 250 150 242 154C240 144 236 137 230 133C224 137 220 144 218 154C210 150 204 143 202 133C194 136 188 142 184 152C178 144 174 132 176 118Z"
        fill={hair}
      />
      {/* 옆머리 */}
      <path d="M180 128c-6 26-4 52 6 70 4-20 6-44 6-64z" fill={hair} />
      <path d="M280 128c6 26 4 52-6 70-4-20-6-44-6-64z" fill={hair} />

      {/* 비니 */}
      <path d="M172 112c0-44 26-68 58-68s58 24 58 68z" fill={beanie} />
      <path d="M200 58c8-6 18-9 30-9" stroke="#34304a" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="230" cy="42" r="10" fill={cuff} />
      <rect x="166" y="96" width="128" height="28" rx="14" fill={cuff} />
      <path d="M182 100v20M194 100v20M206 100v20M254 100v20M266 100v20M278 100v20" stroke={beanie} strokeWidth="2" strokeLinecap="round" />
      {/* 비니의 옷걸이 로고 */}
      <g transform="translate(230 112)" stroke={accent} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-2.5 -9a2.6 2.6 0 1 1 3.8 2.2L0 -6v2" />
        <path d="M0 -4 -12 4a1.3 1.3 0 0 0 .7 2.4h22.6a1.3 1.3 0 0 0 .7-2.4L0 -4Z" />
      </g>

      {/* 눈 */}
      {[207, 253].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="160" rx="10.5" ry="13" fill="url(#m-iris)" />
          <ellipse cx={x} cy="164" rx="5" ry="6" fill="#2a1f4a" opacity="0.55" />
          <circle cx={x - 3.5} cy="154" r="4" fill="#fff" />
          <circle cx={x + 4} cy="166" r="2" fill="#fff" opacity="0.85" />
          <path d={`M${x - 12} 155q11-13 25-3`} stroke={hairShade} strokeWidth="3.6" fill="none" strokeLinecap="round" />
        </g>
      ))}
      {/* 볼 · 입 */}
      <ellipse cx="192" cy="178" rx="8" ry="4.5" fill="#f5a3bf" opacity="0.55" />
      <ellipse cx="268" cy="178" rx="8" ry="4.5" fill="#f5a3bf" opacity="0.55" />
      <path d="M224 180q3 4 6 0q3 4 6 0" stroke="#a45a78" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* 후드 끈 */}
      <path d="M216 200v14M244 200v14" stroke={hoodieShade} strokeWidth="2.5" strokeLinecap="round" />

      {/* 노트북 (뒷면) */}
      <path d="M156 260l14-54h120l14 54z" fill="url(#m-laptop)" stroke="#4a4560" strokeWidth="2" strokeLinejoin="round" />
      <path d="M172 210h116" stroke="#4a4560" strokeWidth="1.5" />
      <g transform="translate(230 238)" stroke={accent} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-3 -11a3 3 0 1 1 4.4 2.6L0 -7v3" />
        <path d="M0 -4 -15 6a1.5 1.5 0 0 0 .8 2.8h28.4a1.5 1.5 0 0 0 .8-2.8L0 -4Z" />
      </g>
      {/* 소매 · 손 */}
      <ellipse cx="190" cy="212" rx="15" ry="10" fill={hoodie} />
      <ellipse cx="270" cy="212" rx="15" ry="10" fill={hoodie} />
      <ellipse cx="196" cy="206" rx="9" ry="7" fill={skin} />
      <ellipse cx="264" cy="206" rx="9" ry="7" fill={skin} />

      {/* 가격표 */}
      <g className="animate-float" style={{ animationDelay: "-2s" }}>
        <g transform="translate(316 104) rotate(12)">
          <path d="M0 4a4 4 0 0 1 4-4h34l12 14-12 14H4a4 4 0 0 1-4-4z" fill={accent} />
          <circle cx="40" cy="14" r="3" fill={ink} />
          <text x="18" y="19" textAnchor="middle" fontSize="12" fontWeight="800" fill={ink} fontFamily="system-ui, sans-serif">↓%</text>
        </g>
      </g>
    </svg>
  );
}
