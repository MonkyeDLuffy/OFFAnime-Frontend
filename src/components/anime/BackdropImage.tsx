"use client";

import Image from "next/image";
import { useState } from "react";
import { getFallbackGradient, isOptimizableImageUrl } from "@/lib/anime";
import type { HeroSlide } from "@/lib/types";

/**
 * Full-bleed hero backdrop with a client-side fallback chain.
 *
 * `backdropUrl` is the highest-priority candidate; `backdropFallbacks`
 * (built server-side in priority order: TMDB banner → TMDB backdrop →
 * AniList banner → cover → poster) are tried one-by-one as `onError` fires,
 * and the cinematic gradient renders when every candidate is exhausted.
 *
 * A failed URL advances the chain index exactly once and is never retried,
 * so the loop is strictly bounded by the candidate list length.
 */
export default function BackdropImage({
  slide,
  isActive,
}: {
  slide: HeroSlide;
  isActive: boolean;
}) {
  const [failedCount, setFailedCount] = useState(0);

  const candidates = [slide.backdropUrl, ...slide.backdropFallbacks].filter(
    (url): url is string => isOptimizableImageUrl(url),
  );
  // Clamp guards against a candidates list shrinking between renders (ISR refresh).
  const current =
    failedCount < candidates.length ? candidates[failedCount] : null;

  if (!current) {
    return (
      <div
        className="absolute inset-0"
        style={{ background: getFallbackGradient(`${slide.anilistId}:${slide.title}`) }}
      />
    );
  }

  return (
    <Image
      key={current}
      src={current}
      alt=""
      fill
      priority={isActive}
      quality={85}
      sizes="100vw"
      className={`object-cover object-center ${isActive ? "hero-zoom" : "scale-105"}`}
      onError={() => setFailedCount((count) => count + 1)}
    />
  );
}
