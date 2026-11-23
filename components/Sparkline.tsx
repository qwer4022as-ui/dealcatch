/**
 * 미니 가격 그래프. 값이 없는 날(null)은 선을 끊는다 (보간하지 않음, PRD P1).
 * 장식이 아니라 데이터이므로 aria-label 로 요약을 제공한다.
 */
export function Sparkline({ values, width = 128, height = 34, label }: {
  values: readonly (number | null)[];
  width?: number;
  height?: number;
  label: string;
}) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) {
    return (
      <span className="inline-block text-xs text-zinc-500" style={{ width }}>
        기록 없음
      </span>
    );
  }
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const pad = 4;
  const x = (i: number) => pad + (i / Math.max(values.length - 1, 1)) * (width - pad * 2);
  const y = (v: number) => (max === min ? height / 2 : pad + (1 - (v - min) / (max - min)) * (height - pad * 2));

  // 연속 구간마다 선·면을 따로 그린다
  const segments: [number, number][][] = [];
  let cur: [number, number][] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (cur.length) segments.push(cur);
      cur = [];
    } else cur.push([x(i), y(v)]);
  });
  if (cur.length) segments.push(cur);
  const lastIndex = values.findLastIndex((v) => v !== null);
  const last = values[lastIndex] as number;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="overflow-visible">
      <rect x={0} y={0} width={width} height={height} rx={6} fill="rgb(255 255 255 / 0.03)" />
      {segments.map((seg, k) => {
        const line = seg.map(([a, b], j) => `${j ? "L" : "M"}${a.toFixed(1)} ${b.toFixed(1)}`).join("");
        return (
          <g key={k}>
            {seg.length > 1 && (
              <path d={`${line}L${seg.at(-1)![0].toFixed(1)} ${height}L${seg[0][0].toFixed(1)} ${height}Z`} fill="var(--accent)" opacity={0.12} />
            )}
            <path d={line} fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            {seg.length === 1 && <circle cx={seg[0][0]} cy={seg[0][1]} r={1.8} fill="var(--accent)" />}
          </g>
        );
      })}
      <circle cx={x(lastIndex)} cy={y(last)} r={3.2} fill="var(--accent)" stroke="var(--background)" strokeWidth={1.5} />
    </svg>
  );
}
