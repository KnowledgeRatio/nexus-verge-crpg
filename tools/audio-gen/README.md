# Audio cue versioning and local preview

`data/audio/cue-versions.json` is the versioned catalogue. Every generated music and effect asset has a stable version ID, SHA-256, generation date, prompt reference, review status, and note. `current` selects the active combat and overworld cues. The combat study builds its cue selector from the catalogue, so its labels and default stay in sync. The v8 combat prompt was recovered from the local generation record and is listed as an unreviewed candidate.

Run `python3 tools/audio-gen/version_catalog.py verify` to check the catalogue, prompts, local assets, and private generation record. Use `--metadata-only` on a checkout without local audio. Run `python3 tools/audio-gen/start_preview.py` and open the stable loopback URL it prints. The sound effects toggle controls the study action samples. The preview server blocks dotfiles and the private generation record.

For a new take, add a new ID and prompt to `mvp-prompts.json`, then run `python3 tools/audio-gen/generate_mvp.py NEW_ID`. The generator reads `ELEVENLABS_API_KEY` from the environment or Git-ignored `.env.elevenlabs.local`, writes the asset and private `generation-record.json` under ignored `data/audio/local/`, and refuses to replace a versioned asset. Register the result with `python3 tools/audio-gen/version_catalog.py register --source NEW_ID --family combat --revision 10 --label 'Combat v10 · description'`. After listening review, run `python3 tools/audio-gen/version_catalog.py promote combat-v10` to change the current cue. Use the next unused revision and verify again. Do not reuse a prompt or file ID for a different generation.

The current combat v9 is a 53.2-second composition of `music_combat_arc_a`, `music_combat_arc_b`, and `music_combat_arc_c`. `build_combat_arc.py` trims their generated fade-outs, crossfades the passages and loop seam, and checks for near-silent gaps. It refuses to overwrite the locked v9 output. A new edit needs a new output ID and catalogue entry.

Combat Study plays a locally derived PCM WAV for v9 because some browsers reject its AAC/M4A stream. `start_preview.py` creates the WAV from the hash-checked v9 master when needed; the catalogue keeps the original M4A and SHA-256 as the immutable version.

The music previews were made with ElevenLabs Sound Effects because this account could not access the Music API when they were generated. Combat v3, v4, and v6 had measured quiet gaps; v7 was continuous but repetitive. Game action sounds are separate and triggered by release and impact events. `music_overworld_music_api` and `music_combat_music_api` retain dedicated Music API prompts for a later paid-plan generation. Exact notes, chords, instrument identity, and loop joins are not guaranteed by the Sound Effects model, so judge candidates by ear.

## Settlement soundscape review (#59)

The settlement candidates use `data/buildingInteriors.json`, independently of
the combat/overworld cue catalogue. Merchant, blacksmith and great-hall mixes
reference ignored `data/audio/local/settlement-{merchant,blacksmith,greathall}-v1.wav`
files. The sponsor accepted the selected soundscapes and signed off issue #59
on 2026-10-24; they remain private local assets, not published assets.
Their `localOnly: true` mixes are stripped from the packaged catalogue
by `scripts/build-web.mjs`, including mixes inside room variants. Public builds
therefore do not show controls for these unavailable candidates. The approved
tavern voices/activity mix is unchanged.

With the private files present, serve the repository on loopback and open
`settlement-study.html?building=merchant` (current review instance:
`http://127.0.0.1:8780/settlement-study.html?building=merchant`). Select merchant,
blacksmith or great hall using **Visit**, then **Enable ambience**. Each room
starts muted; **Room level** adjusts its local gain. Leaving the room or hiding
the tab stops playback. A missing or failed source shows **Sound unavailable ·
retry**; retry recreates the media elements. The main game's master/music
settings also control these mixes; there is no new independent ambience bus.

ElevenLabs read-only checks and generation succeeded on 2026-10-24 after the
earlier `MCP -32603` failures. This establishes recovered access, not the cause
of those failures, a confirmed reconnect, or a billing/credit conclusion.
The [review record](../../docs/reports/2026-10-24-settlement-soundscapes.md)
links the generation manifest and validation. Reproduce the selected constant-gain
WAVs with `python3 tools/audio-gen/build_settlement_ambience.py` after restoring
all twelve hash-matched private MP3 sources and decoded WAVs; it refuses to
overwrite differing output.

## Settlement soundscape variety

The subsequent variety slice adds ten private 30-second candidates: one new
alternative for each building and two exterior beds for each village/town/city.
Existing four accepted mixes are retained. New takes are not listening-approved.
Exterior metadata lives in `data/settlementSoundscapes.json`; building choices
remain in `data/buildingInteriors.json`. Stable IDs and saved independent seeded
choices select defaults; manual selector changes do not rewrite saves.

With private audio present, open
[`http://127.0.0.1:8781/settlement-study.html`](http://127.0.0.1:8781/settlement-study.html).
Select settlement size and **Visit** square, then **Enable ambience** to hear the
exterior; choose a building for room mixes. **Sound** switches the available mix.
Exterior **Ambience level** and interior **Room level** control local gain. Entry
is muted; leaving, changing interior/exterior context or hiding the tab stops
playback. Returning requires re-enabling. Main-game master/music controls apply.

The [brief](../../docs/art/building-interiors/soundscape-variants-brief.md) and
[manifest](../../docs/art/building-interiors/soundscape-variants-generation-manifest.json)
record exact prompts, generation IDs, provider settings, hashes, levels and
processing. Original MP3s, decoded WAVs and final `settlement-*-v2.wav` outputs
remain in ignored `data/audio/local/`. The old three-output build script above
does not reproduce this ten-take batch; use the manifest's recorded processing
contract. Provider-reported generation cost is $0.1818 total, not an invoice
audit or proof of commercial entitlement. The [implementation report](../../docs/reports/2026-10-24-soundscape-variety.md)
separates technical checks from listening acceptance. Public build processing
strips `localOnly` exterior and interior mixes and excludes these binaries.

The current physical combat SFX matrix is `data/audio/combat-sfx.json`. It groups the weapons in `data/items.json` into reusable sword, edged, pointed, whip, blunt, bow, sling, firearm, dart, and blowgun families. The crossbow IDs in the item data are named and described as firearms. Release sounds play when the action releases; contact sounds play only for confirmed hits. An explicit full melee parry uses a material-neutral deflection; misses have no contact cue. Metal contact is selected only for armour IDs listed in the matrix; other targets use the restrained soft-contact fallback. Critical hits reuse the same material sound at a slightly higher level. Player and companion falls use a body or armoured-gear cue; corporeal monster falls use a neutral creature cue; the listed incorporeal monsters have no fall sound. The main game and Combat Study both read this matrix. The game falls back to the existing bundled sounds if a local generated candidate is absent. New generated cues are catalogued as candidates until they have been listened to and accepted.

This GitHub repository is public. Only the catalogue, prompts, and build recipe belong in Git. [ElevenLabs' prohibited-use policy](https://elevenlabs.io/use-policy) restricts standalone distribution of Sound Effects outputs, and [free-plan outputs cannot be used commercially](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform). Keep the audio binaries, API key, and private generation record outside public Git. Store any binary backup in a private location with rights appropriate to its use. The project guide also forbids automatic commits; review and commit the metadata changes manually.
