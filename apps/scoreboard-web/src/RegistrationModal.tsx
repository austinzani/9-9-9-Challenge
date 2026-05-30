import { FormEvent, useEffect, useRef, useState } from 'react';

import type { RegisterParticipantResult } from './useScoreboardSocket';

const EMOJI_FONT_STACK = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';

interface RegistrationModalProps {
  uid: string;
  hotdogPending: number;
  beerPending: number;
  isKioskMode?: boolean;
  onSubmit: (name: string) => Promise<RegisterParticipantResult>;
}

/**
 * Captures a participant name the first time a new tag UID is seen.
 *
 * The API resolves races so only the first submitter wins; all clients receive a
 * WS dismissal event for the same UID.
 */
export function RegistrationModal({
  uid,
  hotdogPending,
  beerPending,
  isKioskMode = false,
  onSubmit,
}: RegistrationModalProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);

    return () => window.clearTimeout(focusTimer);
  }, [uid]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim().toUpperCase();
    if (!trimmed) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
    } catch {
      setError('Unable to register right now. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: isKioskMode ? 'rgba(7, 14, 10, 0.86)' : 'rgba(0, 0, 0, 0.52)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isKioskMode ? 'clamp(24px, 3vw, 56px)' : 16,
        zIndex: 999,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: isKioskMode ? 'min(960px, 78vw)' : 'min(420px, 92vw)',
          background: '#173527',
          color: '#f0e6c8',
          border: isKioskMode ? '4px solid #0e2419' : '2px solid #0e2419',
          boxShadow: '0 18px 48px rgba(0,0,0,0.42)',
          padding: isKioskMode ? 'clamp(28px, 3vw, 52px)' : '18px 16px 14px',
          fontFamily: '"Oswald", system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: isKioskMode ? 'clamp(16px, 1.3vw, 26px)' : 12,
            letterSpacing: '0.16em',
            color: '#c9b988',
            marginBottom: isKioskMode ? 'clamp(14px, 1.3vw, 22px)' : 8,
          }}
        >
          REGISTRATION NEEDED
        </div>
        <div
          id="registration-title"
          style={{
            fontSize: isKioskMode ? 'clamp(46px, 4.9vw, 82px)' : 24,
            fontFamily: '"Big Shoulders Display", "Oswald", sans-serif',
            fontWeight: 800,
            lineHeight: 0.96,
            marginBottom: isKioskMode ? 'clamp(18px, 1.7vw, 30px)' : 12,
            textTransform: 'uppercase',
          }}
        >
          Enter your player name
        </div>
        <div
          style={{
            fontSize: isKioskMode ? 'clamp(18px, 1.6vw, 28px)' : 14,
            marginBottom: isKioskMode ? 'clamp(18px, 1.7vw, 28px)' : 10,
            display: 'flex',
            alignItems: 'center',
            gap: isKioskMode ? 'clamp(10px, 0.8vw, 16px)' : 8,
            flexWrap: 'wrap',
          }}
        >
          <span>Pending taps:</span>
          <span style={{ fontFamily: EMOJI_FONT_STACK, lineHeight: 1 }}>🌭</span>
          <span>{hotdogPending}</span>
          <span>·</span>
          <span style={{ fontFamily: EMOJI_FONT_STACK, lineHeight: 1 }}>🍺</span>
          <span>{beerPending}</span>
        </div>

        <label
          style={{
            display: 'block',
            fontSize: isKioskMode ? 'clamp(24px, 1.8vw, 34px)' : 16,
            fontFamily: '"Big Shoulders Stencil Display", "Oswald", sans-serif',
            letterSpacing: '0.08em',
            marginBottom: isKioskMode ? 12 : 8,
            textTransform: 'uppercase',
          }}
        >
          Type your name
        </label>
        <input
          ref={inputRef}
          value={name}
          onChange={(event) => setName(event.target.value.toUpperCase())}
          placeholder="TYPE YOUR NAME"
          autoFocus
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          inputMode="text"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#0e2419',
            border: '2px solid #234c3a',
            color: '#f0e6c8',
            padding: isKioskMode ? 'clamp(18px, 1.6vw, 26px) clamp(20px, 1.8vw, 28px)' : '10px 12px',
            fontSize: isKioskMode ? 'clamp(34px, 3.1vw, 60px)' : 22,
            marginBottom: isKioskMode ? 'clamp(14px, 1.4vw, 22px)' : 10,
            fontFamily: '"Big Shoulders Stencil Display", "Oswald", sans-serif',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        />

        <div
          style={{
            fontSize: isKioskMode ? 'clamp(16px, 1.2vw, 22px)' : 12,
            color: '#c9b988',
            marginBottom: isKioskMode ? 'clamp(16px, 1.2vw, 22px)' : 10,
            letterSpacing: '0.08em',
          }}
        >
          Press Enter to register
        </div>

        {error &&
          <div style={{ color: '#ffb4a5', marginBottom: isKioskMode ? 16 : 10, fontSize: isKioskMode ? 22 : 16 }}>{error}</div>}

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          style={{
            width: '100%',
            background: '#d6a23a',
            color: '#1d4233',
            border: 'none',
            padding: isKioskMode ? 'clamp(18px, 1.6vw, 26px)' : '10px 12px',
            fontSize: isKioskMode ? 'clamp(28px, 2.2vw, 40px)' : 16,
            fontFamily: '"Big Shoulders Display", "Oswald", sans-serif',
            fontWeight: 800,
            letterSpacing: '0.04em',
            cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'REGISTERING…' : 'REGISTER PLAYER'}
        </button>
      </form>
    </div>
  );
}
