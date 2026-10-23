/**
 * Local Watch Later collection (initial implementation).
 *
 * Persisted in `localStorage` and isolated behind a tiny store API so it can
 * later be swapped for authenticated, user-specific persistence without
 * touching UI components. Every storage access is guarded: private mode,
 * disabled storage, quota errors and corrupt payloads must never crash the UI.
 */

export interface WatchLaterEntry {
  anilistId: number;
  title: string;
  posterUrl: string | null;
  savedAt: string;
}

const STORAGE_KEY = "offanime:watch-later:v1";
const MAX_ENTRIES = 200;

const EMPTY_ENTRIES: WatchLaterEntry[] = [];
let cachedEntries: WatchLaterEntry[] | null = null;
const listeners = new Set<() => void>();

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

function isValidEntryId(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function parseEntries(raw: string | null): WatchLaterEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const entries: WatchLaterEntry[] = [];
    const seen = new Set<number>();
    for (const item of parsed) {
      if (typeof item !== "object" || item === null) continue;
      const record = item as Record<string, unknown>;
      if (!isValidEntryId(record.anilistId) || seen.has(record.anilistId)) continue;
      seen.add(record.anilistId);
      entries.push({
        anilistId: record.anilistId,
        title: typeof record.title === "string" && record.title ? record.title : "Untitled",
        posterUrl: typeof record.posterUrl === "string" ? record.posterUrl : null,
        savedAt: typeof record.savedAt === "string" ? record.savedAt : "",
      });
    }
    return entries;
  } catch {
    return [];
  }
}

function readEntries(): WatchLaterEntry[] {
  if (cachedEntries) return cachedEntries;
  if (!isBrowser()) return [];
  try {
    cachedEntries = parseEntries(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    cachedEntries = [];
  }
  return cachedEntries;
}

function persist(entries: WatchLaterEntry[]): void {
  cachedEntries = entries;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage unavailable or full — keep serving the in-memory state.
    }
  }
  for (const listener of listeners) listener();
}

export function getWatchLaterEntries(): WatchLaterEntry[] {
  return readEntries();
}

/** Server snapshot for `useSyncExternalStore` (no storage during SSR). */
export function getWatchLaterServerSnapshot(): WatchLaterEntry[] {
  return EMPTY_ENTRIES;
}

export function isWatchLaterSaved(anilistId: number): boolean {
  return readEntries().some((entry) => entry.anilistId === anilistId);
}

export function subscribeToWatchLater(listener: () => void): () => void {
  listeners.add(listener);
  if (!isBrowser()) {
    return () => {
      listeners.delete(listener);
    };
  }

  // Keep multiple tabs in sync via the native storage event.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    cachedEntries = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Adds or removes an entry. Returns `true` when the entry is saved afterwards.
 * Duplicate entries are impossible: saving an existing ID removes it instead.
 */
export function toggleWatchLater(
  entry: Omit<WatchLaterEntry, "savedAt">,
): boolean {
  const current = readEntries();
  if (current.some((existing) => existing.anilistId === entry.anilistId)) {
    persist(current.filter((existing) => existing.anilistId !== entry.anilistId));
    return false;
  }
  const next: WatchLaterEntry = {
    ...entry,
    savedAt: new Date().toISOString(),
  };
  persist([...current, next].slice(-MAX_ENTRIES));
  return true;
}
