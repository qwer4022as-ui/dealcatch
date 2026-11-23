import Link from "next/link";
import { Suspense } from "react";
import { isAdmin } from "@/lib/auth/admin";
import { safeNextPath } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">관리자 로그인</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        상품 등록과 가격 입력은 관리자만 할 수 있습니다. 서버의 <code>ADMIN_TOKEN</code> 값을 입력하세요.
      </p>
      <Suspense fallback={null}>
        <LoginBody {...props} />
      </Suspense>
    </main>
  );
}

async function LoginBody({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const target = safeNextPath(Array.isArray(next) ? next[0] : next);
  if (await isAdmin()) {
    return (
      <p className="text-sm">
        이미 로그인되어 있습니다.{" "}
        <Link href={target} className="underline underline-offset-2">
          계속하기 →
        </Link>
      </p>
    );
  }
  return <LoginForm next={target} />;
}
