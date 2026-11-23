import Link from "next/link";
import { Suspense } from "react";
import { BatchClient } from "./BatchClient";

export default function BatchCapturePage(props: PageProps<"/capture/batch">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">무신사 일괄 기록</h1>
      <Suspense fallback={<BatchClient />}>
        <SavedNotice {...props} />
      </Suspense>
    </main>
  );
}

async function SavedNotice({ searchParams }: PageProps<"/capture/batch">) {
  const sp = await searchParams;
  const num = (v: string | string[] | undefined) => Number(Array.isArray(v) ? v[0] : v);
  const saved = num(sp.saved);
  const registered = num(sp.registered);
  const done = (Number.isInteger(saved) && saved > 0) || (Number.isInteger(registered) && registered > 0);
  return (
    <>
      {done && (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          ● {saved > 0 ? `판매처 ${saved}개 가격 기록` : ""}
          {saved > 0 && registered > 0 ? " · " : ""}
          {registered > 0 ? `새 상품 ${registered}개 등록` : ""} 완료
          <Link href="/" className="underline underline-offset-2">
            대시보드로 →
          </Link>
        </div>
      )}
      <BatchClient done={done} />
    </>
  );
}
