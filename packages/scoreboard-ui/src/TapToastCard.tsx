import type { Palette } from './palettes';

interface TapToastCardProps {
  palette: Palette;
  playerName: string;
  station: 'hotdog' | 'beer';
  delta?: number;
  topInset?: number;
}

const EMOJI_FONT_STACK = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';

/** Replaces the linescore panel with a live tap banner in kiosk feedback mode. */
export function TapToastCard({
  palette,
  playerName,
  station,
  delta = 1,
  topInset = 54,
}: TapToastCardProps) {
  const label = station === 'hotdog' ? 'HOT DOG' : 'BEER';
  const icon = station === 'hotdog' ? '🌭' : '🍺';
  const accent = station === 'hotdog' ? '#d6a23a' : '#f1b4a8';

  return (
    <div
      style={{
        position: 'absolute',
        left: 'var(--scoreboard-grid-pad-x)',
        right: 'var(--scoreboard-grid-pad-x)',
        top: `calc(${topInset}px + env(safe-area-inset-top, 0px) + clamp(6px, calc(0.6cqi * var(--scoreboard-scale, 1)), calc(18px * var(--scoreboard-scale, 1))))`,
        zIndex: 8,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(8px, calc(0.7cqi * var(--scoreboard-scale, 1)), calc(24px * var(--scoreboard-scale, 1)))',
          minHeight: 'clamp(56px, calc(6.5cqi * var(--scoreboard-scale, 1)), calc(180px * var(--scoreboard-scale, 1)))',
          padding:
            'clamp(10px, calc(1cqi * var(--scoreboard-scale, 1)), calc(32px * var(--scoreboard-scale, 1))) clamp(14px, calc(1.3cqi * var(--scoreboard-scale, 1)), calc(46px * var(--scoreboard-scale, 1)))',
          border: `1px solid ${palette.line}`,
          background: `${palette.panelDeep}e8`,
          backdropFilter: 'blur(6px)',
          boxShadow: '0 10px 22px rgba(0,0,0,0.32)',
          animation: 'tapToastSlideIn 460ms cubic-bezier(.22,.61,.36,1) forwards',
        }}
      >
        <span
          style={{
            fontFamily: EMOJI_FONT_STACK,
            fontSize:
              'clamp(18px, calc(1.8cqi * var(--scoreboard-scale, 1)), calc(56px * var(--scoreboard-scale, 1)))',
            color: accent,
            lineHeight: 1,
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontFamily: '"Big Shoulders Display", "Oswald", sans-serif',
            fontWeight: 800,
            fontSize:
              'clamp(26px, calc(2.8cqi * var(--scoreboard-scale, 1)), calc(84px * var(--scoreboard-scale, 1)))',
            lineHeight: 0.96,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            color: palette.ink,
          }}
        >
          {playerName}: +{delta} {label}
        </span>
      </div>
    </div>
  );
}
