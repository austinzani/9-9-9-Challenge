/** Team totals in linescore payload shape. */
export interface TeamTotals {
  away: number;
  home: number;
}

/** Inning-by-inning runs for away/home clubs. */
export interface InningRuns {
  away: Array<number | null>;
  home: Array<number | null>;
}

/** MLB game shape consumed by the scoreboard header. */
export interface GameState {
  awayAbbr: string;
  awayName: string;
  homeAbbr: string;
  homeName: string;
  innings: InningRuns;
  R: TeamTotals;
  H: TeamTotals;
  E: TeamTotals;
  inningOrdinal: string;
  inningState: 'Top' | 'Bottom' | 'Middle' | 'End';
  abstractState: string;
  scheduledStart?: string | null;
  scheduledTimeZone?: string | null;
  venueName?: string | null;
}

/** Participant counts for the 9-9-9 challenge. */
export interface Participant {
  uid?: string;
  name: string;
  hotdogs: number;
  beers: number;
}

/** Reader online/offline health for header pills. */
export interface ReaderHealth {
  hotdogOnline?: boolean;
  beerOnline?: boolean;
}

/** Runtime connection state shown near the header label. */
export type ConnectionState = 'connected' | 'disconnected';
