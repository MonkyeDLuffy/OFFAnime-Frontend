import type {
  Anime,
  HeroSlide,
  PopularEntry,
  TmdbVisuals,
  TopTenEntry,
  TrailerSource,
  TrendingEntry,
} from "./types";

/**
 * Pure normalization helpers that turn documented backend payloads into
 * presentation-ready hero slides. Nothing here performs I/O, and every
 * optional field is treated as "may be missing".
 */

export const MAX_HERO_SLIDES = 7;
export const MAX_HERO_GENRES = 3;
/** Entries shown in the "TOP 10 | CONTENT TODAY" homepage row. */
export const MAX_TOP_TEN = 10;
/** Entries shown in the "Popular Anime" homepage row. */
export const MAX_POPULAR = 20;
/** Entries shown in the "Trending Anime" homepage row. */
export const MAX_TRENDING_ROW = 20;
/** Entries shown in the "TOP RATED ANIME" homepage row. */
export const MAX_TOP_RATED = 20;

/** Hosts allowlisted for next/image optimization (next.config.ts mirrors this). */
const OPTIMIZABLE_IMAGE_HOSTS = new Set(["image.tmdb.org", "s4.anilist.co"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** A trending entry is usable when it carries a canonical AniList ID. */
export function isValidAnimeEntry(value: unknown): value is Anime {
  if (!isRecord(value)) return false;
  const anilistId = asFiniteNumber(value.anilistId) ?? asFiniteNumber(value.id);
  return anilistId !== null && anilistId > 0;
}

/**
 * Selects up to `max` valid, de-duplicated trending entries. Never fabricates
 * entries; a short trending list simply yields fewer slides.
 */
export function selectTrendingSlides(
  trending: unknown,
  max: number = MAX_HERO_SLIDES,
): Anime[] {
  if (!Array.isArray(trending)) return [];
  const seen = new Set<number>();
  const selected: Anime[] = [];
  for (const entry of trending) {
    if (!isValidAnimeEntry(entry)) continue;
    const anilistId =
      asFiniteNumber(entry.anilistId) ?? asFiniteNumber(entry.id) ?? 0;
    if (seen.has(anilistId)) continue;
    seen.add(anilistId);
    selected.push(entry);
    if (selected.length >= max) break;
  }
  return selected;
}

/**
 * The entry's English title: the dedicated `titleEnglish` field first, then
 * the AniList `title.english` object field. Null when neither is available.
 */
export function getEnglishTitle(anime: Anime | null): string | null {
  if (!anime) return null;
  const dedicated = asNonEmptyString(anime.titleEnglish);
  if (dedicated) return dedicated;
  if (isRecord(anime.title)) return asNonEmptyString(anime.title.english);
  return null;
}

/**
 * Single shared display-title selector — every component renders titles
 * through this (directly or via the hero/Top 10/Popular builders).
 *
 * Fallback order: dedicated `titleEnglish` → `title.english` →
 * `title.userPreferred` (AniList's preferred display title, never Japanese
 * ahead of an English/romaji option) → `title.romaji` (or the plain string
 * `title` some card endpoints return) → `title.native` (Japanese, last
 * resort) → "Untitled". Never returns an empty string or undefined.
 */
export function getDisplayTitle(anime: Anime): string {
  const dedicatedEnglish = asNonEmptyString(anime.titleEnglish);
  const title: unknown = anime.title;
  if (typeof title === "string") {
    return dedicatedEnglish ?? (title.trim() || "Untitled");
  }
  if (isRecord(title)) {
    const preferred = [
      dedicatedEnglish,
      title.english,
      title.userPreferred,
      title.romaji,
      title.native,
    ]
      .map((candidate) => asNonEmptyString(candidate))
      .find((candidate): candidate is string => candidate !== null);
    if (preferred) return preferred;
  }
  return dedicatedEnglish ?? "Untitled";
}

export function getNativeTitle(anime: Anime): string | null {
  if (!isRecord(anime.title)) return null;
  return asNonEmptyString(anime.title.native);
}

/**
 * Synopsis for the hero. The backend documents descriptions as cleaned plain
 * text (backend.md §7), but AniList-sourced text can still carry inline
 * markup, so tags are stripped and whitespace collapsed defensively before
 * the text reaches the UI. Returns null when nothing usable remains.
 */
export function getDisplayDescription(anime: Anime | null): string | null {
  if (!anime) return null;
  const raw = asNonEmptyString(anime.description);
  if (raw === null) return null;
  const text = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text : null;
}

/** AniList scores are 0–100; the UI shows a 0–10 rating with one decimal. */
export function getDisplayRating(anime: Anime): number | null {
  const score = asFiniteNumber(anime.averageScore);
  if (score === null || score <= 0 || score > 100) return null;
  return Math.round(score) / 10;
}

export function getDisplayYear(anime: Anime): number | null {
  const seasonYear = asFiniteNumber(anime.seasonYear);
  if (seasonYear !== null && seasonYear > 1900 && seasonYear < 2200) {
    return seasonYear;
  }
  const startYear = Number.parseInt(
    asNonEmptyString(anime.startDate)?.slice(0, 4) ?? "",
    10,
  );
  return Number.isFinite(startYear) && startYear > 1900 && startYear < 2200
    ? startYear
    : null;
}

export function getDisplayEpisodeCount(anime: Anime): number | null {
  const episodes = asFiniteNumber(anime.episodes);
  return episodes !== null && episodes > 0 ? Math.round(episodes) : null;
}

export function getDisplayGenres(anime: Anime): string[] {
  if (!Array.isArray(anime.genres)) return [];
  return anime.genres
    .filter((genre): genre is string => asNonEmptyString(genre) !== null)
    .slice(0, MAX_HERO_GENRES);
}

function asHttpUrl(value: unknown): string | null {
  const raw = asNonEmptyString(value);
  if (!raw || !/^https?:\/\//i.test(raw)) return null;
  return raw;
}

/** TMDB responses may return bare paths; convert them to usable image URLs. */
export function toTmdbImageUrl(
  path: string,
  size: "original" | "w500",
): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `https://image.tmdb.org/t/p/${size}${normalized}`;
}

function collectImagePaths(value: unknown, target: string[]): void {
  if (typeof value === "string") {
    const path = asNonEmptyString(value);
    if (path) target.push(path);
    return;
  }
  if (!Array.isArray(value)) return;
  for (const item of value) {
    const path =
      typeof item === "string"
        ? asNonEmptyString(item)
        : isRecord(item)
          ? asNonEmptyString(item.file_path)
          : null;
    if (path) target.push(path);
  }
}

/**
 * Collects TMDB logo candidates in preference order into `target`.
 *
 * The live backend sends a top-level `logo` object
 * (`{ path, url, urlOriginal, language, extension, ... }`); `urlOriginal`
 * (highest quality) is preferred, then `url`, then a bare `path` (converted
 * to a URL by the caller). Bare strings and `images.logos` arrays (string
 * entries or `{ file_path }` records) remain tolerated for compatibility.
 * Posters are never collected here, so a poster can never become a logo.
 */
function collectLogoCandidates(value: unknown, target: string[]): void {
  if (typeof value === "string") {
    const path = asNonEmptyString(value);
    if (path) target.push(path);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectLogoCandidates(item, target);
    return;
  }
  if (isRecord(value)) {
    // urlOriginal → url → file_path. The bare `path` is the same asset in a
    // different size, so it is only used when no absolute URL exists at all.
    const before = target.length;
    for (const key of ["urlOriginal", "url", "file_path"] as const) {
      const candidate = asNonEmptyString(value[key]);
      if (candidate && !target.includes(candidate)) target.push(candidate);
    }
    if (target.length === before) {
      const path = asNonEmptyString(value.path);
      if (path && !target.includes(path)) target.push(path);
    }
  }
}

interface RawImageBucket {
  backdrops: string[];
  banners: string[];
  posters: string[];
  logos: string[];
}

/**
 * The documented `/api/tmdb/:id` response exposes `images`, `poster` and
 * `reason`, but does not pin down the exact `images` shape. This parser
 * accepts the observed variants (keyed object with singular
 * `images.backdrop` / `images.banner` — the live backend shape — plus flat
 * arrays and bare strings) without inventing fields. The logo is read from
 * the live backend's top-level `logo` object (preferring `urlOriginal`, then
 * `url`), with `images.logos` and bare-string logos still tolerated.
 */
function extractRawImages(payload: Record<string, unknown>): RawImageBucket {
  const bucket: RawImageBucket = { backdrops: [], banners: [], posters: [], logos: [] };
  const images = payload.images;
  if (typeof images === "string") {
    bucket.backdrops.push(images);
  } else if (Array.isArray(images)) {
    collectImagePaths(images, bucket.backdrops);
  } else if (isRecord(images)) {
    // Plural array keys (tolerated for future backend changes) …
    collectImagePaths(images.backdrops, bucket.backdrops);
    collectImagePaths(images.posters, bucket.posters);
    collectLogoCandidates(images.logos, bucket.logos);
    // … and the live backend's singular keys.
    collectImagePaths(images.backdrop, bucket.backdrops);
    collectImagePaths(images.banner, bucket.banners);
  }
  collectImagePaths(payload.backdrop, bucket.backdrops);
  collectImagePaths(payload.banner, bucket.banners);
  collectImagePaths(payload.poster, bucket.posters);
  collectLogoCandidates(payload.logo, bucket.logos);
  return bucket;
}

export function normalizeTmdbVisuals(payload: unknown): TmdbVisuals {
  if (!isRecord(payload)) {
    return {
      resolved: false,
      tmdbId: null,
      mediaType: null,
      banner: null,
      backdrop: null,
      poster: null,
      logo: null,
      logoFallback: null,
    };
  }

  const mediaTypeRaw = asNonEmptyString(payload.mediaType)?.toLowerCase();
  const images = extractRawImages(payload);
  const backdropPath = images.backdrops.find((path) => !images.banners.includes(path)) ?? null;
  // Logo priority: urlOriginal (absolute) → url (absolute) → bare path. The
  // preferred entry becomes `logo`; the next distinct entry is the onError
  // fallback. Absolute URLs ignore the size suffix in toTmdbImageUrl.
  const [logoCandidate, logoFallbackCandidate] = images.logos;

  return {
    resolved: payload.resolved === true,
    tmdbId: asFiniteNumber(payload.tmdbId),
    mediaType: mediaTypeRaw === "tv" || mediaTypeRaw === "movie" ? mediaTypeRaw : null,
    banner: images.banners[0] ? toTmdbImageUrl(images.banners[0], "original") : null,
    backdrop: backdropPath ? toTmdbImageUrl(backdropPath, "original") : null,
    poster: images.posters[0] ? toTmdbImageUrl(images.posters[0], "w500") : null,
    logo: logoCandidate ? toTmdbImageUrl(logoCandidate, "original") : null,
    logoFallback:
      logoFallbackCandidate && logoFallbackCandidate !== logoCandidate
        ? toTmdbImageUrl(logoFallbackCandidate, "original")
        : null,
  };
}

/** Only route images from known hosts through the next/image optimizer. */
export function isOptimizableImageUrl(url: string | null): url is string {
  if (!url) return false;
  try {
    return OPTIMIZABLE_IMAGE_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

function getAnimePosterUrl(anime: Anime): string | null {
  if (!isRecord(anime.images)) return null;
  return asHttpUrl(anime.images.poster) ?? asHttpUrl(anime.images.cover);
}

/** AniList artwork of an entry, following the canonical images shape. */
export function getAnimeArtwork(anime: Anime): {
  banner: string | null;
  cover: string | null;
  poster: string | null;
} {
  if (!isRecord(anime.images)) {
    return { banner: null, cover: null, poster: null };
  }
  return {
    banner: asHttpUrl(anime.images.banner),
    cover: asHttpUrl(anime.images.cover),
    poster: asHttpUrl(anime.images.poster),
  };
}

/** True when the entry itself already carries at least one usable image. */
export function hasAnimeArtwork(anime: Anime): boolean {
  const artwork = getAnimeArtwork(anime);
  return artwork.banner !== null || artwork.cover !== null || artwork.poster !== null;
}

/**
 * Derives the highest-resolution AniList cover variant of the same asset.
 *
 * AniList CDN covers live in fixed size folders (`small` → `medium` →
 * `large`) identified by the URL path, with the filename identical across
 * sizes; `large` (~460px) is AniList's highest available tier — it is what
 * the AniList GraphQL `coverImage.extraLarge` field returns, and the
 * `extra-large`/`original` paths do not exist (404). The `/home` cards carry
 * the `medium` file (~230px), which is visibly soft in the Popular row's
 * 240–300px cards (up to ~600 device px on high-DPR screens), so this
 * rewrites the folder in place — same host, same file, no extra request.
 * Returns null for anything that is not an AniList medium cover URL.
 */
export function upgradeAniListCoverUrl(url: string | null): string | null {
  if (!url) return null;
  return url.replace(
    /^(https:\/\/s4\.anilist\.co\/file\/anilistcdn\/media\/anime\/cover\/)medium(\/[^/]+)$/,
    "$1large$2",
  );
}

/** Whether a raw `/api/tmdb/:id` payload produced a confident match. */
export function isTmdbMatchResolved(payload: unknown): boolean {
  return normalizeTmdbVisuals(payload).resolved;
}

/**
 * True only when the TMDB enrichment produced at least one usable hero
 * background candidate (banner or backdrop) from a resolved match.
 *
 * This is the single authority for "TMDB provided a usable image" and is
 * shared by the slide builder and the `/api/details/:id` fallback decision:
 * failed fetches (null), `resolved: false` answers and image-less resolved
 * matches all count as "no usable TMDB image", which is what sends the slide
 * down the AniList fallback chain — never a race, never a partial match.
 */
export function hasUsableTmdbImage(rawPayload: unknown): boolean {
  const visuals = normalizeTmdbVisuals(rawPayload);
  if (!visuals.resolved) return false;
  return (
    isOptimizableImageUrl(visuals.banner) || isOptimizableImageUrl(visuals.backdrop)
  );
}

/** Deterministic dark gradient used when a slide has no usable banner. */
export function getFallbackGradient(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360;
  }
  const hue = hash;
  const hueShift = (hue + 40) % 360;
  return [
    `radial-gradient(120% 90% at 78% 18%, hsl(${hue} 32% 16%) 0%, transparent 60%)`,
    `linear-gradient(112deg, hsl(${hueShift} 30% 10%) 0%, hsl(${hue} 38% 6%) 55%, #050507 100%)`,
  ].join(", ");
}

/**
 * Merges a selected trending anime with its (optional) TMDB visuals and
 * (optional) `/api/details/:id` artwork into a presentation-ready slide.
 *
 * Background candidate priority (first valid URL wins; the rest become
 * client-side onError fallbacks):
 *   1. TMDB images.banner (resolved match only)
 *   2. TMDB images.backdrop (resolved match only)
 *   3. AniList details.images.banner
 *   4. AniList details.images.cover
 *   5. AniList details.images.poster (last image fallback)
 *   6. (UI) cinematic gradient when no candidate exists or all fail to load
 *
 * `resolved: false` is never treated as a match, and posters are never used
 * as logos. A missing logo falls back to the title heading in the UI.
 */
export function buildHeroSlides(
  trending: Anime[],
  visualsById: Map<number, TmdbVisuals | null>,
  detailsById: Map<number, Anime | null> = new Map(),
): HeroSlide[] {
  return trending.map((anime) => {
    const visuals = normalizeTmdbVisuals(visualsById.get(anime.anilistId) ?? null);
    // `/api/details/:id` artwork (fetched only when the home card lacks any
    // image) supersedes the reduced homepage-card images.
    const details = detailsById.get(anime.anilistId) ?? null;
    const artwork = getAnimeArtwork(details ?? anime);

    const candidates: string[] = [];
    const pushCandidate = (url: string | null): void => {
      if (!url || !isOptimizableImageUrl(url)) return;
      if (!candidates.includes(url)) candidates.push(url);
    };
    if (visuals.resolved) {
      pushCandidate(visuals.banner);
      pushCandidate(visuals.backdrop);
    }
    pushCandidate(artwork.banner);
    pushCandidate(artwork.cover);
    pushCandidate(artwork.poster);

    const homePoster = getAnimePosterUrl(anime);
    const posterUrl =
      (isOptimizableImageUrl(homePoster) && homePoster) ||
      (isOptimizableImageUrl(artwork.poster) ? artwork.poster : null);

    // Logo priority: TMDB logo.urlOriginal → TMDB logo.url → (UI) title
    // heading. Both URLs come from the logo field of the SAME /api/tmdb/:id
    // response keyed by this anime's AniList ID; posters are never logos.
    const logoUrl = asHttpUrl(visuals.logo);
    const logoFallback = asHttpUrl(visuals.logoFallback);

    // English-first title. The card's own English title wins; slides whose
    // home card carries only a romaji title pick up the English title from
    // the (already fetched, failure-isolated) details payload. Otherwise the
    // shared fallback chain applies (romaji → native → "Untitled").
    return {
      anilistId: anime.anilistId,
      malId: asFiniteNumber(anime.malId),
      title:
        getEnglishTitle(anime) ??
        getEnglishTitle(details) ??
        getDisplayTitle(anime),
      nativeTitle: getNativeTitle(anime),
      // The home card's description is preferred; slides whose card carried
      // none use the synopsis from the (optionally fetched) details payload.
      description: getDisplayDescription(anime) ?? getDisplayDescription(details),
      logoUrl,
      logoFallbackUrl: logoFallback && logoFallback !== logoUrl ? logoFallback : null,
      backdropUrl: candidates[0] ?? null,
      backdropFallbacks: candidates.slice(1),
      posterUrl: posterUrl || null,
      rating: getDisplayRating(anime),
      year: getDisplayYear(anime),
      episodeCount: getDisplayEpisodeCount(anime),
      genres: getDisplayGenres(anime),
    } satisfies HeroSlide;
  });
}

/**
 * Builds the ranked entries for the "TOP 10 | CONTENT TODAY" row from the raw
 * `/api/home` trending list. Upstream order is preserved (rank = position),
 * entries are de-duplicated, and the best available portrait poster is
 * resolved with the same image logic as the hero (AniList poster → cover,
 * restricted to optimizer-allowlisted hosts). TMDB stays banner/backdrop
 * enrichment for the hero — the trending cards already carry posters, so no
 * extra provider calls are made here. A short list simply yields fewer
 * entries; nothing is ever fabricated.
 */
export function buildTopTenEntries(
  trending: unknown,
  max: number = MAX_TOP_TEN,
): TopTenEntry[] {
  return selectTrendingSlides(trending, max).map((anime, index) => {
    const artwork = getAnimeArtwork(anime);
    const candidates = [artwork.poster, artwork.cover].filter(
      (url): url is string => isOptimizableImageUrl(url),
    );
    return {
      rank: index + 1,
      anilistId: anime.anilistId,
      title: getDisplayTitle(anime),
      posterUrl: candidates[0] ?? null,
      posterFallbackUrl: candidates[1] ?? null,
    };
  });
}

/**
 * Shared builder for the portrait poster home rows ("Trending Anime" and
 * "Popular Anime") — both `/api/home` sections carry the identical card
 * payload, so one mapping serves both rows and both render through the same
 * PopularCard component. Upstream order is preserved, entries are validated
 * and de-duplicated, and the card image is resolved from the card's own
 * artwork with the same image logic as the Top 10 row (poster → cover,
 * restricted to optimizer-allowlisted hosts; the higher-res AniList `large`
 * cover variant goes first). The home cards carry only format, episodes and
 * season/year metadata, which is passed through untouched for the hover
 * panel; the card's `trailer` field is resolved alongside (no extra
 * requests — it arrives in the same `/api/home` payload). Nothing is ever
 * fabricated and short lists simply yield fewer entries.
 */
function buildPosterRowEntries(source: unknown, max: number): PopularEntry[] {
  return selectTrendingSlides(source, max).map((anime) => {
    const artwork = getAnimeArtwork(anime);
    const candidates = [
      upgradeAniListCoverUrl(artwork.poster),
      artwork.poster,
      artwork.cover,
    ].filter((url): url is string => isOptimizableImageUrl(url));
    const uniqueCandidates = [...new Set(candidates)];
    return {
      anilistId: anime.anilistId,
      title: getDisplayTitle(anime),
      posterUrl: uniqueCandidates[0] ?? null,
      posterFallbackUrl: uniqueCandidates[1] ?? null,
      format: asNonEmptyString(anime.format),
      year: getDisplayYear(anime),
      episodeCount: getDisplayEpisodeCount(anime),
      trailer: getAnimeTrailerSource(anime),
    };
  });
}

/**
 * Builds the entries for the "Trending Anime" row (directly below the
 * "Popular Anime" row) from the raw `/api/home` `trending` collection —
 * the same section the hero and Top 10 read, never substituted.
 */
export function buildTrendingEntries(
  trending: unknown,
  max: number = MAX_TRENDING_ROW,
): TrendingEntry[] {
  return buildPosterRowEntries(trending, max);
}

/**
 * Builds the entries for the "Popular Anime" row from the raw `/api/home`
 * `popular` collection — a distinct section from trending, never substituted.
 */
export function buildPopularEntries(
  popular: unknown,
  max: number = MAX_POPULAR,
): PopularEntry[] {
  return buildPosterRowEntries(popular, max);
}

/**
 * Builds the entries for the "TOP RATED ANIME" row (the homepage's final
 * carousel, below "Trending Anime") from the raw `/api/home` `topRated`
 * collection — a distinct section from trending/popular, never substituted.
 * The backend ships the entries already ranked, so upstream order is
 * preserved exactly as delivered; the payload carries 20 entries, matching
 * the other rows' cap, so every entry renders.
 */
export function buildTopRatedEntries(
  topRated: unknown,
  max: number = MAX_TOP_RATED,
): PopularEntry[] {
  return buildPosterRowEntries(topRated, max);
}

/** Canonical 11-character YouTube video ID. */
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/** Direct media URLs a native `<video>` element can actually play. */
const DIRECT_MEDIA_PATTERN =
  /^https?:\/\/\S+\.(?:mp4|webm|ogv|ogg|mov)(?:\?\S*)?$/i;

/**
 * Pulls an 11-character YouTube ID out of every string form the backend may
 * supply: a bare ID, a watch URL, a youtu.be short link or an embed URL.
 */
function toYouTubeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (YOUTUBE_ID_PATTERN.test(raw)) return raw;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }
    if (
      host === "youtube.com" ||
      host === "youtube-nocookie.com" ||
      host === "m.youtube.com"
    ) {
      const v = url.searchParams.get("v");
      if (v && YOUTUBE_ID_PATTERN.test(v)) return v;
      const pathId = url.pathname.match(
        /\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/,
      );
      if (pathId) return pathId[1];
    }
  } catch {
    // Not a URL — a non-ID string yields no trailer.
  }
  return null;
}

function toDirectMediaUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  return DIRECT_MEDIA_PATTERN.test(raw) ? raw : null;
}

/**
 * Resolves the home card's `trailer` record (`{ id, site, key, url }` —
 * currently always a YouTube trailer) into a playable source. YouTube wins
 * over a direct file URL; anything unrecognized yields null so the card
 * keeps its poster — nothing is ever fabricated.
 */
export function getAnimeTrailerSource(anime: Anime): TrailerSource | null {
  const trailer: unknown = anime.trailer;
  if (typeof trailer === "string") {
    const videoId = toYouTubeId(trailer);
    if (videoId) return { kind: "youtube", videoId };
    const direct = toDirectMediaUrl(trailer);
    return direct ? { kind: "video", src: direct } : null;
  }
  if (!isRecord(trailer)) return null;
  const videoId =
    toYouTubeId(trailer.id) ??
    toYouTubeId(trailer.key) ??
    toYouTubeId(trailer.youtube_id) ??
    toYouTubeId(trailer.embed_url) ??
    toYouTubeId(trailer.url);
  if (videoId) return { kind: "youtube", videoId };
  const direct = toDirectMediaUrl(trailer.url);
  return direct ? { kind: "video", src: direct } : null;
}
