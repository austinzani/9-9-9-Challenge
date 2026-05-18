import { useMemo } from 'react';

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
    registration,
    hotName,
    registerParticipant,
  } = useScoreboardSocket({
    initialGame: INITIAL_GAME,
    initialParticipants: INITIAL_PARTICIPANTS,
  });

  const topInset = useMemo(() => {
    const mode = new URLSearchParams(window.location.search).get('mode');
    return mode === 'kiosk' ? 12 : 54;
  }, []);

  return (
    <>
      <div id="stage">
        <div id="phone-preview">
          <div className="phone-scroll">
            <Scoreboard
              participants={participants}
              game={game}
              showTopHighlight
              qrUrl="999.austinzani.dev"
              connectionState={connectionState}
              topInset={topInset}
              hotName={hotName}
            />
          </div>
        </div>
      </div>

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
