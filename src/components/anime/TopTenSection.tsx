import { buildTopTenEntries } from "@/lib/anime";
import { getHomeFeed } from "@/lib/api";
import SectionReveal from "./SectionReveal";
import TopTenRow from "./TopTenRow";

/**
 * "TOP 10 | CONTENT TODAY" — the homepage row under the hero slider.
 *
 * Reuses the exact `/api/home` feed the hero already loads: within one render
 * pass Next.js memoizes the identical fetch (same URL and options), and the
 * feed is Data-Cached for 60s (SHORT TTL), so this adds no extra upstream
 * call. The hero owns feed error/empty presentation; this section renders
 * nothing when the feed failed or no valid trending entries exist. Short
 * trending lists render proportionally fewer cards — never padded fakes.
 * SectionReveal gives the heading + carousel a one-shot staggered entrance
 * when the section first scrolls into view.
 */
export default async function TopTenSection() {
  const feed = await getHomeFeed();
  if (!feed.ok) return null;

  const entries = buildTopTenEntries(feed.data.trending);
  if (entries.length === 0) return null;

  return (
    <section
      aria-labelledby="top-ten-heading"
      className="relative w-full overflow-hidden bg-[#050507] pb-16 pt-12 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20"
    >
      {/* Faint cool glow behind the heading so the section reads as its own
          beat without breaking the seamless #050507 page background. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(50%_100%_at_50%_0%,rgba(140,140,190,0.06),transparent_75%)]"
      />

      <SectionReveal
        heading={
          <div className="relative px-6 sm:px-10 lg:px-16 xl:px-24">
            <div className="flex items-center gap-4 sm:gap-5">
              <h2
                id="top-ten-heading"
                className="top10-title text-5xl font-black leading-none tracking-[-0.02em] sm:text-6xl lg:text-7xl"
              >
                TOP 10
              </h2>
              <span
                aria-hidden="true"
                className="h-9 w-px shrink-0 bg-white/25 sm:h-12 lg:h-14"
              />
              <p className="flex flex-col gap-1 text-[11px] font-semibold leading-snug tracking-[0.3em] text-white/85 sm:text-xs">
                <span>CONTENT</span>
                <span>TODAY</span>
              </p>
            </div>
          </div>
        }
      >
        <TopTenRow entries={entries} />
      </SectionReveal>
    </section>
  );
}
