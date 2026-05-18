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
  if (!isOffline) {
    return null;
  }

  return (
    <span
      style={{
        fontFamily: '"DM Mono", monospace',
        fontSize: 'clamp(9px, 0.95cqi, 26px)',
        letterSpacing: '0.12em',
        color: isOffline ? '#29120f' : color,
        background: isOffline ? '#f1b4a8' : 'transparent',
        border: isOffline ? '1px solid rgba(0,0,0,0.2)' : 'none',
        padding: isOffline ? 'clamp(1px, 0.2cqi, 6px) clamp(5px, 0.5cqi, 14px)' : 0,
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
        width: isTotal ? 'clamp(24px, 2.4cqi, 72px)' : 'clamp(20px, 2cqi, 60px)',
        height: 'clamp(22px, 2.3cqi, 66px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isTotal ? palette.boxBg : 'transparent',
        color: isTotal ? palette.gold : palette.ink,
        fontFamily: '"Big Shoulders Display", sans-serif',
        fontWeight: 700,
        fontSize: 'clamp(14px, 1.8cqi, 48px)',
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
          width: 'clamp(48px, 4.8cqi, 140px)',
          height: 'clamp(22px, 2.3cqi, 66px)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 'clamp(8px, 0.9cqi, 24px)',
          fontFamily: '"Big Shoulders Stencil Display", sans-serif',
          fontWeight: 700,
          fontSize: 'clamp(14px, 1.8cqi, 48px)',
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
    gap: 'clamp(8px, 0.8cqi, 24px)',
  };

  return (
    <div
      style={{
        background: palette.panelDeep,
        borderBottom: `2px solid ${palette.line}`,
        padding: `calc(${topInset}px + env(safe-area-inset-top, 0px)) clamp(8px, 1cqi, 26px) clamp(10px, 1.2cqi, 32px)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(6px, 0.8cqi, 20px) clamp(8px, 1cqi, 24px)',
          fontFamily: '"DM Mono", monospace',
          fontSize: 'clamp(10px, 1.05cqi, 30px)',
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
        <div
          style={{
            width: 'clamp(48px, 4.8cqi, 140px)',
            height: 'clamp(18px, 1.9cqi, 56px)',
            borderRight: `1px solid ${palette.line}`,
          }}
        />
        {inningNumbers.map((inningNumber) => (
          <div
            key={`inning-${inningNumber}`}
            style={{
              width: 'clamp(20px, 2cqi, 60px)',
              height: 'clamp(18px, 1.9cqi, 56px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: '"DM Mono", monospace',
              fontSize: 'clamp(10px, 1.05cqi, 30px)',
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
              width: 'clamp(24px, 2.4cqi, 72px)',
              height: 'clamp(18px, 1.9cqi, 56px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: '"DM Mono", monospace',
              fontSize: 'clamp(10px, 1.05cqi, 30px)',
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
