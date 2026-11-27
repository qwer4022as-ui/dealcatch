# 시스템 아키텍처

> 상태: 초안 v0.1 (2026-11-18)
> 관련 문서: [PRD.md](PRD.md) · [database.md](database.md) · [wireframe.md](wireframe.md)

## 1. 전체 구성

```
┌──────────────────────────────── Vercel ────────────────────────────────┐
│                                                                        │
│  Next.js (App Router, TypeScript)                                      │
│  ┌──────────────────────┐   ┌────────────────────────────────────────┐ │
│  │ UI (Server Comp.)    │   │ Server Actions / Route Handlers        │ │
│  │  - 대시보드          │   │  - 상품 등록, 수동 가격 입력           │ │
│  │  - 상품 목록·상세    │   │  - /api/cron/collect  (스케줄 수집)     │ │
│  │  - 수집 상태         │   │  - /api/products/parse-url             │ │
│  │ Client Comp.         │   └───────────────┬────────────────────────┘ │
│  │  - Recharts 그래프   │                   │                          │
│  └──────────┬───────────┘                   │                          │
│             │                               ▼                          │
│             │                ┌──────────────────────────────┐          │
│             │                │ lib/ (도메인 계층)           │          │
│             │                │  - pricing/  통계 계산(순수) │          │
│             │                │  - collectors/ 플랫폼 어댑터 │          │
│             │                │  - repositories/ DB 접근     │          │
│             │                └──────────────┬───────────────┘          │
└─────────────┼───────────────────────────────┼──────────────────────────┘
              │ (읽기: anon key + RLS)        │ (쓰기: service role, 서버 전용)
              ▼                               ▼
        ┌──────────────────────────────────────────────┐
        │ Supabase (PostgreSQL)                        │
        │  tables · views · RLS · migrations           │
        └──────────────────────────────────────────────┘
              ▲
              │ 트리거
   Vercel Cron 또는 GitHub Actions (스케줄)          외부 플랫폼 (허용된 방식만)
```

## 2. 계층별 책임

| 계층 | 위치 | 책임 | 하지 않는 일 |
|---|---|---|---|
| UI | `app/` | 데이터 조회 결과 렌더링, 상태 배지, 입력 폼 | 통계 계산, DB 직접 쓰기 |
| 서버 액션·라우트 | `app/**/actions.ts`, `app/api/` | 입력 검증(zod), 도메인 호출, 권한 확인 | 비즈니스 규칙 구현 |
| 도메인: pricing | `lib/pricing/` | 현재가, 최저가, 커버리지, 상태 판정. **순수 함수** | I/O |
| 도메인: collectors | `lib/collectors/` | 플랫폼별 URL 파싱, 가격 조회, 실패 분류 | DB 쓰기 (결과만 반환) |
| 저장소 | `lib/repositories/` | Supabase 쿼리, 타입 매핑 | 비즈니스 판단 |
| 확장: alerts / ai | `lib/alerts/`, `lib/ai/` | P2. 인터페이스만 먼저 정의 | 가격 데이터 수정 |

순수 함수인 `pricing`을 분리하면 DB 없이 통계 로직을 테스트할 수 있다. 원칙 P1(가격 생성 금지)과 P6(부족 표시)을 이 계층에서 보장한다.

## 3. 디렉터리 구조 (계획)

```
.
├── app/
│   ├── page.tsx                    # 대시보드
│   ├── products/
│   │   ├── page.tsx                # 목록·검색
│   │   ├── new/page.tsx            # 등록
│   │   └── [id]/page.tsx           # 상세
│   ├── collection/page.tsx         # 수집 상태
│   └── api/cron/collect/route.ts   # 스케줄 수집 엔드포인트
├── components/                     # UI 컴포넌트 (PriceChart, StatusBadge …)
├── lib/
│   ├── pricing/                    # stats.ts, coverage.ts, status.ts (+ *.test.ts)
│   ├── collectors/
│   │   ├── types.ts                # PlatformAdapter 인터페이스
│   │   ├── registry.ts
│   │   ├── manual.ts               # 수동 입력 어댑터
│   │   └── <platform>/             # 정책 검토 통과 후 추가
│   │       ├── adapter.ts
│   │       └── __fixtures__/
│   ├── repositories/
│   ├── supabase/                   # server.ts(service role), client.ts(anon)
│   └── env.ts                      # 환경변수 검증(zod)
├── supabase/
│   ├── migrations/                 # SQL 마이그레이션 (Git으로 관리)
│   └── seed/
│       └── sample.sql              # 샘플 데이터 (source='sample')
├── docs/
├── .env.example
├── .nvmrc
├── .editorconfig
└── .gitattributes
```

## 4. 주요 데이터 흐름

### 4.1 상품 등록

```
URL 입력 → parse-url (platform, external_id 추출)
  ├─ 지원 플랫폼 + 자동 수집 허용 → 어댑터로 메타데이터 조회 → 사용자 확인 → 저장
  └─ 그 외 → 수동 입력 폼(브랜드, 상품명, 모델번호, 색상, 사이즈) → 저장
저장 시 (platform_id, external_id) 유니크 제약으로 중복 차단
```

### 4.2 가격 수집 (자동, P1)

```
Cron → /api/cron/collect (CRON_SECRET 검증)
  → collection_runs 행 생성 (status=running)
  → 대상 리스팅을 작은 배치로 조회 (실행 시간 제한 고려)
  → 리스팅마다:
       adapter.fetchPrices(listing) → 결과 | 분류된 오류
       collection_attempts 기록 (성공/실패, 사유, 소요시간)
       성공 시 price_snapshots 추가 (변형별 1행)
  → collection_runs 종료 (succeeded / partial / failed)
```

### 4.3 수동 가격 입력 (P0)

수동 입력도 `collection_attempts`(trigger=manual)와 `price_snapshots`(source=manual)로 같은 경로에 기록한다. 그래서 통계와 화면은 출처에 관계없이 같은 코드로 동작한다.

### 4.4 상세 페이지 조회

```
page.tsx (Server Component)
  → repositories: 리스팅·변형·스냅샷(기간 내)·최근 시도 조회
  → pricing.computeStats(snapshots, attempts, now) → { current, minAll, min30, min90, status, coverage }
  → <PriceSummary> + <PriceChart data=…>  (Client Component, Recharts)
```

## 5. 수집 어댑터 인터페이스

```ts
// 설계안. 실제 코드는 승인 후 작성
interface PlatformAdapter {
  platform: PlatformCode;
  mode: 'api' | 'crawl' | 'manual' | 'sample';
  parseUrl(url: string): { externalId: string } | null;
  fetchListing?(externalId: string): Promise<AdapterResult<ListingMeta>>;
  fetchPrices?(externalId: string): Promise<AdapterResult<VariantPrice[]>>;
}

type AdapterResult<T> =
  | { ok: true; data: T; fetchedAt: Date }
  | { ok: false; error: 'http_error' | 'blocked' | 'not_found' | 'parse_error'
                      | 'timeout' | 'policy_disabled' | 'unknown';
      detail?: string; httpStatus?: number };
```

- `platforms.collection_mode`가 `api` 또는 `crawl`이 아니면 레지스트리가 자동 수집 어댑터를 반환하지 않는다. 정책상 꺼진 플랫폼은 코드에서도 실행되지 않는다.
- 어댑터는 DB에 직접 쓰지 않는다. 테스트는 fixture만으로 가능하다.

## 6. 데이터 수집 정책 검토 절차

자동 수집을 켜기 전에 플랫폼마다 아래 항목을 `docs/platform-reviews/<platform>.md`에 기록하고, 결과를 `platforms` 테이블의 `collection_mode`, `policy_reviewed_at`, `policy_note`에 반영한다.

1. 공식 개발자 API, 제휴(어필리에이트) 프로그램, 상품 피드 제공 여부
2. 이용약관의 자동 수집 관련 조항 (원문 인용과 확인 날짜)
3. robots.txt에서 상품 상세 경로의 허용 여부 (확인 날짜)
4. 가격 표시에 로그인이 필요한지
5. 결론: `api` / `crawl` / `manual` / `disabled` 중 하나와 근거

**금지 사항**: 로그인 세션 도용, 캡차 우회, 프록시 회전 등 차단 회피, 약관상 금지된 수집.

**허용 시 운영 규칙**: 상품당 하루 최대 4회, 요청 간 지연, 연속 실패 3회면 해당 리스팅 자동 일시정지, `blocked` 오류가 나오면 플랫폼 전체 수집을 중지하고 사람이 확인.

## 7. 스케줄링

| 방식 | 장점 | 주의 |
|---|---|---|
| Vercel Cron | 설정 간단, 같은 코드베이스 | 플랜별 실행 빈도와 함수 실행 시간 제한이 있으므로 착수 시 현재 플랜 조건을 확인 |
| GitHub Actions schedule | 무료 범위 넉넉, 실행 시간 길음 | 정시 실행이 보장되지 않음(지연 가능) |
| Supabase pg_cron + Edge Function | DB와 가까움 | 코드가 두 런타임으로 나뉨 |

**초기 선택**: Vercel Cron → `/api/cron/collect`. 제한에 걸리면 GitHub Actions가 같은 엔드포인트를 호출하도록 바꾼다. 엔드포인트는 `Authorization: Bearer ${CRON_SECRET}`로 보호한다.

> **현재 상태 (2026-11-18)**: 정책 검토 결과 자동 수집 대상 플랫폼이 없어 스케줄러와 `/api/cron/collect` 는 만들지 않았다 ([무신사](platform-reviews/musinsa.md), [네이버 쇼핑 API](platform-reviews/naver-shopping.md)). 가격은 수동 입력과 북마클릿(`lib/capture/`)으로 기록한다. 허용된 수집 경로가 생기면 이 절의 설계대로 추가한다.

## 8. 보안과 환경변수

| 변수 | 노출 범위 | 용도 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 클라이언트 | Supabase 주소 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 | 읽기 전용 (RLS로 제한) |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용** | 쓰기 작업 |
| `CRON_SECRET` | 서버 전용 | 크론 엔드포인트 인증 |
| `ADMIN_ID` · `ADMIN_PASSWORD` | 서버 전용 | 로그인 아이디·비밀번호 (공유 계정 하나) |
| `ADMIN_TOKEN` | 서버 전용 | 로그인 세션 쿠키 서명 키 |

- `lib/supabase/server.ts`에 `import 'server-only'`를 넣어 service role 키가 클라이언트 번들에 들어가지 않게 한다.
- 등록·입력 화면은 환경변수로 정한 아이디·비밀번호(공유 계정 하나)로 로그인해야 쓸 수 있다. 세션 쿠키는 `ADMIN_TOKEN`·아이디·비밀번호로 만든 키로 서명한다. 다중 사용자 단계에서 Supabase Auth로 교체한다.

## 9. PC·노트북 동기화 (Git/GitHub)

| 파일 | 목적 |
|---|---|
| `.gitignore` | `node_modules`, `.next`, `.env*`(단 `.env.example` 제외), `supabase/.temp` |
| `.env.example` | 필요한 변수 목록(값 없음) |
| `.nvmrc` | Node 버전 고정 (예: 22 LTS) |
| `package-lock.json` | 커밋. 설치는 `npm ci` |
| `.gitattributes` | `* text=auto eol=lf` (Windows·macOS 혼용 시 줄바꿈 충돌 방지) |
| `.editorconfig` | 들여쓰기·인코딩 통일 |
| `supabase/migrations/` | 스키마 변경은 항상 마이그레이션 파일로. 대시보드에서 직접 수정 금지 |

**작업 루틴**: 시작 시 `git pull` → 작업 → 작은 단위 커밋 → `git push`. 기능마다 브랜치(`feat/…`)를 만들고 PR로 `main`에 병합하면 Vercel이 미리보기 배포를 만든다. 환경변수는 Vercel 대시보드와 각 기기의 `.env.local`에 따로 설정하고, Git으로 공유하지 않는다.

## 10. 확장 설계

### 10.1 가격 하락 알림 (P2)

- `price_alerts`(조건) 테이블. 수집 실행이 끝난 뒤 `lib/alerts/evaluate.ts`가 새 스냅샷에 대해 조건을 평가하고 `alert_events`에 기록한다.
- 발송 채널(이메일 등)은 `Notifier` 인터페이스로 분리한다.
- 조건 평가는 수집 데이터만 사용한다. 데이터 부족 상태면 "최저가 갱신" 조건을 평가하지 않는다.

### 10.2 AI 분석 (P2)

> **현재 구현**: 비용 없는 **규칙 기반 자동 요약**(`lib/pricing/narrative.ts`, 상세 화면 "자동 요약" 카드). 저장하지 않고 요청마다 통계로 계산한다. 아래는 LLM 으로 교체할 때의 설계다.

- 입력: `pricing.computeStats` 결과 등 **구조화된 수치**만 전달한다. 원본 HTML은 전달하지 않는다.
- 출력: `ai_insights` 테이블에 텍스트, 모델 ID, 프롬프트 버전, 입력 데이터 범위(스냅샷 기간과 개수), 생성 시각을 저장한다.
- 화면: 별도 카드에 "AI 해석 · 생성 시각 · 근거 데이터 범위"를 표시한다. 가격 수치는 AI 텍스트가 아니라 DB에서 직접 렌더링한다.
- AI 출력에 포함된 숫자가 실제 통계와 다르면 저장하지 않는 검증 단계를 둔다.

## 11. 구현 우선순위

1. 골격: Next.js + Tailwind + TypeScript strict + ESLint/Prettier + Vitest, 환경변수 검증
2. Supabase 연결, 마이그레이션, 샘플 시드
3. `lib/pricing` 순수 함수와 테스트
4. 읽기 화면(목록, 상세, 그래프)
5. 쓰기(등록, 수동 입력) + 간이 인증
6. 수집 상태 화면
7. ~~어댑터 + 크론~~ → 정책 검토 결과 자동 수집 없음. 수동 입력 + 북마클릿, "오늘 확인할 상품" 목록
8. Vercel 배포 (4단계 이후 언제든 가능, 일찍 할수록 좋음)

## 12. 예상 기술적 문제

| 문제 | 대응 |
|---|---|
| Server/Client Component 경계 (Recharts는 클라이언트 전용) | 차트만 `'use client'`로 두고, 데이터는 서버에서 직렬화 가능한 형태로 전달 |
| 서버리스 함수 실행 시간 제한 | 배치 크기 제한, 다음 실행에서 이어서 처리 |
| Supabase 무료 플랜 비활성 일시정지 | 크론이 주기적으로 접근하므로 대부분 해소. 문서화 |
| 마이그레이션과 원격 DB 불일치 | Supabase CLI(`supabase db push`)만 사용하는 규칙 |
| 날짜 처리 오류 | 날짜 라이브러리 하나로 통일(예: date-fns + date-fns-tz), KST 변환 헬퍼 한 곳에 둠 |
| 타입 불일치 | `supabase gen types`로 DB 타입을 생성해 커밋 |

## 13. 테스트 및 검증 기준

| 계층 | 도구 | 기준 |
|---|---|---|
| pricing | Vitest | 경계 케이스 포함 모든 테스트 통과 ([PRD §11](PRD.md#11-테스트-및-검증-기준)) |
| collectors | Vitest + fixture | 네트워크 없이 실행. 오류 유형 분류 검증 |
| repositories | 로컬 Supabase(`supabase start`) 통합 테스트 (P1) | 시드 적용 후 쿼리 결과 검증 |
| API | 크론 엔드포인트 인증 테스트 | 시크릿 없으면 401 |
| UI | 수동 체크리스트 → Playwright (P1) | 샘플 시드의 모든 상태가 렌더링됨 |
| CI | GitHub Actions: `lint`, `typecheck`, `test` | PR 병합 전 필수 통과 |
| 보안 | 빌드 산출물 검사 | 클라이언트 번들에 service role 키가 없음 |
