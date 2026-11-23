import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 px-4 py-8">
      <h1 className="text-xl font-semibold">상품을 찾을 수 없습니다</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">삭제되었거나 잘못된 주소입니다.</p>
      <Link href="/" className="text-sm underline underline-offset-2">
        처음으로
      </Link>
    </main>
  );
}
