import type { GameState, Participant } from '@challenge/scoreboard-ui';

export const INITIAL_GAME: GameState = {
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
  scheduledStart: null,
  scheduledTimeZone: 'America/New_York',
  venueName: 'Great American Ball Park',
};

export const INITIAL_PARTICIPANTS: Participant[] = [
  { uid: 'mock-austin', name: 'Austin', hotdogs: 3, beers: 4 },
  { uid: 'mock-aron', name: 'Aron', hotdogs: 2, beers: 4 },
  { uid: 'mock-jefferson', name: 'Jefferson', hotdogs: 1, beers: 3 },
  { uid: 'mock-maddie', name: 'Maddie', hotdogs: 2, beers: 2 },
  { uid: 'mock-tyler', name: 'Tyler', hotdogs: 1, beers: 2 },
  { uid: 'mock-sam', name: 'Sam', hotdogs: 0, beers: 3 },
  { uid: 'mock-priya', name: 'Priya', hotdogs: 1, beers: 1 },
  { uid: 'mock-marcus', name: 'Marcus', hotdogs: 0, beers: 2 },
  { uid: 'mock-lena', name: 'Lena', hotdogs: 0, beers: 1 },
  { uid: 'mock-kev', name: 'Kev', hotdogs: 0, beers: 0 },
];
