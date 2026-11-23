import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { isAdmin } from "@/lib/auth/admin";

const ghost = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100";

/** 상단 메뉴의 로그인 상태. 쿠키를 읽으므로 레이아웃에서 <Suspense> 로 감싼다 */
export async function AdminStatus() {
  if (!(await isAdmin())) {
    return (
      <Link href="/login" className={ghost}>
        로그인
      </Link>
    );
  }
  return (
    <form action={logoutAction} className="flex items-center gap-0.5 sm:gap-1">
      <Link
        href="/products/new"
        className="mr-1 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-accent px-3 py-1.5 sm:px-4 font-semibold text-zinc-950 hover:bg-accent-strong"
      >
        <span aria-hidden>+</span>
        <span className="hidden sm:inline">상품 등록</span>
        <span className="sr-only sm:hidden">상품 등록</span>
      </Link>
      <Link href="/bookmarklet" className={ghost}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M6 3h12v18l-6-4-6 4z" strokeLinejoin="round" />
        </svg>
        <span className="sr-only lg:not-sr-only">북마클릿</span>
      </Link>
      <span className="hidden items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-zinc-300 sm:inline-flex" title="관리자로 로그인됨">
        <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="sr-only lg:not-sr-only">관리자</span>
      </span>
      <button type="submit" className={ghost}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />
        </svg>
        <span className="sr-only lg:not-sr-only">로그아웃</span>
      </button>
    </form>
  );
}
