"use client";

import Image from "next/image";
import { useState } from "react";
import { getFallbackGradient, isOptimizableImageUrl } from "@/lib/anime";
import type { AnimeEpisode } from "@/lib/types";

/**
 * Landscape episode card for the episodes carousel.
 *
 * - 16:9 thumbnail with episode number badge (bottom-left) and
 *   duration badge (bottom-right).
 * - Title + clamped overview below.
 * - Mirrors the homepage poster card's polish: subtle border,
 *   dark background, hover lift, hidden scrollbar, no layout shift.
 * - Image falls back: episode image → AniList cover → cinematic gradient.
 * - Fixed aspect-ratio frame prevents layout shift while image loads.
 */
export default function EpisodeCard({
  episode,
}: {
  episode: AnimeEpisode;
}) {
  const [failedCount, setFailedCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const candidates = [episode.image].filter((url): url is string =>
    isOptimizableImageUrl(url)
  );

  const current =
    failedCount < candidates.length ? candidates[failedCount] : null;

  const episodeNumber = episode.episodeNumber ?? episode.episode ?? 0;
  const runtime = episode.runtime ?? null;
  const runtimeText = runtime ? `${runtime}m` : null;

  return (
    <li className="group relative shrink-0 w-[220px] sm:w-[240px] md:w-[260px] lg:w-[280px]">
      <article
        className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_6px_20px_rgba(0,0,0,0.45)] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.02] hover:border-white/25 hover:shadow-[0_20px_45px_rgba(0,0,0,0.65)]"
      >
        <div className="relative aspect-video overflow-hidden rounded-xl">
          {current ? (
            <Image
              key={current}
              src={current}
              alt=""
              fill
              sizes="(min-width: 1280px) 280px, (min-width: 768px) 260px, 240px"
              quality={90}
              draggable={false}
              onLoad={() => setIsLoaded(true)}
              onError={() => {
                setFailedCount((count) => count + 1);
                setIsLoaded(false);
              }}
              className={`object-cover object-center transition-[opacity,transform] duration-500 ease-out hover:scale-[1.04] ${
                isLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : (
            <span
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background: getFallbackGradient(
                  `ep:${episode.globalEpisodeNumber}:${episode.title}`
                ),
              }}
            />
          )}

          {/* Episode number badge — bottom-left */}
          <span
            aria-hidden="true"
            className="absolute left-2 bottom-2 z-10 rounded-full bg-[#050507]/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold tracking-[0.05em] text-white/90"
          >
            E{episodeNumber}
          </span>

          {/* Duration badge — bottom-right */}
          {runtimeText ? (
            <span
              aria-hidden="true"
              className="absolute right-2 bottom-2 z-10 rounded-full bg-[#050507]/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold tracking-[0.05em] text-white/90"
            >
              {runtimeText}
            </span>
          ) : null}

          {/* Subtle bottom gradient for text readability if no badges overlap */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#050507]/60 via-[#050507]/10 to-transparent"
          />
        </div>

        {/* Text content below image */}
        <div className="mt-3 px-1">
          <h3 className="truncate text-sm font-semibold text-white">
            {episode.title}
          </h3>
          {episode.overview ? (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-white/60">
              {episode.overview}
            </p>
          ) : null}
        </div>
      </article>
    </li>
  );
}