import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { type ConnectionState, type GameState, type Participant } from '@challenge/scoreboard-ui';

interface StatePayload {
  game: GameState;
  participants: Participant[];
}

export interface RegistrationNeededPayload {
  uid: string;
  station: 'hotdog' | 'beer';
  hotdogPending: number;
  beerPending: number;
}

interface SocketState {
  game: GameState;
  participants: Participant[];
  connectionState: ConnectionState;
  registration: RegistrationNeededPayload | null;
  hotUid: string | null;
}

type Action =
  | { type: 'hydrate'; payload: StatePayload }
  | { type: 'socket_open' }
  | { type: 'socket_closed' }
  | { type: 'tap'; uid: string }
  | { type: 'tap_clear' }
  | { type: 'registration_needed'; payload: RegistrationNeededPayload }
  | { type: 'registration_resolved'; uid: string };

const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const API_STATE_URL = `${API_BASE}/api/state`;
const API_REGISTER_URL = `${API_BASE}/api/register`;

function reducer(state: SocketState, action: Action): SocketState {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        game: action.payload.game,
        participants: action.payload.participants,
      };
    case 'socket_open':
      return {
        ...state,
        connectionState: 'connected',
      };
    case 'socket_closed':
      return {
        ...state,
        connectionState: 'disconnected',
      };
    case 'tap':
      return {
        ...state,
        hotUid: action.uid,
      };
    case 'tap_clear':
      return {
        ...state,
        hotUid: null,
      };
    case 'registration_needed':
      return {
        ...state,
        registration: action.payload,
      };
    case 'registration_resolved':
      if (!state.registration || state.registration.uid !== action.uid) {
        return state;
      }
      return {
        ...state,
        registration: null,
      };
    default:
      return state;
  }
}

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

interface UseScoreboardSocketOptions {
  initialGame: GameState;
  initialParticipants: Participant[];
}

/**
 * Owns API bootstrap and WebSocket synchronization for scoreboard clients.
 *
 * Reconnects with exponential backoff and keeps the registration modal state in
 * sync across all connected devices.
 */
export function useScoreboardSocket(options: UseScoreboardSocketOptions) {
  const [state, dispatch] = useReducer(reducer, {
    game: options.initialGame,
    participants: options.initialParticipants,
    connectionState: 'disconnected' as ConnectionState,
    registration: null,
    hotUid: null,
  });

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const isDisposedRef = useRef(false);

  const connectSocket = useCallback(() => {
    if (isDisposedRef.current) {
      return;
    }

    const socket = new WebSocket(makeSocketUrl());
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      reconnectAttemptRef.current = 0;
      dispatch({ type: 'socket_open' });
    });

    socket.addEventListener('close', () => {
      dispatch({ type: 'socket_closed' });

      if (isDisposedRef.current) {
        return;
      }

      const delayMs = Math.min(1000 * 2 ** reconnectAttemptRef.current, 30000);
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = window.setTimeout(() => {
        connectSocket();
      }, delayMs);
    });

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type: string;
          [key: string]: unknown;
        };

        if (payload.type === 'state' && 'state' in payload) {
          dispatch({ type: 'hydrate', payload: payload.state as StatePayload });
          return;
        }

        if (payload.type === 'tap' && 'tap' in payload) {
          const tap = payload.tap as { uid: string };
          dispatch({ type: 'tap', uid: tap.uid });
          window.setTimeout(() => dispatch({ type: 'tap_clear' }), 1200);
          return;
        }

        if (payload.type === 'registration_needed' && 'registration' in payload) {
          dispatch({
            type: 'registration_needed',
            payload: payload.registration as RegistrationNeededPayload,
          });
          return;
        }

        if (payload.type === 'registration_resolved' && 'registration' in payload) {
          const registrationResolved = payload.registration as { uid: string };
          dispatch({ type: 'registration_resolved', uid: registrationResolved.uid });
        }
      } catch {
        // Ignore malformed messages to keep socket handling resilient.
      }
    });
  }, []);

  useEffect(() => {
    isDisposedRef.current = false;

    void (async () => {
      try {
        const response = await fetch(API_STATE_URL);
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as StatePayload;
        dispatch({ type: 'hydrate', payload });
      } catch {
        // Socket re-sync will recover state if initial REST fetch fails.
      }
    })();

    connectSocket();

    return () => {
      isDisposedRef.current = true;

      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [connectSocket]);

  const registerParticipant = useCallback(async (name: string) => {
    if (!state.registration) {
      return;
    }

    const response = await fetch(API_REGISTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid: state.registration.uid, name }),
    });

    if (!response.ok) {
      throw new Error(`Registration failed with ${response.status}`);
    }
  }, [state.registration]);

  const hotName = useMemo(() => {
    if (!state.hotUid) {
      return null;
    }
    return state.participants.find((participant) => participant.uid === state.hotUid)?.name ?? null;
  }, [state.hotUid, state.participants]);

  return {
    game: state.game,
    participants: state.participants,
    connectionState: state.connectionState,
    registration: state.registration,
    hotName,
    registerParticipant,
  };
}
