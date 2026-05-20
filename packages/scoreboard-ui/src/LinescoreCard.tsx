import type { CSSProperties } from 'react';

import type { Palette } from './palettes';
import type { GameState } from './types';

interface LinescoreCardProps {
  game: GameState;
  palette: Palette;
  connectionState?: 'connected' | 'disconnected';
  readerHealth?: {
    hotdogOnline?: boolean;
    beerOnline?: boolean;
  };
  topInset?: number;
}

function HealthPill({ label, online, color }: { label: string; online?: boolean; color: string }) {
  const isOffline = online === false;
  if (!isOffline) {
    return null;
  }

  return (
    <span
      style={{
        fontFamily: '"DM Mono", monospace',
        fontSize:
          'clamp(9px, calc(0.95cqi * var(--scoreboard-scale, 1)), calc(26px * var(--scoreboard-scale, 1)))',
        letterSpacing: '0.12em',
        color: isOffline ? '#29120f' : color,
        background: isOffline ? '#f1b4a8' : 'transparent',
        border: isOffline ? '1px solid rgba(0,0,0,0.2)' : 'none',
        padding: isOffline
          ? 'clamp(1px, calc(0.2cqi * var(--scoreboard-scale, 1)), calc(6px * var(--scoreboard-scale, 1))) clamp(5px, calc(0.5cqi * var(--scoreboard-scale, 1)), calc(14px * var(--scoreboard-scale, 1)))'
          : 0,
      }}
    >
      {label}
    </span>
  );
}

/** Linescore-first game-state header; locked as the production header style. */
export function LinescoreCard({
  game,
  palette,
  connectionState = 'connected',
  readerHealth,
  topInset = 54,
}: LinescoreCardProps) {
  const inningNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const headerRight: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(8px, calc(0.8cqi * var(--scoreboard-scale, 1)), calc(24px * var(--scoreboard-scale, 1)))',
  };
  const linescoreRowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'var(--scoreboard-linescore-template)',
    alignItems: 'stretch',
    width: '100%',
  };
  const commonCell: CSSProperties = {
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'clamp(22px, calc(2.3cqi * var(--scoreboard-scale, 1)), calc(66px * var(--scoreboard-scale, 1)))',
    borderRight: `1px solid ${palette.line}`,
  };
  const cellLabelStyle: CSSProperties = {
    ...commonCell,
    justifyContent: 'flex-start',
    paddingLeft: 'clamp(8px, calc(0.9cqi * var(--scoreboard-scale, 1)), calc(24px * var(--scoreboard-scale, 1)))',
    fontFamily: '"Big Shoulders Stencil Display", sans-serif',
    fontWeight: 700,
    fontSize: 'clamp(14px, calc(1.8cqi * var(--scoreboard-scale, 1)), calc(48px * var(--scoreboard-scale, 1)))',
    color: palette.ink,
  };
  const scoreCellStyle: CSSProperties = {
    ...commonCell,
    fontFamily: '"Big Shoulders Display", sans-serif',
    fontWeight: 700,
    fontSize: 'clamp(14px, calc(1.8cqi * var(--scoreboard-scale, 1)), calc(48px * var(--scoreboard-scale, 1)))',
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
    color: palette.ink,
  };
  const scoreTotalCellStyle: CSSProperties = {
    ...scoreCellStyle,
    color: palette.gold,
    background: palette.boxBg,
  };
  const headerCellStyle: CSSProperties = {
    ...commonCell,
    height: 'clamp(18px, calc(1.9cqi * var(--scoreboard-scale, 1)), calc(56px * var(--scoreboard-scale, 1)))',
    fontFamily: '"DM Mono", monospace',
    fontSize: 'clamp(10px, calc(1.05cqi * var(--scoreboard-scale, 1)), calc(30px * var(--scoreboard-scale, 1)))',
    color: palette.inkDim,
  };

  const renderGameRow = (
    label: string,
    scores: Array<number | null>,
    runs: number,
    hits: number,
    errors: number,
    accent: boolean
  ) => (
    <div style={{ ...linescoreRowStyle, borderTop: `1px solid ${palette.line}` }}>
      <div style={{ ...cellLabelStyle, background: accent ? `${palette.accent}33` : 'transparent' }}>{label}</div>
      {scores.map((score, index) => (
        <div key={`${label}-${index}`} style={scoreCellStyle}>
          {score == null ? '·' : score}
        </div>
      ))}
      <div style={scoreTotalCellStyle}>{runs}</div>
      <div style={scoreTotalCellStyle}>{hits}</div>
      <div style={{ ...scoreTotalCellStyle, borderRight: 'none' }}>{errors}</div>
    </div>
  );

  return (
    <div
      style={{
        background: palette.panelDeep,
        borderBottom: `2px solid ${palette.line}`,
        padding: `calc(${topInset}px + env(safe-area-inset-top, 0px)) var(--scoreboard-grid-pad-x) clamp(10px, calc(1.2cqi * var(--scoreboard-scale, 1)), calc(32px * var(--scoreboard-scale, 1)))`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0 clamp(8px, calc(1cqi * var(--scoreboard-scale, 1)), calc(24px * var(--scoreboard-scale, 1)))',
          fontFamily: '"DM Mono", monospace',
          fontSize:
            'clamp(10px, calc(1.05cqi * var(--scoreboard-scale, 1)), calc(30px * var(--scoreboard-scale, 1)))',
          letterSpacing: '0.18em',
          color: palette.inkDim,
        }}
      >
        <span>
          {connectionState === 'disconnected' ? 'DISCONNECTED ·' : '● LIVE ·'} {game.inningState.toUpperCase()}{' '}
          {game.inningOrdinal.toUpperCase()}
        </span>
        <span style={headerRight}>
          <HealthPill label="🌭 OFFLINE" online={readerHealth?.hotdogOnline} color={palette.inkDim} />
          <HealthPill label="🍺 OFFLINE" online={readerHealth?.beerOnline} color={palette.inkDim} />
          <span>GABP</span>
        </span>
      </div>

      <div style={{ border: `1px solid ${palette.line}`, background: palette.bg }}>
        <div style={linescoreRowStyle}>
          <div style={headerCellStyle} />
          {inningNumbers.map((inningNumber) => (
            <div key={`inning-${inningNumber}`} style={headerCellStyle}>
              {inningNumber}
            </div>
          ))}
          {['R', 'H', 'E'].map((label, index) => (
            <div
              key={`total-${label}`}
              style={{
                ...headerCellStyle,
                color: palette.gold,
                fontWeight: 700,
                borderRight: index === 2 ? 'none' : headerCellStyle.borderRight,
              }}
            >
              {label}
            </div>
          ))}
        </div>
        {renderGameRow(game.awayAbbr, game.innings.away, game.R.away, game.H.away, game.E.away, false)}
        {renderGameRow(game.homeAbbr, game.innings.home, game.R.home, game.H.home, game.E.home, true)}
      </div>
    </div>
  );
}
