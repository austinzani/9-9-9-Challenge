"""SQLite helpers for API and daemon processes."""

from __future__ import annotations

import sqlite3
import threading
from pathlib import Path
from typing import Literal

_DB_DEFAULT = Path("./data/999.sqlite")
_SCHEMA_PATH = Path(__file__).with_name("schema.sql")
_DB_LOCK = threading.Lock()

Station = Literal["hotdog", "beer"]


def resolve_db_path(path: str | None = None) -> Path:
    """Resolve the SQLite file path and ensure its parent directory exists."""
    db_path = Path(path) if path else _DB_DEFAULT
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return db_path


def connect(db_path: str | None = None) -> sqlite3.Connection:
    """Open a SQLite connection with row access by column name."""
    conn = sqlite3.connect(resolve_db_path(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def initialize_schema(conn: sqlite3.Connection) -> None:
    """Apply the schema script idempotently at service startup."""
    with _DB_LOCK:
        conn.executescript(_SCHEMA_PATH.read_text(encoding="utf-8"))
        conn.commit()


def participant_exists(conn: sqlite3.Connection, uid: str) -> bool:
    """Return true when the NFC UID has a participant mapping."""
    with _DB_LOCK:
        row = conn.execute("SELECT 1 FROM participants WHERE uid = ?", (uid,)).fetchone()
    return row is not None


def upsert_participant(conn: sqlite3.Connection, uid: str, name: str) -> None:
    """Insert or rename a participant while preserving existing taps."""
    with _DB_LOCK:
        conn.execute(
            """
            INSERT INTO participants(uid, name)
            VALUES(?, ?)
            ON CONFLICT(uid) DO UPDATE SET name = excluded.name
            """,
            (uid, name),
        )
        conn.commit()


def record_tap(conn: sqlite3.Connection, uid: str, station: Station, source: str = "nfc") -> dict:
    """Insert a tap event and return the inserted row metadata."""
    with _DB_LOCK:
        cursor = conn.execute(
            "INSERT INTO taps(uid, station, source) VALUES(?, ?, ?)",
            (uid, station, source),
        )
        tap_id = cursor.lastrowid
        row = conn.execute(
            "SELECT tapped_at FROM taps WHERE id = ?",
            (tap_id,),
        ).fetchone()
        conn.commit()

    return {
        "id": tap_id,
        "uid": uid,
        "station": station,
        "source": source,
        "tappedAt": row["tapped_at"] if row else None,
    }


def queue_pending_registration(conn: sqlite3.Connection, uid: str, station: Station) -> dict:
    """Queue an unknown UID tap until a participant name is submitted."""
    hotdog_inc = 1 if station == "hotdog" else 0
    beer_inc = 1 if station == "beer" else 0

    with _DB_LOCK:
        conn.execute(
            """
            INSERT INTO pending_registrations(uid, hotdog_pending, beer_pending)
            VALUES(?, ?, ?)
            ON CONFLICT(uid) DO UPDATE SET
              hotdog_pending = hotdog_pending + excluded.hotdog_pending,
              beer_pending = beer_pending + excluded.beer_pending,
              updated_at = datetime('now')
            """,
            (uid, hotdog_inc, beer_inc),
        )
        row = conn.execute(
            """
            SELECT uid, hotdog_pending, beer_pending, requested_at, updated_at
            FROM pending_registrations
            WHERE uid = ?
            """,
            (uid,),
        ).fetchone()
        conn.commit()

    if row is None:
        raise RuntimeError("Failed to queue pending registration")

    return {
        "uid": row["uid"],
        "hotdogPending": int(row["hotdog_pending"]),
        "beerPending": int(row["beer_pending"]),
        "requestedAt": row["requested_at"],
        "updatedAt": row["updated_at"],
    }


def register_and_consume_pending(conn: sqlite3.Connection, uid: str, name: str) -> dict:
    """
    Register a participant exactly once and atomically credit pending taps.

    The first successful registrant wins. Subsequent submissions for the same UID
    return the already-registered name and do not recalculate taps.
    """
    with _DB_LOCK:
        conn.execute("BEGIN IMMEDIATE")

        existing = conn.execute(
            "SELECT uid, name FROM participants WHERE uid = ?",
            (uid,),
        ).fetchone()

        if existing is None:
            conn.execute(
                "INSERT INTO participants(uid, name) VALUES(?, ?)",
                (uid, name),
            )
            status = "registered"
            winner_name = name
        else:
            status = "already_registered"
            winner_name = existing["name"]

        pending = conn.execute(
            "SELECT hotdog_pending, beer_pending FROM pending_registrations WHERE uid = ?",
            (uid,),
        ).fetchone()

        credited_hotdog = 0
        credited_beer = 0

        if pending is not None and status == "registered":
            credited_hotdog = int(pending["hotdog_pending"])
            credited_beer = int(pending["beer_pending"])

            if credited_hotdog:
                conn.executemany(
                    "INSERT INTO taps(uid, station, source) VALUES(?, 'hotdog', 'register')",
                    [(uid,) for _ in range(credited_hotdog)],
                )
            if credited_beer:
                conn.executemany(
                    "INSERT INTO taps(uid, station, source) VALUES(?, 'beer', 'register')",
                    [(uid,) for _ in range(credited_beer)],
                )

        conn.execute("DELETE FROM pending_registrations WHERE uid = ?", (uid,))
        conn.commit()

    return {
        "status": status,
        "uid": uid,
        "name": winner_name,
        "creditedHotdogs": credited_hotdog,
        "creditedBeers": credited_beer,
    }


def fetch_participants_with_totals(conn: sqlite3.Connection) -> list[dict]:
    """Return participants with hotdog/beer counters used by the scoreboard."""
    query = """
    SELECT
      p.uid,
      p.name,
      COALESCE(SUM(CASE WHEN t.station = 'hotdog' THEN 1 ELSE 0 END), 0) AS hotdogs,
      COALESCE(SUM(CASE WHEN t.station = 'beer' THEN 1 ELSE 0 END), 0) AS beers
    FROM participants p
    LEFT JOIN taps t ON t.uid = p.uid
    GROUP BY p.uid, p.name
    ORDER BY (hotdogs + beers) DESC, hotdogs DESC, p.name ASC
    """

    with _DB_LOCK:
        rows = conn.execute(query).fetchall()

    return [
        {
            "uid": row["uid"],
            "name": row["name"],
            "hotdogs": int(row["hotdogs"]),
            "beers": int(row["beers"]),
        }
        for row in rows
    ]
