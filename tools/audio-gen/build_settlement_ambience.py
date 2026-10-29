#!/usr/bin/env python3
"""Build level-matched local settlement audition WAVs; never generates paid audio."""

import array
import hashlib
import json
import math
from pathlib import Path
import sys
import wave

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'docs/art/building-interiors/soundscape-generation-manifest.json'


def read_pcm(path):
    with wave.open(str(path), 'rb') as source:
        if source.getsampwidth() != 2:
            raise ValueError(f'{path.name}: expected 16-bit PCM')
        params = source.getparams()
        samples = array.array('h', source.readframes(source.getnframes()))
        if sys.byteorder != 'little':
            samples.byteswap()
        return params, samples


def measurements(samples, channels, rate):
    rms = math.sqrt(sum(value * value for value in samples) / len(samples))
    peak = max(abs(value) for value in samples)
    return {
        'durationSeconds': len(samples) / channels / rate,
        'rmsDbfs': round(20 * math.log10(max(rms, 1e-12) / 32768), 3),
        'peakDbfs': round(20 * math.log10(max(peak, 1e-12) / 32768), 3),
        'clippedSamples': sum(abs(value) >= 32767 for value in samples),
        'boundaryStep': max(abs(samples[c] - samples[-channels + c]) for c in range(channels)),
    }


def main():
    manifest = json.loads(MANIFEST.read_text())
    for source in manifest['sources']:
        for field in ('source', 'decoded'):
            path = ROOT / source[field]
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            key = field + 'Sha256'
            if source.get(key) not in (None, digest):
                raise ValueError(f'{path.name}: recorded hash mismatch')
            source[key] = digest
    for selected in manifest['selected']:
        source = next(s for s in manifest['sources']
                      if s['building'] == selected['building'] and s['take'] == selected['take'])
        params, samples = read_pcm(ROOT / source['decoded'])
        before = measurements(samples, params.nchannels, params.framerate)
        gain_db = min(selected['targetRmsDbfs'] - before['rmsDbfs'],
                      selected['maxPeakDbfs'] - before['peakDbfs'])
        gain = 10 ** (gain_db / 20)
        output = array.array('h', (round(value * gain) for value in samples))
        after = measurements(output, params.nchannels, params.framerate)
        if after['clippedSamples']:
            raise ValueError('Audition output clips')
        if sys.byteorder != 'little':
            output.byteswap()
        path = ROOT / selected['output']
        # Write to a temporary sibling first, then refuse to replace a different existing take.
        temporary = path.with_suffix('.pending.wav')
        with wave.open(str(temporary), 'wb') as target:
            target.setparams(params)
            target.writeframes(output.tobytes())
        digest = hashlib.sha256(temporary.read_bytes()).hexdigest()
        if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            temporary.unlink()
            raise ValueError(f'{path.name}: existing output differs; use a new revision')
        temporary.replace(path)
        selected.update({'sourceGenerationId': source['generationId'], 'gainDb': round(gain_db, 3),
                         'sourceMeasurements': before, 'outputMeasurements': after, 'sha256': digest})
        print(f"{selected['building']}: {after['durationSeconds']}s, RMS {after['rmsDbfs']} dBFS, peak {after['peakDbfs']} dBFS")
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
