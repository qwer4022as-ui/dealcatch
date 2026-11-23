/** 가격표 아이콘 모양 (24×24). 로고·통계 카드·파비콘(app/icon.svg)이 같은 모양을 쓴다 */
export const TAG_PATH = "M3 12.6V4.4A1.4 1.4 0 0 1 4.4 3h8.2l8.4 8.4a1.4 1.4 0 0 1 0 2l-7.6 7.6a1.4 1.4 0 0 1-2 0z";

/** 가격표 아이콘 (선) */
export function TagIcon({ className = "h-6 w-6", strokeWidth = 1.8 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={TAG_PATH} />
      <circle cx="7.6" cy="7.6" r="1.4" />
    </svg>
  );
}

/** 사이트 로고 마크: 어두운 원 안의 보라색 가격표 */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-zinc-800/80 text-accent ring-1 ring-inset ring-accent/40 ${className}`}>
      <TagIcon className="h-[55%] w-[55%]" strokeWidth={2} />
    </span>
  );
}

export const SITE_NAME = "딜캐치";
export const SITE_NAME_EN = "DEALCATCH";
