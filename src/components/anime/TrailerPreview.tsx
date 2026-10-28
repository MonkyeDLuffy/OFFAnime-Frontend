"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TrailerSource } from "@/lib/types";
import {
  registerPopupTrailerPlayer,
  unregisterPopupTrailerPlayer,
} from "@/lib/trailer-sync";
import {
  loadYouTubeIframeApi,
  type YouTubePlayer,
  type YouTubePlayerVars,
} from "@/lib/youtube-iframe-api";

/**
 * Trailer player for the hover preview popup.
 *
 * The popup renders this only while a resolved trailer exists; the player
 * fades in over the poster only once playback is actually running. The
 * whole layer is `pointer-events-none` — the iframe never receives
 * hover/focus/clicks (which would surface YouTube's own UI); the popup's
 * mute button sits above it as a sibling.
 *
 * The frame is always `aspect-video` (16:9), so YouTube embeds fill it
 * edge-to-edge with no letterboxing, and direct video uses `object-cover`
 * so odd-shaped sources are cropped — never stretched.
 *
 * - YouTube trailers use the IFrame Player API (lazy-loaded). The embed
 *   runs with every supported UI element disabled (`controls=0`, `rel=0`,
 *   `modestbranding=1`, `iv_load_policy=3`, `fs=0`, `disablekb=1`,
 *   `cc_load_policy=0`, `playsinline=1`) — no control bar, no related-video
 *   grid, no fullscreen/captions chrome. The fade-in is gated on the
 *   player's PLAYING state (not merely "ready"), so pre-play overlays —
 *   the big play button, title and channel bar YouTube shows in those
 *   states — never become visible. YouTube's watermark and other branding
 *   it always draws remain, by design — no fragile hacks.
 * - Audio starts muted (autoplay-safe); `muted` flips through the API's
 *   mute/unMute without reloading or restarting the embed. Embed failures
 *   (blocked/unavailable video) and a never-playing player (autoplay
 *   refused) surface through `onError` / a missing PLAYING event → the
 *   popup falls back to its poster.
 * - Master clock: once the embed is ready it registers itself as the sync
 *   master (see src/lib/trailer-sync.ts); the ambient background
 *   slave-tracks this player's timestamps so both stay in step.
 * - Direct media URLs use a native `<video>` element (no controls rendered,
 *   so pausing shows no UI); autoplay rejections and load errors take the
 *   same poster fallback path.
 */

/** YT.PlayerState.PLAYING — playback has actually started. */
const PLAYER_STATE_PLAYING = 1;

export default function TrailerPreview({
  source,
  muted,
  onFailed,
}: {
  source: TrailerSource;
  muted: boolean;
  onFailed: () => void;
}) {
  const [started, setStarted] = useState(false);
  const handlePlaying = useCallback(() => setStarted(true), []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-[1] overflow-hidden transition-opacity duration-500 ease-out ${
        started ? "opacity-100" : "opacity-0"
      }`}
    >
      {source.kind === "youtube" ? (
        <YouTubePreview
          source={source}
          muted={muted}
          onPlaying={handlePlaying}
          onFailed={onFailed}
        />
      ) : (
        <NativeVideoPreview
          source={source}
          muted={muted}
          onPlaying={handlePlaying}
          onFailed={onFailed}
        />
      )}
    </div>
  );
}

function YouTubePreview({
  source,
  muted,
  onPlaying,
  onFailed,
}: {
  source: Extract<TrailerSource, { kind: "youtube" }>;
  muted: boolean;
  onPlaying: () => void;
  onFailed: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [playerReady, setPlayerReady] = useState(false);

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
      playlist: source.videoId,
      origin: window.location.origin,
      cc_load_policy: 0,
    };
    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled) return;
        playerRef.current = new YT.Player(target, {
          videoId: source.videoId,
          width: "100%",
          height: "100%",
          host: "https://www.youtube-nocookie.com",
          playerVars,
          events: {
            onReady: (event) => {
              if (cancelled) return;
              event.target.mute();
              event.target.playVideo();
              setPlayerReady(true);
              // This popup is the master clock for the ambient backdrop:
              // its playback head is what the background slave-tracks (see
              // TrailerAmbientBackground). Unregistered on teardown below.
              registerPopupTrailerPlayer({
                player: event.target,
                videoId: source.videoId,
              });
            },
            onStateChange: (event) => {
              if (cancelled) return;
              // Fade in only once frames are actually on screen — the
              // pre-play overlays stay hidden behind the poster.
              if (event.data === PLAYER_STATE_PLAYING) onPlaying();
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
      // Drop the master-clock registration before destroying the embed so
      // the ambient background can never read a dead player's clock.
      unregisterPopupTrailerPlayer(playerRef.current);
      try {
        playerRef.current?.destroy();
      } catch {
        // The player was already torn down by the API.
      }
      playerRef.current = null;
      target.remove();
    };
  }, [source.videoId, onPlaying, onFailed]);

  // Mute/unmute through the API — no reload, no restart, playback continues.
  useEffect(() => {
    const player = playerRef.current;
    if (!playerReady || !player) return;
    try {
      if (muted) {
        player.mute();
      } else {
        player.unMute();
        player.setVolume(100);
      }
    } catch {
      // The player was torn down mid-toggle; the unmount cleanup handles it.
    }
  }, [muted, playerReady]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function NativeVideoPreview({
  source,
  muted,
  onPlaying,
  onFailed,
}: {
  source: Extract<TrailerSource, { kind: "video" }>;
  muted: boolean;
  onPlaying: () => void;
  onFailed: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Autoplay refused (browser policy) → restore the poster gracefully.
    videoRef.current?.play().catch(() => onFailed());
  }, [onFailed]);

  // Toggle audio without stopping playback.
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  return (
    <video
      ref={videoRef}
      src={source.src}
      muted
      loop
      autoPlay
      playsInline
      preload="auto"
      disablePictureInPicture
      className="h-full w-full object-cover"
      onPlaying={onPlaying}
      onError={onFailed}
    />
  );
}
