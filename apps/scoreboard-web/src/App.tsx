import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import { Scoreboard, type GameState } from '@challenge/scoreboard-ui';

import { INITIAL_GAME, INITIAL_PARTICIPANTS } from './mockData';
import { RegistrationModal } from './RegistrationModal';
import type { TapFeedback } from './useScoreboardSocket';
import { useScoreboardSocket } from './useScoreboardSocket';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const API_TAP_URL = `${API_BASE}/api/tap`;
const API_FORCE_REGISTER_URL = `${API_BASE}/api/admin/force-register`;
const DEBUG_MENU_ENABLED = parseBooleanFlag(import.meta.env.VITE_DEBUG_MENU);

interface TapVisualState {
  id: number;
  playerName: string;
  station: 'hotdog' | 'beer';
  delta: number;
}

interface BurstParticle {
  startDelayMs: number;
  lifetimeMs: number;
  velocityXPxPerSec: number;
  velocityYPxPerSec: number;
  gravityPxPerSec2: number;
  driftXPxPerSec2: number;
  rotationStartDeg: number;
  rotationVelocityDegPerSec: number;
  scale: number;
}

const EMOJI_FONT_STACK = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';

const PRODUCTION_FALLBACK_GAME: GameState = {
  awayAbbr: 'AWY',
  awayName: 'AWAY',
  homeAbbr: 'HME',
  homeName: 'HOME',
  innings: {
    away: [null, null, null, null, null, null, null, null, null],
    home: [null, null, null, null, null, null, null, null, null],
  },
  R: { away: 0, home: 0 },
  H: { away: 0, home: 0 },
  E: { away: 0, home: 0 },
  inningOrdinal: '1st',
  inningState: 'Top',
  abstractState: 'Preview',
  scheduledStart: null,
  scheduledTimeZone: null,
  venueName: null,
};

/** Thin view shell around the live scoreboard socket hook. */
export function App() {
  const initialGame = import.meta.env.DEV ? INITIAL_GAME : PRODUCTION_FALLBACK_GAME;
  const initialParticipants = import.meta.env.DEV ? INITIAL_PARTICIPANTS : [];

  const {
    game,
    participants,
    connectionState,
    readerHealth,
    registration,
    hotName,
    tapFeedback,
    celebrationName,
    registerParticipant,
  } = useScoreboardSocket({
    initialGame,
    initialParticipants,
  });

  const isKioskMode = useMemo(() => {
    const mode = new URLSearchParams(window.location.search).get('mode');
    return mode === 'kiosk';
  }, []);
  const [scoreboardScale, setScoreboardScale] = useState(() =>
    calculateScoreboardScale(window.innerWidth, window.innerHeight, isKioskMode)
  );
  const [activeTapToast, setActiveTapToast] = useState<TapVisualState | null>(null);
  const [tapBursts, setTapBursts] = useState<TapVisualState[]>([]);
  const [debugSelectedUid, setDebugSelectedUid] = useState<string>('');
  const [debugStatus, setDebugStatus] = useState<string>('');
  const toastTimerRef = useRef<number | null>(null);
  const syntheticTapIdRef = useRef(10_000);

  const topInset = 12;
  const isLocalhostOrigin = useMemo(() => {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  }, []);
  const debugMenuQueryEnabled = useMemo(() => {
    return new URLSearchParams(window.location.search).get('debugMenu') === '1';
  }, []);
  const showDebugMenu = (DEBUG_MENU_ENABLED || debugMenuQueryEnabled) && isLocalhostOrigin;
  const debugParticipants = useMemo(
    () => participants.filter((participant) => participant.uid),
    [participants]
  );
  const dismissBurst = useCallback((burstId: number) => {
    setTapBursts((current) => current.filter((item) => item.id !== burstId));
  }, []);
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

  const triggerTapVisual = useCallback((payload: TapFeedback | TapVisualState) => {
    const eventId = 'eventId' in payload ? payload.eventId : payload.id;
    const visual = {
      id: eventId,
      playerName: payload.playerName,
      station: payload.station,
      delta: payload.delta ?? 1,
    };

    setActiveTapToast(visual);
    setTapBursts((current) => [...current, visual]);

    if (toastTimerRef.current != null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setActiveTapToast((current) => (current?.id === visual.id ? null : current));
    }, 3600);
  }, []);

  useEffect(() => {
    if (!tapFeedback) {
      return;
    }
    triggerTapVisual(tapFeedback);
  }, [tapFeedback?.eventId, triggerTapVisual]);

  useEffect(() => {
    if (!showDebugMenu) {
      return;
    }

    if (!debugParticipants.length) {
      setDebugSelectedUid('');
      return;
    }

    const stillValid = debugParticipants.some((participant) => participant.uid === debugSelectedUid);
    if (!stillValid) {
      setDebugSelectedUid(debugParticipants[0].uid ?? '');
    }
  }, [debugParticipants, debugSelectedUid, showDebugMenu]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current != null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const previewTapVisual = useCallback(
    (station: 'hotdog' | 'beer') => {
      const selectedParticipant = debugParticipants.find((participant) => participant.uid === debugSelectedUid);
      syntheticTapIdRef.current += 1;
      triggerTapVisual({
        id: syntheticTapIdRef.current,
        playerName: selectedParticipant?.name ?? 'Preview',
        station,
        delta: 1,
      });
    },
    [debugParticipants, debugSelectedUid, triggerTapVisual]
  );

  const triggerRealTap = useCallback(
    async (station: 'hotdog' | 'beer') => {
      const participant = debugParticipants.find((candidate) => candidate.uid === debugSelectedUid);
      if (!participant?.uid) {
        setDebugStatus('Select a participant with a UID first.');
        return;
      }

      setDebugStatus(`Sending ${station} tap...`);

      try {
        const registerResponse = await fetch(API_FORCE_REGISTER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: participant.uid,
            name: participant.name,
          }),
        });

        if (!registerResponse.ok) {
          setDebugStatus(`force-register failed (${registerResponse.status})`);
          return;
        }

        const tapResponse = await fetch(API_TAP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: participant.uid,
            station,
          }),
        });

        if (!tapResponse.ok) {
          setDebugStatus(`tap failed (${tapResponse.status})`);
          return;
        }

        setDebugStatus(`Sent +1 ${station} for ${participant.name}.`);
      } catch {
        setDebugStatus('Network error while sending tap.');
      }
    },
    [debugParticipants, debugSelectedUid]
  );

  const handleRegisterParticipant = useCallback(
    async (name: string) => {
      if (!registration) {
        throw new Error('No registration is currently pending.');
      }

      const activeRegistration = registration;
      const result = await registerParticipant(name);

      const creditedForPrimaryStation =
        activeRegistration.station === 'hotdog' ? result.creditedHotdogs : result.creditedBeers;
      const creditedForSecondaryStation =
        activeRegistration.station === 'hotdog' ? result.creditedBeers : result.creditedHotdogs;
      const feedbackStation =
        creditedForPrimaryStation > 0
          ? activeRegistration.station
          : creditedForSecondaryStation > 0
            ? activeRegistration.station === 'hotdog'
              ? 'beer'
              : 'hotdog'
            : activeRegistration.station;
      const fallbackPrimaryPending =
        activeRegistration.station === 'hotdog'
          ? activeRegistration.hotdogPending
          : activeRegistration.beerPending;
      const feedbackDelta =
        feedbackStation === 'hotdog'
          ? Math.max(result.creditedHotdogs, feedbackStation === activeRegistration.station ? fallbackPrimaryPending : 0)
          : Math.max(result.creditedBeers, feedbackStation === activeRegistration.station ? fallbackPrimaryPending : 0);

      if (result.status === 'registered' && feedbackDelta > 0) {
        syntheticTapIdRef.current += 1;
        triggerTapVisual({
          id: syntheticTapIdRef.current,
          playerName: result.name || name.trim(),
          station: feedbackStation,
          delta: feedbackDelta,
        });
      }

      return result;
    },
    [registerParticipant, registration, triggerTapVisual]
  );

  return (
    <>
      <div id="scoreboard-shell" className={isKioskMode ? 'kiosk' : undefined} style={shellStyle}>
        <div className="scoreboard-scroll">
          <Scoreboard
            participants={participants}
            game={game}
            isKioskMode={isKioskMode}
            tapToast={
              activeTapToast
                ? {
                    playerName: activeTapToast.playerName,
                    station: activeTapToast.station,
                    delta: activeTapToast.delta,
                    eventId: activeTapToast.id,
                  }
                : null
            }
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

      {tapBursts.length > 0 && (
        <div className="tap-burst-layer" aria-hidden>
          {tapBursts.map((burst) => (
            <TapEmojiBurst key={burst.id} burst={burst} onComplete={dismissBurst} />
          ))}
        </div>
      )}

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
          hotdogPending={registration.hotdogPending}
          beerPending={registration.beerPending}
          isKioskMode={isKioskMode}
          onSubmit={handleRegisterParticipant}
        />
      )}

      {showDebugMenu && (
        <div className="debug-menu">
          <div className="debug-menu-title">Debug</div>

          <label className="debug-menu-label" htmlFor="debug-participant-select">
            Participant
          </label>
          <select
            id="debug-participant-select"
            className="debug-menu-select"
            value={debugSelectedUid}
            onChange={(event) => setDebugSelectedUid(event.target.value)}
          >
            {debugParticipants.map((participant) => (
              <option key={participant.uid ?? participant.name} value={participant.uid ?? ''}>
                {participant.name}
              </option>
            ))}
          </select>

          <div className="debug-menu-grid">
            <button type="button" onClick={() => previewTapVisual('hotdog')}>
              Preview 🌭
            </button>
            <button type="button" onClick={() => previewTapVisual('beer')}>
              Preview 🍺
            </button>
            <button type="button" onClick={() => void triggerRealTap('hotdog')}>
              +1 Hot Dog
            </button>
            <button type="button" onClick={() => void triggerRealTap('beer')}>
              +1 Beer
            </button>
          </div>

          {debugStatus && <div className="debug-menu-status">{debugStatus}</div>}
        </div>
      )}
    </>
  );
}

interface TapEmojiBurstProps {
  burst: TapVisualState;
  onComplete: (burstId: number) => void;
}

function TapEmojiBurst({ burst, onComplete }: TapEmojiBurstProps) {
  const particles = useMemo(() => buildBurstParticles(burst.id), [burst.id]);
  const burstDurationMs = useMemo(
    () => particles.reduce((maxDuration, particle) => Math.max(maxDuration, particle.startDelayMs + particle.lifetimeMs), 0),
    [particles]
  );
  const [elapsedMs, setElapsedMs] = useState(0);
  const didCompleteRef = useRef(false);
  const emoji = burst.station === 'hotdog' ? '🌭' : '🍺';

  useEffect(() => {
    didCompleteRef.current = false;
    let animationFrameId = 0;
    const startedAt = performance.now();

    const renderFrame = (now: number) => {
      const elapsed = now - startedAt;
      setElapsedMs(elapsed);

      if (elapsed < burstDurationMs + 200) {
        animationFrameId = window.requestAnimationFrame(renderFrame);
        return;
      }

      if (!didCompleteRef.current) {
        didCompleteRef.current = true;
        onComplete(burst.id);
      }
    };

    animationFrameId = window.requestAnimationFrame(renderFrame);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [burst.id, burstDurationMs, onComplete]);

  return (
    <div className={`tap-burst tap-burst--${burst.station}`}>
      {particles.map((particle, index) => {
        const ageMs = elapsedMs - particle.startDelayMs;
        if (ageMs < 0 || ageMs > particle.lifetimeMs) {
          return null;
        }

        const tSec = ageMs / 1000;
        const translateX =
          particle.velocityXPxPerSec * tSec + 0.5 * particle.driftXPxPerSec2 * tSec * tSec;
        const translateY = particle.velocityYPxPerSec * tSec + 0.5 * particle.gravityPxPerSec2 * tSec * tSec;
        const rotationDeg = particle.rotationStartDeg + particle.rotationVelocityDegPerSec * tSec;
        const opacity = particleOpacity(ageMs, particle.lifetimeMs);

        return (
          <span
            key={`${burst.id}-${index}`}
            style={{
              left: '50%',
              opacity,
              fontFamily: EMOJI_FONT_STACK,
              transform: `translate3d(calc(-50% + ${translateX}px), ${translateY}px, 0) rotate(${rotationDeg}deg) scale(${particle.scale})`,
            }}
          >
            {emoji}
          </span>
        );
      })}
    </div>
  );
}

function calculateScoreboardScale(width: number, height: number, isKioskMode: boolean) {
  const growth = Math.min(width / 1920, height / 1080);
  const extraGrowth = Math.max(0, growth - 1);

  if (isKioskMode) {
    // Portrait kiosk displays have a lot of vertical room but a narrower inline width,
    // so use a much larger baseline scale and still allow extra growth on bigger screens.
    const boostedGrowth = extraGrowth * 1.15 + extraGrowth * extraGrowth * 0.75;
    return clamp(2.7 + boostedGrowth, 2.7, 3.8);
  }

  return clamp(1 + extraGrowth * 0.3, 1, 1.48);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseBooleanFlag(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function buildBurstParticles(seed: number, count = 36): BurstParticle[] {
  const particles: BurstParticle[] = [];
  let seedIndex = 1;
  const pullFromSeed = (min: number, max: number) => {
    const value = randomFromSeed(seed, seedIndex, min, max);
    seedIndex += 1;
    return value;
  };

  for (let index = 0; index < count; index += 1) {
    const mirroredDirection = index % 2 === 0 ? -1 : 1;
    const band = Math.floor(index / 2) % 6;
    const startDelayMs = pullFromSeed(0, 90) + band * 8;
    const launchSpeed = pullFromSeed(560, 1080);
    const launchAngleDegrees = pullFromSeed(34, 82);
    const launchAngleRadians = (launchAngleDegrees * Math.PI) / 180;
    const xJitter = pullFromSeed(-100, 100);
    const velocityXPxPerSec = Math.cos(launchAngleRadians) * launchSpeed * mirroredDirection + xJitter;
    const liftBoost = pullFromSeed(40, 230);
    const velocityYPxPerSec = -Math.sin(launchAngleRadians) * launchSpeed - liftBoost;
    const gravityPxPerSec2 = pullFromSeed(900, 1480);
    const driftXPxPerSec2 = mirroredDirection * pullFromSeed(40, 180) + pullFromSeed(-70, 70);
    const lifetimeMs = pullFromSeed(2600, 4200);
    const rotationStartDeg = pullFromSeed(-70, 70);
    const rotationVelocityDegPerSec =
      mirroredDirection * pullFromSeed(220, 540) + pullFromSeed(-120, 120);
    const scale = pullFromSeed(84, 128) / 100;

    particles.push({
      startDelayMs,
      lifetimeMs,
      velocityXPxPerSec,
      velocityYPxPerSec,
      gravityPxPerSec2,
      driftXPxPerSec2,
      rotationStartDeg,
      rotationVelocityDegPerSec,
      scale,
    });
  }

  return particles;
}

function particleOpacity(ageMs: number, lifetimeMs: number): number {
  const fadeInMs = 120;
  const fadeOutStartMs = lifetimeMs * 0.72;

  if (ageMs < fadeInMs) {
    return ageMs / fadeInMs;
  }

  if (ageMs < fadeOutStartMs) {
    return 1;
  }

  const fadeOutWindow = Math.max(1, lifetimeMs - fadeOutStartMs);
  return clamp(1 - (ageMs - fadeOutStartMs) / fadeOutWindow, 0, 1);
}

function randomFromSeed(seed: number, index: number, min: number, max: number): number {
  const raw = Math.sin(seed * 17.913 + index * 43.753) * 10000;
  const normalized = raw - Math.floor(raw);
  return Math.round(min + normalized * (max - min));
}
