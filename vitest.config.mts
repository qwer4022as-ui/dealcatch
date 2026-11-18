import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    // 초기 테스트 대상은 순수 함수(lib/)라서 node 환경을 쓴다.
    // 컴포넌트 테스트를 추가할 때 jsdom + @testing-library/react를 설치한다.
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
  },
});
