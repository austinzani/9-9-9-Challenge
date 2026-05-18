"""Daemon that polls two PN532 readers and posts tap events to the local API."""

from __future__ import annotations

import argparse
import logging
import signal
import threading
import time
from dataclasses import dataclass
from queue import Queue

import httpx

from pi.nfc.pn532 import PN532Reader

LOGGER = logging.getLogger("nfc-daemon")
DEBOUNCE_SECONDS = 3.0


@dataclass(frozen=True)
class StationConfig:
    """Reader identity and destination tap station mapping."""

    station: str
    connection_string: str


def parse_args() -> argparse.Namespace:
    """Parse daemon flags with defaults matching the udev symlink layout."""
    parser = argparse.ArgumentParser(description="9-9-9 NFC reader daemon")
    parser.add_argument(
        "--api-url",
        default="http://127.0.0.1:8000/api/tap",
        help="Local API endpoint to receive tap events.",
    )
    parser.add_argument(
        "--hotdog-device",
        default="tty:/dev/nfc-hotdog:pn532",
        help="nfcpy connection string for the hotdog reader.",
    )
    parser.add_argument(
        "--beer-device",
        default="tty:/dev/nfc-beer:pn532",
        help="nfcpy connection string for the beer reader.",
    )
    return parser.parse_args()


def reader_worker(config: StationConfig, stop_event: threading.Event, events: Queue[tuple[str, str]]) -> None:
    """Read UIDs from one station and forward them to the main event queue."""
    reader = PN532Reader(station=config.station, connection_string=config.connection_string)
    for uid in reader.iter_uids(stop_event):
        events.put((config.station, uid))
        if stop_event.is_set():
            break


def main() -> int:
    """Run the NFC daemon until signaled, with per-UID debounce and retries."""
    args = parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )

    stop_event = threading.Event()
    event_queue: Queue[tuple[str, str]] = Queue()

    def request_stop(*_: object) -> None:
        stop_event.set()

    signal.signal(signal.SIGTERM, request_stop)
    signal.signal(signal.SIGINT, request_stop)

    stations = [
        StationConfig(station="hotdog", connection_string=args.hotdog_device),
        StationConfig(station="beer", connection_string=args.beer_device),
    ]

    threads = [
        threading.Thread(
            target=reader_worker,
            args=(station, stop_event, event_queue),
            daemon=True,
            name=f"reader-{station.station}",
        )
        for station in stations
    ]
    for thread in threads:
        thread.start()

    last_seen: dict[tuple[str, str], float] = {}

    with httpx.Client(timeout=5.0) as client:
        while not stop_event.is_set():
            try:
                station, uid = event_queue.get(timeout=0.5)
            except Exception:
                continue

            now = time.monotonic()
            key = (station, uid)
            last = last_seen.get(key, 0.0)
            if (now - last) < DEBOUNCE_SECONDS:
                LOGGER.debug("Skipping debounced tap station=%s uid=%s", station, uid)
                continue
            last_seen[key] = now

            payload = {"uid": uid, "station": station}
            try:
                response = client.post(args.api_url, json=payload)
                response.raise_for_status()
                LOGGER.info("Tap accepted station=%s uid=%s", station, uid)
            except httpx.HTTPStatusError as exc:
                LOGGER.warning(
                    "Tap rejected station=%s uid=%s status=%s body=%s",
                    station,
                    uid,
                    exc.response.status_code,
                    exc.response.text,
                )
            except httpx.HTTPError:
                LOGGER.exception("Tap post failed station=%s uid=%s", station, uid)

    for thread in threads:
        thread.join(timeout=2)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
