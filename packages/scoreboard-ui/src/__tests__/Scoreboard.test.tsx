import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Scoreboard } from '../Scoreboard';
import type { GameState, Participant } from '../types';

const game: GameState = {
  awayAbbr: 'CHC',
  awayName: 'CUBS',
  homeAbbr: 'CIN',
  homeName: 'REDS',
  innings: {
    away: [0, 0, 3, 0, 0, null, null, null, null],
    home: [0, 2, 0, 1, 0, null, null, null, null],
  },
  R: { away: 3, home: 3 },
  H: { away: 5, home: 6 },
  E: { away: 0, home: 1 },
  inningOrdinal: '6th',
  inningState: 'Bottom',
  abstractState: 'Live',
};

const participants: Participant[] = [
  { uid: '1', name: 'Austin', hotdogs: 3, beers: 4 },
  { uid: '2', name: 'Aron', hotdogs: 2, beers: 4 },
  { uid: '3', name: 'Jefferson', hotdogs: 1, beers: 3 },
];

function renderAt(width: number, height: number) {
  const result = render(
    <div style={{ width, height }}>
      <Scoreboard participants={participants} game={game} showTopHighlight qrUrl="999.austinzani.dev" />
    </div>
  );
  return result.container.firstChild;
}

describe('Scoreboard snapshots', () => {
  it('matches phone viewport snapshot', () => {
    expect(renderAt(390, 844)).toMatchSnapshot();
  });

  it('matches 1080p viewport snapshot', () => {
    expect(renderAt(1920, 1080)).toMatchSnapshot();
  });

  it('matches 4k viewport snapshot', () => {
    expect(renderAt(3840, 2160)).toMatchSnapshot();
  });
});
