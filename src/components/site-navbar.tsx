"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Dices, Search, UserRound } from "lucide-react";

/**
 * Global floating navbar, mounted once in the root layout above {children}.
 *
 * Design — ONE cohesive water-glass capsule (`.nav-pill`, globals.css): a
 * compact, horizontally centered sheet of transparent glass floating
 * ~20–28px below the top edge, above the 100svh hero. The artwork stays
 * visible through the refraction (blur 24 / saturate 180) while layered
 * highlights — a top-edge light, a curved reflection and a hover-drifting
 * sheen — give it the look of polished water. The pill owns the glass skin;
 * its controls are light translucent fills inside it (no nested glass
 * shells).
 *
 * Scroll state machine — the pill is one springy object:
 *   "top"    · scrollY ≈ 0 → expanded resting size (52px desktop / 46px
 *              mobile), scale 1.
 *   "scroll" · actively scrolling downward → smallest state (44/42px,
 *              scale 0.985) with strengthened blur/border; the spring is
 *              shorter on entry (300ms) so the shrink feels tactile with a
 *              subtle settle bounce.
 *   "rest"   · idle ~300ms after the last scroll event, or while scrolling
 *              upward → mid-page resting size (47/44px, scale 1), slightly
 *              firmer glass; expansion runs on the longer 400ms spring so
 *              it overshoots gently and settles soft.
 * The handler is rAF-throttled (one check per frame) and commits a state
 * only when it changes, so scrolling never re-renders per frame and the
 * fixed overlay never shifts page layout.
 *
 * Layout — three sections in one row:
 *   Left    · "OFF" wordmark → links to the anime home page (/anime).
 *   Center  · Anime (→ /anime; translucent pill highlight while active,
 *             animated in smoothly via the shared color transition) and
 *             Movies (UI-only — no /movies route exists yet).
 *   Right   · Search and Random Anime icon controls (both UI-only), then the
 *             Login pill — slightly more prominent, far right.
 *
 * UI-only controls (Movies, Search, Random, Login) are rendered as real
 * disabled buttons — no invented routes, endpoints or systems — with a hover
 * tooltip explaining they are coming soon. They will be wired to real
 * functionality in later tasks.
 *
 * Responsiveness: below `sm` the center navigation hides (the wordmark
 * already links to the anime home) and Login collapses to its icon, so the
 * pill never overflows small screens. No separate mobile menu.
 */

/** Hover tooltip for the UI-only controls (also the mouse users' only cue,
    since a disabled control is intentionally not focusable). */
function SoonTooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/15 bg-[#0b0b10]/95 px-2.5 py-1 text-[11px] font-semibold text-white/85 opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-opacity duration-200 group-hover:opacity-100 sm:block"
    >
      {children}
    </span>
  );
}

/** Shared skin for the center text items (equal pills, subtle tracking). */
const NAV_ITEM_CLASS =
  "flex items-center rounded-full px-3 py-1 text-[13px] font-medium tracking-[0.02em] transition-colors duration-[260ms] sm:text-sm";

type NavState = "top" | "scroll" | "rest";

/** Idle delay before the pill relaxes to its mid-page resting size. */
const IDLE_DELAY_MS = 300;

export default function SiteNavbar() {
  const pathname = usePathname();
  const [navState, setNavState] = useState<NavState>("top");

  // Scroll state machine — rAF-throttled so at most one check per frame;
  // each commit is a same-value bail-out unless the state actually changes.
  useEffect(() => {
    let raf = 0;
    let lastY = -1;
    let idleTimer = 0;
    const clearIdle = () => {
      if (idleTimer) {
        window.clearTimeout(idleTimer);
        idleTimer = 0;
      }
    };
    const commit = (next: NavState) =>
      setNavState((prev) => (prev === next ? prev : next));
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      if (y <= 8) {
        lastY = y;
        clearIdle();
        commit("top");
        return;
      }
      const down = lastY < 0 ? true : y > lastY;
      lastY = y;
      clearIdle();
      commit(down ? "scroll" : "rest");
      // Scrolling has stopped — after the idle delay, relax to the resting
      // size (only fired while away from the top).
      idleTimer = window.setTimeout(() => {
        idleTimer = 0;
        commit("rest");
      }, IDLE_DELAY_MS);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      clearIdle();
    };
  }, []);

  const onAnimeHome = pathname === "/anime" || pathname.startsWith("/anime/");

  const stateClass =
    navState === "scroll"
      ? "nav-pill--compact"
      : navState === "rest"
        ? "nav-pill--rest"
        : "";

  return (
    <header className="nav-enter pointer-events-none fixed inset-x-0 top-5 z-50 px-4 sm:top-6 sm:px-6">
      {/* The pill — the only glass surface; header itself is click-through so
          the hero stays interactive around it. */}
      <nav
        aria-label="Primary"
        className={`nav-pill pointer-events-auto relative mx-auto flex w-full max-w-[940px] items-center justify-between gap-1.5 rounded-full ${stateClass}`}
      >
        {/* Brand → anime home */}
        <Link
          href="/anime"
          aria-label="OFFAnime — home"
          className="rounded-full text-[20px] font-black tracking-[-0.02em] text-white transition-opacity duration-200 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/90 sm:text-[24px] lg:text-[26px]"
        >
          OFF
        </Link>

        {/* Center navigation — truly centered in the pill; hidden on mobile
            where the wordmark already covers the anime home. */}
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 sm:flex">
          {/* Anime — real route, active pill follows the pathname (the bg
              eases in/out on the shared color transition) */}
          <Link
            href="/anime"
            aria-current={onAnimeHome ? "page" : undefined}
            className={`${NAV_ITEM_CLASS} ${
              onAnimeHome
                ? "bg-white/[0.14] text-white"
                : "text-white/60 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            Anime
          </Link>

          {/* Movies — UI-only until the /movies section exists */}
          <span className="group relative hidden sm:block">
            <button
              type="button"
              disabled
              aria-label="Movies (coming soon)"
              className={`${NAV_ITEM_CLASS} cursor-not-allowed text-white/35`}
            >
              Movies
            </button>
            <SoonTooltip>Movies — coming soon</SoonTooltip>
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Search — UI-only until a search interface exists */}
          <span className="group relative">
            <button
              type="button"
              disabled
              aria-label="Search (coming soon)"
              className="nav-chip h-8 w-8 sm:h-9 sm:w-9"
            >
              <Search className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
            </button>
            <SoonTooltip>Search — coming soon</SoonTooltip>
          </span>

          {/* Random anime — dice icon, UI-only by design (logic comes later) */}
          <span className="group relative">
            <button
              type="button"
              disabled
              aria-label="Random Anime (coming soon)"
              className="nav-chip h-8 w-8 sm:h-9 sm:w-9"
            >
              <Dices className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
            </button>
            <SoonTooltip>Random Anime</SoonTooltip>
          </span>

          {/* Login — UI-only until an auth interface exists */}
          <span className="group relative">
            <button
              type="button"
              disabled
              aria-label="Login (coming soon)"
              className="nav-login h-8 pl-2 pr-2 sm:h-9 sm:pl-2.5 sm:pr-3"
            >
              <UserRound
                className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
                aria-hidden="true"
              />
              <span className="hidden text-sm font-semibold tracking-[0.01em] sm:inline">
                Login
              </span>
            </button>
            <SoonTooltip>Login — coming soon</SoonTooltip>
          </span>
        </div>
      </nav>
    </header>
  );
}
