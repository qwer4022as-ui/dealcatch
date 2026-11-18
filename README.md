# ax-private — 의류 가격 추적

의류 쇼핑 플랫폼의 가격 변동을 추적하고 현재 할인가가 과거 수집 가격 대비 얼마나 저렴한지 분석한다.

**배포 주소: https://ax-private-n34m.vercel.app** (main 에 merge 되면 Vercel 이 자동 배포)

- 보기(대시보드·목록·상세)는 누구나, 등록·가격 입력·무효 처리는 관리자 로그인 후 가능
- 가격 수집은 수동 입력 + 북마클릿 ([무신사 검토](docs/platform-reviews/musinsa.md), [네이버 쇼핑 API 검토](docs/platform-reviews/naver-shopping.md))
- 북마클릿은 사용하는 주소(로컬 `localhost:3008` 또는 배포 주소)의 `/bookmarklet` 에서 각각 설치

- 요구사항: [docs/PRD.md](docs/PRD.md)
- 구조: [docs/architecture.md](docs/architecture.md)
- DB: [docs/database.md](docs/database.md)
- 화면: [docs/wireframe.md](docs/wireframe.md)
- 작업 규칙: [CLAUDE.md](CLAUDE.md)

## 처음 설치 (새 PC · 노트북)

```bash
git clone https://github.com/qwer4022as-ui/ax-private.git
cd ax-private
nvm use            # .nvmrc의 Node 22 사용
npm ci             # package-lock.json 그대로 설치
cp .env.example .env.local   # 값은 직접 채운다 (Git에 올리지 않음)
npm run dev        # http://localhost:3008 (포트 고정)
```

## 작업 시작 · 종료 루틴

```bash
git checkout main && git pull        # 시작할 때 최신화
git checkout -b feature/기능이름      # 기능마다 새 branch
# ... 작업 ...
npm run lint && npm run typecheck && npm test && npm run build
git push -u origin feature/기능이름   # 이후 GitHub에서 PR 생성 · merge
```

## 데이터베이스 (Supabase)

스키마는 `supabase/migrations/`로만 변경한다. 대시보드에서 직접 테이블을 고치지 않는다.
Supabase CLI 3.x는 기본 대상이 로컬 DB이므로, 클라우드 프로젝트에는 항상 `--remote`를 붙인다.

```bash
npx supabase login                                   # 기기마다 1회 (브라우저 인증)
npx supabase link --project-ref <프로젝트 ref>        # 기기마다 1회 (DB 비밀번호 입력)

npx supabase migration new <이름>                     # 새 마이그레이션 파일 생성
npx supabase db push --remote --dry-run              # 적용될 내용 미리 보기
npx supabase db push --remote                        # 적용
npx supabase db push --remote --include-seed         # 빈 DB에 샘플 데이터까지 적용
npx supabase db advisors --remote                    # 보안·성능 점검
```

샘플 데이터 삭제: SQL Editor에서 `select public.purge_sample_data();` (실제 데이터는 남는다)

## CI (GitHub Actions)

PR 을 올리거나 main 에 merge 되면 [.github/workflows/ci.yml](.github/workflows/ci.yml) 이 lint → 타입 검사 → 테스트 → build 를 실행한다. PR 화면의 Checks 에서 결과를 확인하고, 실패하면 merge 하지 않는다. 비밀 값은 쓰지 않는다.

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (http://localhost:3008) |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm test` | Vitest 1회 실행 (`npm run test:watch`는 감시 모드) |
