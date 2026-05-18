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
  tapped_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(uid) REFERENCES participants(uid)
);

CREATE INDEX IF NOT EXISTS idx_taps_uid_time ON taps(uid, tapped_at DESC);
