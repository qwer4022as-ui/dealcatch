/** 대시보드 히어로 캐릭터 (장식용 SVG). 옷걸이 비니를 쓰고 노트북으로 가격을 확인하는 '로우핏' 마스코트 */
export function Mascot({ className = "" }: { className?: string }) {
  const ink = "#15131d";
  const hair = "#4a3d66";
  const hairDark = "#2f2645";
  const skin = "#f8ebf1";
  const hoodie = "#cdbffd";
  const accent = "#b9a4ff";
  return (
    <svg viewBox="0 0 440 240" className={className} role="img" aria-label="옷걸이 비니를 쓰고 노트북으로 옷 가격을 확인하는 캐릭터">
      <defs>
        <linearGradient id="m-rack" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3a3552" />
          <stop offset="1" stopColor="#221f30" />
        </linearGradient>
        <radialGradient id="m-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={accent} stopOpacity="0.35" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="225" cy="150" rx="150" ry="95" fill="url(#m-glow)" />

      {/* 옷걸이 랙 */}
      <g opacity="0.9">
        <path d="M330 40h100M336 40v200M424 40v200" stroke="#4f4b63" strokeWidth="4" strokeLinecap="round" />
        {[350, 380, 408].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 40v6`} stroke="#7a7690" strokeWidth="2" />
            <path
              d={`M${x - 16} 56 L${x} 48 L${x + 16} 56 L${x + 18} ${130 + i * 4} L${x - 18} ${130 + i * 4} Z`}
              fill="url(#m-rack)"
              stroke="#4f4b63"
              strokeWidth="1.2"
            />
            <path d={`M${x} 50v${76 + i * 4}`} stroke="#4f4b63" strokeWidth="1" />
          </g>
        ))}
        <rect x="372" y="190" width="40" height="26" rx="3" fill="#26233a" />
        <rect x="380" y="170" width="30" height="20" rx="3" fill="#2e2a42" />
      </g>

      {/* 그래프 말풍선 */}
      <g className="animate-float">
        <rect x="18" y="24" width="120" height="74" rx="16" fill="#17151f" stroke="#4f4b63" strokeWidth="2" />
        <path d="M108 98l14 14 -2-14z" fill="#17151f" stroke="#4f4b63" strokeWidth="2" strokeLinejoin="round" />
        <path d="M32 82h94M32 40v42" stroke="#4f4b63" strokeWidth="1.5" />
        <polyline points="36,74 52,60 66,68 82,50 96,58 112,40 124,46" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="124" cy="46" r="3.5" fill={accent} />
      </g>

      {/* ₩ 코인 */}
      <g transform="translate(46 140)">
        <circle r="20" fill={accent} />
        <circle r="15" fill="none" stroke={ink} strokeOpacity="0.25" strokeWidth="2" />
        <text y="7" textAnchor="middle" fontSize="20" fontWeight="800" fill={ink}>₩</text>
      </g>

      {/* 반짝이 */}
      {[
        [170, 30, 7],
        [300, 70, 5],
        [150, 150, 4],
      ].map(([x, y, r]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`} fill="#d9d6e5" opacity="0.7" />
      ))}

      {/* 캐릭터 */}
      <g>
        {/* 뒷머리 */}
        <path d="M168 118c-6 40 0 80 18 100h80c18-20 24-60 18-100z" fill={hairDark} />
        {/* 후드티 몸통 */}
        <path d="M150 240c2-44 30-66 76-66s74 22 76 66z" fill={hoodie} />
        <path d="M196 176c6 14 18 20 30 20s24-6 30-20" fill="none" stroke="#a594ef" strokeWidth="3" strokeLinecap="round" />
        <path d="M216 196v20M236 196v20" stroke="#a594ef" strokeWidth="2.5" strokeLinecap="round" />
        {/* 얼굴 */}
        <ellipse cx="226" cy="128" rx="50" ry="47" fill={skin} />
        {/* 옆머리 */}
        <path d="M176 112c-8 30-4 58 8 74 2-24 4-46 10-64z" fill={hair} />
        <path d="M276 112c8 30 4 58-8 74-2-24-4-46-10-64z" fill={hair} />
        {/* 앞머리 */}
        <path d="M176 114c6-22 26-34 50-34s44 12 50 34c-10-6-18-6-24 2-6-10-16-12-24-4-8-8-18-6-24 4-8-6-18-6-28-2z" fill={hair} />
        {/* 비니 */}
        <path d="M172 104c0-44 24-66 54-66s54 22 54 66z" fill="#1d1b27" />
        <path d="M196 50c8-6 18-9 30-9" stroke="#2e2a3e" strokeWidth="3" strokeLinecap="round" fill="none" />
        <rect x="166" y="92" width="120" height="22" rx="11" fill="#26233a" />
        <path d="M184 96v14M196 96v14M208 96v14M244 96v14M256 96v14M268 96v14" stroke="#1d1b27" strokeWidth="2" />
        {/* 비니의 옷걸이 로고 */}
        <g transform="translate(226 70)" stroke={accent} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-3 -8a3 3 0 1 1 4.5 2.6L0 -4v2" />
          <path d="M0 -2 -14 7a1.5 1.5 0 0 0 .8 2.8h26.4a1.5 1.5 0 0 0 .8-2.8L0 -2Z" />
        </g>
        {/* 눈 */}
        {[204, 248].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="134" rx="10" ry="12.5" fill="#3d2f68" />
            <ellipse cx={x} cy="137" rx="7" ry="8" fill="#7c64d6" />
            <circle cx={x - 3} cy="129" r="3.6" fill="#fff" />
            <circle cx={x + 3.5} cy="140" r="1.8" fill="#fff" opacity="0.8" />
            <path d={`M${x - 11} 121q11-6 22 0`} stroke={hairDark} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>
        ))}
        {/* 볼 · 입 */}
        <ellipse cx="190" cy="154" rx="8" ry="4.5" fill="#f4a6c0" opacity="0.6" />
        <ellipse cx="262" cy="154" rx="8" ry="4.5" fill="#f4a6c0" opacity="0.6" />
        <path d="M220 156q6 5 12 0" stroke="#9b5a74" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </g>

      {/* 노트북 */}
      <g>
        <path d="M108 236l18-70h96l-14 70z" fill="#26233a" stroke="#4f4b63" strokeWidth="2" strokeLinejoin="round" />
        <g transform="translate(168 206)" stroke={accent} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-3 -9a3 3 0 1 1 4.5 2.6L0 -5v3" />
          <path d="M0 -2 -15 8a1.5 1.5 0 0 0 .8 2.8h28.4a1.5 1.5 0 0 0 .8-2.8L0 -2Z" />
        </g>
        {/* 손 */}
        <ellipse cx="214" cy="176" rx="11" ry="8" fill={skin} />
        <ellipse cx="236" cy="182" rx="11" ry="8" fill={skin} />
      </g>

      {/* 가격표 */}
      <g transform="translate(300 168) rotate(14)">
        <path d="M0 0h40l12 14-12 14H0z" fill={accent} />
        <circle cx="42" cy="14" r="3" fill="#15131d" />
        <text x="19" y="19" textAnchor="middle" fontSize="13" fontWeight="800" fill={ink}>%</text>
      </g>
    </svg>
  );
}
