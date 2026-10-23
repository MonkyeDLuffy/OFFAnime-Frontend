"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TopTenEntry } from "@/lib/types";
import {
  CAROUSEL_EDGE_FADE_LEFT_CLASS,
  CAROUSEL_EDGE_FADE_RIGHT_CLASS,
  CAROUSEL_NAV_BUTTON_CLASS,
} from "./carousel-ui";
import TopTenCard from "./TopTenCard";
import { useCarouselScroll } from "./use-carousel-scroll";

/**
 * Horizontal Top 10 carousel.
 *
 * - Large poster cards that always overflow on md+ — all 10 stay reachable
   by scrolling, never squeezed to fit.
 * - Persistent prev/next arrows on md+ that page the row by whole cards
   (smooth, instant under prefers-reduced-motion) and only render while
   their direction is actually scrollable.
 * - Native touch/trackpad scrolling on every breakpoint: hidden scrollbar,
   no scroll snapping (momentum stays untouched), overscroll containment so
   swipes never navigate the page back/forward, and a clip-locked vertical
   axis so the viewport can never scroll vertically.
 * - Edge fades use the exact section background color, so they read as the
   row continuing beyond the viewport rather than as a hard cut.
 */
export default function TopTenRow({ entries }: { entries: TopTenEntry[] }) {
  const { scrollerRef, canScrollLeft, canScrollRight, scrollByPage } =
    useCarouselScroll(entries.length);

  return (
    <div className="relative mt-4 sm:mt-5">
      <ul
        ref={scrollerRef}
        role="list"
        aria-label="Top 10 anime today"
        className="no-scrollbar flex gap-4 overflow-x-auto overflow-y-clip overscroll-x-contain px-6 pb-5 pt-4 sm:gap-5 sm:px-10 lg:gap-6 lg:px-16 xl:px-24"
      >
        {entries.map((entry) => (
          <TopTenCard key={entry.anilistId} entry={entry} />
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
          aria-label="Scroll Top 10 row backward"
          className={`${CAROUSEL_NAV_BUTTON_CLASS} left-3 sm:left-5`}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          aria-label="Scroll Top 10 row forward"
          className={`${CAROUSEL_NAV_BUTTON_CLASS} right-3 sm:right-5`}
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
