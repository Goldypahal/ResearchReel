/**
 * YouTube IFrame Player API helpers for Research Picks.
 * In the Reels feed a pick plays as a short preview (a "trailer"); the full video plays on /watch/[id].
 */

/** Longest stretch a pick plays in the Reels feed before looping back to its start. */
export const PREVIEW_SECONDS = 60;

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}
interface YTEvent { target: YTPlayer; data: number }
interface YTNamespace {
  Player: new (el: HTMLElement, opts: {
    host?: string; videoId: string; width?: string; height?: string;
    playerVars?: Record<string, string | number>;
    events?: { onReady?: (e: YTEvent) => void; onStateChange?: (e: YTEvent) => void; onError?: (e: YTEvent) => void };
  }) => YTPlayer;
}
declare global {
  interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void }
}

/** Player states reported by onStateChange. */
export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2 } as const;

let loading: Promise<YTNamespace> | null = null;

/** Loads https://www.youtube.com/iframe_api once and resolves with window.YT. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === 'undefined') return Promise.reject(new Error('YouTube API needs a browser'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { previous?.(); if (window.YT) resolve(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => { loading = null; reject(new Error('Could not load the YouTube player')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/**
 * Which part of a video the Reels feed previews.
 * Short videos play whole. Longer ones skip the usual intro (about 10% in, at most 5 minutes)
 * and play PREVIEW_SECONDS from there, so the preview lands on actual content.
 */
export function previewWindow(duration: number, length = PREVIEW_SECONDS) {
  if (!duration || duration <= length + 15) return { start: 0, end: duration || length };
  const start = duration > 180 ? Math.min(Math.round(duration * 0.1), 300) : 0;
  return { start, end: Math.min(start + length, duration) };
}

/** 75 → "1:15", 4980 → "1:23:00". */
export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}
