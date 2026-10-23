"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PopularEntry } from "@/lib/types";
import {
  CAROUSEL_EDGE_FADE_LEFT_CLASS,
  CAROUSEL_EDGE_FADE_RIGHT_CLASS,
  CAROUSEL_NAV_BUTTON_CLASS,
} from "./carousel-ui";
import PopularCard from "./PopularCard";
import { useCarouselScroll } from "./use-carousel-scroll";

/**
 * Horizontal "Popular Anime" carousel — same native-scroll behavior as the
 * Top 10 row (hidden scrollbar, no scroll snapping, overscroll containment,
 * clip-locked vertical axis) via the shared useCarouselScroll hook.
 *
 * The row reserves tall bottom padding (pb-28 sm:pb-32): that space hosts the
 * cards' hover info panels, so the expanded card is never clipped by the
 * scroller's overflow clip and the row never jumps when a card expands.
 */
export default function PopularRow({ entries }: { entries: PopularEntry[] }) {
  const { scrollerRef, canScrollLeft, canScrollRight, scrollByPage } =
    useCarouselScroll(entries.length);

  return (
    <div className="relative mt-4 sm:mt-5">
      <ul
        ref={scrollerRef}
        role="list"
        aria-label="Popular anime"
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
          aria-label="Scroll Popular row backward"
          className={`${CAROUSEL_NAV_BUTTON_CLASS} left-3 sm:left-5`}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          aria-label="Scroll Popular row forward"
          className={`${CAROUSEL_NAV_BUTTON_CLASS} right-3 sm:right-5`}
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
