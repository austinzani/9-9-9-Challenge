import { useMemo, type CSSProperties } from 'react';

import { ColumnHeader } from './ColumnHeader';
import { Footer } from './Footer';
import { LinescoreCard } from './LinescoreCard';
import { PALETTES } from './palettes';
import { ParticipantRow } from './ParticipantRow';
import type { ConnectionState, GameState, Participant, ReaderHealth } from './types';
import { useRowFlip } from './useRowFlip';

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

  const refSet = useRowFlip(sorted);

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
      }}
    >
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: palette.bg }}>
        <LinescoreCard
          game={game}
          palette={palette}
          topInset={topInset}
          connectionState={connectionState}
          readerHealth={readerHealth}
        />
        <ColumnHeader palette={palette} />
      </div>

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
    </div>
  );
}
