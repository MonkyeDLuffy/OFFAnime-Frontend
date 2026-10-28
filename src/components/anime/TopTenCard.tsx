"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { getFallbackGradient, isOptimizableImageUrl } from "@/lib/anime";
import type { TopTenEntry } from "@/lib/types";

/** Mirrors the poster widths in .top10-card (70% of the card) for next/image. */
const POSTER_SIZES =
  "(min-width: 1536px) 215px, (min-width: 1280px) 210px, (min-width: 1024px) 200px, (min-width: 768px) 190px, (min-width: 640px) 175px, 41vw";

/**
 * One ranked poster card.
 *
 * - The giant outlined rank sits behind the poster (z-0 vs z-10) and lights
   up via `.top10-rank` CSS when the card is hovered or focused.
 * - Posters load lazily behind a fixed aspect-ratio frame (no layout shift),
   fade in on load, and fall back poster → cover → cinematic gradient, with
   each failed URL advancing the chain exactly once (never retried).
 */
export default function TopTenCard({ entry }: { entry: TopTenEntry }) {
  const candidates = [
    entry.posterUrl,
    entry.posterFallbackUrl,
  ].filter((url): url is string => isOptimizableImageUrl(url));
  const [failedCount, setFailedCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  // Clamp guards against a candidates list shrinking between renders (ISR).
  const current =
    failedCount < candidates.length ? candidates[failedCount] : null;

  return (
    <li className="top10-card group/card relative w-[58vw] max-w-[240px] shrink-0 sm:w-[240px] md:w-[260px] lg:w-[280px] xl:w-[290px] 2xl:w-[300px]">
      <Link
        href={`/anime/${entry.anilistId}`}
        aria-label={`Number ${entry.rank}: ${entry.title}`}
        prefetch={true}
        className="block focus-visible:outline-none"
      >
        <span aria-hidden="true" className="top10-rank">
          {entry.rank}
        </span>
        <span className="top10-poster relative z-10 ml-[30%] block aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_6px_20px_rgba(0,0,0,0.45)] transition-all duration-300 ease-out group-hover/card:-translate-y-1.5 group-hover/card:scale-[1.02] group-hover/card:border-white/30 group-hover/card:shadow-[0_20px_45px_rgba(0,0,0,0.65)]">
          {current ? (
            <Image
              key={current}
              src={current}
              alt=""
              fill
              sizes={POSTER_SIZES}
              draggable={false}
              onLoad={() => setIsLoaded(true)}
              onError={() => {
                setFailedCount((count) => count + 1);
                setIsLoaded(false);
              }}
              className={`object-cover object-center transition-[opacity,transform] duration-500 ease-out group-hover/card:scale-[1.04] ${
                isLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : (
            <span
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background: getFallbackGradient(
                  `${entry.anilistId}:${entry.title}`,
                ),
              }}
            />
          )}
        </span>
      </Link>
    </li>
  );
}
