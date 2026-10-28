"use client";

/**
 * Lazily loads the YouTube IFrame Player API exactly once — on the first
 * hover whose resolved trailer is a YouTube video — and shares one loader
 * promise. A rejected load (blocked script / timeout) is not cached, so a
 * later hover can retry.
 */

export interface YouTubePlayer {
  mute(): void;
  unMute(): void;
  setVolume(volume: number): void;
  playVideo(): void;
  pauseVideo(): void;
  /** Loads another video into the same embed — no destroy/recreate churn. */
  loadVideoById(videoId: string): void;
  /** Current playback head in seconds — the sync clocks read this. */
  getCurrentTime(): number;
  /** Loaded video's length in seconds (0 until its metadata has arrived). */
  getDuration(): number;
  /** YT.PlayerState value (-1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued). */
  getPlayerState(): number;
  /** Jumps the playback head without reloading or restarting the embed. */
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

export interface YouTubePlayerVars {
  autoplay: number;
  mute: number;
  playsinline: number;
  controls: number;
  disablekb: number;
  fs: number;
  iv_load_policy: number;
  modestbranding: number;
  rel: number;
  loop: number;
  playlist: string;
  origin: string;
  cc_load_policy: number;
}

interface YouTubeNamespace {
  Player: new (
    element: HTMLElement,
    config: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      host?: string;
      playerVars?: Partial<YouTubePlayerVars>;
      events?: {
        onReady?: (event: { target: YouTubePlayer }) => void;
        onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const SCRIPT_URL = "https://www.youtube.com/iframe_api";
const LOAD_TIMEOUT_MS = 10_000;

let loader: Promise<YouTubeNamespace> | null = null;

export function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
  if (loader) return loader;
  loader = new Promise<YouTubeNamespace>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("The YouTube IFrame API is browser-only."));
      return;
    }
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const timer = window.setTimeout(() => {
      reject(new Error("The YouTube IFrame API did not load in time."));
    }, LOAD_TIMEOUT_MS);
    // Chain in case something else on the page also waits for the API.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timer);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("The YouTube IFrame API loaded without a Player."));
    };
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("The YouTube IFrame API script was blocked or failed."));
    };
    document.head.appendChild(script);
  });
  // A failed load is not a permanent state: drop the loader so the next
  // hover retries from scratch.
  void loader.catch(() => {
    loader = null;
  });
  return loader;
}
