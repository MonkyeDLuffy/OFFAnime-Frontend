import {
  buildHeroSlides,
  getAnimeArtwork,
  getDisplayDescription,
  hasUsableTmdbImage,
  selectTrendingSlides,
} from "@/lib/anime";
import {
  fetchAnimeDetailsBatch,
  fetchTmdbVisualsBatch,
  getHomeFeed,
} from "@/lib/api";
import type { Anime } from "@/lib/types";
import AnimeHeroSlider from "./AnimeHeroSlider";
import { HeroEmptyState, HeroErrorState } from "./HeroStates";

/**
 * Async server component that loads the homepage feed, selects up to seven
 * trending anime, enriches them with TMDB visuals and renders the slider.
 *
 * Banner source priority is resolved deterministically on the server, before
 * anything is rendered (backend.md §6; no client-side race exists):
 *   1. `/api/tmdb/:id` visuals for every selected slide (deduped, bounded,
 *      retried once on transport failure). A resolved match with a usable
 *      banner or backdrop always wins, regardless of anything AniList could
 *      provide.
 *   2. `/api/details/:id` — requested ONLY for slides whose TMDB enrichment
 *      yielded NO usable banner/backdrop AND whose homepage card carries no
 *      AniList banner (so the AniList fallback, priority 4, becomes the real
 *      canonical banner instead of a stretched cover/poster), OR whose home
 *      card has no usable description (the same payload supplies the hero
 *      synopsis). Never the full list.
 * Each request is failure-isolated; slides with no usable image at all fall
 * through to the CSS gradient. Wrapped in <Suspense> by /anime.
 */
export default async function AnimeHero() {
  const feed = await getHomeFeed();

  if (!feed.ok) {
    return <HeroErrorState kind={feed.kind} status={feed.status} />;
  }

  const trending = selectTrendingSlides(feed.data.trending);
  if (trending.length === 0) {
    return <HeroEmptyState />;
  }

  const visualsById = await fetchTmdbVisualsBatch(
    trending.map((anime) => anime.anilistId),
  );

  // Priority 4 (AniList banner fallback): only slides without a usable TMDB
  // banner/backdrop need AniList artwork. The home card's banner is used
  // directly when present; trending cards usually carry only a poster, so
  // /api/details/:id supplies the canonical AniList banner for the rest.
  //
  // The same (deduped, bounded, failure-isolated) details batch also supplies
  // the hero synopsis: the home feed's trending cards carry description:null
  // in practice, so slides without a usable card description join the batch
  // and pick up the /api/details/:id description. No extra requests are made
  // for slides that already have everything they need.
  const needsBannerFallback = (anime: Anime): boolean =>
    !hasUsableTmdbImage(visualsById.get(anime.anilistId) ?? null) &&
    getAnimeArtwork(anime).banner === null;

  const idsNeedingDetails = trending
    .filter(
      (anime) =>
        needsBannerFallback(anime) || getDisplayDescription(anime) === null,
    )
    .map((anime) => anime.anilistId);

  const detailsById: Map<number, Anime | null> =
    idsNeedingDetails.length > 0
      ? await fetchAnimeDetailsBatch(idsNeedingDetails)
      : new Map<number, Anime | null>();

  const slides = buildHeroSlides(trending, visualsById, detailsById);

  return <AnimeHeroSlider slides={slides} />;
}
