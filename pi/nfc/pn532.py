"""Thin nfcpy wrapper for PN532 readers running over USB serial."""

from __future__ import annotations

import time
from collections.abc import Iterator
from threading import Event

import nfc


class PN532Reader:
    """Single reader wrapper that yields UID strings from scanned tags."""

    def __init__(self, station: str, connection_string: str) -> None:
        self.station = station
        self.connection_string = connection_string

    def iter_uids(self, stop_event: Event) -> Iterator[str]:
        """
        Yield uppercase UID values until the daemon is asked to stop.

        The loop reconnects after recoverable NFC transport faults so one flaky
        reader cable does not permanently break its station.
        """
        while not stop_event.is_set():
            clf: nfc.ContactlessFrontend | None = None
            try:
                clf = nfc.ContactlessFrontend(self.connection_string)

                while not stop_event.is_set():
                    seen_uid: str | None = None

                    def on_connect(tag) -> bool:  # noqa: ANN001 - nfcpy tag type is dynamic.
                        nonlocal seen_uid
                        seen_uid = tag.identifier.hex().upper()
                        return True

                    clf.connect(
                        rdwr={"on-connect": on_connect},
                        terminate=lambda: stop_event.is_set(),
                    )

                    if seen_uid:
                        yield seen_uid
            except nfc.clf.TransmissionError:
                # Reader chatter can occasionally fail mid-frame; reconnect and continue.
                time.sleep(0.5)
            except OSError:
                # Device unplugged or temporarily unavailable.
                time.sleep(1.0)
            finally:
                if clf is not None:
                    try:
                        clf.close()
                    except Exception:
                        pass
