"use client";

import { useEffect, useRef, useState } from "react";

/** Extra delay before the carousel follows the heading (staggered reveal). */
const ROW_DELAY_MS = 150;

/**
 * One-shot scroll reveal for a homepage section (Top 10, Popular Anime, ...).
 *
 * - A single IntersectionObserver watches the section wrapper; the heading
 *   rises in first and the carousel follows after ROW_DELAY_MS.
 * - Content renders fully visible in the server markup (progressive
 *   enhancement: no-JS visitors and crawlers never see hidden content), and
 *   is hidden via `.top10-reveal-armed` only after JS confirms the section
 *   is still below the fold — so nothing on screen ever flashes.
 * - Reveals exactly once, then disconnects: scrolling back never replays.
 * - `prefers-reduced-motion` (or a missing IntersectionObserver) skips the
 *   animation entirely; content is simply shown.
 */
export default function SectionReveal({
  heading,
  children,
}: {
  heading: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isArmed, setIsArmed] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof window.matchMedia !== "function" ||
      typeof window.IntersectionObserver !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    // Already on screen at hydration: show it, don't animate.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setIsRevealed(true);
      return;
    }

    setIsArmed(true);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const revealClass = isRevealed
    ? "top10-reveal-in"
    : isArmed
      ? "top10-reveal-armed"
      : "";

  return (
    <div ref={ref}>
      <div className={revealClass}>{heading}</div>
      <div
        className={revealClass}
        style={{ transitionDelay: `${ROW_DELAY_MS}ms` }}
      >
        {children}
      </div>
    </div>
  );
}
