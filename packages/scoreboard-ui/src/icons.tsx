interface IconProps {
  size?: number;
  color?: string;
}

/** Hot dog glyph styled for scoreboard paint look. */
export function HotdogIcon({ size = 26, color = '#f0e6c8' }: IconProps) {
  return (
    <svg width={size} height={size * 0.65} viewBox="0 0 40 26" style={{ display: 'block' }}>
      <rect x="2" y="6" width="36" height="14" rx="7" fill="none" stroke={color} strokeWidth="2.2" />
      <rect x="6" y="9" width="28" height="8" rx="4" fill={color} />
      <path
        d="M8 13 L12 11 L16 13 L20 11 L24 13 L28 11 L32 13"
        fill="none"
        stroke="#1d4233"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Beer mug glyph styled for scoreboard paint look. */
export function BeerIcon({ size = 26, color = '#f0e6c8' }: IconProps) {
  return (
    <svg width={size * 0.85} height={size} viewBox="0 0 28 32" style={{ display: 'block' }}>
      <rect x="3" y="6" width="17" height="22" rx="1.5" fill="none" stroke={color} strokeWidth="2.2" />
      <path
        d="M20 11 h3 a3 3 0 0 1 3 3 v4 a3 3 0 0 1 -3 3 h-3"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
      />
      <path
        d="M3 9 Q 6 5 9 7 Q 12 4 15 7 Q 18 5 20 8"
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line x1="6" y1="14" x2="17" y2="14" stroke={color} strokeWidth="1.3" />
      <line x1="6" y1="19" x2="17" y2="19" stroke={color} strokeWidth="1.3" />
      <line x1="6" y1="24" x2="17" y2="24" stroke={color} strokeWidth="1.3" />
    </svg>
  );
}
