"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  getActiveTrailer,
  subscribeActiveTrailer,
  type ActiveTrailerRecord,
} from "@/lib/active-trailer";
import {
  getPopupTrailerPlayer,
  getRegisteredPopupPlayer,
  setTrailerSyncProbe,
  type TrailerSyncSample,
} from "@/lib/trailer-sync";
import { getFallbackGradient, isOptimizableImageUrl } from "@/lib/anime";
import type { TrailerSource } from "@/lib/types";
import {
  loadYouTubeIframeApi,
  type YouTubePlayer,
  type YouTubePlayerVars,
} from "@/lib/youtube-iframe-api";

/**
 * Cinematic full-viewport backdrop for the hover-trailer experience: while
 * any carousel card's popup plays a trailer, this fixed layer plays the same
 * trailer behind the entire site — heavily blurred, dimmed by a gradient and
 * a vignette, so it sets atmosphere without competing with the UI.
 *
 * - Data: it mirrors the popup through the single active-trailer store. The
 *   card's claim already carries the resolved `/api/home` trailer and poster,
 *   so nothing is fetched twice and no extra backend endpoints exist. The
 *   popup and the background can never desync on *which* trailer plays.
 * - Synchronization: sharing a video id does NOT align playback — each embed
 *   autoplays at its own wall-clock moment, so the popup runs ~1s ahead.
 *   The popup's embed is therefore the master clock (registered in
 *   src/lib/trailer-sync.ts once its IFrame API player is ready) and this
 *   layer slave-tracks it: a once-a-second loop compares both players'
 *   `getCurrentTime()` (loop-aware, since each embed restarts its own loop)
 *   and seeks the background with the API's `seekTo` only when real drift
 *   has accumulated — beyond a small tolerance and spaced out — so neither
 *   embed is ever restarted and normal jitter never causes stuttering. The
 *   check only runs while the master is actually playing and this embed
 *   holds the exact same video id, so stale registrations, mid-switch
 *   states and buffered pauses can never steer it.
 * - Layering: `z-index: -1` paints it above the page's canvas background but
 *   below every in-flow section; `pointer-events: none` keeps scrolling,
 *   clicks and hover untouched. While it is on screen it toggles the
 *   `trailer-ambient-active` body class, which turns the sections' dark
 *   surfaces translucent (see globals.css) so the backdrop shows through.
 * - Lifecycle: the player mounts with the first claim and survives rapid
 *   switches to other cards — a YouTube embed swaps videos via
 *   `loadVideoById`, a native video swaps its source — so hovers across a
 *   row never stack or remount players. On release it keeps playing through
 *   the fade-out, then unmounts and destroys the player, releasing decode
 *   and network resources. Only one background player can ever exist: the
 *   store holds exactly one slot.
 * - Failure: a trailer that errors (or never starts, or is flagged failed by
 *   the popup) falls back to the card's blurred poster; with no poster it
 *   simply leaves the plain dark page. Playback is always muted here — the
 *   popup owns the only audio toggle.
 * - Motion: only `opacity` transitions (GPU-friendly) for enter/leave; the
 *   global `prefers-reduced-motion` rules collapse them to instant switches.
 */

/** YT.PlayerState.PLAYING — frames are actually on screen. */
const PLAYER_STATE_PLAYING = 1;
/** YT.PlayerState.ENDED — restart the live embed (it outlives single videos). */
const PLAYER_STATE_ENDED = 0;
/** The background keeps playing through its fade-out before resources release. */
const FADE_OUT_MS = 640;
/** How often the backdrop compares its playback head against the popup's. */
const SYNC_INTERVAL_MS = 1000;
/** Drift beyond this many seconds is corrected (smaller → more seeks/stutter). */
const SYNC_TOLERANCE_S = 1.25;
/** Corrective seeks stay at least this far apart, so drift never thrashes. */
const SYNC_MIN_SEEK_GAP_MS = 2500;

export default function TrailerAmbientBackground() {
  const record = useSyncExternalStore(
    subscribeActiveTrailer,
    getActiveTrailer,
    () => null,
  );
  const [mounted, setMounted] = useState(false);
  /**
   * The record rendered by the player. It lags the store while fading out:
   * the slot releases immediately (the popup drops its player at once) but
   * this layer keeps playing through the fade before unmounting.
   */
  const [rendered, setRendered] = useState<ActiveTrailerRecord | null>(record);
  const [shown, setShown] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (record !== null) {
      setRendered(record);
      // Double rAF: the layer must paint once at opacity 0 before the
      // fade-in transition can run (a single rAF can be batched with the
      // first paint, which would snap it in with no transition).
      let raf2 = 0;
      const raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => setShown(true));
      });
      return () => {
        window.cancelAnimationFrame(raf1);
        window.cancelAnimationFrame(raf2);
      };
    }
    setShown(false);
    const timer = window.setTimeout(() => setRendered(null), FADE_OUT_MS);
    return () => window.clearTimeout(timer);
  }, [record]);

  // While the backdrop lingers on screen the sections' dark surfaces turn
  // translucent (see the body.trailer-ambient-active rule in globals.css)
  // so it shows through; the class drops only after the fade completes, so
  // nothing pops.
  useEffect(() => {
    if (rendered === null) return;
    document.body.classList.add("trailer-ambient-active");
    return () => document.body.classList.remove("trailer-ambient-active");
  }, [rendered]);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-hidden="true"
      className={`trailer-ambient${shown ? " trailer-ambient--on" : ""}`}
    >
      {rendered !== null ? <AmbientMedia record={rendered} /> : null}
      <span aria-hidden="true" className="trailer-ambient__shade" />
      <span aria-hidden="true" className="trailer-ambient__vignette" />
    </div>,
    document.body,
  );
}

/**
 * The blurred backdrop for one claim: the card's poster shows immediately
 * (continuity with the card under the pointer, and the permanent fallback),
 * and the trailer layer fades in over it only once playback is actually
 * running — pre-play embed chrome and black frames stay invisible.
 */
function AmbientMedia({ record }: { record: ActiveTrailerRecord }) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  // A new selection starts hidden until its frames arrive; a failure from
  // either this player or the popup's reverts to the poster.
  useEffect(() => {
    setPlaying(false);
    setFailed(false);
  }, [record.key]);

  const handlePlaying = useCallback(() => setPlaying(true), []);
  const handleFailed = useCallback(() => setFailed(true), []);

  const posterUrl =
    record.poster !== null && isOptimizableImageUrl(record.poster)
      ? record.poster
      : null;

  return (
    <>
      <div
        aria-hidden="true"
        className="trailer-ambient__media trailer-ambient__media--on"
      >
        {posterUrl ? (
          <Image
            key={posterUrl}
            src={posterUrl}
            alt=""
            fill
            sizes="100vw"
            quality={30}
            draggable={false}
            className="object-cover object-[50%_35%]"
          />
        ) : (
          <span
            className="absolute inset-0"
            style={{ background: getFallbackGradient(record.poster ?? record.key) }}
          />
        )}
      </div>
      {!record.failed && !failed ? (
        <div
          aria-hidden="true"
          className={`trailer-ambient__media${
            playing ? " trailer-ambient__media--on" : ""
          }`}
        >
          {record.source.kind === "youtube" ? (
            <AmbientYouTubePlayer
              source={record.source}
              onPlaying={handlePlaying}
              onFailed={handleFailed}
            />
          ) : (
            <AmbientVideoPlayer
              source={record.source}
              onPlaying={handlePlaying}
              onFailed={handleFailed}
            />
          )}
        </div>
      ) : null}
    </>
  );
}

/**
 * Always-muted YouTube backdrop, slave-tracked to the popup's master clock.
 * The embed is created once per activation and stays alive across rapid
 * card switches — a new hover calls `loadVideoById` on the live player
 * instead of replacing the iframe, so trailers can never overlap and
 * nothing flickers. Its playback position is synchronized against the
 * popup player (see the sync effect below); the container is
 * `pointer-events: none` (inherited), so YouTube's own UI can never be
 * hovered or focused, and all embed chrome stays disabled via playerVars.
 */
function AmbientYouTubePlayer({
  source,
  onPlaying,
  onFailed,
}: {
  source: Extract<TrailerSource, { kind: "youtube" }>;
  onPlaying: () => void;
  onFailed: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  /** Latest requested video id — picked up whenever the player is free. */
  const pendingVideoIdRef = useRef(source.videoId);
  /** Video id the live embed currently holds. */
  const loadedVideoIdRef = useRef(source.videoId);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    pendingVideoIdRef.current = source.videoId;
  }, [source.videoId]);

  // Switch trailers inside the live embed — no destroy/recreate churn.
  useEffect(() => {
    const player = playerRef.current;
    if (!ready || !player) return;
    if (pendingVideoIdRef.current === loadedVideoIdRef.current) return;
    loadedVideoIdRef.current = pendingVideoIdRef.current;
    try {
      player.loadVideoById(pendingVideoIdRef.current);
    } catch {
      // The player was torn down mid-switch; unmount cleanup handles it.
    }
  }, [ready, source.videoId]);

  // Playback synchronization: the popup's embed is the master clock (see the
  // component docs). Once a second, compare both playback heads and seek this
  // embed only when the drift is real — past a small tolerance, spaced out —
  // so neither embed is ever restarted and ordinary decode jitter never
  // produces stuttering. All gating runs through the live refs, so a stale
  // master or an in-flight trailer switch can never touch this embed.
  useEffect(() => {
    if (!ready) return;
    let lastSeekAt = 0;

    const correctDrift = () => {
      const player = playerRef.current;
      if (!player) return;
      // A loadVideoById is in flight (pending ≠ loaded): leave the embed
      // alone until it settles on the new trailer.
      const videoId = pendingVideoIdRef.current;
      if (videoId !== loadedVideoIdRef.current) return;
      // Only the master for exactly this trailer may steer this embed.
      const master = getPopupTrailerPlayer(videoId);
      if (master === null) return;
      try {
        // The master's timestamps are only meaningful while it is actually
        // playing, and a seek only lands cleanly while this embed's frames
        // advance (buffering/loop-restart states would produce bogus heads).
        if (master.player.getPlayerState() !== PLAYER_STATE_PLAYING) return;
        if (player.getPlayerState() !== PLAYER_STATE_PLAYING) return;

        const masterTime = master.player.getCurrentTime();
        let delta = masterTime - player.getCurrentTime();
        const duration = player.getDuration();
        // Both embeds loop the same short trailer independently, so compare
        // the drift on the loop-wrapped timeline: a restart on either side
        // must read as "nearly aligned", never as a huge offset.
        if (duration > 0) {
          if (delta > duration / 2) delta -= duration;
          else if (delta < -duration / 2) delta += duration;
        }
        if (Math.abs(delta) <= SYNC_TOLERANCE_S) return;

        const now = Date.now();
        if (now - lastSeekAt < SYNC_MIN_SEEK_GAP_MS) return;
        lastSeekAt = now;
        // Jump to the master's position (loop-aware) and keep playing from
        // there — `seekTo` never reloads the embed, so playback simply
        // continues on the shared timeline.
        player.seekTo(
          duration > 0
            ? (((player.getCurrentTime() + delta) % duration) + duration) %
                duration
            : masterTime,
          true,
        );
      } catch {
        // The embed was torn down mid-check; the next tick re-evaluates.
      }
    };

    // One correction attempt right away — covers the common readiness race
    // where the popup (mounted first) already leads when the backdrop starts.
    correctDrift();
    const timer = window.setInterval(correctDrift, SYNC_INTERVAL_MS);

    // Dev-only probe: browser tests read both clocks via
    // window.__trailerSyncProbe() (see src/lib/trailer-sync.ts).
    if (process.env.NODE_ENV !== "production") {
      setTrailerSyncProbe((): TrailerSyncSample => {
        try {
          const player = playerRef.current;
          const background = getRegisteredPopupPlayer();
          return {
            popupVideoId: background?.videoId ?? null,
            backgroundVideoId: player ? loadedVideoIdRef.current : null,
            popupTime: background
              ? background.player.getCurrentTime()
              : null,
            backgroundTime: player ? player.getCurrentTime() : null,
          };
        } catch {
          return {
            popupVideoId: null,
            backgroundVideoId: null,
            popupTime: null,
            backgroundTime: null,
          };
        }
      });
    }

    return () => {
      window.clearInterval(timer);
      if (process.env.NODE_ENV !== "production") setTrailerSyncProbe(null);
    };
  }, [ready]);

  useEffect(() => {
    // The Player API replaces its target element with an iframe; a plain
    // React-managed div would break React's unmount. Create the target
    // imperatively inside an empty React container instead.
    const container = containerRef.current;
    if (!container) return;
    const target = document.createElement("div");
    container.appendChild(target);

    let cancelled = false;
    const playerVars: Partial<YouTubePlayerVars> = {
      autoplay: 1,
      mute: 1,
      playsinline: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      rel: 0,
      loop: 1,
      playlist: pendingVideoIdRef.current,
      origin: window.location.origin,
      cc_load_policy: 0,
    };
    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled) return;
        const videoId = pendingVideoIdRef.current;
        loadedVideoIdRef.current = videoId;
        playerRef.current = new YT.Player(target, {
          videoId,
          width: "100%",
          height: "100%",
          host: "https://www.youtube-nocookie.com",
          playerVars,
          events: {
            onReady: (event) => {
              if (cancelled) return;
              event.target.mute();
              event.target.playVideo();
              setReady(true);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              if (event.data === PLAYER_STATE_PLAYING) onPlaying();
              if (event.data === PLAYER_STATE_ENDED) event.target.playVideo();
            },
            onError: () => {
              if (!cancelled) onFailed();
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) onFailed();
      });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // The player was already torn down by the API.
      }
      playerRef.current = null;
      target.remove();
    };
  }, [onPlaying, onFailed]);

  return <div ref={containerRef} className="trailer-ambient__frame" />;
}

/**
 * Direct-media backdrop: the same native `<video>` element swaps its source
 * on the live node (no remount), always muted, with no controls rendered.
 */
function AmbientVideoPlayer({
  source,
  onPlaying,
  onFailed,
}: {
  source: Extract<TrailerSource, { kind: "video" }>;
  onPlaying: () => void;
  onFailed: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.src !== source.src) {
      video.src = source.src;
      video.load();
    }
    // Autoplay refused (browser policy) → poster fallback, like embed errors.
    video.play().catch(() => onFailed());
  }, [onFailed, source.src]);

  return (
    <video
      ref={videoRef}
      className="trailer-ambient__frame"
      muted
      loop
      autoPlay
      playsInline
      preload="auto"
      disablePictureInPicture
      onPlaying={onPlaying}
      onError={onFailed}
    />
  );
}
