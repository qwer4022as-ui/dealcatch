# CLAUDE.md

의류 가격 추적 및 할인 분석 웹사이트 (Next.js · TypeScript · Tailwind · Supabase · Recharts · Vercel)

참고 문서: [docs/PRD.md](docs/PRD.md) · [docs/wireframe.md](docs/wireframe.md) · [docs/architecture.md](docs/architecture.md) · [docs/database.md](docs/database.md)

## 작업 규칙

- PRD와 wireframe을 먼저 읽는다.
- 기능은 자기 branch에서 수정한다.
- 현재 저장 방식 · 기존 API · DB · 개수를 유지한다.
- 선택한 작은 변경 하나만 수행한다.
- 수정 후 build와 브라우저 확인 방법을 알려 준다.
- commit · push는 AI가 수행하되, push는 사용자 확인을 받은 뒤에만 한다.
- PR 생성 · merge는 사람이 GitHub 화면에서 한다.

## Branch 규칙 (가장 먼저 확인)

- 파일을 수정하기 전에 항상 현재 branch를 확인한다.
- 현재 branch가 main이면 파일을 수정하지 않는다. 먼저 사용자에게 어떤 기능을 작업할지 묻고, 그 이름으로 branch를 만든 뒤 작업한다.
  - branch를 만들기 전에 main을 최신으로 맞춘다(`git checkout main` → `git pull`).
  - 이름은 `feature/기능이름` 형식으로, 영어 소문자와 `-`만 쓴다(예: `feature/report-screen`).
- 사용자가 "그냥 main에서 해줘"라고 해도 branch를 먼저 만든다. 이유를 짧게 설명한다.
- 기능 하나에 branch 하나. 머지가 끝난 branch는 다시 쓰지 않고 새로 만든다.
- 다른 사람 branch는 수정하지 않는다.
- 사용자가 처음 작업을 요청하면, 지금 branch 이름을 알려 주고 시작한다.
- 다른 작업이 커밋 안 한 채로 작업 폴더에 남아 있으면 섞지 않는다. 그 작업을 먼저 커밋하거나 주인에게 확인한 뒤 새 branch로 작업한다.

## Git 규칙

- main에서 직접 commit하지 않는다.
- push 전에 어떤 branch에 어떤 commit이 올라가는지 사용자에게 보여 주고 확인받는다.
- push는 자기 feature branch로만 한다(`git push -u origin feature/기능이름`). main push · force push는 하지 않는다.
- push 후 GitHub에서 PR을 만드는 링크를 알려 준다. PR 생성 · merge는 하지 않는다.
- `.claude/settings.json`의 deny 규칙을 바꾸거나 우회하지 않는다.
