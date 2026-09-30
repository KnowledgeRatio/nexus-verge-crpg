#!/usr/bin/env python3
"""Generate the local ElevenLabs audio study candidates once, without logging the key."""

import argparse
import hashlib
import json
import os
import ssl
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[2]
PROMPTS = Path(__file__).with_name("mvp-prompts.json")
OUTPUT = ROOT / "data/audio/local"
KEY_FILE = ROOT / ".env.elevenlabs.local"
CATALOG = ROOT / "data/audio/cue-versions.json"


def read_key():
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if key:
        return key
    if KEY_FILE.exists():
        for line in KEY_FILE.read_text().splitlines():
            if line.startswith("ELEVENLABS_API_KEY="):
                return line.partition("=")[2].strip().strip('"\'')
    raise SystemExit("ELEVENLABS_API_KEY is missing from the environment or .env.elevenlabs.local")


def generate(key, item):
    if item["kind"] == "music":
        endpoint = "https://api.elevenlabs.io/v1/music"
        body = {
            "model_id": "music_v2_5",
            "prompt": item["prompt"],
            "music_length_ms": item["duration_ms"],
            "force_instrumental": True,
        }
    else:
        endpoint = "https://api.elevenlabs.io/v1/sound-generation"
        body = {
            "model_id": "eleven_text_to_sound_v2",
            "text": item["prompt"],
            "duration_seconds": item["duration_seconds"],
            "prompt_influence": item.get("prompt_influence", 0.45),
            "loop": item.get("loop", False),
        }
    request = Request(
        endpoint,
        data=json.dumps(body).encode("utf-8"),
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        default_certs = ssl.get_default_verify_paths().cafile
        system_certs = Path("/etc/ssl/cert.pem")
        certs = default_certs or (str(system_certs) if system_certs.exists() else None)
        context = ssl.create_default_context(cafile=certs)
        with urlopen(request, timeout=300, context=context) as response:
            return response.read(), response.headers.get("song-id")
    except HTTPError as error:
        try:
            detail = json.loads(error.read().decode("utf-8"))
            message = detail.get("detail", {})
            if isinstance(message, dict):
                message = message.get("message", "")
            message = str(message).replace(key, "[redacted]")[:300]
        except (ValueError, UnicodeError):
            message = ""
        raise RuntimeError(f"ElevenLabs returned HTTP {error.code}: {message}") from None
    except URLError as error:
        raise RuntimeError(f"Could not reach ElevenLabs: {error.reason}") from None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("names", nargs="*", help="Candidate IDs; default is every MVP candidate")
    args = parser.parse_args()
    prompts = json.loads(PROMPTS.read_text())
    names = args.names or [name for name, item in prompts.items() if item.get("mvp", True)]
    unknown = set(names) - set(prompts)
    if unknown:
        raise SystemExit(f"Unknown candidate IDs: {', '.join(sorted(unknown))}")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUTPUT / "generation-record.json"
    record = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    catalog = json.loads(CATALOG.read_text()) if CATALOG.exists() else {"versions": {}}
    locked = {item["source"]: item for item in catalog["versions"].values()}
    key = None
    for name in names:
        path = OUTPUT / f"{name}.mp3"
        if path.exists():
            if name in locked and hashlib.sha256(path.read_bytes()).hexdigest() != locked[name]["sha256"]:
                raise SystemExit(f"{name}: local file differs from its versioned SHA-256; refusing to overwrite")
            print(f"{name}: already exists; skipping to avoid another paid generation")
            continue
        if name in locked or name in record:
            raise SystemExit(f"{name}: versioned audio is missing; restore the exact file instead of regenerating it")
        if key is None:
            key = read_key()
        print(f"{name}: generating", flush=True)
        try:
            audio, generation_id = generate(key, prompts[name])
        except RuntimeError as error:
            raise SystemExit(str(error)) from None
        path.write_bytes(audio)
        record[name] = {
            "file": path.name,
            "sha256": hashlib.sha256(audio).hexdigest(),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "generation_id": generation_id,
            "request": prompts[name],
            "model_id": "music_v2_5" if prompts[name]["kind"] == "music" else "eleven_text_to_sound_v2",
            "status": "candidate",
        }
        manifest_path.write_text(json.dumps(record, indent=2) + "\n")
        print(f"{name}: saved {len(audio)} bytes", flush=True)


if __name__ == "__main__":
    main()
