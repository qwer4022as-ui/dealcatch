import Link from "next/link";
import { Suspense } from "react";
import { isAdmin } from "@/lib/auth/admin";
import { safeNextPath } from "@/lib/auth/session";
import { LogoMark, SITE_NAME } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="card flex w-full max-w-sm flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoMark className="h-14 w-14" />
          <h1 className="text-2xl font-extrabold tracking-tight">{SITE_NAME} 로그인</h1>
          <p className="text-sm text-zinc-400">상품 등록과 가격 입력은 로그인한 뒤 할 수 있습니다.</p>
        </div>
        <Suspense fallback={null}>
          <LoginBody {...props} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginBody({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const target = safeNextPath(Array.isArray(next) ? next[0] : next);
  if (await isAdmin()) {
    return (
      <div className="flex flex-col items-center gap-3 text-sm text-zinc-300">
        이미 로그인되어 있습니다.
        <Link href={target} className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-zinc-950 hover:bg-accent-strong">
          계속하기 →
        </Link>
      </div>
    );
  }
  return <LoginForm next={target} />;
}
