"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage, type Page } from '@/lib/api';

/**
 * Cursor-paginated list with load-more, reset on dependency change, and
 * stale-response protection. `fetcher` must be stable (useCallback).
 */
export function useCursorList<T extends { id: string }>(
  fetcher: (cursor: string | null) => Promise<Page<T>>,
  enabled = true
) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const load = useCallback(async (reset: boolean) => {
    const gen = reset ? ++generation.current : generation.current;
    setLoading(true);
    setError(null);
    try {
      const page = await fetcher(reset ? null : cursor);
      if (gen !== generation.current) return;
      setItems((prev) => {
        if (reset) return page.items;
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.items.filter((p) => !seen.has(p.id))];
      });
      setCursor(page.nextCursor);
      setHasMore(Boolean(page.nextCursor));
    } catch (err) {
      if (gen === generation.current) setError(errorMessage(err));
    } finally {
      if (gen === generation.current) {
        setLoading(false);
        setInitialLoading(false);
      }
    }
  }, [fetcher, cursor]);

  useEffect(() => {
    if (!enabled) return;
     
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
    setInitialLoading(true);
    setItems([]);
    setCursor(null);
    setHasMore(true);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, enabled]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore && !error) load(false);
  }, [loading, hasMore, error, load]);

  const remove = useCallback((id: string) => setItems((prev) => prev.filter((p) => p.id !== id)), []);
  const prepend = useCallback((item: T) => setItems((prev) => [item, ...prev.filter((p) => p.id !== item.id)]), []);

  return { items, loading, initialLoading, error, hasMore, loadMore, reload: () => load(true), remove, prepend };
}

/** Calls `onVisible` when the returned ref's element scrolls into view. */
export function useInfiniteSentinel(onVisible: () => void) {
  const cb = useRef(onVisible);
  const observer = useRef<IntersectionObserver | null>(null);
  useEffect(() => { cb.current = onVisible; }, [onVisible]);
  useEffect(() => () => observer.current?.disconnect(), []);
  // Callback ref: the sentinel usually mounts after the first page loads.
  return useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    observer.current = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) cb.current();
    }, { rootMargin: '600px 0px' });
    observer.current.observe(el);
  }, []);
}
