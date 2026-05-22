import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';

interface UseKioskAutoScrollOptions {
  enabled: boolean;
  rowIds: string[];
  cyclePauseMs?: number;
  rowPauseMs?: number;
  speedPxPerSecond?: number;
}

interface UseKioskAutoScrollResult {
  viewportRef: RefObject<HTMLDivElement>;
  listRef: RefObject<HTMLDivElement>;
  trackRef: RefObject<HTMLDivElement>;
  shouldLoop: boolean;
}

/**
 * Kiosk leaderboard auto-scroll controller.
 *
 * Business rule:
 * - Scroll only rows below rank #1 and only when they overflow the viewport.
 * - Pause 10s at the top of each loop cycle, then smoothly advance and snap at
 *   each row boundary.
 */
export function useKioskAutoScroll({
  enabled,
  rowIds,
  cyclePauseMs = 10_000,
  rowPauseMs = 750,
  speedPxPerSecond = 44,
}: UseKioskAutoScrollOptions): UseKioskAutoScrollResult {
  const viewportRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [shouldLoop, setShouldLoop] = useState(false);
  const shouldLoopRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  const rowIdsRef = useRef<string[]>(rowIds);
  const rowTopsRef = useRef<number[]>([]);
  const contentHeightRef = useRef(0);
  const offsetRef = useRef(0);
  const currentRowIndexRef = useRef(0);
  const nextRowIndexRef = useRef(0);
  const pauseUntilRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);

  const rowSignature = useMemo(() => rowIds.join('|'), [rowIds]);

  const applyOffset = (offset: number) => {
    offsetRef.current = offset;
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(0, ${-offset}px, 0)`;
    }
  };

  const measure = () => {
    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!enabled || !viewport || !list) {
      setShouldLoop(false);
      shouldLoopRef.current = false;
      rowIdsRef.current = rowIds;
      rowTopsRef.current = [];
      contentHeightRef.current = 0;
      currentRowIndexRef.current = 0;
      nextRowIndexRef.current = 0;
      pauseUntilRef.current = 0;
      lastTickRef.current = null;
      applyOffset(0);
      return;
    }

    const previousIds = rowIdsRef.current;
    const previousAnchorUid = previousIds[currentRowIndexRef.current];

    rowIdsRef.current = rowIds;
    rowTopsRef.current = Array.from(list.children).map((row) => (row as HTMLDivElement).offsetTop);
    contentHeightRef.current = list.scrollHeight;

    const canLoop =
      rowIds.length > 1 &&
      contentHeightRef.current > viewport.clientHeight + 1 &&
      rowTopsRef.current.length === rowIds.length;

    if (canLoop !== shouldLoopRef.current) {
      shouldLoopRef.current = canLoop;
      setShouldLoop(canLoop);
    }

    if (!canLoop) {
      currentRowIndexRef.current = 0;
      nextRowIndexRef.current = 0;
      pauseUntilRef.current = 0;
      lastTickRef.current = null;
      applyOffset(0);
      return;
    }

    const anchorIndex = previousAnchorUid ? rowIds.indexOf(previousAnchorUid) : -1;
    const resolvedIndex = anchorIndex >= 0 ? anchorIndex : 0;
    const resolvedTop = rowTopsRef.current[resolvedIndex] ?? 0;

    currentRowIndexRef.current = resolvedIndex;
    nextRowIndexRef.current = (resolvedIndex + 1) % rowIds.length;
    pauseUntilRef.current = performance.now() + cyclePauseMs;
    lastTickRef.current = null;
    applyOffset(resolvedTop);
  };

  useLayoutEffect(() => {
    measure();
    // Re-measure after render in case fonts/layout settle on next frame.
    const frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, rowSignature, cyclePauseMs]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!viewport || !list) {
      return;
    }

    let queued = false;
    const queueMeasure = () => {
      if (queued) {
        return;
      }
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        measure();
      });
    };

    const resizeObserver = new ResizeObserver(queueMeasure);
    resizeObserver.observe(viewport);
    resizeObserver.observe(list);
    window.addEventListener('resize', queueMeasure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', queueMeasure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, rowSignature]);

  useEffect(() => {
    if (!enabled || !shouldLoop) {
      if (animationFrameRef.current != null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) {
        return;
      }

      if (now < pauseUntilRef.current) {
        lastTickRef.current = now;
        animationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const contentHeight = contentHeightRef.current;
      const rowTops = rowTopsRef.current;
      const rowCount = rowIdsRef.current.length;

      if (!contentHeight || rowCount < 2 || rowTops.length !== rowCount) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const lastTick = lastTickRef.current ?? now;
      const deltaSec = Math.min((now - lastTick) / 1000, 0.1);
      lastTickRef.current = now;

      let offset = offsetRef.current + speedPxPerSecond * deltaSec;
      let currentIndex = currentRowIndexRef.current;
      let nextIndex = nextRowIndexRef.current;

      const targetTop = rowTops[nextIndex] + (nextIndex <= currentIndex ? contentHeight : 0);
      if (offset >= targetTop - 0.5) {
        const reachedIndex = nextIndex;
        const didWrapToTop = reachedIndex === 0 && reachedIndex <= currentIndex;

        offset = targetTop;
        currentIndex = reachedIndex;
        nextIndex = (currentIndex + 1) % rowCount;
        pauseUntilRef.current = now + (didWrapToTop ? cyclePauseMs : rowPauseMs);
      }

      if (offset >= contentHeight) {
        offset -= contentHeight;
      }

      currentRowIndexRef.current = currentIndex;
      nextRowIndexRef.current = nextIndex;
      applyOffset(offset);

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (animationFrameRef.current != null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [enabled, shouldLoop, cyclePauseMs, rowPauseMs, speedPxPerSecond]);

  return {
    viewportRef,
    listRef,
    trackRef,
    shouldLoop,
  };
}
