import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name} 가 설정되지 않았습니다. .env.example 을 참고해 .env.local 에 값을 넣어 주세요.`);
  }
  return value;
}

/** 서버에서만 읽는 환경변수. 호출 시점에 검증한다 (빌드 시점에는 값이 없을 수 있음). */
export function getServerEnv() {
  return {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

/** 관리자 화면 보호용 토큰. 짧은 값은 추측될 수 있으므로 거부한다. */
export function getAdminToken(): string {
  const token = required("ADMIN_TOKEN");
  if (token.length < 16) {
    throw new Error("ADMIN_TOKEN 은 16자 이상이어야 합니다. `openssl rand -base64 32` 로 생성해 주세요.");
  }
  return token;
}
