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
        gridTemplateColumns:
          'clamp(28px, 2.8cqi, 96px) 1fr clamp(54px, 5.2cqi, 152px) clamp(54px, 5.2cqi, 152px) clamp(54px, 5.2cqi, 152px)',
        alignItems: 'center',
        padding:
          'clamp(10px, 1.2cqi, 36px) clamp(14px, 1.6cqi, 44px) clamp(8px, 1cqi, 28px)',
        background: palette.panel,
        borderTop: `1px solid ${palette.line}`,
        borderBottom: `2px solid ${palette.line}`,
        boxShadow: `0 4px 0 0 ${palette.bg}, 0 6px 10px -4px rgba(0,0,0,0.4)`,
      }}
    >
      <div
        style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: 'clamp(10px, 1.05cqi, 30px)',
          color: palette.inkDim,
          letterSpacing: '0.18em',
        }}
      >
        #
      </div>
      <div
        style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: 'clamp(10px, 1.05cqi, 30px)',
          color: palette.inkDim,
          letterSpacing: '0.18em',
        }}
      >
        PLAYER
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <HotdogIcon color={palette.ink} size="clamp(26px, 2.7cqi, 82px)" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <BeerIcon color={palette.ink} size="clamp(22px, 2.3cqi, 70px)" />
      </div>
      <div
        style={{
          fontFamily: '"Big Shoulders Stencil Display", sans-serif',
          fontWeight: 700,
          color: palette.gold,
          fontSize: 'clamp(16px, 1.9cqi, 54px)',
          textAlign: 'center',
          letterSpacing: '0.04em',
          marginLeft: 'clamp(6px, 0.7cqi, 18px)',
        }}
      >
        TOT
      </div>
    </div>
  );
}
