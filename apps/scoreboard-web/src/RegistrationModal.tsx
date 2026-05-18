import { FormEvent, useState } from 'react';

interface RegistrationModalProps {
  uid: string;
  station: 'hotdog' | 'beer';
  hotdogPending: number;
  beerPending: number;
  onSubmit: (name: string) => Promise<void>;
}

/**
 * Captures a participant name the first time a new tag UID is seen.
 *
 * The API resolves races so only the first submitter wins; all clients receive a
 * WS dismissal event for the same UID.
 */
export function RegistrationModal({
  uid,
  station,
  hotdogPending,
  beerPending,
  onSubmit,
}: RegistrationModalProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.52)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 999,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 'min(420px, 92vw)',
          background: '#173527',
          color: '#f0e6c8',
          border: '2px solid #0e2419',
          boxShadow: '0 14px 28px rgba(0,0,0,0.3)',
          padding: '18px 16px 14px',
          fontFamily: '"Oswald", system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: '0.16em', color: '#c9b988', marginBottom: 8 }}>
          REGISTRATION NEEDED
        </div>
        <div
          style={{
            fontSize: 24,
            fontFamily: '"Big Shoulders Stencil Display", "Oswald", sans-serif',
            lineHeight: 1,
            marginBottom: 10,
          }}
        >
          New tag scanned on {station === 'hotdog' ? 'HOT DOG' : 'BEER'} station
        </div>
        <div style={{ fontSize: 13, color: '#c9b988', marginBottom: 12, fontFamily: '"DM Mono", monospace' }}>
          UID: {uid}
        </div>
        <div style={{ fontSize: 14, marginBottom: 10 }}>
          Pending taps: 🌭 {hotdogPending} · 🍺 {beerPending}
        </div>

        <label style={{ display: 'block', fontSize: 12, letterSpacing: '0.12em', marginBottom: 6 }}>PLAYER NAME</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter name"
          autoFocus
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#0e2419',
            border: '1px solid #234c3a',
            color: '#f0e6c8',
            padding: '10px 12px',
            fontSize: 18,
            marginBottom: 10,
          }}
        />

        {error && <div style={{ color: '#ffb4a5', marginBottom: 10 }}>{error}</div>}

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          style={{
            width: '100%',
            background: '#d6a23a',
            color: '#1d4233',
            border: 'none',
            padding: '10px 12px',
            fontSize: 16,
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
