import { useEffect, useRef, useState } from 'react';

interface FlipNumberProps {
  value: number;
  color: string;
  size?: number | string;
  hot?: boolean;
}

/** Subtle scoreboard-style card flip for number updates. */
export function FlipNumber({ value, color, size = 44, hot = false }: FlipNumberProps) {
  const [display, setDisplay] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const last = useRef(value);

  useEffect(() => {
    if (value === last.current) {
      return;
    }

    setFlipping(true);
    const timeout = window.setTimeout(() => {
      setDisplay(value);
      setFlipping(false);
      last.current = value;
    }, 160);

    return () => window.clearTimeout(timeout);
  }, [value]);

  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: '"Big Shoulders Display", "Oswald", sans-serif',
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1,
        color,
        letterSpacing: '-0.01em',
        transform: flipping ? 'rotateX(90deg) scaleY(0.9)' : 'rotateX(0) scaleY(1)',
        transformOrigin: 'center',
        transition: 'transform 0.16s cubic-bezier(.5,0,.5,1)',
        textShadow: hot ? `0 0 12px ${color}55` : 'none',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {display}
    </span>
  );
}
