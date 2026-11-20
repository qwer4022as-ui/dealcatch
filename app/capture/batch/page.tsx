import Link from "next/link";
import { Suspense } from "react";
import { BatchClient } from "./BatchClient";

export default function BatchCapturePage(props: PageProps<"/capture/batch">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">무신사 일괄 기록</h1>
      <Suspense fallback={null}>
        <SavedNotice {...props} />
      </Suspense>
      <BatchClient />
    </main>
  );
}

async function SavedNotice({ searchParams }: PageProps<"/capture/batch">) {
  const { saved } = await searchParams;
  const n = Number(Array.isArray(saved) ? saved[0] : saved);
  if (!Number.isInteger(n) || n <= 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
      ● 판매처 {n}개의 가격을 기록했습니다.
      <Link href="/" className="underline underline-offset-2">
        대시보드로 →
      </Link>
    </div>
  );
}
