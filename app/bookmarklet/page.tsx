import { headers } from "next/headers";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin";
import { BATCH_BOOKMARKLET_SOURCE, buildBookmarkletHref } from "@/lib/capture/bookmarklet";

export default function BookmarkletPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">무신사 가격 가져오기 북마클릿</h1>
      <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
        <BookmarkletBody />
      </Suspense>
    </main>
  );
}

const escapeAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function BookmarkletBody() {
  await requireAdmin("/bookmarklet");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3008";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  let href: string;
  let batchHref: string;
  try {
    href = buildBookmarkletHref(`${proto}://${host}`);
    batchHref = buildBookmarkletHref(`${proto}://${host}`, BATCH_BOOKMARKLET_SOURCE);
  } catch {
    return <p className="text-sm text-red-700">이 주소에서는 북마클릿을 만들 수 없습니다.</p>;
  }

  // React 는 javascript: 링크를 막으므로 이 링크만 직접 HTML 로 넣는다 (값은 이스케이프)
  const btn = "inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900";
  const link = `<a href="${escapeAttr(href)}" class="${btn}">무신사 → 가격추적</a>`;
  const batchLink = `<a href="${escapeAttr(batchHref)}" class="${btn}">무신사 → 일괄 기록</a>`;

  return (
    <div className="flex flex-col gap-5 text-sm">
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">설치</h2>
        <ol className="list-inside list-decimal space-y-1">
          <li>브라우저 즐겨찾기 막대를 켭니다 (Chrome: Ctrl+Shift+B).</li>
          <li>아래 버튼을 즐겨찾기 막대로 <strong>끌어다 놓습니다</strong>. (여기서 클릭하면 아무 일도 일어나지 않습니다)</li>
        </ol>
        <div className="flex flex-wrap gap-3">
          <div dangerouslySetInnerHTML={{ __html: link }} />
          <div dangerouslySetInnerHTML={{ __html: batchLink }} />
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          이 북마클릿은 지금 주소({host})로 정보를 보냅니다. 배포 주소가 바뀌면 다시 설치하세요.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">사용</h2>
        <ol className="list-inside list-decimal space-y-1">
          <li>무신사 상품 페이지에서 즐겨찾기의 <strong>무신사 → 가격추적</strong>을 누릅니다.</li>
          <li>새 탭에서 이미 등록된 상품이면 가격 입력, 처음 보는 상품이면 등록 화면이 열리고 값이 채워집니다.</li>
          <li>무신사 화면과 같은지 <strong>직접 확인한 뒤</strong> 저장합니다.</li>
        </ol>
        <p>
          <strong>무신사 → 일괄 기록</strong>: 좋아요 목록·검색·브랜드처럼 상품이 여러 개 보이는 페이지에서 누르면, 화면의 상품 중
          이미 등록한 판매처(색상)의 가격을 표로 가져옵니다. 확인 후 한 번에 저장합니다. 판매가는 쿠폰·적립 혜택가가 아닌 판매가
          기준이며, 같은 가격을 모든 사이즈에 기록합니다. 목록이 길면 끝까지 스크롤한 뒤 누르세요.
        </p>
      </section>

      <section className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">하는 일과 하지 않는 일</h2>
        <p>· 지금 보고 있는 페이지 1개에서, 버튼을 눌렀을 때만, 페이지에 이미 있는 정보(상품 번호·상품명·브랜드·가격)를 읽습니다.</p>
        <p>· 무신사에 추가 요청을 보내지 않고, 자동·반복 실행하지 않으며, 로그인 정보나 쿠키를 읽지 않습니다.</p>
        <p>· 저장은 항상 직접 확인 후 누릅니다. 기록 출처는 &quot;수동 입력&quot;입니다.</p>
      </section>
    </div>
  );
}
