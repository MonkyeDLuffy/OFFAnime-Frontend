import { buildTopRatedEntries } from "@/lib/anime";
import { getHomeFeed } from "@/lib/api";
import PopularRow from "./PopularRow";
import SectionReveal from "./SectionReveal";

/**
 * "TOP RATED ANIME" — the homepage's final carousel, below "Trending Anime".
 *
 * Reuses the exact `/api/home` feed the hero, Top 10, Popular and Trending
 * rows already load: within one render pass Next.js memoizes the identical
 * fetch (same URL and options), and the feed is Data-Cached for 60s (SHORT
 * TTL), so this adds no extra upstream call. The backend documents the home
 * sections independently (`trending`, `popular`, `seasonal`, `topRated`);
 * this row renders the `topRated` collection only — a distinct section, never
 * substituted with trending or popular data. The backend ships the entries
 * already ranked, so upstream order is preserved exactly as delivered. The
 * cards and the row are the shared PopularCard/PopularRow pair, so the
 * vertical posters, hover info panels, 700ms trailer popups (muted autoplay,
 * glass mute toggle) and carousel navigation are pixel-identical to the other
 * rows. The hero owns feed error/empty presentation, so this section renders
 * nothing when the feed failed or topRated is missing/empty — never padded
 * substitutes; entries with missing posters or trailers degrade gracefully
 * inside the card itself (gradient fallback, no preview).
 */
export default async function TopRatedSection() {
  const feed = await getHomeFeed();
  if (!feed.ok) return null;

  const entries = buildTopRatedEntries(feed.data.topRated);
  if (entries.length === 0) return null;

  return (
    <section
      aria-labelledby="top-rated-heading"
      className="relative w-full overflow-hidden bg-[#050507] pb-16 pt-10 sm:pb-20 sm:pt-12 lg:pb-24"
    >
      <SectionReveal
        heading={
          <div className="relative px-6 sm:px-10 lg:px-16 xl:px-24">
            <h2
              id="top-rated-heading"
              className="text-2xl font-black tracking-[-0.01em] text-white sm:text-3xl lg:text-4xl"
            >
              TOP RATED ANIME
            </h2>
          </div>
        }
      >
        <PopularRow
          entries={entries}
          listLabel="Top rated anime"
          navLabelPrefix="Top Rated"
        />
      </SectionReveal>
    </section>
  );
}
