import type { CSSProperties } from 'react';

import { BeerIcon, HotdogIcon } from './icons';
import type { Palette } from './palettes';

interface ColumnHeaderProps {
  palette: Palette;
}

/** Sticky leaderboard column header that mirrors handoff spacing. */
export function ColumnHeader({ palette }: ColumnHeaderProps) {
  const labelStyle: CSSProperties = {
    fontFamily: '"DM Mono", monospace',
    fontSize:
      'clamp(10px, calc(1.05cqi * var(--scoreboard-scale, 1)), calc(30px * var(--scoreboard-scale, 1)))',
    color: palette.inkDim,
    letterSpacing: '0.18em',
  };

  const iconColumnStyle: CSSProperties = {
    display: 'grid',
    placeItems: 'center',
  };

  const iconBoxStyle: CSSProperties = {
    width: 'clamp(28px, calc(2.9cqi * var(--scoreboard-scale, 1)), calc(90px * var(--scoreboard-scale, 1)))',
    height: 'clamp(28px, calc(2.9cqi * var(--scoreboard-scale, 1)), calc(90px * var(--scoreboard-scale, 1)))',
    display: 'grid',
    placeItems: 'center',
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'var(--scoreboard-grid-template)',
        alignItems: 'center',
        padding: 'var(--scoreboard-header-pad-y) var(--scoreboard-grid-pad-x)',
        background: palette.panel,
        borderTop: `1px solid ${palette.line}`,
        borderBottom: `2px solid ${palette.line}`,
        boxShadow: `0 4px 0 0 ${palette.bg}, 0 6px 10px -4px rgba(0,0,0,0.4)`,
      }}
    >
      <div style={labelStyle}>
        #
      </div>
      <div style={labelStyle}>
        PLAYER
      </div>
      <div style={iconColumnStyle}>
        <div style={iconBoxStyle}>
          <HotdogIcon
            color={palette.ink}
            size="clamp(26px, calc(2.6cqi * var(--scoreboard-scale, 1)), calc(82px * var(--scoreboard-scale, 1)))"
          />
        </div>
      </div>
      <div style={iconColumnStyle}>
        <div style={iconBoxStyle}>
          <BeerIcon
            color={palette.ink}
            size="clamp(28px, calc(2.8cqi * var(--scoreboard-scale, 1)), calc(84px * var(--scoreboard-scale, 1)))"
          />
        </div>
      </div>
      <div
        style={{
          fontFamily: '"Big Shoulders Stencil Display", sans-serif',
          fontWeight: 700,
          color: palette.gold,
          fontSize:
            'clamp(16px, calc(1.9cqi * var(--scoreboard-scale, 1)), calc(54px * var(--scoreboard-scale, 1)))',
          textAlign: 'center',
          letterSpacing: '0.04em',
        }}
      >
        TOT
      </div>
    </div>
  );
}
