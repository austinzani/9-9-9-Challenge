import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import { Scoreboard } from '@challenge/scoreboard-ui';

import { INITIAL_GAME, INITIAL_PARTICIPANTS } from './mockData';
import { RegistrationModal } from './RegistrationModal';
import { useScoreboardSocket } from './useScoreboardSocket';

/** Thin view shell around the live scoreboard socket hook. */
export function App() {
  const {
    game,
    participants,
    connectionState,
    readerHealth,
    registration,
    hotName,
    celebrationName,
    registerParticipant,
  } = useScoreboardSocket({
    initialGame: INITIAL_GAME,
    initialParticipants: INITIAL_PARTICIPANTS,
  });

  const isKioskMode = useMemo(() => {
    const mode = new URLSearchParams(window.location.search).get('mode');
    return mode === 'kiosk';
  }, []);
  const [scoreboardScale, setScoreboardScale] = useState(() =>
    calculateScoreboardScale(window.innerWidth, window.innerHeight, isKioskMode)
  );

  const topInset = 12;
  const shellStyle = useMemo(
    () =>
      ({
        '--scoreboard-scale': scoreboardScale,
      }) as CSSProperties,
    [scoreboardScale]
  );

  useEffect(() => {
    const updateScale = () => {
      setScoreboardScale(calculateScoreboardScale(window.innerWidth, window.innerHeight, isKioskMode));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isKioskMode]);

  return (
    <>
      <div id="scoreboard-shell" className={isKioskMode ? 'kiosk' : undefined} style={shellStyle}>
        <div className="scoreboard-scroll">
          <Scoreboard
            participants={participants}
            game={game}
            showTopHighlight
            qrUrl="999.austinzani.dev"
            showQrUrl={!isKioskMode}
            showQrCode={isKioskMode}
            connectionState={connectionState}
            readerHealth={readerHealth}
            topInset={topInset}
            hotName={hotName}
          />
        </div>
      </div>

      {celebrationName && (
        <div className="celebration-overlay" aria-live="polite">
          <div className="celebration-banner">{celebrationName} HIT 9·9·9!</div>
          <div className="celebration-confetti">
            {Array.from({ length: 20 }).map((_, index) => (
              <span key={index} />
            ))}
          </div>
        </div>
      )}

      {registration && (
        <RegistrationModal
          uid={registration.uid}
          station={registration.station}
          hotdogPending={registration.hotdogPending}
          beerPending={registration.beerPending}
          onSubmit={registerParticipant}
        />
      )}
    </>
  );
}

function calculateScoreboardScale(width: number, height: number, isKioskMode: boolean) {
  const growth = Math.min(width / 1920, height / 1080);
  const extraGrowth = Math.max(0, growth - 1);

  if (isKioskMode) {
    // Keep 1080p baseline stable, then scale up aggressively on large displays.
    const boostedGrowth = extraGrowth * 0.85 + extraGrowth * extraGrowth * 0.55;
    return clamp(1.35 + boostedGrowth, 1.35, 2.35);
  }

  return clamp(1 + extraGrowth * 0.3, 1, 1.48);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
