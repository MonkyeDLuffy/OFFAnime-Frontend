"use client";

import { Check, Plus } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  isWatchLaterSaved,
  subscribeToWatchLater,
  toggleWatchLater,
} from "@/lib/watch-later";
import type { HeroSlide } from "@/lib/types";

/**
 * Watch Later toggle backed by the isolated localStorage store. The icon
 * changes with the state (Plus ↔ Check) and `aria-pressed` exposes it to
 * assistive tech, so the state never relies on color alone.
 *
 * Accepts any { anilistId, title, posterUrl } target (hero slides, popular
 * cards, ...) and an optional `className` override for the button size —
 * colors and states always stay owned by this component.
 */
export default function WatchLaterButton({
  slide,
  className = "h-12 w-12 sm:h-[52px] sm:w-[52px]",
}: {
  slide: Pick<HeroSlide, "anilistId" | "title" | "posterUrl">;
  className?: string;
}) {
  const saved = useSyncExternalStore(
    subscribeToWatchLater,
    () => isWatchLaterSaved(slide.anilistId),
    () => false,
  );

  return (
    <button
      type="button"
      onClick={() =>
        toggleWatchLater({
          anilistId: slide.anilistId,
          title: slide.title,
          posterUrl: slide.posterUrl,
        })
      }
      aria-pressed={saved}
      aria-label={
        saved
          ? `Remove ${slide.title} from Watch Later`
          : `Add ${slide.title} to Watch Later`
      }
      title={saved ? "In Watch Later" : "Add to Watch Later"}
      className={`glass-btn flex shrink-0 items-center justify-center rounded-full ${className} ${
        saved ? "glass-btn--bright" : "text-white"
      }`}
    >
      {saved ? (
        <Check className="h-5 w-5" aria-hidden="true" strokeWidth={2.5} />
      ) : (
        <Plus className="h-5 w-5" aria-hidden="true" strokeWidth={2.5} />
      )}
    </button>
  );
}
