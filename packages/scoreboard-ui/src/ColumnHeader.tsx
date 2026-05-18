import { BeerIcon, HotdogIcon } from './icons';
import type { Palette } from './palettes';

interface ColumnHeaderProps {
  palette: Palette;
}

/** Sticky leaderboard column header that mirrors handoff spacing. */
export function ColumnHeader({ palette }: ColumnHeaderProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr 54px 54px 54px',
        alignItems: 'center',
        padding: '10px 14px 8px',
        background: palette.panel,
        borderTop: `1px solid ${palette.line}`,
        borderBottom: `2px solid ${palette.line}`,
        boxShadow: `0 4px 0 0 ${palette.bg}, 0 6px 10px -4px rgba(0,0,0,0.4)`,
      }}
    >
      <div
        style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: 10,
          color: palette.inkDim,
          letterSpacing: '0.18em',
        }}
      >
        #
      </div>
      <div
        style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: 10,
          color: palette.inkDim,
          letterSpacing: '0.18em',
        }}
      >
        PLAYER
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <HotdogIcon color={palette.ink} size={26} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <BeerIcon color={palette.ink} size={22} />
      </div>
      <div
        style={{
          fontFamily: '"Big Shoulders Stencil Display", sans-serif',
          fontWeight: 700,
          color: palette.gold,
          fontSize: 16,
          textAlign: 'center',
          letterSpacing: '0.04em',
          marginLeft: 6,
        }}
      >
        TOT
      </div>
    </div>
  );
}
