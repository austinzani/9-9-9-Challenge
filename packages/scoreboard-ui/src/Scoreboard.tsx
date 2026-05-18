import { useMemo } from 'react';

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
  topInset = 54,
}: ScoreboardProps) {
  const palette = PALETTES.green;

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
        background: palette.bg,
        color: palette.ink,
        minHeight: '100%',
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

      <Footer palette={palette} qrUrl={qrUrl} />
    </div>
  );
}
