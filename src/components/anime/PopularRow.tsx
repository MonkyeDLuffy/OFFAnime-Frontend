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
 * Horizontal carousel for the poster-card home rows — the same component
 * renders "Popular Anime" and "TOP RATED ANIME" (Trending keeps its own thin
 * wrapper that reuses the same PopularCard cards). Native-scroll behavior
 * matches the Top 10 row (hidden scrollbar, no scroll snapping, overscroll
 * containment, clip-locked vertical axis) via the shared useCarouselScroll
 * hook; the glass nav arrows and edge fades come from the shared carousel-ui.
 *
 * The row reserves tall bottom padding (pb-28 sm:pb-32): that space hosts the
 * cards' hover info panels, so the expanded card is never clipped by the
 * scroller's overflow clip and the row never jumps when a card expands. The
 * wrapper's deliberate negative bottom margin (-mb-8 sm:-mb-12) hands the
 * empty part of that reservation back to the layout: the next section's
 * heading sits a balanced ~80px below the posters instead of ~200px, and a
 * shown panel simply overlays the next section, Netflix-style. The overlay
 * wins because the section lifts itself above the next one while a card is
 * hovered/keyboard-focused (hover:z-10 focus-within:z-20 on the section —
 * the one-shot reveal transforms trap every section at the same paint level,
 * so a card-level z-index alone could never escape it).
 */
export default function PopularRow({
  entries,
  listLabel = "Popular anime",
  navLabelPrefix = "Popular row",
}: {
  entries: PopularEntry[];
  /** Accessible name of the carousel list. */
  listLabel?: string;
  /** Prefix for the scroll navigation buttons' accessible labels. */
  navLabelPrefix?: string;
}) {
  const { scrollerRef, canScrollLeft, canScrollRight, scrollByPage } =
    useCarouselScroll(entries.length);

  return (
    <div className="relative mt-4 -mb-8 sm:mt-5 sm:-mb-12">
      <ul
        ref={scrollerRef}
        role="list"
        aria-label={listLabel}
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
          aria-label={`Scroll ${navLabelPrefix} backward`}
          className={`${CAROUSEL_NAV_BUTTON_CLASS} left-3 sm:left-5`}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          aria-label={`Scroll ${navLabelPrefix} forward`}
          className={`${CAROUSEL_NAV_BUTTON_CLASS} right-3 sm:right-5`}
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
