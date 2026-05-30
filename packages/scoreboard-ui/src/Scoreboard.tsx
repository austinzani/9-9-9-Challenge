import { useMemo, type CSSProperties } from 'react';

import { ColumnHeader } from './ColumnHeader';
import { Footer } from './Footer';
import { LinescoreCard } from './LinescoreCard';
import { PALETTES } from './palettes';
import { ParticipantRow } from './ParticipantRow';
import { TapToastCard } from './TapToastCard';
import type { ConnectionState, GameState, Participant, ReaderHealth } from './types';
import { useKioskAutoScroll } from './useKioskAutoScroll';
import { useRowFlip } from './useRowFlip';

export interface TapToastPayload {
  playerName: string;
  station: 'hotdog' | 'beer';
  delta?: number;
  eventId: number;
}

function ordinalSuffix(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return 'th';
  }

  switch (value % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

function formatScheduledDate(
  scheduledStart?: string | null,
  scheduledTimeZone?: string | null
): string | null {
  if (!scheduledStart) {
    return null;
  }

  const date = new Date(scheduledStart);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(scheduledTimeZone ? { timeZone: scheduledTimeZone } : {}),
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === 'weekday')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!weekday || !month || !day) {
    return null;
  }

  return `${weekday}, ${month} ${day}${ordinalSuffix(Number(day))}`;
}

function formatScheduledTime(
  scheduledStart?: string | null,
  scheduledTimeZone?: string | null
): string | null {
  if (!scheduledStart) {
    return null;
  }

  const date = new Date(scheduledStart);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    ...(scheduledTimeZone ? { timeZone: scheduledTimeZone } : {}),
  })
    .format(date)
    .replace('AM', 'a.m.')
    .replace('PM', 'p.m.');
}

function formatVenueName(venueName?: string | null): string | null {
  if (!venueName) {
    return null;
  }

  return venueName.replace(/\bBall Park\b/giu, 'Ballpark');
}

function EmptyStatePanel({ game, palette }: { game: GameState; palette: (typeof PALETTES)['green'] }) {
  const isPreview = game.abstractState.toLowerCase() === 'preview';
  const matchup = `${game.homeName} vs ${game.awayName}`;
  const scheduledDate = formatScheduledDate(game.scheduledStart, game.scheduledTimeZone);
  const scheduledTime = formatScheduledTime(game.scheduledStart, game.scheduledTimeZone);
  const venueName = formatVenueName(game.venueName);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(28px, 3.2cqi, 88px)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 'min(980px, 100%)',
          display: 'grid',
          gap: 'clamp(10px, 1cqi, 28px)',
        }}
      >
        <div
          style={{
            fontFamily: '"DM Mono", monospace',
            fontSize: 'clamp(12px, 1.15cqi, 26px)',
            letterSpacing: '0.18em',
            color: palette.gold,
          }}
        >
          {isPreview ? 'GAME UPCOMING' : 'NO PLAYERS REGISTERED YET'}
        </div>

        {isPreview ? (
          <>
            <div
              style={{
                fontFamily: '"Big Shoulders Display", "Oswald", sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(42px, 5cqi, 120px)',
                lineHeight: 0.92,
                color: palette.ink,
                letterSpacing: '0.02em',
              }}
            >
              {matchup}
            </div>
            {scheduledDate && (
              <div
                style={{
                  fontFamily: '"Oswald", system-ui, sans-serif',
                  fontSize: 'clamp(22px, 2.2cqi, 52px)',
                  color: palette.ink,
                }}
              >
                {scheduledDate}
              </div>
            )}
            {scheduledTime && (
              <div
                style={{
                  fontFamily: '"Oswald", system-ui, sans-serif',
                  fontSize: 'clamp(20px, 2cqi, 46px)',
                  color: palette.gold,
                }}
              >
                {scheduledTime}
              </div>
            )}
            {venueName && (
              <div
                style={{
                  fontFamily: '"DM Mono", monospace',
                  fontSize: 'clamp(14px, 1.35cqi, 30px)',
                  letterSpacing: '0.12em',
                  color: palette.inkDim,
                }}
              >
                {venueName}
              </div>
            )}
          </>
        ) : (
          <>
            <div
              style={{
                fontFamily: '"Big Shoulders Display", "Oswald", sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(38px, 4.6cqi, 110px)',
                lineHeight: 0.94,
                color: palette.ink,
                letterSpacing: '0.02em',
              }}
            >
              Waiting for the first contestant
            </div>
            <div
              style={{
                fontFamily: '"Oswald", system-ui, sans-serif',
                fontSize: 'clamp(22px, 2.1cqi, 46px)',
                color: palette.gold,
              }}
            >
              to finish a beer or hot dog.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export interface ScoreboardProps {
  participants: Participant[];
  game: GameState;
  hotName?: string | null;
  connectionState?: ConnectionState;
  readerHealth?: ReaderHealth;
  showTopHighlight?: boolean;
  qrUrl?: string;
  showQrUrl?: boolean;
  showQrCode?: boolean;
  topInset?: number;
  /** Enables kiosk-specific split layout (pinned leader + sticky footer). */
  isKioskMode?: boolean;
  /** Enables auto-scroll loop for overflowed rows in kiosk mode. */
  kioskAutoScroll?: boolean;
  /** Optional top feedback card that replaces linescore content while active. */
  tapToast?: TapToastPayload | null;
}

/**
 * Main scoreboard surface.
 *
 * Compact header remains intentionally omitted in production. The visual
 * direction is locked to the linescore treatment from the design handoff.
 */
export function Scoreboard({
  participants,
  game,
  hotName,
  connectionState = 'connected',
  readerHealth,
  showTopHighlight = true,
  qrUrl,
  showQrUrl = true,
  showQrCode = false,
  topInset = 54,
  isKioskMode = false,
  kioskAutoScroll = true,
  tapToast = null,
}: ScoreboardProps) {
  const palette = PALETTES.green;
  const leaderboardGridTemplate = isKioskMode
    ? 'clamp(60px, 5.1cqi, 144px) minmax(0, 1fr) clamp(104px, 8.3cqi, 220px) clamp(104px, 8.3cqi, 220px) clamp(112px, 8.9cqi, 236px)'
    : 'clamp(32px, calc(3.1cqi * var(--scoreboard-scale, 1)), calc(104px * var(--scoreboard-scale, 1))) minmax(0, 1fr) clamp(58px, calc(5.6cqi * var(--scoreboard-scale, 1)), calc(162px * var(--scoreboard-scale, 1))) clamp(58px, calc(5.6cqi * var(--scoreboard-scale, 1)), calc(162px * var(--scoreboard-scale, 1))) clamp(58px, calc(5.6cqi * var(--scoreboard-scale, 1)), calc(162px * var(--scoreboard-scale, 1)))';
  const linescoreGridTemplate = isKioskMode
    ? 'minmax(clamp(102px, 8.1cqi, 188px), 1.42fr) repeat(9, minmax(clamp(32px, 2.45cqi, 62px), 1fr)) repeat(3, minmax(clamp(42px, 3.3cqi, 86px), 1.12fr))'
    : 'minmax(clamp(52px, calc(5.2cqi * var(--scoreboard-scale, 1)), calc(152px * var(--scoreboard-scale, 1))), 1.35fr) repeat(9, minmax(clamp(20px, calc(2cqi * var(--scoreboard-scale, 1)), calc(60px * var(--scoreboard-scale, 1))), 1fr)) repeat(3, minmax(clamp(24px, calc(2.35cqi * var(--scoreboard-scale, 1)), calc(72px * var(--scoreboard-scale, 1))), 1.12fr))';
  const layoutVars: CSSProperties = {
    '--scoreboard-grid-template': leaderboardGridTemplate,
    '--scoreboard-linescore-template': linescoreGridTemplate,
    '--scoreboard-grid-pad-x': isKioskMode ? 'clamp(18px, 1.6cqi, 42px)' : 'clamp(12px, calc(1.6cqi * var(--scoreboard-scale, 1)), calc(44px * var(--scoreboard-scale, 1)))',
    '--scoreboard-row-pad-y': isKioskMode ? 'clamp(14px, 1.25cqi, 30px)' : 'clamp(8px, calc(1.2cqi * var(--scoreboard-scale, 1)), calc(32px * var(--scoreboard-scale, 1)))',
    '--scoreboard-header-pad-y': isKioskMode ? 'clamp(14px, 1.2cqi, 28px)' : 'clamp(10px, calc(1.2cqi * var(--scoreboard-scale, 1)), calc(36px * var(--scoreboard-scale, 1)))',
    '--scoreboard-rank-size': isKioskMode ? 'clamp(22px, 1.75cqi, 42px)' : 'clamp(12px, calc(1.3cqi * var(--scoreboard-scale, 1)), calc(34px * var(--scoreboard-scale, 1)))',
    '--scoreboard-name-size': isKioskMode ? 'clamp(46px, 3.9cqi, 96px)' : 'clamp(24px, calc(2.8cqi * var(--scoreboard-scale, 1)), calc(84px * var(--scoreboard-scale, 1)))',
    '--scoreboard-name-gap': isKioskMode ? 'clamp(10px, 0.75cqi, 20px)' : 'clamp(8px, calc(0.9cqi * var(--scoreboard-scale, 1)), calc(24px * var(--scoreboard-scale, 1)))',
    '--scoreboard-badge-size': isKioskMode ? 'clamp(12px, 0.95cqi, 22px)' : 'clamp(9px, calc(0.95cqi * var(--scoreboard-scale, 1)), calc(24px * var(--scoreboard-scale, 1)))',
    '--scoreboard-badge-padding': isKioskMode ? 'clamp(3px, 0.25cqi, 8px) clamp(8px, 0.6cqi, 16px)' : 'clamp(2px, calc(0.3cqi * var(--scoreboard-scale, 1)), calc(8px * var(--scoreboard-scale, 1))) clamp(5px, calc(0.5cqi * var(--scoreboard-scale, 1)), calc(14px * var(--scoreboard-scale, 1)))',
    '--scoreboard-number-size': isKioskMode ? 'clamp(52px, 4.35cqi, 112px)' : 'clamp(32px, calc(3.4cqi * var(--scoreboard-scale, 1)), calc(94px * var(--scoreboard-scale, 1)))',
    '--scoreboard-total-pad-y': isKioskMode ? 'clamp(6px, 0.45cqi, 12px)' : 'clamp(4px, calc(0.5cqi * var(--scoreboard-scale, 1)), calc(14px * var(--scoreboard-scale, 1)))',
    '--scoreboard-header-label-size': isKioskMode ? 'clamp(15px, 1.15cqi, 28px)' : 'clamp(10px, calc(1.05cqi * var(--scoreboard-scale, 1)), calc(30px * var(--scoreboard-scale, 1)))',
    '--scoreboard-header-icon-box-size': isKioskMode ? 'clamp(42px, 3.2cqi, 88px)' : 'clamp(28px, calc(2.9cqi * var(--scoreboard-scale, 1)), calc(90px * var(--scoreboard-scale, 1)))',
    '--scoreboard-header-hotdog-size': isKioskMode ? 'clamp(38px, 2.9cqi, 78px)' : 'clamp(26px, calc(2.6cqi * var(--scoreboard-scale, 1)), calc(82px * var(--scoreboard-scale, 1)))',
    '--scoreboard-header-beer-size': isKioskMode ? 'clamp(40px, 3.05cqi, 82px)' : 'clamp(28px, calc(2.8cqi * var(--scoreboard-scale, 1)), calc(84px * var(--scoreboard-scale, 1)))',
    '--scoreboard-header-total-size': isKioskMode ? 'clamp(22px, 1.75cqi, 42px)' : 'clamp(16px, calc(1.9cqi * var(--scoreboard-scale, 1)), calc(54px * var(--scoreboard-scale, 1)))',
    '--scoreboard-status-size': isKioskMode ? 'clamp(15px, 1.15cqi, 28px)' : 'clamp(10px, calc(1.05cqi * var(--scoreboard-scale, 1)), calc(30px * var(--scoreboard-scale, 1)))',
    '--scoreboard-health-pill-size': isKioskMode ? 'clamp(14px, 1.05cqi, 22px)' : 'clamp(9px, calc(0.95cqi * var(--scoreboard-scale, 1)), calc(26px * var(--scoreboard-scale, 1)))',
    '--scoreboard-status-gap': isKioskMode ? 'clamp(10px, 0.75cqi, 18px)' : 'clamp(8px, calc(0.8cqi * var(--scoreboard-scale, 1)), calc(24px * var(--scoreboard-scale, 1)))',
    '--scoreboard-linescore-header-height': isKioskMode ? 'clamp(28px, 2cqi, 54px)' : 'clamp(18px, calc(1.9cqi * var(--scoreboard-scale, 1)), calc(56px * var(--scoreboard-scale, 1)))',
    '--scoreboard-linescore-row-height': isKioskMode ? 'clamp(42px, 3.15cqi, 82px)' : 'clamp(22px, calc(2.3cqi * var(--scoreboard-scale, 1)), calc(66px * var(--scoreboard-scale, 1)))',
    '--scoreboard-linescore-team-size': isKioskMode ? 'clamp(26px, 2cqi, 46px)' : 'clamp(14px, calc(1.8cqi * var(--scoreboard-scale, 1)), calc(48px * var(--scoreboard-scale, 1)))',
    '--scoreboard-linescore-score-size': isKioskMode ? 'clamp(24px, 1.85cqi, 44px)' : 'clamp(14px, calc(1.8cqi * var(--scoreboard-scale, 1)), calc(48px * var(--scoreboard-scale, 1)))',
    '--scoreboard-footer-font-size': isKioskMode ? 'clamp(12px, 0.9cqi, 20px)' : 'clamp(10px, calc(1.05cqi * var(--scoreboard-scale, 1)), calc(30px * var(--scoreboard-scale, 1)))',
    '--scoreboard-footer-padding': isKioskMode ? 'clamp(16px, 1.2cqi, 30px) clamp(16px, 1.2cqi, 30px) clamp(24px, 1.8cqi, 42px)' : 'clamp(16px, calc(1.8cqi * var(--scoreboard-scale, 1)), calc(54px * var(--scoreboard-scale, 1))) clamp(16px, calc(1.8cqi * var(--scoreboard-scale, 1)), calc(48px * var(--scoreboard-scale, 1))) clamp(28px, calc(2.8cqi * var(--scoreboard-scale, 1)), calc(80px * var(--scoreboard-scale, 1)))',
    '--scoreboard-footer-gap': isKioskMode ? 'clamp(6px, 0.45cqi, 12px)' : 'clamp(4px, calc(0.5cqi * var(--scoreboard-scale, 1)), calc(14px * var(--scoreboard-scale, 1)))',
    '--scoreboard-qr-width': isKioskMode ? 'clamp(150px, 11cqi, 240px)' : 'clamp(120px, calc(10cqi * var(--scoreboard-scale, 1)), calc(280px * var(--scoreboard-scale, 1)))',
  } as CSSProperties;

  const sorted = useMemo(() => {
    return [...participants].sort((a, b) => {
      const totalA = a.hotdogs + a.beers;
      const totalB = b.hotdogs + b.beers;
      if (totalB !== totalA) {
        return totalB - totalA;
      }
      if (b.hotdogs !== a.hotdogs) {
        return b.hotdogs - a.hotdogs;
      }
      return a.name.localeCompare(b.name);
    });
  }, [participants]);

  const hasParticipants = sorted.length > 0;
  const scrollingRows = useMemo(() => sorted.slice(1), [sorted]);
  const scrollingRowIds = useMemo(
    () => scrollingRows.map((participant) => participant.uid ?? participant.name),
    [scrollingRows]
  );
  const refSet = useRowFlip(isKioskMode ? [] : sorted);
  const autoScroll = useKioskAutoScroll({
    enabled: isKioskMode && kioskAutoScroll,
    rowIds: scrollingRowIds,
  });

  return (
    <div
      style={{
        ...layoutVars,
        background: palette.bg,
        color: palette.ink,
        minHeight: '100%',
        containerType: 'inline-size',
        fontFamily: '"Oswald", system-ui, sans-serif',
        backgroundImage: `
          radial-gradient(rgba(0,0,0,0.18) 1px, transparent 1px),
          repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0 2px, transparent 2px 4px)
        `,
        backgroundSize: '4px 4px, auto',
        height: isKioskMode ? '100%' : undefined,
        display: 'flex',
        flexDirection: 'column',
        overflow: isKioskMode ? 'hidden' : undefined,
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: palette.bg,
          flexShrink: isKioskMode ? 0 : undefined,
        }}
      >
        <LinescoreCard
          game={game}
          palette={palette}
          topInset={topInset}
          connectionState={connectionState}
          readerHealth={readerHealth}
        />
        {tapToast && (
          <TapToastCard
            key={`tap-toast-${tapToast.eventId}`}
            palette={palette}
            playerName={tapToast.playerName}
            station={tapToast.station}
            delta={tapToast.delta}
            topInset={topInset}
          />
        )}
        {hasParticipants && <ColumnHeader palette={palette} />}
      </div>

      {isKioskMode ? (
        <>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              background: palette.bg,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {hasParticipants ? (
              <>
                {sorted[0] && (
                  <ParticipantRow
                    key={sorted[0].uid ?? sorted[0].name}
                    participant={sorted[0]}
                    rank={0}
                    palette={palette}
                    refSet={noopRefSet}
                    hotName={hotName}
                    showTopHighlight={showTopHighlight}
                  />
                )}

                <div
                  ref={autoScroll.viewportRef}
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden',
                    position: 'relative',
                    borderBottom: `1px solid ${palette.line}`,
                  }}
                >
                  <div
                    ref={autoScroll.trackRef}
                    style={{
                      willChange: autoScroll.shouldLoop ? 'transform' : undefined,
                    }}
                  >
                    <div ref={autoScroll.listRef}>
                      {scrollingRows.map((participant, index) => (
                        <ParticipantRow
                          key={participant.uid ?? participant.name}
                          participant={participant}
                          rank={index + 1}
                          palette={palette}
                          refSet={noopRefSet}
                          hotName={hotName}
                          showTopHighlight={false}
                        />
                      ))}
                    </div>
                    {autoScroll.shouldLoop && scrollingRows.length > 1 && (
                      <div aria-hidden>
                        {scrollingRows.map((participant, index) => (
                          <ParticipantRow
                            key={`${participant.uid ?? participant.name}-loop`}
                            participant={participant}
                            rank={index + 1}
                            palette={palette}
                            refSet={noopRefSet}
                            hotName={hotName}
                            showTopHighlight={false}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <EmptyStatePanel game={game} palette={palette} />
            )}
          </div>

          <div style={{ flexShrink: 0 }}>
            <Footer
              palette={palette}
              qrUrl={qrUrl}
              showQrUrl={showQrUrl}
              showQrCode={showQrCode}
            />
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              background: palette.bg,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {hasParticipants ? (
              sorted.map((participant, index) => (
                <ParticipantRow
                  key={participant.name}
                  participant={participant}
                  rank={index}
                  palette={palette}
                  refSet={refSet}
                  hotName={hotName}
                  showTopHighlight={showTopHighlight}
                />
              ))
            ) : (
              <EmptyStatePanel game={game} palette={palette} />
            )}
          </div>

          <Footer
            palette={palette}
            qrUrl={qrUrl}
            showQrUrl={showQrUrl}
            showQrCode={showQrCode}
          />
        </>
      )}
    </div>
  );
}

function noopRefSet() {
  return () => {};
}
