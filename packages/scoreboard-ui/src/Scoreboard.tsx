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
  const leaderboardGridTemplate =
    'clamp(32px, calc(3.1cqi * var(--scoreboard-scale, 1)), calc(104px * var(--scoreboard-scale, 1))) minmax(0, 1fr) clamp(58px, calc(5.6cqi * var(--scoreboard-scale, 1)), calc(162px * var(--scoreboard-scale, 1))) clamp(58px, calc(5.6cqi * var(--scoreboard-scale, 1)), calc(162px * var(--scoreboard-scale, 1))) clamp(58px, calc(5.6cqi * var(--scoreboard-scale, 1)), calc(162px * var(--scoreboard-scale, 1)))';
  const linescoreGridTemplate =
    'minmax(clamp(52px, calc(5.2cqi * var(--scoreboard-scale, 1)), calc(152px * var(--scoreboard-scale, 1))), 1.35fr) repeat(9, minmax(clamp(20px, calc(2cqi * var(--scoreboard-scale, 1)), calc(60px * var(--scoreboard-scale, 1))), 1fr)) repeat(3, minmax(clamp(24px, calc(2.35cqi * var(--scoreboard-scale, 1)), calc(72px * var(--scoreboard-scale, 1))), 1.12fr))';
  const layoutVars: CSSProperties = {
    '--scoreboard-grid-template': leaderboardGridTemplate,
    '--scoreboard-linescore-template': linescoreGridTemplate,
    '--scoreboard-grid-pad-x':
      'clamp(12px, calc(1.6cqi * var(--scoreboard-scale, 1)), calc(44px * var(--scoreboard-scale, 1)))',
    '--scoreboard-row-pad-y':
      'clamp(8px, calc(1.2cqi * var(--scoreboard-scale, 1)), calc(32px * var(--scoreboard-scale, 1)))',
    '--scoreboard-header-pad-y':
      'clamp(10px, calc(1.2cqi * var(--scoreboard-scale, 1)), calc(36px * var(--scoreboard-scale, 1)))',
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
        display: isKioskMode ? 'flex' : undefined,
        flexDirection: isKioskMode ? 'column' : undefined,
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
        <ColumnHeader palette={palette} />
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
          <div style={{ background: palette.bg }}>
            {sorted.map((participant, index) => (
              <ParticipantRow
                key={participant.name}
                participant={participant}
                rank={index}
                palette={palette}
                refSet={refSet}
                hotName={hotName}
                showTopHighlight={showTopHighlight}
              />
            ))}
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
