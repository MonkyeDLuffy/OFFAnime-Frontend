import "server-only";

import type { Anime, ApiResult, HomeFeed, TmdbVisuals, EpisodesResponse, AnimeRecommendation } from "./types";

/**
 * Server-side client for the OffAnime backend (backend.md §5, §10).
 *
 * - Runs exclusively on the server; `BACKEND_API_SECRET` never reaches the
 *   browser (there are no `NEXT_PUBLIC_*` variables in this project).
 * - Server components call this module directly; browser-originated requests
 *   go through the restricted Route Handler proxy in `src/app/api/[...path]`,
 *   which enforces the same allowlist as the backend docs.
 * - Deadlines are enforced by racing the fetch (which keeps running so it can
 *   still populate the Data Cache); only the TMDB visuals call retries, once,
 *   on transport failures.
 * - Never logs the secret or full upstream payloads.
 */

const BACKEND_URL_ENV = "OFFANIME_BACKEND_URL";
const BACKEND_SECRET_ENV = "BACKEND_API_SECRET";

/** Backend feeds are cached ~60s upstream (TTL preset SHORT). */
const HOME_REVALIDATE_SECONDS = 60;
/** TMDB visuals are effectively static; cache for a day (TTL preset DAY). */
const TMDB_REVALIDATE_SECONDS = 60 * 60 * 24;

const HOME_TIMEOUT_MS = 10_000;
/**
 * Matches the backend's own outbound budget (REQUEST_TIMEOUT_MS = 10s).
 * Cold backend invocations have been observed to need >5s for a first TMDB
 * enrichment, so a tight deadline here would fail renders that would have
 * succeeded — and a failed render silently demotes the slide to AniList.
 */
const TMDB_TIMEOUT_MS = 10_000;
/**
 * TMDB visuals gate the hero background (priority 1-3 of the banner chain),
 * so a single transient transport failure must not hand the slide to the
 * AniList fallback. Only transport failures (timeout / network / 5xx) are
 * retried; definitive 200 answers — including `resolved: false` — are the
 * backend's considered match decision (it never caches failures) and are
 * never retried. Bounded: one retry, no loops.
 */
const TMDB_ATTEMPTS = 2;
const RETRY_DELAY_MS = 300;
/** Bounded concurrency for TMDB enrichment across hero slides. */
const TMDB_CONCURRENCY = 3;
const MAX_HERO_SLIDES = 7;

function getBackendConfig(): { baseUrl: string; secret: string } | null {
  const baseUrl = process.env[BACKEND_URL_ENV]?.trim();
  const secret = process.env[BACKEND_SECRET_ENV]?.trim();
  if (!baseUrl || !secret) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), secret };
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

async function readUpstreamErrorCode(response: Response): Promise<string | undefined> {
  try {
    const payload: unknown = await response.json();
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const error = (payload as Record<string, unknown>).error;
      if (error && typeof error === "object" && !Array.isArray(error)) {
        const code = (error as Record<string, unknown>).code;
        if (typeof code === "string") return code;
      }
    }
  } catch {
    // Body was not JSON — nothing to surface beyond the status code.
  }
  return undefined;
}

/** Deadline error; named "TimeoutError" so isTimeoutError recognizes it. */
class DeadlineExceededError extends Error {
  constructor() {
    super("The OffAnime backend did not respond in time.");
    this.name = "TimeoutError";
  }
}

/**
 * Settles with the fetch result, or rejects once `deadlineMs` elapses.
 *
 * The underlying request is deliberately NOT aborted: an aborted fetch can
 * never populate the Next.js Data Cache, so every revalidation would re-roll
 * the dice on a flaky upstream. A slow-but-successful response is allowed to
 * finish and be cached (`next.revalidate`) for subsequent renders instead of
 * being thrown away.
 */
function withDeadline<T>(promise: Promise<T>, deadlineMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new DeadlineExceededError()), deadlineMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export async function requestJsonOnce<T>(
  path: string,
  revalidateSeconds: number,
  timeoutMs: number,
): Promise<ApiResult<T>> {
  const config = getBackendConfig();
  if (!config) {
    return { ok: false, kind: "not-configured" };
  }

  try {
    const response = await withDeadline(
      fetch(`${config.baseUrl}/api${path}`, {
        headers: {
          accept: "application/json",
          // Trusted-proxy authentication (backend.md §5). Never sent from a browser.
          "x-api-key": config.secret,
        },
        next: { revalidate: revalidateSeconds },
      }),
      timeoutMs,
    );

    if (!response.ok) {
      const code = await readUpstreamErrorCode(response);
      return {
        ok: false,
        kind: response.status === 401 ? "unauthorized" : "http",
        status: response.status,
        code,
      };
    }

    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    if (isTimeoutError(error)) return { ok: false, kind: "timeout" };
    return { ok: false, kind: "network" };
  }
}

/**
 * True for failures that may succeed on a second attempt: deadline/network
 * failures and upstream 5xx. Definitive answers (200 payloads, 4xx, 401)
 * are never retried.
 */
function isRetryableFailure(result: ApiResult<unknown>): boolean {
  if (result.ok) return false;
  if (result.kind === "timeout" || result.kind === "network") return true;
  return (
    result.kind === "http" &&
    typeof result.status === "number" &&
    result.status >= 500
  );
}

async function requestJson<T>(
  path: string,
  revalidateSeconds: number,
  timeoutMs: number,
  attempts: number = 1,
): Promise<ApiResult<T>> {
  let result = await requestJsonOnce<T>(path, revalidateSeconds, timeoutMs);
  for (
    let attempt = 1;
    attempt < attempts && isRetryableFailure(result);
    attempt += 1
  ) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    result = await requestJsonOnce<T>(path, revalidateSeconds, timeoutMs);
  }
  return result;
}

export function getHomeFeed(): Promise<ApiResult<HomeFeed>> {
  return requestJson<HomeFeed>("/home", HOME_REVALIDATE_SECONDS, HOME_TIMEOUT_MS);
}

export function getTmdbVisuals(anilistId: number): Promise<ApiResult<TmdbVisuals>> {
  return requestJson<TmdbVisuals>(
    `/tmdb/${anilistId}`,
    TMDB_REVALIDATE_SECONDS,
    TMDB_TIMEOUT_MS,
    TMDB_ATTEMPTS,
  );
}

/** Details pipeline results use the backend's LONG TTL (1h). */
const DETAILS_REVALIDATE_SECONDS = 60 * 60;

export function getAnimeDetails(anilistId: number): Promise<ApiResult<Anime>> {
  return requestJson<Anime>(
    `/details/${anilistId}`,
    DETAILS_REVALIDATE_SECONDS,
    HOME_TIMEOUT_MS,
  );
}

/** Episodes list can be very large (e.g., One Piece 1000+ episodes = 2.3MB+).
 *  Use no-store (revalidate=0) to avoid Next.js cache size limits. */
export function getAnimeEpisodes(anilistId: number): Promise<ApiResult<EpisodesResponse>> {
  return requestJsonOnce<EpisodesResponse>(
    `/episodes/${anilistId}`,
    0,
    HOME_TIMEOUT_MS,
  );
}

/**
 * Extract recommendations from an anime details response.
 * The `/api/details/:id` response already includes a `recommendations` array.
 * This helper normalizes the raw recommendations into the `AnimeRecommendation` shape.
 */
export function extractRecommendations(
  detailsResponse: { recommendations?: unknown } | null,
): AnimeRecommendation[] {
  if (!detailsResponse || !Array.isArray(detailsResponse.recommendations)) {
    return [];
  }
  return detailsResponse.recommendations
    .filter((rec): rec is Record<string, unknown> => {
      if (!rec || typeof rec !== "object") return false;
      return typeof rec.id === "number" && rec.id > 0;
    })
    .map((rec) => ({
      id: rec.id as number,
      anilistId: (rec.anilistId as number) ?? (rec.id as number),
      title: rec.title as string | null,
      titleEnglish: rec.titleEnglish as string | null,
      titleRomaji: rec.titleRomaji as string | null,
      images: rec.images as { poster: string | null; banner: string | null } | null,
      format: rec.format as string | null,
      episodes: rec.episodes as number | null,
      status: rec.status as string | null,
      seasonYear: rec.seasonYear as number | null,
      averageScore: rec.averageScore as number | null,
      genres: Array.isArray(rec.genres) ? rec.genres.filter((g): g is string => typeof g === "string") : [],
      recommendationRating: rec.recommendationRating as number | null,
    }));
}

/**
 * Runs `handler` for each unique AniList ID with bounded concurrency.
 * Every item is failure-isolated by the caller (handler returns null on
 * error) so one bad slide can never break the whole batch.
 */
async function runBoundedBatch<T>(
  anilistIds: number[],
  concurrency: number,
  handler: (anilistId: number) => Promise<T>,
): Promise<Map<number, T>> {
  const uniqueIds = [...new Set(anilistIds)];
  const results = new Map<number, T>();
  if (uniqueIds.length === 0) return results;

  let cursor = 0;
  const workerCount = Math.min(concurrency, uniqueIds.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < uniqueIds.length) {
      const anilistId = uniqueIds[cursor];
      cursor += 1;
      results.set(anilistId, await handler(anilistId));
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * TMDB enrichment for hero slides only (≤ MAX_HERO_SLIDES ids):
 * deduplicated per AniList ID, bounded concurrency, per-slide timeout and
 * failure isolation. Returns raw payloads keyed by AniList ID (null when
 * enrichment failed).
 */
export async function fetchTmdbVisualsBatch(
  anilistIds: number[],
): Promise<Map<number, TmdbVisuals | null>> {
  const uniqueIds = [...new Set(anilistIds)].slice(0, MAX_HERO_SLIDES);
  return runBoundedBatch(uniqueIds, TMDB_CONCURRENCY, async (anilistId) => {
    const result = await getTmdbVisuals(anilistId);
    return result.ok ? result.data : null;
  });
}

/**
 * `/api/details/:id` artwork for the AniList banner fallback (priority 4):
 * slides whose TMDB enrichment produced no usable banner/backdrop AND whose
 * homepage card carries no AniList banner of its own. Only those IDs are
 * requested (never the full trending list), deduplicated, failure-isolated.
 */
export async function fetchAnimeDetailsBatch(
  anilistIds: number[],
): Promise<Map<number, Anime | null>> {
  const uniqueIds = [...new Set(anilistIds)].slice(0, MAX_HERO_SLIDES);
  return runBoundedBatch(uniqueIds, TMDB_CONCURRENCY, async (anilistId) => {
    const result = await getAnimeDetails(anilistId);
    return result.ok ? result.data : null;
  });
}
