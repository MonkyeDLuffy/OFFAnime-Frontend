"use client";

import { useSyncExternalStore } from "react";
import type { TrailerSource } from "@/lib/types";

/**
 * Single active hover-trailer across every carousel: exactly one card may
 * play a preview at a time. A hovered card claims the slot with a
 * per-instance key (React `useId`) plus the resolved trailer record it
 * already owns; claiming while another card holds it evicts that card,
 * whose hook observes the change through `useSyncExternalStore` and tears
 * its player down immediately.
 *
 * The stored record is everything the page-level ambient background needs
 * to mirror the popup's trailer — no extra fetches, no duplicate state.
 * `failed` marks a trailer that broke in the popup so the ambient layer
 * falls back to the poster in lockstep.
 */

/** The trailer currently playing in the hover preview (and its ambient twin). */
export interface ActiveTrailerRecord {
  /** Per-instance key (React `useId`) of the card that owns the slot. */
  key: string;
  /** Resolved, embeddable trailer from the card's `/api/home` payload. */
  source: TrailerSource;
  /** Card poster — the ambient layer's fallback when playback is impossible. */
  poster: string | null;
  /** True once the trailer failed; both popup and ambient show the poster. */
  failed: boolean;
}

let activeRecord: ActiveTrailerRecord | null = null;
const listeners = new Set<() => void>();

export function subscribeActiveTrailer(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Stable snapshot — the stored record object is replaced, never mutated. */
export function getActiveTrailer(): ActiveTrailerRecord | null {
  return activeRecord;
}

/**
 * Claims the slot (evicting any other card that currently holds it) with the
 * card's trailer record. A re-claim by the same key is a no-op.
 */
export function claimActiveTrailer(record: ActiveTrailerRecord): void {
  if (activeRecord?.key === record.key) return;
  activeRecord = record;
  for (const listener of listeners) listener();
}

/** Releases the slot only when it is still held by `key` (stale releases are no-ops). */
export function releaseActiveTrailer(key: string): void {
  if (activeRecord?.key !== key) return;
  activeRecord = null;
  for (const listener of listeners) listener();
}

/** Flags the held trailer as failed so the ambient layer falls back to the poster. */
export function failActiveTrailer(key: string): void {
  if (activeRecord?.key !== key || activeRecord.failed) return;
  activeRecord = { ...activeRecord, failed: true };
  for (const listener of listeners) listener();
}

/**
 * Whether `key` currently holds the single active-trailer slot. The derived
 * boolean snapshot keeps re-renders to the two cards whose state actually
 * flips on a claim/release — every other subscriber's snapshot is unchanged,
 * so React bails out instead of re-rendering the whole carousel.
 */
export function useIsActiveTrailer(key: string): boolean {
  return useSyncExternalStore(
    subscribeActiveTrailer,
    () => getActiveTrailer()?.key === key,
    () => false,
  );
}
