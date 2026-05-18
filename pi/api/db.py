"""SQLite helpers for API and daemon processes."""

from __future__ import annotations

import sqlite3
from pathlib import Path

_DB_DEFAULT = Path("./data/999.sqlite")
_SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def resolve_db_path(path: str | None = None) -> Path:
    """Resolve the SQLite file path and ensure its parent directory exists."""
    db_path = Path(path) if path else _DB_DEFAULT
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return db_path


def connect(db_path: str | None = None) -> sqlite3.Connection:
    """Open a SQLite connection with row access by column name."""
    conn = sqlite3.connect(resolve_db_path(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_schema(conn: sqlite3.Connection) -> None:
    """Apply the schema script idempotently at service startup."""
    conn.executescript(_SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.commit()
