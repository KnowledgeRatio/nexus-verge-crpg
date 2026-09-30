#!/usr/bin/env python3
"""Start the protected local preview independently of the agent terminal."""

import json
import hashlib
import os
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[2]
SERVER = Path(__file__).with_name("preview_server.py")
PORT = 8765
URL = f"http://127.0.0.1:{PORT}/combat-study.html"
LOG = Path("/private/tmp/nexus-verge-audio-preview.log")
CATALOG = json.loads((ROOT / "data/audio/cue-versions.json").read_text())
CURRENT_COMBAT = CATALOG["versions"][CATALOG["current"]["combat"]]
DEFAULT_CUE = ROOT / CATALOG["assetRoot"] / CURRENT_COMBAT["file"]
PREVIEW_CUE = ROOT / CATALOG["assetRoot"] / CURRENT_COMBAT.get("previewFile", CURRENT_COMBAT["file"])


def prepare_preview():
    if hashlib.sha256(DEFAULT_CUE.read_bytes()).hexdigest() != CURRENT_COMBAT["sha256"]:
        raise SystemExit("Current combat cue differs from its versioned master")
    if PREVIEW_CUE == DEFAULT_CUE or PREVIEW_CUE.exists():
        return
    temporary = PREVIEW_CUE.with_suffix(".wav.tmp")
    result = subprocess.run(
        ["afconvert", str(DEFAULT_CUE), "-o", str(temporary), "-f", "WAVE", "-d", "LEI16"],
        capture_output=True, text=True, check=False,
    )
    if result.returncode:
        temporary.unlink(missing_ok=True)
        raise SystemExit(f"Could not prepare combat audio preview: {result.stderr.strip()}")
    os.replace(temporary, PREVIEW_CUE)


def ready():
    try:
        with urlopen(URL, timeout=1) as response:
            if response.status != 200:
                return False
        with urlopen(f"http://127.0.0.1:{PORT}/data/audio/cue-versions.json", timeout=1) as response:
            if response.status != 200:
                return False
        audio_url = f"http://127.0.0.1:{PORT}/data/audio/local/{PREVIEW_CUE.name}"
        with urlopen(Request(audio_url, headers={"Range": "bytes=0-1023"}), timeout=1) as response:
            expected_type = {".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".wav": "audio/wav"}[PREVIEW_CUE.suffix]
            if response.status != 206 or response.headers.get("Content-Type") != expected_type:
                return False
        try:
            urlopen(f"http://127.0.0.1:{PORT}/.env.elevenlabs.local", timeout=1)
        except HTTPError as error:
            return error.code == 403
    except (OSError, URLError):
        return False
    return False


if __name__ == "__main__":
    if not DEFAULT_CUE.exists():
        raise SystemExit(f"Current combat cue is missing: {DEFAULT_CUE}. Restore the versioned asset first")
    prepare_preview()
    if ready():
        print(URL)
        raise SystemExit(0)
    with LOG.open("ab") as log:
        process = subprocess.Popen(
            [sys.executable, str(SERVER)],
            cwd=ROOT,
            stdin=subprocess.DEVNULL,
            stdout=log,
            stderr=subprocess.STDOUT,
            close_fds=True,
            start_new_session=True,
        )
    for _ in range(30):
        if ready():
            print(URL)
            raise SystemExit(0)
        if process.poll() is not None:
            raise SystemExit(f"Preview server exited; see {LOG}")
        time.sleep(0.1)
    raise SystemExit(f"Preview server did not become ready; see {LOG}")
