import Image from "next/image";
import base from "@/public/hero/base.png";
import bubble from "@/public/hero/bubble.png";
import burst from "@/public/hero/burst.png";
import coin from "@/public/hero/coin.png";

// 레이어 위치: 원본 그림(760×202) 기준 % 좌표 (public/hero/*.png 를 자를 때 쓴 값)
const LAYERS = [
  { src: bubble, left: 7.368, top: 23.267, width: 17.895, anim: "hero-float" },
  { src: coin, left: 4.211, top: 50.495, width: 6.842, anim: "hero-swing" },
  { src: burst, left: 27.895, top: 23.762, width: 4.474, anim: "hero-burst" },
] as const;

const SPARKLES = [
  { left: 36, top: 12, size: 10, delay: "0s" },
  { left: 57, top: 30, size: 7, delay: "-1.2s" },
  { left: 88, top: 46, size: 8, delay: "-0.6s" },
  { left: 19, top: 78, size: 6, delay: "-1.8s" },
  { left: 60, top: 70, size: 6, delay: "-2.4s" },
] as const;

/** 대시보드 상단 그림. 말풍선·₩ 태그·강조선은 따로 움직이는 레이어다 (장식용) */
export function HeroArt() {
  return (
    <div className="hero-fade relative w-full max-w-[760px] justify-self-end [mask-image:linear-gradient(to_right,transparent,black_3%,black_94%,transparent)]">
      <div aria-hidden className="hero-glow absolute left-[30%] top-[10%] h-[80%] w-[35%] rounded-full bg-accent/25 blur-3xl" />
      <Image
        src={base}
        alt="옷걸이 비니를 쓰고 노트북으로 옷 가격을 확인하는 캐릭터"
        priority
        sizes="(min-width: 768px) 760px, 100vw"
        className="relative h-auto w-full"
      />
      {LAYERS.map((l) => (
        <Image
          key={l.anim}
          src={l.src}
          alt=""
          aria-hidden
          sizes="140px"
          className={`${l.anim} absolute h-auto`}
          style={{ left: `${l.left}%`, top: `${l.top}%`, width: `${l.width}%` }}
        />
      ))}
      {SPARKLES.map((s) => (
        <svg
          key={`${s.left}-${s.top}`}
          aria-hidden
          viewBox="0 0 10 10"
          className="hero-twinkle absolute text-zinc-200"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: s.delay }}
        >
          <path d="M5 0Q5 5 10 5Q5 5 5 10Q5 5 0 5Q5 5 5 0Z" fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}
