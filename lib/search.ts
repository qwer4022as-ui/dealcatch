/** PostgREST 필터 문법에 쓰이는 문자를 제거한 검색어 (최대 50자) */
export function sanitizeQuery(q: string): string {
  return q.replace(/[,()%*\\:."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 50);
}
