# Tavern room audio v2 provenance

Generated 2026-10-23 for a local audition. The sponsor accepted the tavern
soundscape for this experiment, saying “i love the soundscape btw.” This does
not approve the broader proposed audio identity. Provider source terms have not
been independently verified; this record
does not assert licence clearance, exclusive rights or deployment.

Provider: ElevenLabs, `eleven_text_to_sound_v2`. Flow: `xodcX5C2kTM26WLbci1e`.
Both requests used `duration_seconds: 30`, `loop: true`, and
`prompt_influence: 0.65`. Loop mode is a generation setting, not evidence that
the join is inaudible.

| Stem | Generation | Runtime file |
| --- | --- | --- |
| Voices | `EDWAA0bgpn7mn5rG0LMN` | [`tavern-voices-v2.wav`](../../../data/sound/tavern-voices-v2.wav) |
| Activity | `o1OausvqpDiro3uGL8Wn` | [`tavern-activity-v2.wav`](../../../data/sound/tavern-activity-v2.wav) |

MP3 generation outputs were converted to PCM WAV with `afconvert`; no additional
crossfade was applied. Both runtime WAVs are 30 seconds, stereo, 44,100 Hz.
The current audition mixes voices at 0.55 and activity at 0.14, multiplied by the
room-level control and, in game, master/music gain. The previous fireplace loop
was a separate comparison choice during the 3D experiment; the current
illustrated-building catalogue omits it. Those gains are retained experiment
settings, not measured
perceived-loudness matching.

## Generation prompts

Voices:

```text
Populated frontier inn, heard from entrance: 8–12 adults in groups 3–8 metres away. Continuous low overlapping unintelligible conversation dominates, rounded human midrange, natural pauses, warm short timber-and-stone room reflections. Stable perspective, irregular variation, seamless ambient bed. No intelligible words, close voices, whispers, cheering, singing, music, instruments, hearth, crackle, hiss, modern bar or cavern echo.
```

Activity:

```text
Sparse frontier inn activity heard 3–8 metres away: occasional earthenware mugs softly set on wooden tables, one bench creak, a few soft boot steps on floorboards. Irregular quiet intervals, rounded pottery and wood, short warm timber-and-stone reflections, stable distant perspective. Supporting ambient loop. No voices, music, hearth, crackle, glass clinks, metal clangs, loud impacts, close microphone, modern appliances, hiss or cavern echo.
```

See [audio identity direction](../audio-identity-direction.md) for proposed
creative criteria, and the [tavern comparison](README.md) for implementation and
technical validation. Neither prompt content nor successful playback proves the
rendered sound meets those criteria.
