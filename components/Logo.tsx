/** 옷걸이 로고 아이콘 */
export function HangerIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M13 5.5a3 3 0 1 1 4.6 2.5L16 9v2" />
      <path d="M16 11 3 19.5a1.6 1.6 0 0 0 .9 2.9h24.2a1.6 1.6 0 0 0 .9-2.9L16 11Z" />
    </svg>
  );
}

export const SITE_NAME = "로우핏";
export const SITE_NAME_EN = "LOWFIT";
