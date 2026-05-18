import { useLayoutEffect, useRef } from 'react';

import type { Participant } from './types';

/**
 * FLIP animation hook to animate vertical row movement when sort order changes.
 */
export function useRowFlip(participants: Participant[]) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const previous = useRef<Record<string, number>>({});

  useLayoutEffect(() => {
    const next: Record<string, number> = {};

    Object.entries(refs.current).forEach(([name, element]) => {
      if (!element) {
        return;
      }
      next[name] = element.getBoundingClientRect().top;
    });

    Object.entries(next).forEach(([name, top]) => {
      const wasTop = previous.current[name];
      const element = refs.current[name];
      if (wasTop == null || !element || wasTop === top) {
        return;
      }

      const deltaY = wasTop - top;
      element.animate(
        [
          { transform: `translateY(${deltaY}px)` },
          { transform: 'translateY(0)' },
        ],
        {
          duration: 480,
          easing: 'cubic-bezier(.22,.61,.36,1)',
        }
      );
    });

    previous.current = next;
  }, [participants]);

  return (name: string) => (element: HTMLDivElement | null) => {
    refs.current[name] = element;
  };
}
