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
        gridTemplateColumns:
          'clamp(28px, 2.8cqi, 96px) 1fr clamp(54px, 5.2cqi, 152px) clamp(54px, 5.2cqi, 152px) clamp(54px, 5.2cqi, 152px)',
        alignItems: 'center',
        padding: 'clamp(8px, 1.2cqi, 32px) clamp(12px, 1.6cqi, 40px)',
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
          fontSize: 'clamp(12px, 1.3cqi, 34px)',
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
          fontSize: 'clamp(24px, 2.8cqi, 84px)',
          lineHeight: 1,
          color: palette.ink,
          letterSpacing: '0.01em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(8px, 0.9cqi, 24px)',
        }}
      >
        <span style={{ textShadow: isLeader ? `0 0 14px ${palette.gold}44` : 'none' }}>
          {participant.name}
        </span>
        {complete && (
          <span
            style={{
              fontFamily: '"DM Mono", monospace',
              fontSize: 'clamp(9px, 0.95cqi, 24px)',
              letterSpacing: '0.16em',
              color: palette.bg,
              background: palette.gold,
              padding: 'clamp(2px, 0.3cqi, 8px) clamp(5px, 0.5cqi, 14px)',
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
          size="clamp(32px, 3.4cqi, 94px)"
          hot={isHot}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <FlipNumber
          value={participant.beers}
          color={palette.ink}
          size="clamp(32px, 3.4cqi, 94px)"
          hot={isHot}
        />
      </div>

      <div
        style={{
          textAlign: 'center',
          background: isLeader ? palette.gold : 'transparent',
          color: isLeader ? palette.bg : palette.ink,
          padding: 'clamp(4px, 0.5cqi, 14px) 0',
          margin: '0 0 0 clamp(6px, 0.7cqi, 18px)',
        }}
      >
        <FlipNumber
          value={total}
          color={isLeader ? palette.bg : palette.gold}
          size="clamp(32px, 3.4cqi, 94px)"
        />
      </div>
    </div>
  );
}
