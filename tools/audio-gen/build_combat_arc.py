#!/usr/bin/env python3
"""Join the local combat passages into one continuous, longer preview loop."""

import array
import hashlib
import json
import math
import subprocess
import tempfile
import wave
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "data/audio/local"
CATALOG = ROOT / "data/audio/cue-versions.json"
PASSAGES = (
    ("music_combat_arc_a", 20.1),
    ("music_combat_arc_b", 18.0),
    ("music_combat_arc_c", 19.6),
)
CROSSFADE_SECONDS = 1.5


def convert(source, destination, *options):
    result = subprocess.run(
        ["afconvert", str(source), "-o", str(destination), *options],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode:
        raise RuntimeError(f"Could not convert {source.name}: {result.stderr.strip()}")


def read_passage(path, end_seconds):
    with wave.open(str(path), "rb") as audio:
        if audio.getnchannels() != 2 or audio.getsampwidth() != 2:
            raise RuntimeError(f"Expected stereo 16-bit PCM: {path.name}")
        rate = audio.getframerate()
        samples = array.array("h", audio.readframes(round(end_seconds * rate)))
    if len(samples) < 2 * round(end_seconds * rate):
        raise RuntimeError(f"Passage is shorter than its edit point: {path.name}")
    return rate, samples


def blend(left, right, fade_frames, channels=2):
    fade_samples = fade_frames * channels
    if min(len(left), len(right)) <= fade_samples:
        raise RuntimeError("A passage is too short for the requested crossfade")
    result = array.array("h", left[:-fade_samples])
    for frame in range(fade_frames):
        weight = (frame + 1) / fade_frames
        for channel in range(channels):
            index = frame * channels + channel
            sample = left[-fade_samples + index] * (1 - weight) + right[index] * weight
            result.append(round(sample))
    result.extend(right[fade_samples:])
    return result


def quiet_runs(samples, rate, threshold_db=-35, minimum_seconds=0.25):
    frames = rate // 20
    frame_samples = frames * 2
    minimum_windows = math.ceil(minimum_seconds * rate / frames)
    runs = []
    start = None
    for index in range(0, len(samples) + frame_samples, frame_samples):
        window = samples[index:index + frame_samples]
        rms = math.sqrt(sum(value * value for value in window) / len(window)) / 32768 if window else 1
        quiet = 20 * math.log10(max(rms, 1e-8)) < threshold_db
        if quiet and start is None:
            start = index // frame_samples
        elif not quiet and start is not None:
            end = index // frame_samples
            if end - start >= minimum_windows:
                runs.append((round(start * frames / rate, 2), round(end * frames / rate, 2)))
            start = None
    return runs


def main():
    destination = OUTPUT / "music_combat_arc.m4a"
    if CATALOG.exists():
        catalog = json.loads(CATALOG.read_text())
        locked = next((item for item in catalog["versions"].values()
                       if item["source"] == "music_combat_arc"), None)
        if locked:
            if not destination.exists():
                raise RuntimeError("Versioned combat arc is missing; restore its exact file instead of rebuilding")
            actual = hashlib.sha256(destination.read_bytes()).hexdigest()
            if actual != locked["sha256"]:
                raise RuntimeError("Combat arc differs from its versioned SHA-256; refusing to overwrite")
            print(f"{destination.relative_to(ROOT)}: versioned asset already exists")
            return
    with tempfile.TemporaryDirectory(prefix="nexus-verge-combat-") as directory:
        temp = Path(directory)
        passages = []
        sample_rate = None
        for name, end_seconds in PASSAGES:
            source = OUTPUT / f"{name}.mp3"
            if not source.exists():
                raise RuntimeError(f"Missing generated passage: {source}")
            decoded = temp / f"{name}.wav"
            convert(source, decoded, "-f", "WAVE", "-d", "LEI16")
            rate, samples = read_passage(decoded, end_seconds)
            if sample_rate is not None and rate != sample_rate:
                raise RuntimeError("Combat passages have different sample rates")
            sample_rate = rate
            passages.append(samples)

        fade_frames = round(CROSSFADE_SECONDS * sample_rate)
        fade_samples = fade_frames * 2
        combined = blend(blend(passages[0], passages[1], fade_frames), passages[2], fade_frames)
        intro = passages[0][:fade_samples]
        combined = combined[fade_samples:]
        for frame in range(fade_frames):
            weight = (frame + 1) / fade_frames
            for channel in range(2):
                index = frame * 2 + channel
                tail = len(combined) - fade_samples + index
                combined[tail] = round(combined[tail] * (1 - weight) + intro[index] * weight)

        gaps = quiet_runs(combined, sample_rate)
        if gaps:
            raise RuntimeError(f"Combined cue has near-silent gaps: {gaps}")

        wav_path = temp / "combat_arc.wav"
        with wave.open(str(wav_path), "wb") as audio:
            audio.setnchannels(2)
            audio.setsampwidth(2)
            audio.setframerate(sample_rate)
            audio.writeframes(combined.tobytes())
        compressed = temp / "combat_arc.m4a"
        convert(wav_path, compressed, "-f", "m4af", "-d", "aac", "-b", "128000")
        content = compressed.read_bytes()
        destination.write_bytes(content)

        record_path = OUTPUT / "generation-record.json"
        record = json.loads(record_path.read_text()) if record_path.exists() else {}
        record["music_combat_arc"] = {
            "file": destination.name,
            "sha256": hashlib.sha256(content).hexdigest(),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "sources": [name for name, _ in PASSAGES],
            "edit_ends_seconds": [end for _, end in PASSAGES],
            "crossfade_seconds": CROSSFADE_SECONDS,
            "status": "candidate",
        }
        record_path.write_text(json.dumps(record, indent=2) + "\n")
        print(f"{destination.relative_to(ROOT)}: {len(combined) / (sample_rate * 2):.1f}s; "
              f"no near-silent gaps; {len(content)} bytes")


if __name__ == "__main__":
    main()
