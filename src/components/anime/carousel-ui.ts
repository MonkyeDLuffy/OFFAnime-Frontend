/**
 * Shared styling for the horizontal home carousels (Top 10, Popular Anime,
 * Trending Anime): identical arrow buttons and edge fades keep the rows
 * visually consistent. The arrows use the shared Liquid Glass skin
 * (`.glass-btn`, globals.css) with the `--dark` variant so chevron contrast
 * never depends on the poster art scrolling beneath them.
 */

/**
 * z-40 keeps the arrows clickable above expanded (hover/focus z-30) cards in
 * the rows that reserve hover-panel space.
 */
export const CAROUSEL_NAV_BUTTON_CLASS =
  "glass-btn glass-btn--dark absolute top-1/2 z-40 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white md:flex";

export const CAROUSEL_EDGE_FADE_LEFT_CLASS =
  "pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#050507] to-transparent sm:w-16";

export const CAROUSEL_EDGE_FADE_RIGHT_CLASS =
  "pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#050507] to-transparent sm:w-16";
