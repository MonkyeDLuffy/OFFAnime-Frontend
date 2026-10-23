"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared state + behavior for the horizontal home carousels (Top 10,
 * Popular Anime):
 *
 * - Tracks whether each direction is currently scrollable so the nav arrows
 *   only render while their direction can actually move.
 * - Pages by whole cards (first card width + column gap) so each click lands
 *   the next aligned group; instant under prefers-reduced-motion.
 * - Recomputes on scroll (passive) and window resize.
 */
export function useCarouselScroll(itemCount: number) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Respect prefers-reduced-motion for programmatic scrolling.
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(maxScroll > 1 && el.scrollLeft < maxScroll - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, itemCount]);

  const scrollByPage = useCallback(
    (direction: 1 | -1) => {
      const el = scrollerRef.current;
      if (!el) return;
      // Step by whole cards so each click lands the next aligned group.
      const firstCard = el.firstElementChild;
      const cardWidth =
        firstCard instanceof HTMLElement ? firstCard.offsetWidth : 0;
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
      const step = cardWidth > 0 ? cardWidth + gap : el.clientWidth * 0.8;
      const perPage = Math.max(1, Math.floor(el.clientWidth / step));
      el.scrollBy({
        left: direction * perPage * step,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    },
    [prefersReducedMotion],
  );

  return {
    scrollerRef,
    canScrollLeft,
    canScrollRight,
    prefersReducedMotion,
    scrollByPage,
  };
}
