import { FlipNumber } from './FlipNumber';
import type { Palette } from './palettes';
import type { Participant } from './types';

interface ParticipantRowProps {
  participant: Participant;
  rank: number;
  palette: Palette;
  refSet: (name: string) => (element: HTMLDivElement | null) => void;
  hotName?: string | null;
  showTopHighlight?: boolean;
}

/** One leaderboard row with rank, counts, and completion badge. */
export function ParticipantRow({
  participant,
  rank,
  palette,
  refSet,
  hotName,
  showTopHighlight = true,
}: ParticipantRowProps) {
  const total = participant.hotdogs + participant.beers;
  const isLeader = rank === 0;
  const complete = participant.hotdogs >= 9 && participant.beers >= 9;
  const isHot = hotName === participant.name;

  return (
    <div
      ref={refSet(participant.name)}
      style={{
        display: 'grid',
        gridTemplateColumns: 'var(--scoreboard-grid-template)',
        alignItems: 'center',
        padding: 'var(--scoreboard-row-pad-y) var(--scoreboard-grid-pad-x)',
        borderBottom: `1px solid ${palette.line}`,
        background:
          showTopHighlight && isLeader
            ? `linear-gradient(90deg, ${palette.gold}22 0%, transparent 80%)`
            : 'transparent',
        position: 'relative',
        transition: 'background 0.4s ease',
      }}
    >
      <div
        style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: 'var(--scoreboard-rank-size)',
          color: isLeader ? palette.gold : palette.inkDim,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {String(rank + 1).padStart(2, '0')}
      </div>

      <div
        style={{
          fontFamily: '"Big Shoulders Stencil Display", "Oswald", sans-serif',
          fontWeight: 600,
          fontSize: 'var(--scoreboard-name-size)',
          lineHeight: 1,
          color: palette.ink,
          letterSpacing: '0.01em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--scoreboard-name-gap)',
        }}
      >
        <span style={{ textShadow: isLeader ? `0 0 14px ${palette.gold}44` : 'none' }}>
          {participant.name}
        </span>
        {complete && (
          <span
            style={{
              fontFamily: '"DM Mono", monospace',
              fontSize: 'var(--scoreboard-badge-size)',
              letterSpacing: '0.16em',
              color: palette.bg,
              background: palette.gold,
              padding: 'var(--scoreboard-badge-padding)',
              borderRadius: 0,
            }}
          >
            9·9·9
          </span>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <FlipNumber
          value={participant.hotdogs}
          color={palette.ink}
          size="var(--scoreboard-number-size)"
          hot={isHot}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <FlipNumber
          value={participant.beers}
          color={palette.ink}
          size="var(--scoreboard-number-size)"
          hot={isHot}
        />
      </div>

      <div
        style={{
          textAlign: 'center',
          borderLeft: `1px solid ${palette.line}`,
          background: isLeader ? palette.gold : 'transparent',
          color: isLeader ? palette.bg : palette.ink,
          padding: 'var(--scoreboard-total-pad-y) 0',
        }}
      >
        <FlipNumber
          value={total}
          color={isLeader ? palette.bg : palette.gold}
          size="var(--scoreboard-number-size)"
        />
      </div>
    </div>
  );
}
