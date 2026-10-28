"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TrendingEntry } from "@/lib/types";
import {
  CAROUSEL_EDGE_FADE_LEFT_CLASS,
  CAROUSEL_EDGE_FADE_RIGHT_CLASS,
  CAROUSEL_NAV_BUTTON_CLASS,
} from "./carousel-ui";
import PopularCard from "./PopularCard";
import { useCarouselScroll } from "./use-carousel-scroll";

/**
 * Horizontal "Trending Anime" carousel — the same native-scroll behavior as
 * the Top 10 and Popular rows (hidden scrollbar, no scroll snapping,
 * overscroll containment, clip-locked vertical axis) via the shared
 * useCarouselScroll hook, with the same glass nav arrows and edge fades.
 *
 * Cards reuse PopularCard so the row is pixel-identical to the Popular row:
 * same card dimensions, poster chain (high-res AniList cover first), hover
 * info panel (Play / Watch Later / Info) and reserved bottom padding that
 * keeps the expanded panel unclipped and the row jump-free. As in
 * PopularRow, the wrapper's negative bottom margin (-mb-8 sm:-mb-12) gives
 * the empty part of that reservation back to the layout so the next
 * section's heading sits ~80px below the posters; a shown panel overlays
 * the next section while this one is hovered/focused (the section-level
 * hover:z-10 / focus-within:z-20 lift, see PopularRow).
 */
export default function TrendingRow({ entries }: { entries: TrendingEntry[] }) {
  const { scrollerRef, canScrollLeft, canScrollRight, scrollByPage } =
    useCarouselScroll(entries.length);

  return (
    <div className="relative mt-4 -mb-8 sm:mt-5 sm:-mb-12">
      <ul
        ref={scrollerRef}
        role="list"
        aria-label="Trending anime"
        className="no-scrollbar flex gap-4 overflow-x-auto overflow-y-clip overscroll-x-contain px-6 pb-28 pt-4 sm:gap-5 sm:px-10 sm:pb-32 lg:gap-6 lg:px-16 xl:px-24"
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
          aria-label="Scroll Trending row backward"
          className={`${CAROUSEL_NAV_BUTTON_CLASS} left-3 sm:left-5`}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          aria-label="Scroll Trending row forward"
          className={`${CAROUSEL_NAV_BUTTON_CLASS} right-3 sm:right-5`}
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
