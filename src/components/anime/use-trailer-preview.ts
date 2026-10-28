"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  claimActiveTrailer,
  failActiveTrailer,
  releaseActiveTrailer,
  useIsActiveTrailer,
} from "@/lib/active-trailer";
import type { TrailerSource } from "@/lib/types";

/**
 * Hover-to-preview state machine for one carousel card (Popular/Trending).
 *
 * The trailer source comes straight from the card's `/api/home` payload —
 * no separate requests. A mouse hover starts a 700ms delay; stray pointers
 * that leave earlier never claim anything. Once the delay fires, the card
 * claims the single active-trailer slot — evicting any other card's preview
 * instantly — and mounts its popup. The claim carries the resolved trailer
 * and the card's poster so the page-level ambient background can mirror the
 * popup's trailer behind the whole site (see TrailerAmbientBackground).
 *
 * Scrolling never opens previews: any scroll event cancels a pending open
 * and locks new ones briefly, so trackpad swipes and momentum (which slide
 * cards under a stationary pointer) cannot trigger accidental popups. While
 * a popup is open, a scroll closes it — the card has moved away from it.
 *
 * While the popup is open, leaving the card does not close it immediately:
 * a short grace period keeps it alive so the pointer can travel between the
 * card and the popup without flicker, and entering either one cancels the
 * pending close. Escape, a pointerdown outside both, and any scroll close
 * at once. Closing is animated: the slot releases immediately (unmounting
 * the players) but the popup shell stays mounted for the exit animation,
 * fading out with opacity/translate/scale before it unmounts.
 *
 * Touch/stylus pointers skip the hover machinery entirely: the card's click
 * handler calls `openPreviewFromTap` — the first tap claims the slot, a
 * second tap navigates normally. A missing or failed trailer simply never
 * shows a player — the poster remains.
 */

/** How long a mouse hover must persist before the preview popup opens. */
const HOVER_DELAY_MS = 700;
/** Grace period for pointer travel between the card and the popup. */
const CLOSE_DELAY_MS = 300;
/** Hover-opens stay suppressed this long after the last scroll event. */
const SCROLL_SUPPRESS_MS = 200;
/** How long the popup shell stays mounted to play its exit animation. */
const EXIT_ANIM_MS = 240;

export function useTrailerPreview(
  source: TrailerSource | null,
  posterUrl: string | null = null,
) {
  const instanceKey = useId();
  const [discarded, setDiscarded] = useState(false);
  const [exiting, setExiting] = useState(false);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const scrollLockUntilRef = useRef(0);
  const anchorRef = useRef<HTMLLIElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  // Derived boolean snapshot (see useIsActiveTrailer): on a claim/release
  // only the two cards whose state actually flips re-render.
  const holdsSlot = useIsActiveTrailer(instanceKey);
  const isActive = holdsSlot && source !== null;

  // Track the previous active state during render so the exit animation
  // starts in the same commit that releases the slot — the popup never
  // flashes out of existence before the fade can play.
  const [wasActive, setWasActive] = useState(isActive);
  if (wasActive !== isActive) {
    setWasActive(isActive);
    setExiting(!isActive);
  }

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const release = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    releaseActiveTrailer(instanceKey);
  }, [clearCloseTimer, clearOpenTimer, instanceKey]);

  /** Claim the slot now — the 700ms delay elapsed, or a touch tap opened it. */
  const claim = useCallback(() => {
    if (source === null) return;
    clearOpenTimer();
    clearCloseTimer();
    claimActiveTrailer({
      key: instanceKey,
      source,
      poster: posterUrl,
      failed: false,
    });
  }, [clearCloseTimer, clearOpenTimer, instanceKey, posterUrl, source]);

  /** Close after the grace delay so the pointer can travel card ↔ popup. */
  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      releaseActiveTrailer(instanceKey);
    }, CLOSE_DELAY_MS);
  }, [clearCloseTimer, instanceKey]);

  /** Card hover: arm the delayed open; a re-enter also cancels a pending close. */
  const onPointerEnter = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      // Touch/stylus open through tap instead; no trailer → nothing to preview.
      if (event.pointerType !== "mouse" || source === null) return;
      // A card sliding under a stationary pointer during a scroll must not
      // arm a preview; the lock lifts shortly after the scrolling stops.
      if (Date.now() < scrollLockUntilRef.current) return;
      clearCloseTimer();
      if (isActive) return;
      clearOpenTimer();
      const claimedSource = source;
      openTimerRef.current = window.setTimeout(() => {
        openTimerRef.current = null;
        claimActiveTrailer({
          key: instanceKey,
          source: claimedSource,
          poster: posterUrl,
          failed: false,
        });
      }, HOVER_DELAY_MS);
    },
    [clearCloseTimer, clearOpenTimer, isActive, instanceKey, posterUrl, source],
  );

  /** Card leave: cancel a pending open; close an open popup after the grace delay. */
  const onPointerLeave = useCallback(() => {
    clearOpenTimer();
    if (isActive) scheduleClose();
  }, [clearOpenTimer, isActive, scheduleClose]);

  /** Popup hover: the pointer made it into the popup — cancel the close. */
  const onPopupPointerEnter = useCallback(
    () => clearCloseTimer(),
    [clearCloseTimer],
  );

  /** Popup leave: close after the grace delay. */
  const onPopupPointerLeave = useCallback(() => {
    if (isActive) scheduleClose();
  }, [isActive, scheduleClose]);

  /**
   * Touch tap on the card: the first tap opens the preview (the caller must
   * suppress that tap's navigation), a second tap lets navigation through.
   */
  const openPreviewFromTap = useCallback(() => {
    if (source === null || isActive) return false;
    claim();
    return true;
  }, [claim, isActive, source]);

  // Any scroll (row swipes, page scroll, momentum) cancels a pending open
  // and locks new ones briefly — a popup must never open under a moving
  // carousel. Passive: the listener only reads and never blocks scrolling.
  useEffect(() => {
    const onScroll = () => {
      scrollLockUntilRef.current = Date.now() + SCROLL_SUPPRESS_MS;
      clearOpenTimer();
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [clearOpenTimer]);

  // While this card holds the slot, Escape / outside pointerdown / any
  // scroll closes the preview immediately.
  useEffect(() => {
    if (!isActive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") release();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (anchorRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      release();
    };
    const onScroll = () => release();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [isActive, release]);

  // A discarded (failed) preview retries on the next open.
  useEffect(() => {
    if (isActive) setDiscarded(false);
  }, [isActive]);

  // Exit animation window: once the exit starts, the popup shell stays
  // mounted (fading out) until the timer releases it. Re-claiming the slot
  // mid-exit cancels it via the render-phase adjustment above; unmount
  // cleanup below clears the timer.
  useEffect(() => {
    if (!exiting) return;
    const timer = window.setTimeout(() => setExiting(false), EXIT_ANIM_MS);
    return () => window.clearTimeout(timer);
  }, [exiting]);

  // Unmount cleanup: pending timers + the active slot.
  useEffect(() => {
    const openTimer = openTimerRef;
    const closeTimer = closeTimerRef;
    return () => {
      if (openTimer.current !== null) window.clearTimeout(openTimer.current);
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
      releaseActiveTrailer(instanceKey);
    };
  }, [instanceKey]);

  /** Playback/embed failure → drop the player, the popup keeps the poster.
      The slot's record is flagged so the ambient background falls back to
      its poster in lockstep instead of playing a trailer the popup lost. */
  const discardTrailer = useCallback(() => {
    setDiscarded(true);
    failActiveTrailer(instanceKey);
  }, [instanceKey]);

  return {
    isActive,
    /** True while the popup shell plays its exit animation (slot released). */
    exiting,
    /** Non-null exactly while the player should be mounted. */
    previewSource: source !== null && isActive && !discarded ? source : null,
    anchorRef,
    popupRef,
    onPointerEnter,
    onPointerLeave,
    onPopupPointerEnter,
    onPopupPointerLeave,
    openPreviewFromTap,
    discardTrailer,
  };
}
