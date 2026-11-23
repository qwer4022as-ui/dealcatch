// 상품 이미지를 저장하지 않으므로(수집 원칙), 상품명·색상으로 의류 종류와 색을 추정한 아이콘을 썬네일 대신 보여 준다.
// 장식용이며 가격 데이터와 무관하다.

type Kind = "tee" | "shirt" | "hoodie" | "jacket" | "pants";

const KIND_RULES: [Kind, RegExp][] = [
  ["pants", /pants|팬츠|바지|overall|오버롤|jean|데님|슬랙스|trouser/i],
  ["jacket", /parka|파카|jacket|자켓|재킷|anorak|아노락|windbreaker|바람막이|bomber|봄버|blouson|블루종|coat|코트|패딩|padded|down/i],
  ["hoodie", /hood|후드|zip|집업|sweat|맨투맨|cardigan|가디건/i],
  ["shirt", /shirt|셔츠|블라우스|blouse/i],
];

const COLOR_RULES: [string, RegExp][] = [
  ["#e5484d", /red|레드|빨강/i],
  ["#2f3c7e", /navy|네이비/i],
  ["#f1f0f5", /white|화이트|흰색|아이보리|ivory|cream|크림/i],
  ["#5b5866", /charcoal|차콜/i],
  ["#a3a1ad", /gray|grey|그레이|회색/i],
  ["#6fbf73", /green|그린|카키|khaki|olive/i],
  ["#4d7cfe", /blue|블루/i],
  ["#c8a26b", /beige|베이지|brown|브라운|camel/i],
  ["#1e1c26", /black|블랙|검정/i],
];

function pick<T>(rules: [T, RegExp][], text: string, fallback: T): T {
  for (const [v, re] of rules) if (re.test(text)) return v;
  return fallback;
}

const PATHS: Record<Kind, string> = {
  tee: "M9 4 4 7l2 4 3-1.5V20h10V9.5l3 1.5 2-4-5-3c-.6 1.6-2.2 2.5-4 2.5S9.6 5.6 9 4Z",
  shirt: "M9 4 4 7l2 4 3-1.5V20h10V9.5l3 1.5 2-4-5-3-3 4-3-4Z",
  hoodie: "M9.5 4.5C10 2.8 11.8 2 14 2s4 .8 4.5 2.5L23 7.5l-1.8 4.5-2.7-1.3V21h-9V10.7L6.8 12 5 7.5l4.5-3Z",
  jacket: "M10 3 4.5 6 3 21h4.5v-9 9H13V7l-3-4Zm8 0 5.5 3L25 21h-4.5v-9 9H15V7l3-4Z",
  pants: "M8 3h12l1.5 18H16l-2-11-2 11H6.5L8 3Z",
};

export function GarmentIcon({ name, color = "", size = "md" }: { name: string; color?: string; size?: "md" | "lg" }) {
  const kind = pick(KIND_RULES, name, "tee");
  const fill = pick(COLOR_RULES, `${color} ${name}`, "#8b7ad8");
  const dark = fill === "#1e1c26";
  return (
    <span
      className={`grid shrink-0 place-items-center bg-zinc-800/70 ring-1 ring-inset ring-zinc-700/60 ${
        size === "lg" ? "h-20 w-20 rounded-2xl sm:h-32 sm:w-32 sm:rounded-3xl bg-gradient-to-br from-zinc-700/60 to-zinc-900" : "h-11 w-11 rounded-xl"
      }`}
      aria-hidden
    >
      <svg viewBox="0 0 28 24" className={size === "lg" ? "h-12 w-12 drop-shadow-lg sm:h-20 sm:w-20" : "h-7 w-7"}>
        <path
          d={PATHS[kind]}
          fill={fill}
          stroke={dark ? "#6b6780" : "rgb(0 0 0 / 0.35)"}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
