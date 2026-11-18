# ax-private — 의류 가격 추적

의류 쇼핑 플랫폼의 가격 변동을 추적하고 현재 할인가가 과거 수집 가격 대비 얼마나 저렴한지 분석한다.

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
npm run dev        # http://localhost:3000
```

## 작업 시작 · 종료 루틴

```bash
git checkout main && git pull        # 시작할 때 최신화
git checkout -b feature/기능이름      # 기능마다 새 branch
# ... 작업 ...
npm run lint && npm run typecheck && npm test && npm run build
git push -u origin feature/기능이름   # 이후 GitHub에서 PR 생성 · merge
```

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm test` | Vitest 1회 실행 (`npm run test:watch`는 감시 모드) |
