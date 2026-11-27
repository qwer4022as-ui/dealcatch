// DB 검증: 마이그레이션 + 샘플 시드를 PGlite(브라우저·Node 용 PostgreSQL 17)에 적용하고
// 제약조건·트리거·RLS·권한·DB 함수·요약 뷰를 확인한다. Docker 나 원격 DB 없이 실행된다.
// 실행: npm run test:db   (실패가 있으면 종료 코드 1)
// Supabase 환경을 흉내 낸다: anon / authenticated / service_role 역할, extensions 스키마.
// 실제 프로젝트처럼 테이블 기본 권한은 주지 않는다 (마이그레이션의 GRANT 만으로 동작해야 함).
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

const ROOT = resolve(process.argv[2] ?? ".");

const db = new PGlite({ extensions: { pg_trgm } });
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) pass++; else fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name} ${extra}`); };
const one = async (sql) => (await db.query(sql)).rows[0];
const expectError = async (name, sql, pattern) => {
  try { await db.exec(`begin; ${sql}; rollback;`); ok(name, false, "(오류가 나야 하는데 성공함)"); }
  catch (e) { await db.exec("rollback").catch(() => {}); ok(name, !pattern || pattern.test(e.message), `→ ${e.message.slice(0, 90)}`); }
};

// Supabase 환경 흉내: 역할, extensions 스키마, 기본 권한
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema extensions;
  grant usage on schema public to anon, authenticated, service_role;
  -- 실제 프로젝트와 같이 테이블 기본 권한 없음 (함수 EXECUTE 는 PostgreSQL 기본값대로 PUBLIC)
`);

const migDir = join(ROOT, "supabase/migrations");
for (const f of readdirSync(migDir).sort()) {
  try { await db.exec(readFileSync(join(migDir, f), "utf8")); console.log(`migrated ${f}`); }
  catch (e) { console.log(`MIGRATION FAILED ${f}: ${e.message}`); process.exit(1); }
}
try { await db.exec(readFileSync(join(ROOT, "supabase/seed/sample.sql"), "utf8")); console.log("seeded"); }
catch (e) { console.log(`SEED FAILED: ${e.message}`); process.exit(1); }

console.log("\n== 시드 요약");
console.table((await db.query(`
  select p.model_no, pl.code platform, count(distinct lv.id)::int variants,
         count(distinct a.id)::int attempts,
         count(distinct a.id) filter (where a.outcome <> 'success')::int failed,
         count(distinct ps.id)::int snapshots,
         to_char(min(ps.collected_at) at time zone 'Asia/Seoul','MM-DD HH24:MI') first_kst,
         to_char(max(ps.collected_at) at time zone 'Asia/Seoul','MM-DD HH24:MI') last_kst
    from products p join listings l on l.product_id=p.id join platforms pl on pl.id=l.platform_id
    join listing_variants lv on lv.listing_id=l.id
    left join collection_attempts a on a.listing_id=l.id
    left join price_snapshots ps on ps.listing_variant_id=lv.id
   group by 1,2 order by 1,2`)).rows);

console.log("== 시나리오 검증");
const stat = (label, days) => one(`
  select min(sale_price)::int m
    from price_snapshots ps join listing_variants lv on lv.id=ps.listing_variant_id
    join listings l on l.id=lv.listing_id
   where l.external_id='SMP-A-1001' and lv.option_label_raw='${label}' and not is_void
     ${days ? `and collected_at >= now() - interval '${days} days'` : ""}`);
const cur = (label) => one(`select sale_price::int p from v_latest_price v join listing_variants lv on lv.id=v.listing_variant_id
   join listings l on l.id=lv.listing_id join platforms p on p.id=l.platform_id
   where p.code='sample-a' and lv.option_label_raw='${label}'`);

ok("1 코트 블랙/M 현재가 129,000", (await cur("블랙 / M")).p === 129000);
ok("1 코트 블랙/M 수집기간 최저 119,000", (await stat("블랙 / M", 0)).m === 119000);
ok("1 코트 블랙/M 30일 최저 119,000", (await stat("블랙 / M", 30)).m === 119000);
ok("1 코트 블랙/L 추가금 반영 134,000", (await cur("블랙 / L")).p === 134000);
const b = await one(`select v.sale_price::int p from v_latest_price v join listing_variants lv on lv.id=v.listing_variant_id
   join listings l on l.id=lv.listing_id join platforms p on p.id=l.platform_id where p.code='sample-b'`);
ok("1 코트 플랫폼B 현재가 135,000", b.p === 135000);
const same = await one(`select count(distinct l.platform_id)::int n from listing_variants lv join listings l on l.id=lv.listing_id
   join product_variants pv on pv.id=lv.product_variant_id where pv.color='블랙' and pv.size='M'`);
ok("1 같은 정규 변형(블랙/M)이 플랫폼 2곳에 연결", same.n === 2);

const span = async (model) => one(`select extract(day from now() - min(ps.collected_at))::int d,
   count(distinct (ps.collected_at at time zone 'Asia/Seoul')::date) filter (where ps.collected_at >= now() - interval '30 days')::int days30
   from price_snapshots ps join listing_variants lv on lv.id=ps.listing_variant_id join listings l on l.id=lv.listing_id
   join products p on p.id=l.product_id where p.model_no='${model}'`);
const knit = await span("SMP-KNIT-02");
ok("2 니트 수집 기간 30일 미만", knit.d < 30, `(${knit.d}일)`);
const denim = await span("SMP-DNM-03");
ok("3 데님 최근 30일 수집일 비율 < 70%", denim.days30 / 30 < 0.7, `(${denim.days30}/30일)`);

const health = async (ext) => one(`select h.* from v_listing_health h join listings l on l.id=h.listing_id where l.external_id='${ext}'`);
const shirt = await health("SMP-A-1004");
ok("4 셔츠 마지막 시도 실패 + 연속 실패 3", shirt.last_outcome === "parse_error" && shirt.consecutive_failures === 3);
ok("4 셔츠 마지막 성공은 마지막 시도보다 이전", shirt.last_success_at < shirt.last_attempt_at);
const snk = await health("SMP-A-1005");
const hrs = (Date.now() - new Date(snk.last_success_at)) / 36e5;
ok("5 스니커즈 마지막 성공이 48시간 이상 전", hrs >= 48, `(${hrs.toFixed(0)}시간 전)`);

const hoodAll = await one(`select min(sale_price)::int m from price_snapshots ps join listing_variants lv on lv.id=ps.listing_variant_id
   where lv.option_label_raw='차콜 / M' and not is_void`);
const hoodInStock = await one(`select min(sale_price)::int m from price_snapshots ps join listing_variants lv on lv.id=ps.listing_variant_id
   where lv.option_label_raw='차콜 / M' and not is_void and stock_status <> 'sold_out'`);
const voided = await one(`select count(*)::int n, min(sale_price)::int m from price_snapshots where is_void`);
ok("6 후드 void 1건(9,900) 존재", voided.n === 1 && voided.m === 9900);
ok("6 후드 void 제외 최저가 45,000 (품절 포함)", hoodAll.m === 45000);
ok("6 후드 품절 제외 최저가 65,000", hoodInStock.m === 65000);

const runs = await db.query(`select status, total, succeeded, failed from collection_runs order by id`);
ok("실행 집계: A partial / B succeeded", runs.rows[0].status === "partial" && runs.rows[1].status === "succeeded",
   JSON.stringify(runs.rows));

console.log("== 요약 뷰 검증");
const hoodSum = await one(`select s.low_price::int lp, s.record_count::int rc, s.has_sample hs from v_variant_price_summary s
   join listing_variants lv on lv.id=s.listing_variant_id where lv.option_label_raw='차콜 / M'`);
const hoodCnt = await one(`select count(*)::int n from price_snapshots ps join listing_variants lv on lv.id=ps.listing_variant_id where lv.option_label_raw='차콜 / M' and not ps.is_void`);
ok("요약 뷰: 후드 M 최저가 65,000 (무효·품절 제외), 기록 수에 무효 제외", hoodSum.lp === 65000 && hoodSum.rc === hoodCnt.n && hoodSum.hs === true, JSON.stringify({ ...hoodSum, expected: hoodCnt.n }));
const coatSum = await one(`select s.low_price::int lp, to_char(s.low_at at time zone 'Asia/Seoul','HH24:MI') t from v_variant_price_summary s
   join listing_variants lv on lv.id=s.listing_variant_id join listings l on l.id=lv.listing_id
   where l.external_id='SMP-A-1001' and lv.option_label_raw='블랙 / M'`);
ok("요약 뷰: 코트 M 최저가 119,000, 최저가 시각은 가장 최근(21:00)", coatSum.lp === 119000 && coatSum.t === "21:00", JSON.stringify(coatSum));
const shirtH = await health("SMP-A-1004");
ok("상태 뷰: 셔츠 마지막 성공 이후 실패 3", shirtH.failures_since_success === 3);
const coatH = await health("SMP-A-1001");
ok("상태 뷰: 코트 실패 0", coatH.failures_since_success === 0);
await db.exec(`set role anon`);
ok("anon 요약 뷰 읽기 가능", (await one(`select count(*)::int n from v_variant_price_summary`)).n === 16);
await db.exec(`reset role`);

console.log("== 제약조건 검증 (모두 거부되어야 함)");
const anyLv = (await one(`select id from listing_variants limit 1`)).id;
const okAtt = (await one(`select a.id from collection_attempts a join listing_variants lv on lv.listing_id=a.listing_id
   where lv.id=${anyLv} and a.outcome='success' limit 1`)).id;
const failAtt = (await one(`select id from collection_attempts where outcome<>'success' limit 1`)).id;
const ins = (cols) => `insert into price_snapshots (listing_variant_id, attempt_id, collected_at, list_price, sale_price, source)
   values (${cols.lv ?? anyLv}, ${cols.att ?? okAtt}, ${cols.at ?? "now() - interval '1 minute'"}, ${cols.list ?? 100000}, ${cols.sale ?? 90000}, '${cols.src ?? "sample"}')`;
await expectError("음수 판매가", ins({ sale: -1 }), /check/);
await expectError("판매가 > 정가", ins({ sale: 200000 }), /check/);
await expectError("미래 시각", ins({ at: "now() + interval '1 day'" }), /미래/);
await expectError("실패한 시도에 가격 연결", ins({ att: failAtt }), /성공한/);
await expectError("샘플 상품에 manual 출처", ins({ src: "manual" }), /샘플/);
await expectError("잘못된 enum", ins({ src: "scrape" }), /enum/);
await expectError("중복 리스팅 (platform, external_id)", `insert into listings (product_id, platform_id, external_id, url)
   select product_id, platform_id, external_id, url from listings limit 1`, /duplicate|unique/);
await expectError("sale_price 수정", `update price_snapshots set sale_price = 1 where id = (select min(id) from price_snapshots)`, /append-only/);
await expectError("void 되돌리기", `update price_snapshots set is_void=false, void_reason=null where is_void`, /되돌릴/);
await expectError("스냅샷 삭제", `delete from price_snapshots where id = (select min(id) from price_snapshots)`, /삭제할 수 없/);
await expectError("void 사유 없이 무효 처리", `update price_snapshots set is_void=true where id = (select min(id) from price_snapshots)`, /check/);
await expectError("수집 주기 60분 미만", `update platforms set collect_interval_minutes = 10 where code='musinsa'`, /check/);

console.log("== RLS 검증");
await db.exec(`set role anon`);
const anonRead = await one(`select count(*)::int n from price_snapshots`);
ok("anon 읽기 가능", anonRead.n > 0, `(${anonRead.n}행)`);
for (const [name, sql] of [
  ["anon INSERT 거부", `insert into brands (name) values ('x')`],
  ["anon UPDATE 거부", `update products set name='x'`],
  ["anon purge_sample_data 실행 거부", `select purge_sample_data()`],
]) {
  try { await db.exec(sql); ok(name, false); } catch (e) { ok(name, /permission|denied|policy/.test(e.message), `→ ${e.message.slice(0, 60)}`); }
}
await db.exec(`reset role`);
await db.exec(`set role anon`);
const anonView = await one(`select count(*)::int n from v_latest_price`);
ok("anon 뷰 읽기 가능", anonView.n > 0, `(${anonView.n}행)`);
await db.exec(`reset role`);
await db.exec(`set role service_role`);
try {
  await db.exec(`begin; insert into brands (name) values ('service test'); update products set category = category; rollback;`);
  ok("service_role 쓰기 가능", true);
} catch (e) { await db.exec("rollback").catch(() => {}); ok("service_role 쓰기 가능", false, e.message); }
try {
  await db.exec(`update price_snapshots set sale_price = 1 where id = (select min(id) from price_snapshots)`);
  ok("service_role 도 가격 수정 불가 (트리거)", false);
} catch (e) { ok("service_role 도 가격 수정 불가 (트리거)", /append-only/.test(e.message)); }
await db.exec(`reset role`);

console.log("== 수동 등록·입력 함수");
await db.exec(`set role service_role`);
const reg = (listings, model) => `select register_product_listings('테스트 브랜드', '테스트 셔츠', ${model === null ? "null" : `'${model}'`}, '상의',
  '${JSON.stringify(listings.map(([ext, variants]) => ({ platform_code: "musinsa", external_id: ext, url: `https://www.musinsa.com/products/${ext}`, variants })))}'::jsonb) r`;
const V = (color, sizes) => sizes.map((size) => ({ color, size, label: `${color} / ${size}` }));
const r1 = (await one(reg([["1111", V("블랙", ["M", "L"])], ["1112", V("레드", ["M", "L"])], ["1113", [{ color: "화이트", size: "", label: "화이트" }]]], "TB-01"))).r;
ok("등록: 상품 1개 + 판매처 3개", r1.reused_product === false && r1.listing_ids.length === 3, JSON.stringify(r1));
r1.listing_id = r1.listing_ids[0];
const pv = await one(`select count(*)::int n from product_variants where product_id=${r1.product_id}`);
ok("등록: 정규 옵션 = 색상×사이즈 5개 (블랙 2, 레드 2, 화이트 1)", pv.n === 5, `${pv.n}`);
const per = (await db.query(`select l.external_id, count(lv.id)::int n from listings l join listing_variants lv on lv.listing_id=l.id where l.product_id=${r1.product_id} group by 1 order by 1`)).rows;
ok("등록: 판매처별 옵션 2/2/1", JSON.stringify(per.map((x) => x.n)) === "[2,2,1]");
const r2 = (await one(reg([["2222", V("블랙", ["M"])]], "TB-01"))).r;
ok("등록: 같은 브랜드·모델번호면 상품 재사용", r2.reused_product === true && r2.product_id === r1.product_id);
try { await db.exec(reg([["1111", V("x", ["y"])]], "TB-02").replace(/ r$/, "")); ok("등록: 중복 URL 거부", false); }
catch (e) { ok("등록: 중복 URL 거부", /duplicate|unique/.test(e.message)); }
const prodBefore = await one(`select count(*)::int n from products`);
const lstBefore = await one(`select count(*)::int n from listings`);
try { await db.exec(reg([["3331", V("a", ["b"])], ["3332", []]], "TB-03").replace(/ r$/, "")); ok("등록: 두 번째 판매처 실패 시 전부 취소", false); }
catch (e) {
  const pa = await one(`select count(*)::int n from products`); const la = await one(`select count(*)::int n from listings`);
  ok("등록: 두 번째 판매처 실패 시 전부 취소", pa.n === prodBefore.n && la.n === lstBefore.n && /옵션/.test(e.message), `${prodBefore.n}→${pa.n}, ${lstBefore.n}→${la.n}`);
}
try { await db.exec(reg([], "TB-04").replace(/ r$/, "")); ok("등록: 판매처 0개 거부", false); }
catch (e) { ok("등록: 판매처 0개 거부", /판매처/.test(e.message)); }
const oldFn = await one(`select count(*)::int n from pg_proc where proname='register_product'`);
ok("기존 register_product 함수 삭제됨", oldFn.n === 0);

const lvs = (await db.query(`select id from listing_variants where listing_id=${r1.listing_id} order by id`)).rows;
const items = JSON.stringify([{ listing_variant_id: lvs[0].id, list_price: 59000, sale_price: 39000, stock_status: "in_stock" }, { listing_variant_id: lvs[1].id, list_price: 59000, sale_price: 41000 }]);
const att = (await one(`select record_manual_prices(${r1.listing_id}, now() - interval '1 hour', '${items}'::jsonb) a`)).a;
const snaps = await one(`select count(*)::int n, bool_and(source='manual') m, min(stock_status::text) st from price_snapshots where attempt_id=${att}`);
ok("가격 입력: 시도 1건 + 기록 2건, 출처 manual", snaps.n === 2 && snaps.m === true, JSON.stringify(snaps));
const cnt = async () => (await one(`select count(*)::int n from collection_attempts where listing_id=${r1.listing_id}`)).n;
const attBefore = await cnt();
try { await db.exec(`select record_manual_prices(${r1.listing_id}, now() + interval '1 day', '${items}'::jsonb)`); ok("가격 입력: 미래 시각 거부 + 시도도 취소", false); }
catch (e) { ok("가격 입력: 미래 시각 거부 + 시도도 취소", /미래/.test(e.message) && (await cnt()) === attBefore); }
const otherLv = (await one(`select lv.id from listing_variants lv where lv.listing_id <> ${r1.listing_id} limit 1`)).id;
try { await db.exec(`select record_manual_prices(${r1.listing_id}, now() - interval '2 hour', '[{"listing_variant_id": ${otherLv}, "sale_price": 1000}]'::jsonb)`); ok("가격 입력: 다른 리스팅 옵션 거부", false); }
catch (e) { ok("가격 입력: 다른 리스팅 옵션 거부", /리스팅|샘플/.test(e.message), e.message.slice(0, 50)); }
const sampleListing = (await one(`select l.id, lv.id lv from listings l join products p on p.id=l.product_id join listing_variants lv on lv.listing_id=l.id where p.is_sample limit 1`));
try { await db.exec(`select record_manual_prices(${sampleListing.id}, now() - interval '3 hour', '[{"listing_variant_id": ${sampleListing.lv}, "sale_price": 1000}]'::jsonb)`); ok("가격 입력: 샘플 상품에 수동 가격 거부", false); }
catch (e) { ok("가격 입력: 샘플 상품에 수동 가격 거부", /샘플/.test(e.message)); }
await db.exec(`reset role`);
await db.exec(`set role anon`);
for (const fn of [`register_product_listings('b','n',null,null,'[]'::jsonb)`, `record_manual_prices(1, now(), '[]'::jsonb)`]) {
  try { await db.exec(`select ${fn}`); ok(`anon ${fn.split("(")[0]} 실행 거부`, false); }
  catch (e) { ok(`anon ${fn.split("(")[0]} 실행 거부`, /permission/.test(e.message)); }
}
await db.exec(`reset role`);
// 다음 검증(샘플 삭제)에 영향 없도록 테스트 데이터는 그대로 둔다: purge 는 실제 데이터를 지우지 않아야 함
console.log("== 일괄 기록");
await db.exec(`set role service_role`);
const bl = (await db.query(`select l.id lid, array_agg(lv.id order by lv.id) lvs from listings l join listing_variants lv on lv.listing_id=l.id
  join products p on p.id=l.product_id where not p.is_sample group by l.id order by l.id limit 2`)).rows;
const payload = (sale) => JSON.stringify(bl.map((r) => ({ listing_id: r.lid, items: r.lvs.map((id) => ({ listing_variant_id: id, list_price: 99900, sale_price: sale, stock_status: "unknown" })) })));
const attBefore2 = (await one(`select count(*)::int n from collection_attempts`)).n;
const T0 = (await one(`select to_char(now() - interval '30 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') t`)).t;
const batchCnt = (await one(`select record_manual_prices_batch('${T0}'::timestamptz, '${payload(84900)}'::jsonb) c`)).c;
const attAfter2 = (await one(`select count(*)::int n from collection_attempts`)).n;
ok("일괄 기록: 판매처 2개 → 시도 2건", batchCnt === 2 && attAfter2 - attBefore2 === 2, `${batchCnt}, +${attAfter2 - attBefore2}`);
try { await db.exec(`select record_manual_prices_batch('${T0}'::timestamptz, '${payload(84900)}'::jsonb)`); ok("일괄 기록: 같은 시각 중복이면 전부 취소", false); }
catch (e) { ok("일괄 기록: 같은 시각 중복이면 전부 취소", (await one(`select count(*)::int n from collection_attempts`)).n === attAfter2, e.message.slice(0, 50)); }
const sampleL = (await one(`select l.id lid, lv.id lv from listings l join listing_variants lv on lv.listing_id=l.id join products p on p.id=l.product_id where p.is_sample limit 1`));
const mixed = JSON.stringify([...JSON.parse(payload(83000)), { listing_id: sampleL.lid, items: [{ listing_variant_id: sampleL.lv, sale_price: 1000 }] }]);
try { await db.exec(`select record_manual_prices_batch(now() - interval '10 minutes', '${mixed}'::jsonb)`); ok("일괄 기록: 샘플 상품이 섞이면 전부 취소", false); }
catch (e) { ok("일괄 기록: 샘플 상품이 섞이면 전부 취소", (await one(`select count(*)::int n from collection_attempts`)).n === attAfter2 && /샘플/.test(e.message)); }
await db.exec(`reset role`);
await db.exec(`set role anon`);
try { await db.exec(`select record_manual_prices_batch(now(), '[]'::jsonb)`); ok("anon 일괄 기록 실행 거부", false); }
catch (e) { ok("anon 일괄 기록 실행 거부", /permission/.test(e.message)); }
await db.exec(`reset role`);

console.log("== 일괄 등록");
await db.exec(`set role service_role`);
const T1 = (await one(`select to_char(now() - interval '20 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') t`)).t;
const regItems = (ids, sale = 84900) => JSON.stringify(ids.map((id) => ({ brand: "피뎁트 모터사이클", name: `Item ${id}`, external_id: String(id), url: `https://www.musinsa.com/products/${id}`, list_price: 99900, sale_price: sale, stock_status: "unknown" })));
const prodBefore3 = (await one(`select count(*)::int n from products`)).n;
const regCnt = (await one(`select register_and_record_batch('${T1}'::timestamptz, '${regItems([9100001, 9100002, 9100003])}'::jsonb) c`)).c;
const chk = await one(`select count(distinct p.id)::int prods, count(lv.id)::int lvs, count(ps.id)::int snaps, min(lv.option_label_raw) lbl, bool_and(ps.source='manual') manual
  from listings l join products p on p.id=l.product_id join listing_variants lv on lv.listing_id=l.id left join price_snapshots ps on ps.listing_variant_id=lv.id
  where l.external_id in ('9100001','9100002','9100003')`);
ok("일괄 등록: 상품 3개, 옵션 '전체 옵션' 1개씩, 가격 3건 (manual)", regCnt === 3 && chk.prods === 3 && chk.lvs === 3 && chk.snaps === 3 && chk.lbl === "전체 옵션" && chk.manual === true, JSON.stringify(chk));
const brandCnt = (await one(`select count(*)::int n from brands where name_normalized = lower(regexp_replace('피뎁트 모터사이클', '\\s+', '', 'g'))`)).n;
ok("일괄 등록: 같은 브랜드는 하나로", brandCnt === 1);
const prodMid = (await one(`select count(*)::int n from products`)).n;
try { await db.exec(`select register_and_record_batch('${T1}'::timestamptz, '${regItems([9100004, 9100001])}'::jsonb)`); ok("일괄 등록: 이미 등록된 상품이 섞이면 전부 취소", false); }
catch (e) { ok("일괄 등록: 이미 등록된 상품이 섞이면 전부 취소", (await one(`select count(*)::int n from products`)).n === prodMid, e.message.slice(0, 40)); }
try { await db.exec(`select register_and_record_batch('${T1}'::timestamptz, '${regItems([9100005], 200000)}'::jsonb)`); ok("일괄 등록: 판매가 > 정가면 전부 취소", false); }
catch { ok("일괄 등록: 판매가 > 정가면 전부 취소", (await one(`select count(*)::int n from products`)).n === prodMid); }
const T2 = (await one(`select to_char(now() - interval '15 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') t`)).t;
const existingL = (await one(`select l.id lid, array_agg(lv.id) lvs from listings l join listing_variants lv on lv.listing_id=l.id where l.external_id='9100001' group by l.id`));
const recPart = JSON.stringify([{ listing_id: existingL.lid, items: existingL.lvs.map((id) => ({ listing_variant_id: id, sale_price: 80000, list_price: 99900 })) }]);
const both = (await one(`select capture_batch_save('${T2}'::timestamptz, '${recPart}'::jsonb, '${regItems([9100006, 9100007])}'::jsonb) r`)).r;
ok("저장 1회: 기록 1 + 등록 2", both.recorded === 1 && both.registered === 2, JSON.stringify(both));
const prodNow = (await one(`select count(*)::int n from products`)).n;
const T3 = (await one(`select to_char(now() - interval '14 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') t`)).t;
try { await db.exec(`select capture_batch_save('${T3}'::timestamptz, '${recPart}'::jsonb, '${regItems([9100008, 9100006])}'::jsonb)`); ok("저장 1회: 등록 중 하나 실패하면 기록까지 전부 취소", false); }
catch {
  const snapAt = (await one(`select count(*)::int n from price_snapshots where collected_at='${T3}'::timestamptz`)).n;
  ok("저장 1회: 등록 중 하나 실패하면 기록까지 전부 취소", snapAt === 0 && (await one(`select count(*)::int n from products`)).n === prodNow);
}
try { await db.exec(`select capture_batch_save(now(), '[]'::jsonb, '[]'::jsonb)`); ok("저장 1회: 빈 요청 거부", false); }
catch (e) { ok("저장 1회: 빈 요청 거부", /없습니다/.test(e.message)); }
await db.exec(`reset role`);
await db.exec(`set role anon`);
try { await db.exec(`select capture_batch_save(now(), '[]'::jsonb, '[]'::jsonb)`); ok("anon 일괄 저장 실행 거부", false); }
catch (e) { ok("anon 일괄 저장 실행 거부", /permission/.test(e.message)); }
await db.exec(`reset role`);
void prodBefore3;

console.log("== 가격 알림");
const hoodLow = await one(`select s.low_price::int lp, s.low_first_at < s.low_at as later, s.first_collected_at < s.low_first_at as hadEarlier
  from v_variant_price_summary s join listing_variants lv on lv.id=s.listing_variant_id where lv.option_label_raw='차콜 / M'`);
ok("요약 뷰: 후드 M 최저가는 첫 기록부터 같은 값 → 갱신 아님", hoodLow.lp === 65000 && hoodLow.later === true && hoodLow.hadearlier === false, JSON.stringify(hoodLow));
const coatLow = await one(`select s.low_price::int lp, s.first_collected_at < s.low_first_at as hadEarlier,
  extract(day from now() - s.low_first_at)::int as days from v_variant_price_summary s join listing_variants lv on lv.id=s.listing_variant_id
  join listings l on l.id=lv.listing_id where l.external_id='SMP-A-1001' and lv.option_label_raw='블랙 / M'`);
ok("요약 뷰: 코트 M 은 25일 전 119,000원으로 최저가 갱신", coatLow.lp === 119000 && coatLow.hadearlier === true && coatLow.days === 25, JSON.stringify(coatLow));
await db.exec(`set role service_role`);
const realProduct = (await one(`select id from products where not is_sample limit 1`)).id;
await db.exec(`insert into price_alerts (product_id, target_price) values (${realProduct}, 50000)`);
ok("service_role 목표가 저장", (await one(`select target_price from price_alerts where product_id=${realProduct}`)).target_price === 50000);
try { await db.exec(`update price_alerts set target_price = -1 where product_id=${realProduct}`); ok("음수 목표가 거부", false); }
catch (e) { ok("음수 목표가 거부", /check/.test(e.message)); }
await db.exec(`reset role`);
await db.exec(`set role anon`);
try { await db.exec(`select * from price_alerts`); ok("anon 목표가 읽기 거부", false); }
catch (e) { ok("anon 목표가 읽기 거부", /permission/.test(e.message)); }
await db.exec(`reset role`);

console.log("== 샘플 삭제");
const before = await one(`select count(*)::int n from platforms where collection_mode <> 'sample'`);
await db.exec(`set role service_role`);
const res = await one(`select purge_sample_data() r`);
await db.exec(`reset role`);
console.log("   ", JSON.stringify(res.r));
const after = await one(`select (select count(*) from products)::int p, (select count(*) from price_snapshots)::int s,
   (select count(*) from collection_attempts)::int a, (select count(*) from collection_runs)::int r,
   (select count(*) from brands)::int b, (select count(*) from platforms where collection_mode='sample')::int sp,
   (select count(*) from platforms where collection_mode<>'sample')::int real`);
const realLeft = await one(`select (select count(*) from products where not is_sample)::int p, (select count(*) from price_snapshots where source='manual')::int s`);
ok("샘플 행 모두 삭제, 실제(수동) 데이터는 유지", after.p === realLeft.p && after.s === realLeft.s && realLeft.p >= 1 && realLeft.s > 0 && after.r + after.sp === 0, JSON.stringify({after, realLeft}));
ok("실제 플랫폼 3개 유지", after.real === before.n && before.n === 3);
await db.exec(readFileSync(join(ROOT, "supabase/seed/sample.sql"), "utf8").replace(/create function pg_temp/g, "create or replace function pg_temp"));
ok("purge 후 시드 재적용 가능", (await one(`select count(*)::int n from products where is_sample`)).n === 6);

// 데모 시드 (supabase/seed/demo_90d.sql): 90일 상품 10개. 위 검사 개수에 섞이지 않게 같은 DB 에서 마지막에 확인
const demo = readFileSync(join(ROOT, "supabase/seed/demo_90d.sql"), "utf8");
await db.exec(demo);
const d1 = await one(`select count(*)::int p,
   (select count(distinct (ps.collected_at at time zone 'Asia/Seoul')::date)::int from price_snapshots ps
      join listing_variants lv on lv.id = ps.listing_variant_id join listings l on l.id = lv.listing_id
      join products pr on pr.id = l.product_id where pr.model_no like 'SMP-D-%') days,
   (select bool_and(ps.source = 'sample') from price_snapshots ps join listing_variants lv on lv.id = ps.listing_variant_id
      join listings l on l.id = lv.listing_id join products pr on pr.id = l.product_id where pr.model_no like 'SMP-D-%') all_sample
   from products where model_no like 'SMP-D-%' and is_sample`);
ok("데모 시드: 샘플 상품 10개 · 91일 · 전부 source=sample", d1.p === 10 && d1.days === 91 && d1.all_sample, JSON.stringify(d1));
await db.exec(demo);
ok("데모 시드: 다시 실행해도 중복 없음", (await one(`select count(*)::int n from products where model_no like 'SMP-D-%'`)).n === 10);
await db.exec(`select purge_sample_data()`);
ok("데모 시드: purge 로 모두 삭제", (await one(`select count(*)::int n from products where model_no like 'SMP-D-%'`)).n === 0);

console.log(`\n결과: ${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
