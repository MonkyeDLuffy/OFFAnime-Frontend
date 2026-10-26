"use client";

import { useSyncExternalStore } from "react";

/**
 * Single active hover-trailer across every carousel: exactly one card may
 * play a preview at a time. A hovered card claims the slot with a
 * per-instance key (React `useId`); claiming while another card holds it
 * evicts that card, whose hook observes the change through
 * `useSyncExternalStore` and tears its player down immediately.
 */

let activeKey: string | null = null;
const listeners = new Set<() => void>();

export function subscribeActiveTrailer(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getActiveTrailer(): string | null {
  return activeKey;
}

/** Claims the slot, evicting any other card that currently holds it. */
export function claimActiveTrailer(key: string): void {
  if (activeKey === key) return;
  activeKey = key;
  for (const listener of listeners) listener();
}

/** Releases the slot only when it is still held by `key` (stale releases are no-ops). */
export function releaseActiveTrailer(key: string): void {
  if (activeKey !== key) return;
  activeKey = null;
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
    () => getActiveTrailer() === key,
    () => false,
  );
}
