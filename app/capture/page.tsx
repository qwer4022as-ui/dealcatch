import { CaptureClient } from "./CaptureClient";

export default function CapturePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">무신사에서 가져오기</h1>
      <CaptureClient />
    </main>
  );
}
