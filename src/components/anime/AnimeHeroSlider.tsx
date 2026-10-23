"use client";

import { useCallback, useEffect, useState } from "react";
import type { HeroSlide } from "@/lib/types";
import BackdropImage from "./BackdropImage";
import HeroSlideContent from "./HeroSlideContent";
import SliderControls from "./SliderControls";

const AUTOPLAY_INTERVAL_MS = 7000;

export interface AnimeHeroSliderProps {
  slides: HeroSlide[];
}

/**
 * Full-screen cinematic hero slider.
 *
 * - Autoplay pauses on hover/focus, when the tab is hidden, when the user
 *   prefers reduced motion, and for single-slide datasets.
 * - Manual navigation restarts the autoplay countdown.
 * - A shared bottom-fade overlay blends the banner into the page background
 *   consistently across all slides and screen sizes.
 * - Intervals and media/visibility listeners are always cleaned up.
 */
export default function AnimeHeroSlider({ slides }: AnimeHeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [manualNavCount, setManualNavCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const slideCount = slides.length;
  const activeSlide = slides[activeIndex] as HeroSlide | undefined;

  // Respect prefers-reduced-motion (disables autoplay; CSS kills transitions).
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Pause autoplay while the browser tab is not visible.
  useEffect(() => {
    const onVisibilityChange = () => setIsTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const goToIndex = useCallback(
    (index: number) => {
      setActiveIndex((current) => {
        if (slideCount < 2) return current;
        return (((index % slideCount) + slideCount) % slideCount);
      });
      setManualNavCount((count) => count + 1);
    },
    [slideCount],
  );

  const goToRelative = useCallback(
    (offset: number) => {
      setActiveIndex((current) => {
        if (slideCount < 2) return current;
        return (((current + offset) % slideCount) + slideCount) % slideCount;
      });
      setManualNavCount((count) => count + 1);
    },
    [slideCount],
  );

  const autoplayEnabled =
    slideCount > 1 && !isPaused && !isTabHidden && !prefersReducedMotion;

  // Autoplay restarts after manual navigation (manualNavCount dependency) and
  // keeps a steady cadence otherwise; cleared on every pause/unmount.
  useEffect(() => {
    if (!autoplayEnabled) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [autoplayEnabled, slideCount, manualNavCount]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToRelative(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goToRelative(1);
    }
  };

  if (slideCount === 0 || !activeSlide) return null;

  return (
    <section
      className="hero-viewport relative w-full select-none overflow-hidden bg-[#050507]"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured anime"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
    >
      {/* Cinematic background layers (crossfade between slides). */}
      {slides.map((slide, index) => {
        const isActive = index === activeIndex;
        return (
          <div
            key={slide.anilistId}
            aria-hidden={!isActive}
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
              isActive ? "z-10 opacity-100" : "z-0 opacity-0"
            }`}
          >
            <BackdropImage slide={slide} isActive={isActive} />
            {/* Layered gradients: a soft scrim behind the left-side content
                and a faint top vignette. (The bottom anchor lives in a shared
                overlay below, so every slide blends identically.) No uniform
                dark wash — the banner art stays bright and vibrant. */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.22)_26%,rgba(0,0,0,0)_56%)]" />
            <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.28),rgba(0,0,0,0))]" />
          </div>
        );
      })}

      {/* Bottom fade — one overlay shared by every slide, so the blend into
          the #050507 page background is identical for all banner art and
          stays stable during crossfades. Fully opaque only at the very
          bottom edge, then a long eased tail — no dark band or hard line.
          pointer-events-none + layered below the content (z-20) and controls
          (z-30), so slider interactions, text, and buttons are untouched. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-[30%] bg-[linear-gradient(to_top,#050507_0%,#050507_4%,rgba(5,5,7,0.86)_20%,rgba(5,5,7,0.58)_42%,rgba(5,5,7,0.3)_64%,rgba(5,5,7,0.1)_84%,rgba(5,5,7,0)_100%)]"
      />

      {/* Main content — lower-left composition. */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end">
        <div
          key={activeIndex}
          className={`w-full px-6 pb-20 sm:px-10 lg:px-16 xl:px-24 ${
            prefersReducedMotion ? "" : "hero-content-in"
          }`}
        >
          <HeroSlideContent slide={activeSlide} />
        </div>
      </div>

      <SliderControls
        slideCount={slideCount}
        activeIndex={activeIndex}
        onSelect={goToIndex}
        onPrevious={() => goToRelative(-1)}
        onNext={() => goToRelative(1)}
      />

      <p className="sr-only" aria-live="polite">
        Slide {activeIndex + 1} of {slideCount}: {activeSlide.title}
      </p>
    </section>
  );
}
