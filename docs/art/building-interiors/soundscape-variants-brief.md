# Settlement and building soundscape variations

2026-10-24 — generated candidates for local audition, not listening acceptance or public release.

This expands the existing illustrated-room soundscapes with one alternative per building and two exterior beds for each settlement size. It follows the inhabited frontier direction in `../audio-identity-direction.md`, the restrained materials in `../../../tools/audio-gen/style-guide.md`, and `../../world/WORLD.md` / `../../world/TECHNOLOGY.md`. These scenes introduce no cultural customs or new narrative facts.

Village lanes and workyards leave long quiet intervals between a few people and practical tasks. Town markets and workcourts layer several groups with moderate labour. City streets and markets have more overlapping activity at different distances, without implying a festival. Size is expressed through occupancy and depth, not simply volume. The tavern remains conversation-led; merchant, smithy and civic hall alternatives vary practical activity within their existing roles.

The [manifest](soundscape-variants-generation-manifest.json) records exact prompts, provider settings, generation identifiers, reported prices, source/output hashes and measurements. Each prompt is below 450 characters. Ten separate briefs each produce one 30-second take through connected ElevenLabs `sfx` nodes using `eleven_text_to_sound_v2`, `loop: true`, and `prompt_influence: 0.65`. Prompts and model settings do not guarantee reproducible generated waveforms.

Original MP3s, decoded PCM WAVs and level-matched output WAVs remain under ignored `data/audio/local/`. Existing accepted assets must remain unchanged. Constant-gain processing uses the same measurement and rounding conventions as `tools/audio-gen/build_settlement_ambience.py`, with the exact calculation in the manifest. No added effects, compression or seam edits are implied.

Technical measurements are separate from hearing the result. Audition several loops on headphones and speakers for unintelligible rather than distinct speech, plausible population, restrained incidental activity, audible joins, recognizable repeated hooks, hiss and fatigue. Compare the alternative tavern against the accepted voices/activity mix at comparable level. Provider loop mode and a small sample boundary step do not establish an inaudible seam. These candidates have not received sponsor listening acceptance.
