import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { isAdmin } from "@/lib/auth/admin";

const ghost = "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100";

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
    <form action={logoutAction} className="flex flex-wrap items-center gap-1">
      <Link
        href="/products/new"
        className="mr-1 inline-flex items-center gap-1 rounded-full bg-accent px-4 py-1.5 font-semibold text-zinc-950 hover:bg-accent-strong"
      >
        <span aria-hidden>+</span> 상품 등록
      </Link>
      <Link href="/bookmarklet" className={ghost}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M6 3h12v18l-6-4-6 4z" strokeLinejoin="round" />
        </svg>
        북마클릿
      </Link>
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-zinc-300">
        <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-400" />
        관리자
      </span>
      <button type="submit" className={ghost}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />
        </svg>
        로그아웃
      </button>
    </form>
  );
}
