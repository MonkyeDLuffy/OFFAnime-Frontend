"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AnimeRecommendation, PopularEntry, TrailerSource } from "@/lib/types";
import {
  CAROUSEL_EDGE_FADE_LEFT_CLASS,
  CAROUSEL_EDGE_FADE_RIGHT_CLASS,
  CAROUSEL_NAV_BUTTON_CLASS,
} from "./carousel-ui";
import PopularCard from "./PopularCard";
import { useCarouselScroll } from "./use-carousel-scroll";

/**
 * Recommended Anime carousel for the anime details page.
 *
 * Reuses the exact same PopularCard + PopularRow carousel infrastructure as
 * the homepage rows (Trending, Popular, Top Rated, Seasonal). Converts the
 * recommendations array into PopularEntry format so the cards render
 * identically to the homepage carousels, including:
 * - High-quality poster images with fallback chain
 * - Hover info panel with Play / Watch Later / Info actions
 * - 700ms delayed trailer popup on hover
 * - Native horizontal scrolling with glass nav arrows and edge fades
 *
 * The recommendations come from the anime details response, converted to
 * PopularEntry format using the existing anime card builders.
 */

interface RecommendedCarouselProps {
  recommendations: AnimeRecommendation[];
}

/** Convert a recommendation to PopularEntry format for the shared card. */
function toPopularEntry(rec: AnimeRecommendation): PopularEntry {
  // Poster image from the recommendation
  const posterUrl = rec.images?.poster ?? null;

  // Trailer: we don't have trailer data in recommendations, so pass null.
  // The card will handle missing trailers gracefully.

  // Format label
  const formatLabel = rec.format ?? null;

  // Year from seasonYear
  const year = rec.seasonYear ?? null;

  // Episode count
  const episodeCount = rec.episodes ?? null;

  return {
    anilistId: rec.anilistId,
    title: rec.titleEnglish ?? rec.titleRomaji ?? rec.title ?? "Untitled",
    posterUrl,
    posterFallbackUrl: null,
    format: formatLabel,
    year,
    episodeCount,
    trailer: null as TrailerSource | null,
  };
}

export default function RecommendedCarousel({
  recommendations,
}: RecommendedCarouselProps) {
  // Filter out invalid recommendations
  const validRecs = recommendations.filter((rec) => rec.anilistId > 0);

  // Convert to PopularEntry format for the shared card component
  const entries = validRecs.map(toPopularEntry);

  const { scrollerRef, canScrollLeft, canScrollRight, scrollByPage } =
    useCarouselScroll(entries.length);

  const listLabel = `Recommended anime`;

  if (entries.length === 0) {
    return (
      <section
        aria-labelledby="recommended-heading"
        className="relative w-full bg-[#050507] overflow-hidden"
      >
        <div className="relative px-6 sm:px-10 lg:px-16 xl:px-24">
          <h2
            id="recommended-heading"
            className="mb-5 text-2xl font-black tracking-[-0.01em] text-white sm:text-3xl lg:text-4xl"
          >
            Recommended Anime
          </h2>
          <p className="text-sm text-white/50">
            No recommendations available for this title.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="recommended-heading"
      className="relative w-full bg-[#050507]"
    >
      <div className="relative px-6 sm:px-10 lg:px-16 xl:px-24">
        <h2
          id="recommended-heading"
          className="mb-5 text-2xl font-black tracking-[-0.01em] text-white sm:text-3xl lg:text-4xl"
        >
          Recommended Anime
        </h2>

        <div className="relative mt-8 sm:mt-10">
          <ul
            ref={scrollerRef}
            role="list"
            aria-label={listLabel}
            className="no-scrollbar flex gap-4 overflow-x-auto overflow-y-clip overscroll-x-contain px-6 pb-36 pt-4 sm:gap-5 sm:px-10 sm:pb-40 lg:gap-6 lg:px-16 xl:px-24"
          >
            {entries.map((entry) => (
              <PopularCard key={entry.anilistId} entry={entry} />
            ))}
          </ul>

          {canScrollLeft ? (
            <div aria-hidden="true" className={CAROUSEL_EDGE_FADE_LEFT_CLASS} />
          ) : null}
          {canScrollRight ? (
            <div aria-hidden="true" className={CAROUSEL_EDGE_FADE_RIGHT_CLASS} />
          ) : null}

          {canScrollLeft ? (
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              aria-label={`Scroll ${listLabel} backward`}
              className={`${CAROUSEL_NAV_BUTTON_CLASS} left-3 sm:left-5`}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}
          {canScrollRight ? (
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              aria-label={`Scroll ${listLabel} forward`}
              className={`${CAROUSEL_NAV_BUTTON_CLASS} right-3 sm:right-5`}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}