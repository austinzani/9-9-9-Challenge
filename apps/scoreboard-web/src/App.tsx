import { useCallback, useEffect, useMemo, useState } from 'react';

import { Scoreboard, type ConnectionState, type GameState, type Participant } from '@challenge/scoreboard-ui';

import { INITIAL_GAME, INITIAL_PARTICIPANTS } from './mockData';
import { RegistrationModal } from './RegistrationModal';

interface StatePayload {
  game: GameState;
  participants: Participant[];
}

interface RegistrationNeededPayload {
  uid: string;
  station: 'hotdog' | 'beer';
  hotdogPending: number;
  beerPending: number;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const API_STATE_URL = `${API_BASE}/api/state`;
const API_REGISTER_URL = `${API_BASE}/api/register`;

function makeSocketUrl(): string {
  if (API_BASE.startsWith('https://')) {
    return `${API_BASE.replace('https://', 'wss://')}/ws`;
  }
  if (API_BASE.startsWith('http://')) {
    return `${API_BASE.replace('http://', 'ws://')}/ws`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws`;
}

/** Thin app shell that handles state hydration + registration events. */
export function App() {
  const [state, setState] = useState<StatePayload>({
    game: INITIAL_GAME,
    participants: INITIAL_PARTICIPANTS,
  });
  const [hotUid, setHotUid] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [registration, setRegistration] = useState<RegistrationNeededPayload | null>(null);

  useEffect(() => {
    let active = true;

    async function loadState() {
      try {
        const response = await fetch(API_STATE_URL);
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as StatePayload;
        if (active) {
          setState(payload);
        }
      } catch {
        // WebSocket flow can still hydrate state after initial load failure.
      }
    }

    void loadState();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const socket = new WebSocket(makeSocketUrl());

    socket.addEventListener('open', () => {
      setConnectionState('connected');
    });

    socket.addEventListener('close', () => {
      setConnectionState('disconnected');
    });

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type: string;
          [key: string]: unknown;
        };

        if (payload.type === 'state' && 'state' in payload) {
          setState(payload.state as StatePayload);
          return;
        }

        if (payload.type === 'tap' && 'tap' in payload) {
          const tap = payload.tap as { uid: string };
          setHotUid(tap.uid);
          window.setTimeout(() => setHotUid(null), 1200);
          return;
        }

        if (payload.type === 'registration_needed' && 'registration' in payload) {
          setRegistration(payload.registration as RegistrationNeededPayload);
          return;
        }

        if (payload.type === 'registration_resolved' && 'registration' in payload) {
          const registrationResolved = payload.registration as { uid: string };
          setRegistration((previous) => {
            if (!previous || previous.uid !== registrationResolved.uid) {
              return previous;
            }
            return null;
          });
        }
      } catch {
        // Ignore malformed WS payloads.
      }
    });

    return () => {
      socket.close();
    };
  }, []);

  const submitRegistration = useCallback(
    async (name: string) => {
      if (!registration) {
        return;
      }

      const response = await fetch(API_REGISTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: registration.uid, name }),
      });

      if (!response.ok) {
        throw new Error(`Registration failed with ${response.status}`);
      }
    },
    [registration]
  );

  const topInset = useMemo(() => {
    const mode = new URLSearchParams(window.location.search).get('mode');
    return mode === 'kiosk' ? 12 : 54;
  }, []);

  const hotName = useMemo(() => {
    if (!hotUid) {
      return null;
    }
    return state.participants.find((participant) => participant.uid === hotUid)?.name ?? null;
  }, [hotUid, state.participants]);

  return (
    <>
      <div id="stage">
        <div id="phone-preview">
          <div className="phone-scroll">
            <Scoreboard
              participants={state.participants}
              game={state.game}
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
          onSubmit={submitRegistration}
        />
      )}
    </>
  );
}
