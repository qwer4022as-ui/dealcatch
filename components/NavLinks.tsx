"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "대시보드", match: (p: string) => p === "/" },
  { href: "/products", label: "상품", match: (p: string) => p === "/products" || /^\/products\/\d+/.test(p) },
] as const;

/** 현재 경로를 읽어 강조한다. usePathname 때문에 레이아웃에서 <Suspense> 로 감싼다 */
export function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

/** 주 메뉴. 현재 화면을 pill 로 강조한다 (pathname 이 null 이면 강조 없음) */
export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      {LINKS.map((l) => {
        const active = pathname !== null && l.match(pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "whitespace-nowrap rounded-full bg-accent/20 px-2.5 py-1.5 sm:px-4 font-medium text-accent ring-1 ring-inset ring-accent/30"
                : "whitespace-nowrap rounded-full px-2.5 py-1.5 sm:px-4 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
