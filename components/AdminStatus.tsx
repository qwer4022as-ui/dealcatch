import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { isAdmin } from "@/lib/auth/admin";

/** 상단 메뉴의 로그인 상태. 쿠키를 읽으므로 레이아웃에서 <Suspense> 로 감싼다 */
export async function AdminStatus() {
  if (!(await isAdmin())) {
    return (
      <Link href="/login" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
        로그인
      </Link>
    );
  }
  return (
    <form action={logoutAction} className="flex items-center gap-3">
      <Link href="/products/new" className="rounded-md px-2 py-0.5 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 dark:ring-zinc-700 dark:hover:bg-zinc-800">
        + 상품 등록
      </Link>
      <Link href="/bookmarklet" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
        북마클릿
      </Link>
      <span className="text-xs text-zinc-600 dark:text-zinc-400">● 관리자</span>
      <button type="submit" className="text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400">
        로그아웃
      </button>
    </form>
  );
}
