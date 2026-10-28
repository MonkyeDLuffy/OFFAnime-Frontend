"use client";

import type { YouTubePlayer } from "@/lib/youtube-iframe-api";

/**
 * Master-clock registry for the hover-trailer experience.
 *
 * Two YouTube embeds play the same trailer at once — the sharp one in the
 * hover popup and the blurred ambient backdrop behind the site. Sharing a
 * video id does NOT align their playback: each embed starts its own network
 * fetch and fires its own autoplay at a different wall-clock moment, so one
 * runs ~1s ahead of the other (and loops at an independent moment). To keep
 * them together, the popup's embed acts as the master clock and the
 * background slave-tracks it.
 *
 * Exactly one popup exists while a hover preview is open (the active-trailer
 * store guarantees a single claim), so a single registration slot suffices:
 * the popup's embed registers itself here as soon as its IFrame API player
 * is ready and unregisters on destroy. The registration carries the video id
 * it belongs to — a consumer only accepts a master whose id matches its own
 * embed, so a stale popup (closed, evicted, mid-switch) can never steer the
 * background onto another trailer.
 *
 * The registry is deliberately non-reactive: the ambient reads it inside its
 * own polling loop, so claims and releases never trigger extra renders.
 */

interface PopupPlayerRegistration {
  /** Live IFrame API player of the open popup's embed. */
  player: YouTubePlayer;
  /** Trailer id this popup player was created for. */
  videoId: string;
}

let popupPlayer: PopupPlayerRegistration | null = null;

/** Called once the popup's player is ready (its onReady event). */
export function registerPopupTrailerPlayer(
  registration: PopupPlayerRegistration,
): void {
  popupPlayer = registration;
}

/** Called when the popup's player is destroyed — clears only its own entry. */
export function unregisterPopupTrailerPlayer(
  player: YouTubePlayer | null,
): void {
  if (popupPlayer?.player === player) popupPlayer = null;
}

/**
 * The popup player registered for exactly `videoId`, or null when no popup
 * is open, none has registered yet, or the registration belongs to another
 * trailer (stale or mid-transition — never a valid master for this embed).
 */
export function getPopupTrailerPlayer(
  videoId: string,
): PopupPlayerRegistration | null {
  return popupPlayer !== null && popupPlayer.videoId === videoId
    ? popupPlayer
    : null;
}

/** The popup registration regardless of video id (diagnostics/tests only). */
export function getRegisteredPopupPlayer(): PopupPlayerRegistration | null {
  return popupPlayer;
}

/**
 * Dev-only browser-verification probe: a test reads both players' clocks
 * through `window.__trailerSyncProbe()` without touching the embeds. Every
 * call site is gated on NODE_ENV, so the assignment is dead-code-eliminated
 * from production builds and the window stays clean.
 */
export interface TrailerSyncSample {
  /** Video id the popup's embed was registered for (null → no popup player). */
  popupVideoId: string | null;
  /** Video id the background embed currently holds (null → no bg player). */
  backgroundVideoId: string | null;
  /** Popup (master) playback head in seconds; null when unavailable. */
  popupTime: number | null;
  /** Background playback head in seconds; null when unavailable. */
  backgroundTime: number | null;
}

type SyncProbe = () => TrailerSyncSample;

export function setTrailerSyncProbe(probe: SyncProbe | null): void {
  if (process.env.NODE_ENV === "production") return;
  const target = window as unknown as {
    __trailerSyncProbe?: SyncProbe | null;
  };
  if (probe === null) {
    delete target.__trailerSyncProbe;
  } else {
    target.__trailerSyncProbe = probe;
  }
}
