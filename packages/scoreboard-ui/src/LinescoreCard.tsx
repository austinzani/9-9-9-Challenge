import type { CSSProperties } from 'react';

import type { GameState } from './types';
import type { Palette } from './palettes';

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

  return (
    <span
      style={{
        fontFamily: '"DM Mono", monospace',
        fontSize: 9,
        letterSpacing: '0.12em',
        color: isOffline ? '#29120f' : color,
        background: isOffline ? '#f1b4a8' : 'transparent',
        border: isOffline ? '1px solid rgba(0,0,0,0.2)' : 'none',
        padding: isOffline ? '1px 5px' : 0,
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

  const cell = (value: number | null, isTotal = false) => (
    <div
      style={{
        width: isTotal ? 24 : 20,
        height: 22,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isTotal ? palette.boxBg : 'transparent',
        color: isTotal ? palette.gold : palette.ink,
        fontFamily: '"Big Shoulders Display", sans-serif',
        fontWeight: 700,
        fontSize: 16,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        borderRight: `1px solid ${palette.line}`,
      }}
    >
      {value == null ? '·' : value}
    </div>
  );

  const row = (
    label: string,
    scores: Array<number | null>,
    runs: number,
    hits: number,
    errors: number,
    accent: boolean
  ) => (
    <div style={{ display: 'flex', alignItems: 'center', borderTop: `1px solid ${palette.line}` }}>
      <div
        style={{
          width: 48,
          height: 22,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 8,
          fontFamily: '"Big Shoulders Stencil Display", sans-serif',
          fontWeight: 700,
          fontSize: 16,
          color: palette.ink,
          background: accent ? `${palette.accent}33` : 'transparent',
          borderRight: `1px solid ${palette.line}`,
        }}
      >
        {label}
      </div>
      {scores.map((score, index) => (
        <div key={`${label}-${index}`}>{cell(score)}</div>
      ))}
      {cell(runs, true)}
      {cell(hits, true)}
      {cell(errors, true)}
    </div>
  );

  const headerRight: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  return (
    <div
      style={{
        background: palette.panelDeep,
        borderBottom: `2px solid ${palette.line}`,
        padding: `${topInset}px 8px 10px`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 6px 8px',
          fontFamily: '"DM Mono", monospace',
          fontSize: 10,
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

      <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${palette.line}`, background: palette.bg }}>
        <div style={{ width: 48, height: 18, borderRight: `1px solid ${palette.line}` }} />
        {inningNumbers.map((inningNumber) => (
          <div
            key={`inning-${inningNumber}`}
            style={{
              width: 20,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: '"DM Mono", monospace',
              fontSize: 10,
              color: palette.inkDim,
              borderRight: `1px solid ${palette.line}`,
            }}
          >
            {inningNumber}
          </div>
        ))}

        {['R', 'H', 'E'].map((label) => (
          <div
            key={`total-${label}`}
            style={{
              width: 24,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: '"DM Mono", monospace',
              fontSize: 10,
              color: palette.gold,
              fontWeight: 700,
              borderRight: `1px solid ${palette.line}`,
            }}
          >
            {label}
          </div>
        ))}
      </div>

      <div style={{ border: `1px solid ${palette.line}`, borderTop: 'none', background: palette.bg }}>
        {row(game.awayAbbr, game.innings.away, game.R.away, game.H.away, game.E.away, false)}
        {row(game.homeAbbr, game.innings.home, game.R.home, game.H.home, game.E.home, true)}
      </div>
    </div>
  );
}
