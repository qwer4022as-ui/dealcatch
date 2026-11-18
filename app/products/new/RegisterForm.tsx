"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerDefaults } from "@/lib/capture/prefill";
import { useCapturedPayload } from "@/lib/capture/useCapturedPayload";
import { CATEGORIES } from "@/lib/forms/product";
import { registerProductAction, type RegisterState } from "./actions";

const empty: RegisterState = {
  errors: [],
  values: { url: "", brand: "", name: "", modelNo: "", category: "", options: "" },
  existingProductId: null,
};

const inputClass =
  "w-full rounded-md px-3 py-1.5 text-sm ring-1 ring-inset ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-700";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-zinc-600 dark:text-zinc-400">{hint}</p>}
    </div>
  );
}

export function RegisterForm({ brands }: { brands: string[] }) {
  const [state, formAction, pending] = useActionState(registerProductAction, empty);
  const captured = useCapturedPayload();
  // 제출 전에는 북마클릿 값, 제출 후에는 사용자가 보낸 값을 유지
  const v = state === empty && captured.payload ? registerDefaults(captured.payload) : state.values;
  // 오류 후 입력값을 유지하기 위해 제출할 때마다 폼을 다시 그린다
  const formKey = JSON.stringify(v);

  return (
    <form key={formKey} action={formAction} className="flex max-w-2xl flex-col gap-4">
      {captured.payload && state === empty && (
        <div className="rounded-md bg-sky-50 px-4 py-2 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100">
          ⓘ 무신사 페이지에서 가져온 값을 채웠습니다. 화면과 같은지 확인하고 카테고리를 고른 뒤 등록하세요.
        </div>
      )}
      {captured.error && (
        <div role="alert" className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          ◐ {captured.error}
        </div>
      )}
      {state.errors.length > 0 && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          <ul className="list-inside list-disc space-y-1">
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          {state.existingProductId && (
            <Link href={`/products/${state.existingProductId}`} className="mt-2 inline-block underline underline-offset-2">
              등록된 상품 보기 →
            </Link>
          )}
        </div>
      )}

      <Field id="url" label="상품 URL *" hint="무신사 상품 상세 페이지 주소. 주소만 해석하며 무신사에 요청을 보내지 않습니다.">
        <input id="url" name="url" type="url" required defaultValue={v.url} placeholder="https://www.musinsa.com/products/..." className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="brand" label="브랜드 *">
          <input id="brand" name="brand" required maxLength={50} defaultValue={v.brand} list="brand-list" className={inputClass} />
          <datalist id="brand-list">
            {brands.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Field>
        <Field id="modelNo" label="모델번호" hint="같은 브랜드·모델번호가 있으면 그 상품에 추가됩니다.">
          <input id="modelNo" name="modelNo" maxLength={50} defaultValue={v.modelNo} className={inputClass} />
        </Field>
      </div>
      <Field id="name" label="상품명 *">
        <input id="name" name="name" required maxLength={200} defaultValue={v.name} className={inputClass} />
      </Field>
      <Field id="category" label="카테고리">
        <select id="category" name="category" defaultValue={v.category} className={inputClass}>
          <option value="">선택 안 함</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <Field id="options" label="옵션 *" hint="한 줄에 하나씩 '색상 / 사이즈'. 색상이 없으면 사이즈만 (예: FREE).">
        <textarea
          id="options"
          name="options"
          required
          rows={6}
          defaultValue={v.options}
          placeholder={"블랙 / S\n블랙 / M\n블랙 / L"}
          className={`${inputClass} font-mono`}
        />
      </Field>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "저장 중…" : "등록하고 가격 입력하기"}
        </button>
        <Link href="/products" className="self-center text-sm text-zinc-600 underline underline-offset-2 dark:text-zinc-400">
          취소
        </Link>
      </div>
    </form>
  );
}
