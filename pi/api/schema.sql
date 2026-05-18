-- Core challenge entities: participant registrations and tap events.
CREATE TABLE IF NOT EXISTS participants (
  uid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS taps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  station TEXT NOT NULL CHECK (station IN ('hotdog', 'beer')),
  source TEXT NOT NULL DEFAULT 'nfc',
  tapped_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(uid) REFERENCES participants(uid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pending_registrations (
  uid TEXT PRIMARY KEY,
  hotdog_pending INTEGER NOT NULL DEFAULT 0,
  beer_pending INTEGER NOT NULL DEFAULT 0,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS event_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS celebrations (
  uid TEXT PRIMARY KEY,
  celebrated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(uid) REFERENCES participants(uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_taps_uid_time ON taps(uid, tapped_at DESC);
