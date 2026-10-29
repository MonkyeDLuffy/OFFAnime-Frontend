/**
 * Types modeled on the documented OffAnime backend schemas (backend.md §6, §7).
 *
 * The backend guarantees that missing optional fields are `null` / `[]`, but
 * values crossing the network boundary are still normalized defensively in
 * `src/lib/anime.ts` before they reach the UI.
 */

export interface AnimeTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
  userPreferred: string | null;
}

export interface AnimeImages {
  poster: string | null;
  cover: string | null;
  banner: string | null;
}

/**
 * Trailer reference attached to `/api/home` cards: a YouTube trailer record
 * (`{ id, site, key, url }`) or null when the card has none.
 */
export interface AnimeTrailer {
  id: string | null;
  site: string | null;
  key: string | null;
  url: string | null;
}

/**
 * A resolved, embeddable trailer for the hover previews: a YouTube video ID
 * (rendered through the proper YouTube embed) or a directly playable media
 * URL (rendered through a native `<video>` element). Null → poster only.
 */
export type TrailerSource =
  | { kind: "youtube"; videoId: string }
  | { kind: "video"; src: string };

/** Canonical normalized anime shape (backend.md §7). */
export interface Anime {
  id: number;
  anilistId: number;
  malId: number | null;
  /**
   * Dedicated English title supplied by the backend. Optional: older
   * deployments and cached payloads omit it, in which case display titles
   * fall back through the shared selector in `src/lib/anime.ts`.
   */
  titleEnglish?: string | null;
  /**
   * Title payload. The details endpoint returns the canonical
   * `{ romaji, english, native, userPreferred }` object; card-style endpoints
   * may return a plain (romaji) string — both are handled defensively.
   */
  title: AnimeTitle | null;
  description: string | null;
  images: AnimeImages | null;
  format: string | null;
  status: string | null;
  episodes: number | null;
  duration: number | null;
  season: string | null;
  seasonYear: number | null;
  genres: string[];
  studios: string[];
  startDate: string | null;
  endDate: string | null;
  averageScore: number | null;
  popularity: number | null;
  /** Trailer record from the home card; optional (older cached payloads omit it). */
  trailer?: AnimeTrailer | null;
}

/** `GET /api/home` response. A failing section may be omitted upstream. */
export interface HomeFeed {
  trending?: Anime[];
  popular?: Anime[];
  seasonal?: Anime[];
  topRated?: Anime[];
}

export type TmdbMediaType = "tv" | "movie";

/**
 * `GET /api/tmdb/:id` visual enrichment (backend.md §6).
 *
 * The live deployment returns `images: { backdrop, banner }` (absolute URLs)
 * or `resolved: false` with a `reason`. The logo arrives as a top-level
 * `logo` object (`{ path, url, urlOriginal, language, extension, ... }`);
 * `logo` normalizes to the preferred `urlOriginal` URL with `logoFallback`
 * holding `url` for the client-side onError chain. Plural `images.logos` and
 * bare-string logo fields remain tolerated for forward compatibility.
 * `banner` and `backdrop` are kept as separate candidates for the hero
 * fallback chain (banner preferred, then backdrop).
 */
export interface TmdbVisuals {
  resolved: boolean;
  tmdbId: number | null;
  mediaType: TmdbMediaType | null;
  banner: string | null;
  backdrop: string | null;
  poster: string | null;
  /** Preferred logo URL (`logo.urlOriginal` when present). */
  logo: string | null;
  /** Secondary logo URL (`logo.url`, w500) used only if `logo` fails to load. */
  logoFallback: string | null;
}

/** Fully prepared hero slide, ready for presentation components. */
export interface HeroSlide {
  anilistId: number;
  malId: number | null;
  title: string;
  nativeTitle: string | null;
  /**
   * Short synopsis for the hero: the home card's description when present,
   * otherwise the `/api/details/:id` description. Null when neither source
   * has one (the UI hides the description area).
   */
  description: string | null;
  /** Preferred TMDB logo URL (`urlOriginal`); null when the backend sent none. */
  logoUrl: string | null;
  /** Secondary TMDB logo URL (`url`), tried only if `logoUrl` fails to load. */
  logoFallbackUrl: string | null;
  /** Primary background candidate (highest-priority valid image). */
  backdropUrl: string | null;
  /** Remaining background candidates in priority order for client-side onError fallback. */
  backdropFallbacks: string[];
  posterUrl: string | null;
  /** AniList averageScore mapped to a 0–10 scale. */
  rating: number | null;
  year: number | null;
  episodeCount: number | null;
  genres: string[];
}

/** Prepared entry for the "TOP 10 | CONTENT TODAY" homepage row. */
export interface TopTenEntry {
  /** 1-based display rank; mirrors the trending order (never re-sorted). */
  rank: number;
  anilistId: number;
  title: string;
  /** Best available poster from the home card (optimizer-allowlisted host). */
  posterUrl: string | null;
  /** Secondary candidate (AniList cover) tried if `posterUrl` fails to load. */
  posterFallbackUrl: string | null;
}

/**
 * Prepared entry for the "Trending Anime" homepage row. The `/api/home`
 * trending section carries the identical card payload as `popular`, so this
 * row shares the PopularEntry shape (and the PopularCard renderer).
 */
export type TrendingEntry = PopularEntry;

/** Prepared entry for the "Popular Anime" homepage row. */
export interface PopularEntry {
  anilistId: number;
  title: string;
  /** Best available portrait poster (optimizer-allowlisted host). */
  posterUrl: string | null;
  /** Secondary candidate (AniList cover) tried if `posterUrl` fails to load. */
  posterFallbackUrl: string | null;
  /** Release format label from the home card (TV, MOVIE, OVA, ...). */
  format: string | null;
  year: number | null;
  episodeCount: number | null;
  /** Resolved trailer from the home card's `trailer` field (null → no preview). */
  trailer: TrailerSource | null;
}

/** Discriminated result for server-side backend calls. */
export type ApiErrorKind =
  | "not-configured"
  | "network"
  | "timeout"
  | "http"
  | "unauthorized";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: ApiErrorKind; status?: number; code?: string };

export type HeroErrorKind = ApiErrorKind;

/**
 * Episode metadata from `/api/episodes/:id` (backend.md §6).
 * Jikan episode list + AniZip enrichment.
 */
export interface AnimeEpisode {
  episode: number;
  globalEpisodeNumber: number;
  episodeNumber: number;
  seasonNumber: number;
  absoluteEpisodeNumber: number;
  anidbEid: number | null;
  tvdbId: number | null;
  malId: number | null;
  title: string;
  titleJapanese: string | null;
  titleVariants: Record<string, string> | null;
  image: string | null;
  overview: string | null;
  aired: string | null;
  airDateUtc: string | null;
  runtime: number | null;
  score: number | null;
  filler: boolean | null;
  recap: boolean | null;
  episodeType: string | null;
  source: string;
}

/** `GET /api/episodes/:id` response shape. */
export interface EpisodesResponse {
  id: number;
  anilistId: number;
  malId: number | null;
  totalEpisodes: number | null;
  pageInfo: {
    currentPage: number;
    hasNextPage: boolean;
  } | null;
  episodes: AnimeEpisode[] | null;
  source: string;
  diagnostics: Record<string, unknown>;
}

/**
 * Recommendation entry from the anime details response.
 * Derived from the `recommendations` array in `/api/details/:id`.
 */
export interface AnimeRecommendation {
  id: number;
  anilistId: number;
  title: string | null;
  titleEnglish: string | null;
  titleRomaji: string | null;
  images: {
    poster: string | null;
    banner: string | null;
  } | null;
  format: string | null;
  episodes: number | null;
  status: string | null;
  seasonYear: number | null;
  averageScore: number | null;
  genres: string[];
  recommendationRating: number | null;
}

/** `GET /api/recommendations/:id` response shape (also available inline in `/api/details/:id`). */
export interface RecommendationsResponse {
  anilistId: number;
  recommendations: AnimeRecommendation[];
}
