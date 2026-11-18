# 데이터베이스 설계 (Supabase / PostgreSQL)

> 상태: 초안 v0.1 (2026-11-18)
> 관련 문서: [PRD.md](PRD.md) · [architecture.md](architecture.md) · [wireframe.md](wireframe.md)

## 1. 설계 원칙

1. **가격은 플랫폼 판매 옵션(listing_variant) 단위로 저장**한다. 같은 상품이라도 사이즈나 색상, 플랫폼에 따라 가격이 다를 수 있다.
2. **정규 상품(product)과 플랫폼 판매 정보(listing)를 분리**한다. 플랫폼 간 비교는 같은 `product_variant`에 연결된 판매 옵션끼리 한다.
3. **가격 기록은 append-only**다. 수정 대신 `is_void`로 무효 처리한다. 보간하거나 추정한 값은 저장하지 않는다.
4. **모든 가격 기록에 출처(source)와 수집 시도(attempt)를 남긴다.**
5. **AI 결과는 별도 테이블**에 저장하고 가격 테이블을 참조만 한다.
6. 금액은 `integer`(원), 시각은 `timestamptz`(UTC).

## 2. ERD

```
brands 1─< products 1─< product_variants
                │                 │
                │                 │ (nullable, 매칭 전에는 비어 있음)
                1                 │
                ┴                 │
platforms 1─< listings 1─< listing_variants >─┘
                │                 │
                │                 1
                │                 ┴
                │           price_snapshots >─ collection_attempts >─ collection_runs
                │                                      │
                └──────────────< collection_attempts ──┘

(P2) price_alerts >─ product_variants        alert_events >─ price_alerts
(P2) ai_insights  ── target(product | listing_variant)
```

## 3. 테이블 정의

### 3.1 `platforms` — 쇼핑 플랫폼과 수집 정책

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | `smallint` | PK | |
| code | `text` | UNIQUE, NOT NULL | `musinsa`, `29cm`, `wconcept` (마이그레이션에서 등록), `sample-a`, `sample-b` (시드) |
| name | `text` | NOT NULL | 표시명 |
| base_url | `text` | | |
| collection_mode | `collection_mode` enum | NOT NULL, default `'disabled'` | `disabled` / `manual` / `sample` / `api` / `crawl` |
| policy_reviewed_at | `timestamptz` | | 약관·robots 검토 날짜 |
| policy_note | `text` | | 검토 결론 요약과 문서 링크 |
| collect_interval_minutes | `integer` | CHECK ≥ 60 | 자동 수집 주기 |
| is_paused | `boolean` | default false | `blocked` 발생 시 전체 중지 |

### 3.2 `brands`

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | `bigint` identity | PK | |
| name | `text` | NOT NULL | 표시명 |
| name_normalized | `text` | UNIQUE | 소문자, 공백 제거. 검색·중복 방지용 |

### 3.3 `products` — 정규 상품 (플랫폼 무관)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | `bigint` identity | PK | |
| brand_id | `bigint` | FK → brands, NOT NULL | |
| name | `text` | NOT NULL | 정규 상품명 |
| model_no | `text` | | 브랜드 품번(스타일 코드). 플랫폼 간 매칭 키 |
| category | `text` | | 상의, 하의, 아우터 등 |
| is_sample | `boolean` | NOT NULL, default false | 샘플 상품 표시 |
| created_at | `timestamptz` | default now() | |

- UNIQUE(`brand_id`, `model_no`) WHERE `model_no IS NOT NULL`
- 검색: `pg_trgm` GIN 인덱스(`name`, `model_no`). 한글 부분 일치 검색에 사용

### 3.4 `product_variants` — 정규 변형 (색상 × 사이즈)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | `bigint` identity | PK | |
| product_id | `bigint` | FK → products ON DELETE RESTRICT | |
| color | `text` | NOT NULL, default `''` | 정규화한 색상명 |
| color_code | `text` | | 브랜드 색상 코드(있으면) |
| size | `text` | NOT NULL, default `''` | `S`, `M`, `270`, `FREE` 등 |
| sku | `text` | | 품번 + 색상 + 사이즈 조합(있으면) |

- UNIQUE(`product_id`, `color`, `size`)
- 색상이나 사이즈가 없는 상품은 빈 문자열을 쓴다. NULL이면 유니크 제약이 동작하지 않기 때문이다.

### 3.5 `listings` — 플랫폼별 판매 페이지

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | `bigint` identity | PK | |
| product_id | `bigint` | FK → products, NOT NULL | |
| platform_id | `smallint` | FK → platforms, NOT NULL | |
| external_id | `text` | NOT NULL | 플랫폼 상품 번호 |
| url | `text` | NOT NULL | 정규화된 URL (추적 파라미터 제거) |
| title_on_platform | `text` | | 플랫폼 표기 상품명 |
| status | `listing_status` enum | default `'active'` | `active` / `paused` / `not_found` / `ended` |
| consecutive_failures | `integer` | default 0 | 3회 이상이면 자동 `paused` |
| created_at | `timestamptz` | default now() | |

- UNIQUE(`platform_id`, `external_id`) → 중복 등록 방지

### 3.6 `listing_variants` — 플랫폼 옵션

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | `bigint` identity | PK | |
| listing_id | `bigint` | FK → listings ON DELETE RESTRICT | |
| product_variant_id | `bigint` | FK → product_variants ON DELETE SET NULL, **nullable** | 정규 변형과 매칭. 매칭 전에는 NULL |
| external_option_id | `text` | | 플랫폼 옵션 ID |
| option_label_raw | `text` | NOT NULL | 플랫폼 원문 옵션명 (예: "블랙 / M") |
| is_active | `boolean` | default true | |

- UNIQUE(`listing_id`, `option_label_raw`)
- 원문 옵션명을 보존해서 매칭 오류를 나중에 고칠 수 있게 한다.

### 3.7 `price_snapshots` — 가격 이력 (핵심)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | `bigint` identity | PK | |
| listing_variant_id | `bigint` | FK → listing_variants, NOT NULL | |
| attempt_id | `bigint` | FK → collection_attempts, NOT NULL | 어떤 수집 시도의 결과인지 |
| collected_at | `timestamptz` | NOT NULL | 실제 가격을 확인한 시각 |
| list_price | `integer` | CHECK > 0 | 정가 (없을 수 있음) |
| sale_price | `integer` | NOT NULL, CHECK > 0 | **비교 기준 가격** (로그인 없이 보이는 판매가) |
| member_price | `integer` | CHECK > 0 | 회원가 등 (참고용, 비교 미사용) |
| stock_status | `stock_status` enum | default `'unknown'` | `in_stock` / `low` / `sold_out` / `unknown` |
| currency | `char(3)` | default `'KRW'` | |
| source | `price_source` enum | NOT NULL | `sample` / `manual` / `api` / `crawl` |
| is_void | `boolean` | default false | 잘못된 기록 무효 처리 |
| void_reason | `text` | | |
| created_at | `timestamptz` | default now() | DB 기록 시각 (collected_at과 다를 수 있음) |

- CHECK(`list_price IS NULL OR sale_price <= list_price`). 위반하면 수집 데이터 이상으로 보고 `parse_error` 처리
- CHECK(`NOT is_void OR void_reason IS NOT NULL`), UNIQUE(`listing_variant_id`, `collected_at`)
- INDEX(`listing_variant_id`, `collected_at DESC`) WHERE `NOT is_void`
- INSERT 트리거: 미래 시각 금지, `outcome='success'`인 시도에만 연결, 시도와 옵션의 리스팅 일치, **샘플 상품 ↔ `source='sample'` 일치**(샘플과 실제 데이터 혼합 방지), 무효 상태로 INSERT 금지
- UPDATE 트리거: `is_void`, `void_reason` 외 컬럼 수정 금지, 무효 → 유효 되돌리기 금지
- DELETE 트리거: 금지. `purge_sample_data()` 안에서 `source='sample'` 행만 예외
- 모든 FK는 `ON DELETE RESTRICT`(정규 변형 연결만 `SET NULL`)로, 상위 행을 지워 가격 이력이 함께 사라지는 일을 막는다
- **품절 시 가격**: 품절 상태여도 표시 가격이 있으면 저장하되, 통계 계산 시 품절 기록 포함 여부는 설정값으로 둔다(기본: 포함하지 않음)

### 3.8 `collection_runs` — 수집 실행 단위

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | `bigint` identity | PK | |
| platform_id | `smallint` | FK | |
| trigger | `run_trigger` enum | NOT NULL | `cron` / `manual` / `seed` |
| started_at | `timestamptz` | NOT NULL | |
| finished_at | `timestamptz` | | |
| status | `run_status` enum | | `running` / `succeeded` / `partial` / `failed` |
| total / succeeded / failed | `integer` | | 집계 |

### 3.9 `collection_attempts` — 리스팅별 수집 시도

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | `bigint` identity | PK | |
| run_id | `bigint` | FK → collection_runs, nullable | 수동 입력은 NULL 가능 |
| listing_id | `bigint` | FK → listings, NOT NULL | |
| attempted_at | `timestamptz` | NOT NULL | |
| outcome | `attempt_outcome` enum | NOT NULL | `success` / `http_error` / `blocked` / `not_found` / `parse_error` / `timeout` / `policy_disabled` / `unknown` |
| http_status | `smallint` | | |
| error_detail | `text` | | 최대 1000자 |
| duration_ms | `integer` | | |

- INDEX(`listing_id`, `attempted_at DESC`)
- 실패 기록은 스냅샷이 없는 시도로 남는다. "수집 실패"와 "수집 안 함"을 구분하는 근거가 된다.

### 3.10 확장 테이블 (P2, 마이그레이션은 나중에)

**`price_alerts`**

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint PK | |
| product_variant_id | bigint FK | 정규 변형 기준 (플랫폼 무관) |
| platform_id | smallint FK nullable | NULL이면 모든 플랫폼 |
| condition | enum | `below_price` / `new_period_low` / `drop_percent` |
| threshold | integer | 가격 또는 % |
| is_active | boolean | |

**`alert_events`**: `alert_id`, `snapshot_id`, `triggered_at`, `delivered_at`, `channel`

**`ai_insights`**

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint PK | |
| target_type | enum | `product` / `listing_variant` |
| target_id | bigint | |
| kind | text | `buy_timing`, `summary` 등 |
| content | text | AI 생성 텍스트 |
| model | text | 사용한 모델 ID |
| prompt_version | text | |
| input_from / input_to | timestamptz | 입력으로 쓴 스냅샷 기간 |
| input_snapshot_count | integer | |
| input_stats | jsonb | AI에 전달한 통계 값 (재현·검증용) |
| generated_at | timestamptz | |

## 4. Enum 정의

```
collection_mode : disabled | manual | sample | api | crawl
listing_status  : active | paused | not_found | ended
stock_status    : in_stock | low | sold_out | unknown
price_source    : sample | manual | api | crawl
run_trigger     : cron | manual | seed
run_status      : running | succeeded | partial | failed
attempt_outcome : success | http_error | blocked | not_found | parse_error | timeout | policy_disabled | unknown
```

## 5. 뷰와 조회

### 5.1 `v_latest_price` — 변형별 최신 유효 가격

```sql
-- 설계안
select distinct on (ps.listing_variant_id)
       ps.listing_variant_id, ps.sale_price, ps.list_price,
       ps.collected_at, ps.source, ps.stock_status
from price_snapshots ps
where not ps.is_void
order by ps.listing_variant_id, ps.collected_at desc;
```

### 5.2 `v_listing_health` — 리스팅별 수집 상태

마지막 시도 시각과 결과, 마지막 성공 시각, 연속 실패 횟수. 목록 화면의 상태 배지에 사용한다.

### 5.3 통계 계산 위치

30일·90일 최저가, 커버리지, 상태 판정은 **애플리케이션의 `lib/pricing`(순수 함수)에서 계산**한다. DB는 기간 내 스냅샷과 시도 기록만 반환한다.

- 이유: 커버리지와 "데이터 부족" 판정 규칙을 단위 테스트로 검증하기 쉽고, 규칙을 바꿀 때 마이그레이션이 필요 없다.
- 데이터가 커지면(상품 수천 개 이상) 일별 집계 테이블 `daily_price_summary`(KST 일 단위 최저·최고·종가)를 추가한다. 이 집계도 실제 스냅샷에서만 만들며, 스냅샷이 없는 날은 행을 만들지 않는다.

## 6. RLS (Row Level Security)

| 테이블 | anon (브라우저) | service role (서버) |
|---|---|---|
| platforms, brands, products, product_variants, listings, listing_variants | SELECT | ALL |
| price_snapshots | SELECT | INSERT, UPDATE(`is_void`, `void_reason`만) |
| collection_runs, collection_attempts | SELECT | INSERT, UPDATE |
| ai_insights, price_alerts | SELECT (P2에서 사용자 단위로 변경) | ALL |

모든 테이블에 RLS를 켠다. 정책이 없는 테이블은 anon이 접근할 수 없다.

## 7. 마이그레이션과 시드

```
supabase/
├── migrations/
│   ├── 20261118000100_enums.sql
│   ├── 20261118000200_core_tables.sql        # platforms … listing_variants, 실제 플랫폼 3개(disabled)
│   ├── 20261118000300_price_and_collection.sql  # + 무결성 트리거, purge_sample_data()
│   ├── 20261118000400_views.sql
│   └── 20261118000500_rls.sql
├── seed/
│   └── sample.sql                  # config.toml [db.seed] sql_paths 에 등록
└── config.toml
```

- 파일명 앞 숫자는 Supabase CLI가 적용 순서를 정하는 버전 번호다. 새 마이그레이션은 `npx supabase migration new <이름>`으로 만든다.

- 스키마 변경은 마이그레이션 파일로만 한다. Supabase 대시보드에서 직접 바꾸지 않는다.
- `supabase gen types typescript`로 생성한 타입 파일을 커밋해서 PC와 노트북의 타입을 같게 유지한다.

### 샘플 시드 구성 (검증용 시나리오)

| 샘플 상품 | 목적 |
|---|---|
| 샘플 상품 (모델번호) | 데이터 | 목적 |
|---|---|---|
| 울 코트 (SMP-COAT-01) | 130일, 할인 2회, 블랙/L +5,000원, 플랫폼 B에도 블랙/M 60일 | 30·90일 최저가 정상 표시, 변형별 가격, 플랫폼별 비교 |
| 램스울 니트 (SMP-KNIT-02) | 20일 | 30일·90일 "데이터 부족" |
| 와이드 데님 (SMP-DNM-03) | 50일, 20~34일 전 공백 | 커버리지 기준 미달, 그래프 공백 |
| 옥스포드 셔츠 (SMP-SHT-04) | 60일, 최근 3회 연속 실패 | "수집 실패" 배지, 마지막 성공가 + 경고 |
| 캔버스 스니커즈 (SMP-SNK-05) | 40일, 3일 전부터 수집 없음 | "오래된 데이터" |
| 집업 후드 (SMP-HD-06) | 100일, 10~15일 전 품절(이때 최저가), void 이상치 1건 | 품절 제외 규칙, void 제외 |

수집 시각은 매일 09:00, 21:00(KST)이고, 날짜는 시드 실행 시점 기준 "N일 전"으로 계산한다.

- 모든 샘플 상품은 `is_sample=true`, 가상 브랜드, `source='sample'`이다.
- 삭제: append-only 트리거가 `price_snapshots` DELETE를 막으므로, 전용 함수 `purge_sample_data()`만 샘플 행(`source='sample'`) 삭제를 허용한다. 이 함수는 샘플 스냅샷 → 샘플 시도·실행 → `is_sample` 상품 순으로 삭제하며, 실제 수집 데이터는 건드리지 않는다.

## 8. 용량 추정

20개 상품 × 평균 10개 변형 × 하루 4회 = 하루 800행, 1년 약 29만 행. 행당 약 100바이트로 잡으면 연 30MB 안팎이라 Supabase 무료 플랜 용량 안에 들어간다. 인덱스를 포함해도 MVP 규모에서는 문제없다.

## 9. 예상 기술적 문제

| 문제 | 대응 |
|---|---|
| 옵션명 표기가 플랫폼마다 다름 ("BLACK/M", "블랙 M") | 원문 보존 + 수동 매칭 UI. 정규화 사전은 P2 |
| 색상별로 품번이 다른 브랜드 | 색상별 품번이면 `color_code`에 저장하고 product는 스타일 단위로 유지 |
| 같은 시각에 중복 수집 | UNIQUE(`listing_variant_id`, `collected_at`) 추가 고려 |
| 플랫폼이 상품 번호를 재사용하거나 변경 | `listings.status='ended'` 처리 후 새 리스팅 생성 |
| NULL 유니크 제약 함정 | 빈 문자열 기본값 사용 (§3.4) |
| append-only 강제 | 트리거로 UPDATE 컬럼 제한, DELETE는 service role에서도 막음 |

## 10. 테스트 및 검증 기준

- [ ] 마이그레이션이 빈 DB에 처음부터 끝까지 오류 없이 적용된다 (`supabase db reset`)
- [ ] 제약 위반 테스트: 음수 가격, `sale_price > list_price`, 중복 `(platform_id, external_id)`, 잘못된 enum 입력이 모두 거부된다
- [ ] `price_snapshots`의 `sale_price` UPDATE와 DELETE가 거부되고, `is_void` UPDATE만 허용된다
- [ ] anon 키로 INSERT를 시도하면 RLS로 거부된다
- [ ] 샘플 시드 적용 후 §7 시나리오가 모두 조회된다
- [ ] 검증 SQL(직접 계산한 30일 최저가)과 애플리케이션 계산 결과가 일치한다
- [ ] `purge_sample_data()` 실행 후 샘플 관련 행이 0건이고, `source <> 'sample'` 행 수는 그대로다
