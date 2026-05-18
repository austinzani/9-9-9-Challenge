// scoreboard.jsx — old-school manual scoreboard for the 9-9-9 challenge
// Phone-vertical layout. Sticky game-state header + sticky column header + sorted leaderboard.

const { useState, useEffect, useRef, useLayoutEffect } = React;

// ─────────────────────────────────────────────────────────────
// Palettes — keyed off Tweak `palette`
// ─────────────────────────────────────────────────────────────
const PALETTES = {
  green: {
    name: 'Outfield Green',
    bg: '#1d4233',
    panel: '#234c3a',
    panelDeep: '#173527',
    line: '#0e2419',
    ink: '#f0e6c8',
    inkDim: '#c9b988',
    gold: '#d6a23a',
    goldDeep: '#8a6722',
    accent: '#c8102e',
    accentInk: '#f0e6c8',
    boxBg: '#0e2419',
    boxInk: '#f0e6c8',
  },
  charcoal: {
    name: 'Charcoal Night',
    bg: '#1c1c1e',
    panel: '#252527',
    panelDeep: '#101011',
    line: '#0a0a0b',
    ink: '#ece3c9',
    inkDim: '#9c9079',
    gold: '#e0b14a',
    goldDeep: '#8a6722',
    accent: '#c8102e',
    accentInk: '#ece3c9',
    boxBg: '#0a0a0b',
    boxInk: '#ece3c9',
  },
  brick: {
    name: 'Brick & Cream',
    bg: '#5a2422',
    panel: '#6a2c2a',
    panelDeep: '#3f1817',
    line: '#2a0f0e',
    ink: '#f3e7c9',
    inkDim: '#c9af83',
    gold: '#e6b955',
    goldDeep: '#8a6722',
    accent: '#0b3d2e',
    accentInk: '#f3e7c9',
    boxBg: '#2a0f0e',
    boxInk: '#f3e7c9',
  },
};

// ─────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────
const INITIAL_GAME = {
  awayAbbr: 'CHC',
  awayName: 'CUBS',
  homeAbbr: 'CIN',
  homeName: 'REDS',
  innings: {
    // index 0 = 1st inning
    away: [0, 0, 3, 0, 0, null, null, null, null],
    home: [0, 2, 0, 1, 0, null, null, null, null],
  },
  R: { away: 3, home: 3 },
  H: { away: 5, home: 6 },
  E: { away: 0, home: 1 },
  inningOrdinal: '6th',
  inningState: 'Bottom', // Top | Bottom | Middle | End
  abstractState: 'Live',
};

const INITIAL_PARTICIPANTS = [
  { name: 'Austin',    hotdogs: 3, beers: 4 },
  { name: 'Aron',      hotdogs: 2, beers: 4 },
  { name: 'Jefferson', hotdogs: 1, beers: 3 },
  { name: 'Maddie',    hotdogs: 2, beers: 2 },
  { name: 'Tyler',     hotdogs: 1, beers: 2 },
  { name: 'Sam',       hotdogs: 0, beers: 3 },
  { name: 'Priya',     hotdogs: 1, beers: 1 },
  { name: 'Marcus',    hotdogs: 0, beers: 2 },
  { name: 'Lena',      hotdogs: 0, beers: 1 },
  { name: 'Kev',       hotdogs: 0, beers: 0 },
];

// ─────────────────────────────────────────────────────────────
// FLIP animation hook — animates row reorder when sort changes
// ─────────────────────────────────────────────────────────────
function useRowFlip(participants) {
  const refs = useRef({});
  const prev = useRef({});

  // Measure BEFORE paint
  useLayoutEffect(() => {
    const next = {};
    Object.entries(refs.current).forEach(([name, el]) => {
      if (el) next[name] = el.getBoundingClientRect().top;
    });
    Object.entries(next).forEach(([name, top]) => {
      const wasTop = prev.current[name];
      const el = refs.current[name];
      if (wasTop != null && el && wasTop !== top) {
        const dy = wasTop - top;
        el.animate(
          [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }],
          { duration: 480, easing: 'cubic-bezier(.22,.61,.36,1)' }
        );
      }
    });
    prev.current = next;
  }, [participants]);

  return (name) => (el) => { refs.current[name] = el; };
}

// ─────────────────────────────────────────────────────────────
// Flipping number (subtle scoreboard card flip)
// ─────────────────────────────────────────────────────────────
function FlipNumber({ value, color, size = 44, hot }) {
  const [display, setDisplay] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const last = useRef(value);

  useEffect(() => {
    if (value !== last.current) {
      setFlipping(true);
      const t = setTimeout(() => { setDisplay(value); setFlipping(false); last.current = value; }, 160);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span style={{
      display: 'inline-block',
      fontFamily: '"Big Shoulders Display", "Oswald", sans-serif',
      fontWeight: 800,
      fontSize: size,
      lineHeight: 1,
      color: color,
      letterSpacing: '-0.01em',
      transform: flipping ? 'rotateX(90deg) scaleY(0.9)' : 'rotateX(0) scaleY(1)',
      transformOrigin: 'center',
      transition: 'transform 0.16s cubic-bezier(.5,0,.5,1)',
      textShadow: hot ? `0 0 12px ${color}55` : 'none',
      fontVariantNumeric: 'tabular-nums',
    }}>{display}</span>
  );
}

// ─────────────────────────────────────────────────────────────
// Hot dog + beer SVG glyphs (no emoji; painted/screen-printed feel)
// ─────────────────────────────────────────────────────────────
function HotdogIcon({ size = 26, color = '#f0e6c8' }) {
  return (
    <svg width={size} height={size * 0.65} viewBox="0 0 40 26" style={{ display: 'block' }}>
      {/* bun */}
      <rect x="2" y="6" width="36" height="14" rx="7" fill="none" stroke={color} strokeWidth="2.2"/>
      {/* sausage */}
      <rect x="6" y="9" width="28" height="8" rx="4" fill={color}/>
      {/* mustard zigzag */}
      <path d="M8 13 L12 11 L16 13 L20 11 L24 13 L28 11 L32 13"
            fill="none" stroke="#1d4233" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BeerIcon({ size = 26, color = '#f0e6c8' }) {
  return (
    <svg width={size * 0.85} height={size} viewBox="0 0 28 32" style={{ display: 'block' }}>
      {/* mug body */}
      <rect x="3" y="6" width="17" height="22" rx="1.5" fill="none" stroke={color} strokeWidth="2.2"/>
      {/* handle */}
      <path d="M20 11 h3 a3 3 0 0 1 3 3 v4 a3 3 0 0 1 -3 3 h-3"
            fill="none" stroke={color} strokeWidth="2.2"/>
      {/* foam */}
      <path d="M3 9 Q 6 5 9 7 Q 12 4 15 7 Q 18 5 20 8"
            fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      {/* beer fill lines */}
      <line x1="6" y1="14" x2="17" y2="14" stroke={color} strokeWidth="1.3"/>
      <line x1="6" y1="19" x2="17" y2="19" stroke={color} strokeWidth="1.3"/>
      <line x1="6" y1="24" x2="17" y2="24" stroke={color} strokeWidth="1.3"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Inning indicator triangle
// ─────────────────────────────────────────────────────────────
function InningArrow({ state, color }) {
  const up = state === 'Top';
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <path d={up ? 'M7 2 L12 11 L2 11 Z' : 'M7 12 L12 3 L2 3 Z'} fill={color}/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Game-state header — Compact (default) and Linescore variants
// ─────────────────────────────────────────────────────────────
function CompactGameCard({ game, p }) {
  const winningSide = game.R.home > game.R.away ? 'home' : game.R.away > game.R.home ? 'away' : null;
  return (
    <div style={{
      background: p.panelDeep,
      borderBottom: `2px solid ${p.line}`,
      padding: '58px 16px 12px',
      fontFamily: '"Big Shoulders Stencil Display", "Oswald", sans-serif',
    }}>
      {/* Top label row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: '"DM Mono", "JetBrains Mono", monospace',
        fontSize: 10, letterSpacing: '0.18em', color: p.inkDim, marginBottom: 10,
      }}>
        <span>{game.abstractState === 'Live' ? '● LIVE' : game.abstractState.toUpperCase()}</span>
        <span>GABP · CIN vs CHC</span>
      </div>

      {/* Score row */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
        {/* Teams stacked left */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <TeamLine abbr={game.awayAbbr} name={game.awayName} runs={game.R.away}
                    dim={winningSide === 'home'} p={p} />
          <TeamLine abbr={game.homeAbbr} name={game.homeName} runs={game.R.home}
                    dim={winningSide === 'away'} p={p} accent />
        </div>

        {/* Inning indicator */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '0 4px 0 14px',
          borderLeft: `1px dashed ${p.line}`,
          marginLeft: 12, minWidth: 70,
        }}>
          <InningArrow state={game.inningState} color={p.gold} />
          <div style={{
            fontFamily: '"Big Shoulders Stencil Display", sans-serif',
            fontWeight: 700, fontSize: 28, lineHeight: 1, color: p.gold, marginTop: 4,
          }}>{game.inningOrdinal.toUpperCase()}</div>
          <div style={{
            fontFamily: '"DM Mono", monospace', fontSize: 9, letterSpacing: '0.2em',
            color: p.inkDim, marginTop: 4,
          }}>{game.inningState.toUpperCase()}</div>
        </div>
      </div>

      {/* H/E micro-stats */}
      <div style={{
        marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${p.line}`,
        display: 'flex', justifyContent: 'space-between',
        fontFamily: '"DM Mono", monospace', fontSize: 10, letterSpacing: '0.14em',
        color: p.inkDim,
      }}>
        <span style={{ whiteSpace: 'nowrap' }}>R&nbsp;&nbsp;{game.R.away} / {game.R.home}</span>
        <span style={{ whiteSpace: 'nowrap' }}>H&nbsp;&nbsp;{game.H.away} / {game.H.home}</span>
        <span style={{ whiteSpace: 'nowrap' }}>E&nbsp;&nbsp;{game.E.away} / {game.E.home}</span>
      </div>
    </div>
  );
}

function TeamLine({ abbr, name, runs, dim, p, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: dim ? 0.55 : 1 }}>
      {/* color dot */}
      <div style={{
        width: 10, height: 10, borderRadius: 0,
        background: accent ? p.accent : p.ink,
        boxShadow: `inset 0 0 0 1px ${p.line}`,
      }} />
      <div style={{
        fontFamily: '"Big Shoulders Stencil Display", sans-serif',
        fontWeight: 700, fontSize: 28, lineHeight: 1, color: p.ink, letterSpacing: '0.02em',
        minWidth: 60,
      }}>{name}</div>
      <div style={{ flex: 1 }} />
      <div style={{
        fontFamily: '"Big Shoulders Display", sans-serif',
        fontWeight: 800, fontSize: 38, lineHeight: 1, color: p.ink,
        fontVariantNumeric: 'tabular-nums',
        marginRight: 4,
      }}>{runs}</div>
    </div>
  );
}

function LinescoreCard({ game, p }) {
  const inningNums = [1,2,3,4,5,6,7,8,9];
  const cell = (val, isTotal) => (
    <div style={{
      width: isTotal ? 24 : 20, height: 22,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: isTotal ? p.boxBg : 'transparent',
      color: isTotal ? p.gold : p.ink,
      fontFamily: '"Big Shoulders Display", sans-serif',
      fontWeight: 700, fontSize: 16, lineHeight: 1,
      fontVariantNumeric: 'tabular-nums',
      borderRight: `1px solid ${p.line}`,
    }}>{val == null ? '·' : val}</div>
  );

  const row = (label, scores, R, H, E, accent) => (
    <div style={{ display: 'flex', alignItems: 'center', borderTop: `1px solid ${p.line}` }}>
      <div style={{
        width: 48, height: 22, display: 'flex', alignItems: 'center', paddingLeft: 8,
        fontFamily: '"Big Shoulders Stencil Display", sans-serif',
        fontWeight: 700, fontSize: 16, color: p.ink,
        background: accent ? `${p.accent}33` : 'transparent',
        borderRight: `1px solid ${p.line}`,
      }}>{label}</div>
      {scores.map((s, i) => <React.Fragment key={i}>{cell(s)}</React.Fragment>)}
      {cell(R, true)}{cell(H, true)}{cell(E, true)}
    </div>
  );

  return (
    <div style={{ background: p.panelDeep, borderBottom: `2px solid ${p.line}`, padding: '54px 8px 10px' }}>
      {/* header label */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 6px 8px',
        fontFamily: '"DM Mono", monospace', fontSize: 10, letterSpacing: '0.18em', color: p.inkDim,
      }}>
        <span>● LIVE · {game.inningState.toUpperCase()} {game.inningOrdinal.toUpperCase()}</span>
        <span>GABP</span>
      </div>
      {/* inning number row */}
      <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${p.line}`, background: p.bg }}>
        <div style={{ width: 48, height: 18, borderRight: `1px solid ${p.line}` }} />
        {inningNums.map(n => (
          <div key={n} style={{
            width: 20, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"DM Mono", monospace', fontSize: 10, color: p.inkDim,
            borderRight: `1px solid ${p.line}`,
          }}>{n}</div>
        ))}
        {['R','H','E'].map(L => (
          <div key={L} style={{
            width: 24, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"DM Mono", monospace', fontSize: 10, color: p.gold, fontWeight: 700,
            borderRight: `1px solid ${p.line}`,
          }}>{L}</div>
        ))}
      </div>
      {/* team rows */}
      <div style={{ border: `1px solid ${p.line}`, borderTop: 'none', background: p.bg }}>
        {row(game.awayAbbr, game.innings.away, game.R.away, game.H.away, game.E.away, false)}
        {row(game.homeAbbr, game.innings.home, game.R.home, game.H.home, game.E.home, true)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Leaderboard row
// ─────────────────────────────────────────────────────────────
function ParticipantRow({ part, rank, p, refSet, hotName }) {
  const total = part.hotdogs + part.beers;
  const isLeader = rank === 0;
  const complete = part.hotdogs >= 9 && part.beers >= 9;
  const isHot = hotName === part.name;

  return (
    <div ref={refSet(part.name)} style={{
      display: 'grid',
      gridTemplateColumns: '28px 1fr 54px 54px 54px',
      alignItems: 'center',
      padding: '10px 14px',
      borderBottom: `1px solid ${p.line}`,
      background: isLeader ? `linear-gradient(90deg, ${p.gold}22 0%, transparent 80%)` : 'transparent',
      position: 'relative',
      transition: 'background 0.4s ease',
    }}>
      {/* rank */}
      <div style={{
        fontFamily: '"DM Mono", monospace',
        fontSize: 12, color: isLeader ? p.gold : p.inkDim, fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
      }}>{String(rank + 1).padStart(2, '0')}</div>

      {/* name */}
      <div style={{
        fontFamily: '"Big Shoulders Stencil Display", "Oswald", sans-serif',
        fontWeight: 600,
        fontSize: 24, lineHeight: 1, color: p.ink, letterSpacing: '0.01em',
        textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ textShadow: isLeader ? `0 0 14px ${p.gold}44` : 'none' }}>{part.name}</span>
        {complete && (
          <span style={{
            fontFamily: '"DM Mono", monospace', fontSize: 9, letterSpacing: '0.16em',
            color: p.bg, background: p.gold, padding: '2px 5px', borderRadius: 0,
          }}>9·9·9</span>
        )}
      </div>

      {/* hotdogs */}
      <div style={{ textAlign: 'center' }}>
        <FlipNumber value={part.hotdogs} color={p.ink} size={32} hot={isHot} />
      </div>

      {/* beers */}
      <div style={{ textAlign: 'center' }}>
        <FlipNumber value={part.beers} color={p.ink} size={32} hot={isHot} />
      </div>

      {/* total */}
      <div style={{
        textAlign: 'center',
        background: isLeader ? p.gold : 'transparent',
        color: isLeader ? p.bg : p.ink,
        padding: '4px 0',
        margin: '0 0 0 6px',
      }}>
        <FlipNumber value={total} color={isLeader ? p.bg : p.gold} size={32} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sticky column header
// ─────────────────────────────────────────────────────────────
function ColumnHeader({ p }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '28px 1fr 54px 54px 54px',
      alignItems: 'center',
      padding: '10px 14px 8px',
      background: p.panel,
      borderTop: `1px solid ${p.line}`,
      borderBottom: `2px solid ${p.line}`,
      boxShadow: `0 4px 0 0 ${p.bg}, 0 6px 10px -4px rgba(0,0,0,0.4)`,
    }}>
      <div style={{
        fontFamily: '"DM Mono", monospace', fontSize: 10, color: p.inkDim,
        letterSpacing: '0.18em',
      }}>#</div>
      <div style={{
        fontFamily: '"DM Mono", monospace', fontSize: 10, color: p.inkDim,
        letterSpacing: '0.18em',
      }}>PLAYER</div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <HotdogIcon color={p.ink} size={26} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <BeerIcon color={p.ink} size={22} />
      </div>
      <div style={{
        fontFamily: '"Big Shoulders Stencil Display", sans-serif',
        fontWeight: 700, color: p.gold, fontSize: 16, textAlign: 'center',
        letterSpacing: '0.04em', marginLeft: 6,
      }}>TOT</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Footer credit / event tag
// ─────────────────────────────────────────────────────────────
function Footer({ p, game }) {
  return (
    <div style={{
      padding: '16px 16px 28px',
      textAlign: 'center',
      fontFamily: '"DM Mono", monospace',
      fontSize: 10, letterSpacing: '0.18em', color: p.inkDim,
      borderTop: `1px solid ${p.line}`,
      background: p.panelDeep,
    }}>
      <div style={{ marginBottom: 4 }}>9·9·9 CHALLENGE — MAY 31, 2026</div>
      <div style={{ color: p.gold }}>999.AUSTINZANY.DEV</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main scoreboard
// ─────────────────────────────────────────────────────────────
function Scoreboard({ tweaks }) {
  const p = PALETTES[tweaks.palette] || PALETTES.green;
  const [participants, setParticipants] = useState(INITIAL_PARTICIPANTS);
  const [game] = useState(INITIAL_GAME);
  const [hotName, setHotName] = useState(null);
  const refSet = useRowFlip(participants);

  // Expose a simulator on the window for the Tweaks button
  useEffect(() => {
    window.__simulateTap = (type) => {
      // Pick a random non-leader to bump (more interesting reorder)
      const idx = Math.floor(Math.random() * participants.length);
      const target = participants[idx];
      setParticipants(prev => {
        const next = prev.map(x => x.name === target.name
          ? { ...x, [type === 'beer' ? 'beers' : 'hotdogs']: x[type === 'beer' ? 'beers' : 'hotdogs'] + 1 }
          : x);
        return next;
      });
      setHotName(target.name);
      setTimeout(() => setHotName(null), 1200);
    };
    return () => { delete window.__simulateTap; };
  }, [participants]);

  // Sort descending by total, then by hotdogs as tiebreaker
  const sorted = [...participants].sort((a, b) => {
    const ta = a.hotdogs + a.beers, tb = b.hotdogs + b.beers;
    if (tb !== ta) return tb - ta;
    if (b.hotdogs !== a.hotdogs) return b.hotdogs - a.hotdogs;
    return a.name.localeCompare(b.name);
  });

  return (
    <div style={{
      background: p.bg,
      color: p.ink,
      minHeight: '100%',
      fontFamily: '"Oswald", system-ui, sans-serif',
      // subtle painted-canvas texture
      backgroundImage: `
        radial-gradient(rgba(0,0,0,0.18) 1px, transparent 1px),
        repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0 2px, transparent 2px 4px)
      `,
      backgroundSize: '4px 4px, auto',
    }}>
      {/* Sticky header block — game card + column header travel together at top.
          z-index 5 < iOS status bar (z=10) so the time/icons stay legible. */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: p.bg }}>
        {tweaks.headerStyle === 'linescore'
          ? <LinescoreCard game={game} p={p} />
          : <CompactGameCard game={game} p={p} />}
        <ColumnHeader p={p} />
      </div>

      {/* Rows */}
      <div style={{ background: p.bg }}>
        {sorted.map((part, i) => (
          <ParticipantRow key={part.name} part={part} rank={i} p={p}
                          refSet={refSet} hotName={hotName} />
        ))}
      </div>

      <Footer p={p} game={game} />
    </div>
  );
}

window.Scoreboard = Scoreboard;
window.PALETTES = PALETTES;
