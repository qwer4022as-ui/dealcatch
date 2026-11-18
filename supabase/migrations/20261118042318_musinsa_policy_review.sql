-- 0008 무신사 정책 검토 결과 반영
-- docs/platform-reviews/musinsa.md: robots.txt 가 지정 봇 외 전체 수집을 금지하므로 자동 수집하지 않는다.
-- 수동 입력(manual)으로 운영한다. 데이터 행만 바꾸며 스키마 변경은 없다.

update public.platforms
   set collection_mode    = 'manual',
       policy_reviewed_at = '2026-11-18T00:00:00+09:00',
       policy_note        = 'robots.txt 전체 수집 금지(지정 봇 제외), 공식 API 없음, Cloudflare 봇 차단 → 수동 입력만. docs/platform-reviews/musinsa.md'
 where code = 'musinsa';
