import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminStatus } from "@/components/AdminStatus";
import { HangerIcon, SITE_NAME, SITE_NAME_EN } from "@/components/Logo";
import { ActiveNavLinks, NavLinks } from "@/components/NavLinks";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${SITE_NAME} ${SITE_NAME_EN}`, template: `%s · ${SITE_NAME}` },
  description: "옷값의 최저점을 기록하는 의류 가격 추적 · 할인 분석",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-background/80 backdrop-blur">
          <nav aria-label="주 메뉴" className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
            <Link href="/" className="flex items-center gap-2" aria-label={`${SITE_NAME} 홈`}>
              <HangerIcon className="h-6 w-7 text-accent" />
              <span className="text-lg font-extrabold tracking-tight">{SITE_NAME}</span>
              <span className="hidden text-[10px] font-semibold tracking-[0.2em] text-zinc-500 sm:inline">{SITE_NAME_EN}</span>
            </Link>
            <Suspense fallback={<NavLinks pathname={null} />}>
              <ActiveNavLinks />
            </Suspense>
            <div className="ml-auto">
              <Suspense fallback={null}>
                <AdminStatus />
              </Suspense>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
