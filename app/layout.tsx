import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminStatus } from "@/components/AdminStatus";
import "./globals.css";

export const metadata: Metadata = {
  title: "가격추적",
  description: "의류 가격 변동 추적 및 할인 분석",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <nav aria-label="주 메뉴" className="mx-auto flex w-full max-w-5xl items-center gap-5 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold">
              가격추적
            </Link>
            <Link href="/" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              대시보드
            </Link>
            <Link
              href="/products"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              상품
            </Link>
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
