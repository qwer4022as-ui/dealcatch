import { connection } from "next/server";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { createReadClient } from "@/lib/supabase/server";
import { RegisterForm } from "./RegisterForm";

export default function NewProductPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">상품 등록</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        무신사는 자동 수집이 허용되지 않아 상품 정보와 가격을 직접 입력합니다 (
        <a href="https://github.com/qwer4022as-ui/ax-private/blob/main/docs/platform-reviews/musinsa.md" className="underline underline-offset-2">
          검토 결과
        </a>
        ).
      </p>
      <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
        <NewProductBody />
      </Suspense>
    </main>
  );
}

async function NewProductBody() {
  await connection();
  await requireAdmin("/products/new");
  const { data } = await createReadClient().from("brands").select("name").order("name");
  return <RegisterForm brands={(data ?? []).map((b) => b.name).filter((n) => !n.startsWith("SAMPLE"))} />;
}
