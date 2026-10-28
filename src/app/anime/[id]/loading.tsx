"use client";

import AnimeDetailsSkeleton from "@/components/anime/AnimeDetailsSkeleton";

/**
 * Route-level loading UI for `/anime/[id]`.
 *
 * Next.js renders this automatically during client-side transitions to the
 * details page, so the moment a user clicks an anime card they see a premium
 * skeleton instead of a frozen screen. The shell streams in from the server
 * behind it and replaces the skeleton once the details data is ready — no
 * artificial delay, no waiting for the API before navigating.
 *
 * It is intentionally a skeleton shell (not the shared error state) so the
 * transition to content is seamless: matching layout, matching dimensions,
 * minimal cumulative layout shift.
 */

export default function AnimeDetailsLoading() {
  return <AnimeDetailsSkeleton />;
}
