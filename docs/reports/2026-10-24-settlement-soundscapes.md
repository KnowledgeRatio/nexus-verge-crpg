# Settlement soundscapes — issue #59

**Status: sponsor accepted completion, 2026-10-24.** ElevenLabs access recovered and
merchant, blacksmith and great-hall soundscapes are integrated locally. After the
final-review handoff, the sponsor explicitly confirmed: “i sign off on this item
being completed.” This records listening acceptance and completion of issue #59's
review scope, not deployment or public audio release. Tavern remains the previously
approved voices/activity mix at 0.55/0.14.

## Review

With the review server running on loopback, open a room and select **Enable
ambience**. **Visit** switches rooms, **Room level** adjusts gain, and **Mute
ambience** stops playback. Audio starts off on each entry.

| Room | Review link | Selected take | Accepted runtime gain |
| --- | --- | --- | --- |
| Merchant | [Open shop](http://127.0.0.1:8780/settlement-study.html?building=merchant) | 3 | 0.4 |
| Blacksmith | [Open smithy](http://127.0.0.1:8780/settlement-study.html?building=blacksmith) | 2 | 0.35 |
| Great hall | [Open hall](http://127.0.0.1:8780/settlement-study.html?building=greathall) | 4 | 0.4 |

The review brief requested several 30-second loops on headphones and ordinary
speakers, judging room identity, distance and scale against the image; repeated
hooks, seams, harshness or phantom words; and support for conversation and trading.
The sponsor accepted the result without recording individual listening conditions
or findings. Signal analysis and advancing playback alone are not listening approval.
The broader [audio identity](../art/audio-identity-direction.md) remains proposed.

## Recovery and asset evidence

Read-only asset and model-schema requests succeeded on 2026-10-24. Twelve
generation requests then completed, four per room, using
`eleven_text_to_sound_v2`, 30 seconds, `loop: true`, and prompt influence 0.65.
This establishes recovered access; the earlier `MCP -32603` cause, whether a
reconnect fixed it, and historical failed-request charges remain unknown.

The [generation manifest](../art/building-interiors/soundscape-generation-manifest.json)
records generation identifiers, prompts/settings, source and output hashes,
measurements and provider-reported cost. The provider reported 1,200.9718 credits
and 21.816 US cents across the twelve completed requests; this is not an invoice
audit or proof of account entitlement. The initial estimate was 72 US cents.

MP3 sources and decoded WAVs remain in ignored `data/audio/local/`. The selected
three files use constant gain only to target −42 dBFS RMS, with no clipped
samples. Peaks fall between approximately −14.7 and −12.4 dBFS. Each is 30
seconds. No crossfade, compression or additional sound was applied; a provider
loop flag and small measured boundary steps do not prove an inaudible seam.
[`build_settlement_ambience.py`](../../tools/audio-gen/build_settlement_ambience.py)
checks source hashes and refuses to overwrite a differing output.

## Integration and release boundary

[`buildingInteriors.json`](../../data/buildingInteriors.json) configures the
three mixes generically. The source checkout can audition them in the study
and main game. `localOnly: true` removes each mix from the public build's
catalogue, recursively including variant mixes; private audio is not packaged.
Tavern remains available and unchanged in the built catalogue.
The [local-review terms assessment](../../legal/ASSET_ATTRIBUTIONS.md#settlement-soundscape-candidates--local-review-only)
records the distribution boundary and unresolved entitlement verification.

Playback uses the existing opt-in lifecycle and master/music controls. A failed
source now recreates its media elements on retry, allowing recovery after the
source becomes available. No independent global ambience bus was added.

## Validation

Five focused tests and scoped lint pass. The web build passes; build assertions
confirm the packaged tavern matches the source, the other three rooms have no
ambience property, and `data/audio/local/` is absent from the package.

The complete suite passes 1,696 tests across 151 files in 86.47 seconds with
two workers and a 60-second test timeout. Repository lint remains at 171 errors
and 1,174 warnings; broad lint remains at 3,247 errors and 2,419 warnings,
unchanged from the existing baseline. These are not clean full-repository lint
results.

Eight study browser flows (four rooms at 1440px and 375px) pass with actual
decoded playback and advancing time, keyboard Enable, local gain, mute,
tab-hide stop without automatic resume, exit cleanup and silent re-entry.
There is no horizontal overflow or page error. A failed-source/retry check
confirms recovery. Actual `index.html` checks with a settlement fixture and
real AudioManager pass for all four rooms: master × music gain, global disable
and re-enable, and an empty ambience registry on exit. These controlled fixtures
do not establish a full generated-world playthrough.

Independent checks confirm all twelve recorded prompts match the full submitted
briefs, all source/decoded/selected file hashes match the manifest, and the
approved tavern files match their baseline hashes. Changed documentation links
resolve locally; `git diff --check` passes. Sponsor listening acceptance was
subsequently given on 2026-10-24 as recorded above.

Re-running the deterministic WAV builder reproduces the same outputs and hashes
without errors. `npm run legal:verify` passes all 12 checks with no failures;
pre-existing warnings remain. That automated result does not establish account
entitlement or approve public distribution of these candidates.
