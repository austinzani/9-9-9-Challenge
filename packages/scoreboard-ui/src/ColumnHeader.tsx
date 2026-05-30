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
    fontSize: 'var(--scoreboard-header-label-size)',
    color: palette.inkDim,
    letterSpacing: '0.18em',
  };

  const iconColumnStyle: CSSProperties = {
    display: 'grid',
    placeItems: 'center',
  };

  const iconBoxStyle: CSSProperties = {
    width: 'var(--scoreboard-header-icon-box-size)',
    height: 'var(--scoreboard-header-icon-box-size)',
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
            size="var(--scoreboard-header-hotdog-size)"
          />
        </div>
      </div>
      <div style={iconColumnStyle}>
        <div style={iconBoxStyle}>
          <BeerIcon
            color={palette.ink}
            size="var(--scoreboard-header-beer-size)"
          />
        </div>
      </div>
      <div
        style={{
          fontFamily: '"Big Shoulders Stencil Display", sans-serif',
          fontWeight: 700,
          color: palette.gold,
          fontSize: 'var(--scoreboard-header-total-size)',
          textAlign: 'center',
          letterSpacing: '0.04em',
        }}
      >
        TOT
      </div>
    </div>
  );
}
