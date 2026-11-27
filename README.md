# 딜캐치 DEALCATCH — 의류 가격 추적

> 무신사에서 눈여겨본 옷의 가격을 매일 기록하고, **지금 가격이 내가 기록한 기간 중 얼마나 싼지** 한눈에 보여 주는 서비스입니다.

**배포 주소: https://ax-private-n34m.vercel.app**  
`main`에 merge되면 Vercel이 자동으로 배포합니다.

---

## 목차

1. [무엇을 하나요](#1-무엇을-하나요)
2. [화면 구성](#2-화면-구성)
3. [매일 쓰는 방법](#3-매일-쓰는-방법)
4. [처음 설치하기](#4-처음-설치하기)
5. [환경변수](#5-환경변수)
6. [샘플 · 데모 데이터](#6-샘플--데모-데이터)
7. [개발 흐름](#7-개발-흐름)
8. [데이터베이스 (Supabase)](#8-데이터베이스-supabase)
9. [테스트와 CI](#9-테스트와-ci)
10. [폴더 구조](#10-폴더-구조)
11. [스크립트](#11-스크립트)
12. [문서](#12-문서)

---

## 1. 무엇을 하나요

쇼핑몰이 보여 주는 할인율은 **정가 기준**이라, 실제로 지금이 싼 시점인지 알기 어렵습니다.
딜캐치는 직접 기록한 가격 이력을 근거로 다음 질문에 답합니다.

- 이 옷(색상·사이즈까지)의 **지금 가격**은 얼마인가?
- 내가 기록한 기간의 **최저가**는 얼마였고, 지금은 그보다 몇 % 비싸거나 싼가?
- **최근 30일 · 90일 최저가**와 비교하면 어떤가? 판단할 데이터는 충분한가?

### 지키는 원칙

| 원칙 | 화면에서 보이는 모습 |
|---|---|
| 기록하지 않은 가격은 만들지 않는다 | 기록이 없는 날은 그래프 선이 끊깁니다. 기간이 부족하면 "데이터 부족"으로 표시합니다 |
| "역대 최저가"라고 하지 않는다 | 항상 **"수집 기간 최저가"** 라고 씁니다 |
| 데이터 출처를 숨기지 않는다 | 모든 가격에 "수동 입력" · "샘플" 같은 출처 배지가 붙습니다 |
| 허용된 방식으로만 수집한다 | 무신사는 자동 수집을 허용하지 않아, **사용자가 보고 있는 페이지에서 버튼을 눌렀을 때만** 값을 읽습니다 ([검토 문서](docs/platform-reviews/musinsa.md)) |

### 기술 스택

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL) · Recharts · Vercel

---

## 2. 화면 구성

보기 화면은 누구나 볼 수 있고, 등록 · 입력 화면은 **로그인해야** 쓸 수 있습니다.

| 화면 | 주소 | 내용 | 로그인 |
|---|---|---|:---:|
| 대시보드 | `/` | 등록 상품 수 · 최저가 갱신 · 오늘 기록 완료율 · 평균 변동률, 최저가 근접 상품, 주의 필요 상품 | - |
| 〃 (로그인 시 추가) | `/` | 가격 알림 (3개씩 보이고 "더 보기"로 20개씩), 오늘 확인할 상품 (검색 · 필터 · 정렬 · 30일 미니 그래프) | ✔ |
| 상품 목록 | `/products` | 검색, 필터(최저가 임박 · 최근 확인순 · 브랜드 · 카테고리), 요약 카드 | - |
| 상품 상세 | `/products/[id]` | 옵션 선택, 현재가 · 수집 기간 최저가 · 30/90일 최저가 · 정가 대비 할인율, 가격 추이 그래프, 최근 기록, 자동 요약(규칙 기반) | - |
| 〃 (로그인 시 추가) | `/products/[id]` | 목표가 설정, 잘못된 기록 무효 처리 | ✔ |
| 상품 등록 | `/products/new` | 무신사 주소로 상품 · 옵션 등록 | ✔ |
| 가격 입력 | `/products/[id]/prices/new` | 옵션별 정가 · 판매가 · 재고 입력 | ✔ |
| 일괄 기록 | `/capture/batch` | 무신사 목록 페이지에서 가져온 가격을 한 번에 저장 | ✔ |
| 북마클릿 안내 | `/bookmarklet` | "가격추적"(상품 1개) · "일괄 기록"(목록 페이지) 북마클릿 설치 | ✔ |
| 로그인 | `/login` | 아이디 · 비밀번호 로그인 | - |

---

## 3. 매일 쓰는 방법

**준비 (한 번만)**

1. `/login`에서 로그인합니다.
2. `/bookmarklet`에서 북마클릿 두 개를 브라우저 즐겨찾기 막대로 끌어다 놓습니다.
   - 로컬(`localhost:3008`)과 배포 주소는 **각각 따로** 설치해야 합니다.
3. 추적할 상품을 무신사 **좋아요**에 모아 둡니다. 일괄 기록이 가장 편해집니다.

**매일**

1. 무신사 좋아요 목록(또는 브랜드 페이지)을 열고 **"무신사 → 일괄 기록"** 북마클릿을 누릅니다.
2. 딜캐치 화면에 가져온 가격표가 뜨면 확인하고 **저장**을 한 번 누릅니다.
3. 대시보드의 **오늘 확인할 상품**에서 아직 "미기록"인 상품만 **가격 입력**으로 따로 채웁니다.
   저장하면 대시보드로 돌아오고, 그 상품이 "기록 완료"로 바뀝니다.
4. **가격 알림**과 상품 상세 그래프로 지금이 살 때인지 확인합니다.

> 무신사 목록은 스크롤하면 지나간 상품이 화면에서 사라집니다. 상품이 많으면 화면을 나눠서 북마클릿을 여러 번 눌러 주세요.

---

## 4. 처음 설치하기

**필요한 것**: Node.js 22 (`.nvmrc`), npm, Git

```bash
git clone https://github.com/qwer4022as-ui/ax-private.git
cd ax-private
nvm use                      # Node 22
npm ci                       # package-lock.json 그대로 설치
cp .env.example .env.local   # 아래 5번 표를 보고 값 채우기 (Git에 올리지 않음)
npm run dev                  # http://localhost:3008 (포트 고정)
```

화면이 하얗게 나오거나 바꾼 스타일이 반영되지 않으면 개발 서버 캐시를 지우고 다시 띄웁니다.

```bash
rm -rf .next && npm run dev
```

---

## 5. 환경변수

`.env.local`(로컬)과 Vercel **Settings → Environment Variables**(배포)에 같은 이름으로 넣습니다.
값은 Git에 올리지 않습니다. 바꾼 뒤에는 개발 서버를 다시 시작해야 읽힙니다.

| 이름 | 용도 | 비고 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 주소 | 브라우저에도 노출되는 공개 값 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 읽기용 공개 키 | 브라우저에도 노출되는 공개 값 |
| `SUPABASE_SERVICE_ROLE_KEY` | 쓰기용 키 | **서버 전용.** 화면 코드에서 절대 쓰지 않음 |
| `ADMIN_ID` | 로그인 아이디 | |
| `ADMIN_PASSWORD` | 로그인 비밀번호 | 8자 이상 |
| `ADMIN_TOKEN` | 로그인 상태(쿠키) 서명용 비밀 값 | 16자 이상. 화면에 입력하지 않음. `openssl rand -base64 32`로 생성 |
| `CRON_SECRET` | 예약 수집용 | 현재 사용하지 않음 (자동 수집 없음) |

- `ADMIN_ID` · `ADMIN_PASSWORD` · `ADMIN_TOKEN` 중 하나라도 바꾸면 **모든 기기의 로그인이 풀립니다.** 비밀번호가 새었을 때 바꾸면 바로 막을 수 있습니다.
- 배포 환경에 `ADMIN_ID` · `ADMIN_PASSWORD`가 없으면 아무도 로그인할 수 없습니다.

---

## 6. 샘플 · 데모 데이터

실제 가격 이력처럼 보이지 않도록 **가상 브랜드 · 가상 상품**만 쓰고, 화면에 **"샘플" 배지**가 붙습니다.
샘플이 하나라도 있으면 대시보드 위에 안내 배너가 뜹니다. "오늘 확인할 상품"과 가격 알림에는 나오지 않습니다.

| 파일 | 내용 | 용도 |
|---|---|---|
| [supabase/seed/sample.sql](supabase/seed/sample.sql) | 상품 6개 — 데이터 부족, 수집 공백, 수집 실패, 오래된 데이터, 품절, 무효 기록 | 상태 표시가 맞는지 검증 |
| [supabase/seed/demo_90d.sql](supabase/seed/demo_90d.sql) | 상품 10개 — 90일치 하루 1회 기록, 상품마다 다른 가격 흐름(단계 인하 · 반짝 세일 · 인상 · 지그재그 · 품절) | 화면 시연 |

**넣기**

- 실제(클라우드) DB: Supabase 대시보드 → **SQL Editor**에 파일 내용을 붙여 넣고 Run
- 로컬 Supabase: `npx supabase db reset` (두 파일이 순서대로 들어감)
- `demo_90d.sql`은 이미 들어가 있으면 아무것도 하지 않으므로 여러 번 실행해도 안전합니다.

**빼기**: SQL Editor에서 아래 한 줄을 실행합니다. 샘플만 지워지고 실제 데이터는 그대로 남습니다.

```sql
select public.purge_sample_data();
```

---

## 7. 개발 흐름

자세한 규칙은 [CLAUDE.md](CLAUDE.md)에 있습니다. 요약하면 다음과 같습니다.

- `main`에서 직접 작업하지 않습니다. **기능 하나에 branch 하나**(`feature/기능이름`, 영어 소문자와 `-`).
- merge가 끝난 branch는 다시 쓰지 않고 새로 만듭니다.
- push는 자기 feature branch로만 합니다. `main` push와 force push는 하지 않습니다.
- PR 생성과 merge는 GitHub 화면에서 사람이 합니다.

```bash
git checkout main && git pull            # 1. 최신 main
git checkout -b feature/기능이름          # 2. 새 branch
# ... 작업 ...
npm run lint && npm run typecheck && npm test && npm run test:db && npm run build   # 3. 검사
git push -u origin feature/기능이름       # 4. push → GitHub에서 PR 생성 · merge
```

---

## 8. 데이터베이스 (Supabase)

- 스키마는 **`supabase/migrations/`로만** 바꿉니다. Supabase 대시보드에서 테이블을 직접 고치지 않습니다.
- 가격 기록은 **추가만** 할 수 있습니다. 수정 · 삭제는 DB에서 막혀 있고, 잘못된 기록은 "무효 처리"합니다(되돌릴 수 없음).
- Supabase CLI 3.x는 기본 대상이 로컬 DB라서, 클라우드 프로젝트에는 항상 `--remote`를 붙입니다.

```bash
npx supabase login                                # 기기마다 1회 (브라우저 인증)
npx supabase link --project-ref <프로젝트 ref>     # 기기마다 1회 (DB 비밀번호 입력)

npx supabase migration new <이름>                  # 새 마이그레이션 파일 만들기
npx supabase db push --remote --dry-run           # 적용될 내용 미리 보기
npx supabase db push --remote                     # 적용
npx supabase db advisors --remote                 # 보안 · 성능 점검
```

테이블 설명과 ERD는 [docs/database.md](docs/database.md)에 있습니다.

---

## 9. 테스트와 CI

| 검사 | 명령 | 확인하는 것 |
|---|---|---|
| 단위 테스트 | `npm test` | 가격 통계(최저가 · 30/90일 · 커버리지), 7일 변동률, 필터 · 정렬, 로그인 · 세션, 날짜(KST) 등 |
| DB 검증 | `npm run test:db` | 마이그레이션과 시드를 메모리 DB(PGlite)에 적용해 제약조건 · 트리거 · 권한 · 함수 · 샘플 삭제 확인. Docker 불필요 |
| 정적 검사 | `npm run lint`, `npm run typecheck` | 코드 규칙, 타입 |

PR을 올리거나 `main`에 merge되면 [.github/workflows/ci.yml](.github/workflows/ci.yml)이
lint → 타입 검사 → 테스트 → DB 검증 → build를 실행합니다.
PR 화면의 **Checks**에서 결과를 확인하고, 실패하면 merge하지 않습니다.

---

## 10. 폴더 구조

```
app/                    화면 (Next.js App Router)
  page.tsx              대시보드
  products/             상품 목록 · 상세 · 등록 · 가격 입력
  capture/              북마클릿으로 가져온 값 처리 (상품 1개 · 일괄 기록)
  bookmarklet/          북마클릿 설치 안내
  login/                로그인
components/             화면 조각 (표, 카드, 그래프, 로고 등)
lib/
  pricing/              가격 통계 · 알림 · 추이 계산 (순수 함수 + 테스트)
  products/             상품 목록 필터 · 정렬
  repositories/         DB 읽기
  auth/                 로그인 · 세션
  capture/              북마클릿 코드
supabase/
  migrations/           DB 스키마 (이 폴더로만 변경)
  seed/                 샘플 · 데모 데이터
  tests/                DB 검증 스크립트
docs/                   PRD · 구조 · DB · 화면 설계, 플랫폼 정책 검토
public/hero/            대시보드 캐릭터 그림
```

---

## 11. 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (http://localhost:3008) |
| `npm run build` | 배포용 빌드 |
| `npm run start` | 빌드 결과 실행 (포트 3008) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm test` | 단위 테스트 1회 실행 (`npm run test:watch`는 감시 모드) |
| `npm run test:db` | DB 검증 (PGlite) |
| `npm run db:types` | Supabase 스키마로 TypeScript 타입 다시 만들기 |

---

## 12. 문서

| 문서 | 내용 |
|---|---|
| [docs/PRD.md](docs/PRD.md) | 요구사항, 원칙, 구현 현황 |
| [docs/wireframe.md](docs/wireframe.md) | 화면 설계 |
| [docs/architecture.md](docs/architecture.md) | 구조, 환경변수, 수집 정책 검토 절차 |
| [docs/database.md](docs/database.md) | 테이블, 제약조건, 시드 구성 |
| [docs/platform-reviews/](docs/platform-reviews/) | 무신사 · 네이버 쇼핑 수집 정책 검토 결과 |
| [CLAUDE.md](CLAUDE.md) | 작업 규칙 (branch · commit · push) |
