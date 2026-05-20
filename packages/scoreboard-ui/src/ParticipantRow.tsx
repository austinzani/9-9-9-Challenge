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
          fontSize:
            'clamp(12px, calc(1.3cqi * var(--scoreboard-scale, 1)), calc(34px * var(--scoreboard-scale, 1)))',
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
          fontSize:
            'clamp(24px, calc(2.8cqi * var(--scoreboard-scale, 1)), calc(84px * var(--scoreboard-scale, 1)))',
          lineHeight: 1,
          color: palette.ink,
          letterSpacing: '0.01em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(8px, calc(0.9cqi * var(--scoreboard-scale, 1)), calc(24px * var(--scoreboard-scale, 1)))',
        }}
      >
        <span style={{ textShadow: isLeader ? `0 0 14px ${palette.gold}44` : 'none' }}>
          {participant.name}
        </span>
        {complete && (
          <span
            style={{
              fontFamily: '"DM Mono", monospace',
              fontSize:
                'clamp(9px, calc(0.95cqi * var(--scoreboard-scale, 1)), calc(24px * var(--scoreboard-scale, 1)))',
              letterSpacing: '0.16em',
              color: palette.bg,
              background: palette.gold,
              padding:
                'clamp(2px, calc(0.3cqi * var(--scoreboard-scale, 1)), calc(8px * var(--scoreboard-scale, 1))) clamp(5px, calc(0.5cqi * var(--scoreboard-scale, 1)), calc(14px * var(--scoreboard-scale, 1)))',
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
          size="clamp(32px, calc(3.4cqi * var(--scoreboard-scale, 1)), calc(94px * var(--scoreboard-scale, 1)))"
          hot={isHot}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <FlipNumber
          value={participant.beers}
          color={palette.ink}
          size="clamp(32px, calc(3.4cqi * var(--scoreboard-scale, 1)), calc(94px * var(--scoreboard-scale, 1)))"
          hot={isHot}
        />
      </div>

      <div
        style={{
          textAlign: 'center',
          borderLeft: `1px solid ${palette.line}`,
          background: isLeader ? palette.gold : 'transparent',
          color: isLeader ? palette.bg : palette.ink,
          padding:
            'clamp(4px, calc(0.5cqi * var(--scoreboard-scale, 1)), calc(14px * var(--scoreboard-scale, 1))) 0',
        }}
      >
        <FlipNumber
          value={total}
          color={isLeader ? palette.bg : palette.gold}
          size="clamp(32px, calc(3.4cqi * var(--scoreboard-scale, 1)), calc(94px * var(--scoreboard-scale, 1)))"
        />
      </div>
    </div>
  );
}
