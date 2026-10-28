"use client";

/**
 * Premium skeleton for the anime details page. Mirrors the real layout
 * (banner → left column with logo / genres / title / buttons / description
 * lines, right info panel with four rows) so the transition from skeleton to
 * content produces almost no layout shift.
 *
 * Dark gray gradients with a subtle, slow shimmer — consistent with the
 * OFFAnime theme, never bright white flashing.
 */

/** One shimmering gradient track. */
function ShimmerTrack({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-full w-full rounded bg-gradient-to-x from-[#0f1116] via-[#161820] to-[#0f1116] animate-[shimmer_3s_ease-in-out_infinite] ${className ?? ""}`}
    />
  );
}

/** A rounded rectangular shimmer block of a given size. */
function ShimmerBlock({ h, w, className }: { h: string; w: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded-xl ${className ?? ""} style-[--h:${h};--w:${w}]`}
      style={{ height: `var(--h)`, width: `var(--w)` }}
    >
      <ShimmerTrack />
    </span>
  );
}

export default function AnimeDetailsSkeleton() {
  return (
    <section
      className="relative flex min-h-[100svh] w-full flex-col overflow-hidden bg-[#050507]"
      aria-label="Loading anime details"
    >
      {/* Banner skeleton — full-width, cover-shaped, with a bottom fade that
          matches the real page so the blend is stable during loading. */}
      <div className="absolute inset-0 z-0">
        <ShimmerBlock h="100%" w="100%" className="rounded-none" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-[30%] bg-[linear-gradient(to_top,#050507_0%,#050507_4%,rgba(5,5,7,0.86)_20%,rgba(5,5,7,0.58)_42%,rgba(5,5,7,0.3)_64%,rgba(5,5,7,0.1)_84%,rgba(5,5,7,0)_100%)]"
        />
      </div>

      {/* Content skeleton — matches the real row's bottom-pinned geometry. */}
      <div className="relative z-20 mt-auto w-full px-6 pb-14 pt-40 sm:px-10 sm:pb-16 lg:px-16 lg:pb-20 xl:px-24">
        <div className="flex w-full flex-col gap-7 sm:gap-9 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          {/* Left column skeleton — logo, genres, title, buttons, description lines. */}
          <div className="min-w-0 lg:w-[60%]">
            <ShimmerBlock h="96px" w="min(580px,84vw)" className="mt-3 sm:h-[114px] lg:h-[148px]" />
            <ShimmerBlock h="16px" w="40%" className="mt-3 sm:mt-[2px] sm:h-6 lg:h-7" />
            <ShimmerBlock h="24px" w="min(320px,60vw)" className="mt-2 text-lg sm:mt-3 sm:text-xl lg:text-[26px]" />
            <div className="mt-6 flex flex-wrap items-center gap-2.5 sm:mt-7 sm:gap-3">
              <ShimmerBlock h="52px" w="220px" className="sm:h-[52px]" />
              <ShimmerBlock h="52px" w="52px" className="sm:h-[52px]" />
              <ShimmerBlock h="52px" w="150px" className="sm:h-[52px]" />
            </div>
            <ShimmerBlock h="20px" w="560px" className="mt-5 opacity-60 sm:mt-6 sm:h-[22px]" />
            <ShimmerBlock h="20px" w="440px" className="mt-3 opacity-50 sm:mt-4 sm:h-[22px]" />
          </div>

          {/* Right column skeleton — info panel with four rows. */}
          <aside className="relative w-full max-w-[340px] self-start sm:max-w-[320px] lg:max-w-[300px] lg:self-end">
            <ShimmerBlock h="72px" w="100%" className="rounded-2xl" />
            <ShimmerBlock h="20px" w="70%" className="mt-3 opacity-60 sm:mt-4 sm:h-[22px]" />
            <ShimmerBlock h="20px" w="45%" className="mt-3 opacity-50 sm:mt-4 sm:h-[22px]" />
            <ShimmerBlock h="20px" w="55%" className="mt-3 opacity-60 sm:mt-4 sm:h-[22px]" />
            <ShimmerBlock h="20px" w="40%" className="mt-3 opacity-50 sm:mt-4 sm:h-[22px]" />
          </aside>
        </div>
      </div>
    </section>
  );
}
