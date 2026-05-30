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

const EMOJI_FONT_STACK = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';

function formatPreviewStartLabel(
  scheduledStart?: string | null,
  scheduledTimeZone?: string | null
): string {
  if (!scheduledStart) {
    return 'PREVIEW';
  }

  const date = new Date(scheduledStart);
  if (Number.isNaN(date.getTime())) {
    return 'PREVIEW';
  }

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(scheduledTimeZone ? { timeZone: scheduledTimeZone } : {}),
  })
    .format(date)
    .replace(/,/g, '');
  const timeLabel = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    ...(scheduledTimeZone ? { timeZone: scheduledTimeZone } : {}),
  }).format(date);

  return `${dateLabel} · ${timeLabel}`.toUpperCase();
}

function HealthPill({
  icon,
  label,
  online,
  color,
}: {
  icon: string;
  label: string;
  online?: boolean;
  color: string;
}) {
  const isOffline = online === false;
  if (!isOffline) {
    return null;
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'clamp(3px, calc(0.3cqi * var(--scoreboard-scale, 1)), calc(8px * var(--scoreboard-scale, 1)))',
        fontFamily: '"DM Mono", monospace',
        fontSize: 'var(--scoreboard-health-pill-size)',
        letterSpacing: '0.12em',
        color: isOffline ? '#29120f' : color,
        background: isOffline ? '#f1b4a8' : 'transparent',
        border: isOffline ? '1px solid rgba(0,0,0,0.2)' : 'none',
        padding: isOffline
          ? 'clamp(1px, calc(0.2cqi * var(--scoreboard-scale, 1)), calc(6px * var(--scoreboard-scale, 1))) clamp(5px, calc(0.5cqi * var(--scoreboard-scale, 1)), calc(14px * var(--scoreboard-scale, 1)))'
          : 0,
      }}
    >
      <span style={{ fontFamily: EMOJI_FONT_STACK, lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
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
    gap: 'var(--scoreboard-status-gap)',
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
    height: 'var(--scoreboard-linescore-row-height)',
    borderRight: `1px solid ${palette.line}`,
  };
  const cellLabelStyle: CSSProperties = {
    ...commonCell,
    justifyContent: 'flex-start',
    paddingLeft: 'clamp(8px, calc(0.9cqi * var(--scoreboard-scale, 1)), calc(24px * var(--scoreboard-scale, 1)))',
    fontFamily: '"Big Shoulders Stencil Display", sans-serif',
    fontWeight: 700,
    fontSize: 'var(--scoreboard-linescore-team-size)',
    color: palette.ink,
  };
  const scoreCellStyle: CSSProperties = {
    ...commonCell,
    fontFamily: '"Big Shoulders Display", sans-serif',
    fontWeight: 700,
    fontSize: 'var(--scoreboard-linescore-score-size)',
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
    height: 'var(--scoreboard-linescore-header-height)',
    fontFamily: '"DM Mono", monospace',
    fontSize: 'var(--scoreboard-header-label-size)',
    color: palette.inkDim,
  };

  const abstractState = game.abstractState.toLowerCase();
  const gameStateLabel =
    connectionState === 'disconnected'
      ? `DISCONNECTED · ${game.inningState.toUpperCase()} ${game.inningOrdinal.toUpperCase()}`
      : abstractState === 'final'
        ? 'FINAL'
        : abstractState === 'preview'
          ? formatPreviewStartLabel(game.scheduledStart, game.scheduledTimeZone)
          : `● LIVE · ${game.inningState.toUpperCase()} ${game.inningOrdinal.toUpperCase()}`;

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
          fontSize: 'var(--scoreboard-status-size)',
          letterSpacing: '0.18em',
          color: palette.inkDim,
        }}
      >
        <span>{gameStateLabel}</span>
        <span style={headerRight}>
          <HealthPill icon="🌭" label="OFFLINE" online={readerHealth?.hotdogOnline} color={palette.inkDim} />
          <HealthPill icon="🍺" label="OFFLINE" online={readerHealth?.beerOnline} color={palette.inkDim} />
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
