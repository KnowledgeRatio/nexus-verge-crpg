# Audio identity direction

Creative direction, 2026-10-23. The broader audio identity and criteria below remain proposed. The initial brief paired a genuine 3D tavern comparison with replacing the fireplace-dominated sound. After the two-stem implementation, the sponsor accepted the tavern soundscape for this experiment (“i love the soundscape btw”). That approval does not establish acceptance of the broader identity or production deployment. See the [tavern implementation and validation](tavern-study/README.md) and [audio provenance](tavern-study/audio-v2-provenance.md).

**Current experiment status:** the sponsor subsequently chose illustrated rooms
and character images instead of the 3D interior. The accepted voices/activity
files are unchanged; the earlier-fireplace selector remains removed. As of
2026-10-24, merchant, blacksmith and great
hall have private local soundscapes accepted by the sponsor, who signed off
completion of [issue #59](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/59)
on that date.
They are excluded from public builds. See [current building interiors](building-interiors/README.md).
The [soundscape review record](../reports/2026-10-24-settlement-soundscapes.md)
separates recovered access, generated candidates, technical checks and sponsor
listening acceptance. This does not approve the broader identity or public release.
The subsequent [soundscape-variety slice](../reports/2026-10-24-soundscape-variety.md)
is implemented locally with independent seeded choices: two exterior mixes each
for villages/towns/cities and two mixes per building. Ten newly generated takes
are private candidates without sponsor listening approval; the four previously
accepted mixes remain unchanged. Opt-in selectors and local gain controls support
audition; exterior playback stops on entry indoors, restricted views, departure
and tab hide. Returns start muted. This implements local variety and playback
lifecycle, not the proposed crossfades, dialogue ducking or independent global
ambience bus described below. Public builds strip the new private candidates.
The 2D/3D trial criteria below remain historical/proposed direction, not active
comparison controls or acceptance of an overall audio system.

## Creative thesis

**The Verge sounds like people keeping a foothold in a world whose familiar materials occasionally behave impossibly.**

The player should remember the relief of hearing ordinary life after an uncertain journey, then feel enough curiosity and attachment to speak to someone and venture out again. Desperate wonder requires contrast: danger does not make every room ominous, and refuge need not become a comic drinking party.

The sensory foundation is tactile, worn and inhabited. Wood has body, cloth softens contact, iron rings briefly, and people occupy a believable room. The extraordinary earns attention by changing a familiar acoustic relationship. Volume and cinematic bass are not substitutes for meaning.

## Evidence and current limits

- `tools/audio-gen/style-guide.md` already establishes worn acoustic/found materials, a recurring musical motif, restrained effects, and separation of music from action sounds. Extend this foundation.
- `data/audio/cue-versions.json` selects `overworld-v02` and `combat-v09`. The former is described as retained at the user's request; the latter is a 53.2-second edited arc. Their prompts use related D-F-G / D-F-G-A ideas, strings, reeds and hand percussion. Prompted pitches and metadata are not proof of the generated notes or a listening judgment.
- `src/ui/CombatSceneStudy.js` reads the music catalogue. `src/systems/AudioManager.js:loadMusic()` contains only commented example tracks; repository search found no other `playMusic()` call. Existing music candidates do not establish a working main-game music transition system.
- At the start of this review, `data/buildingInteriors.json` selected one tavern ambience file and `BuildingInteriorArt.js` owned opt-in playback. The implementation now delegates playback to `BuildingAmbience.js`, with two stems (voices at 0.55, activity at 0.14), opt-in/mute and a room-level slider. The earlier-fireplace comparison existed during the 3D trial and has been removed from the current catalogue. In the game, `AudioManager` applies master × music × configured stem volume × room level; the study without that manager uses stem volume × room level. The room slider is a local gain, not an independent global ambience bus. The sponsor's subsequent listening approval applies to this tavern experiment; generation and working controls alone would not establish that approval.
- `docs/art/tavern-study/inhabited-prompts.txt` records an eight-second generation beginning with “gentle hearth crackle,” edited to a 7.7-second loop. A crossfade can smooth its join but cannot supply missing human activity or room perspective. The sponsor's listening report is the evidence of its tonal failure; this review has not listened to the file.
- `docs/world/WORLD.md` and `COSMOLOGY.md` govern meaning. The image guide's older “pure entropy” and universal medieval restriction conflict with that canon and must not become new audio rules. Its worn materials, restrained focal contrast and specificity remain useful visual counterparts.

## A shared sound language

| Domain | Intended feeling and sound | Constraint |
| --- | --- | --- |
| Travel and wilderness | Invitation with exposure: ecology, air and surface sounds, with sparse musical statements and room for discovery | Avoid continuous threat drones. Ecologies need specific, restrained differences rather than an exotic sound on every tile. |
| Settlement | People have made this place work: labour, distant exchanges and local materials arranged around a readable activity | Density follows visible/implied occupancy. A quiet outpost cannot sound like a market crowd. |
| Tavern | Earned relief, company and possibility: human room murmur first, practical activity second, hearth third | Conversational rather than riotous. No stereotyped saloon, jolly drinking chorus or close-miked fireplace. |
| Mundane action | Reliable material consequence: distinct release, contact and settling, with short tails | No hit sound on a miss; no decorative impact disconnected from a visible action. Preserve existing combat timing contracts. |
| Magic | Familiar matter briefly exhibits an impossible relation: a scrape carries a second material's resonance, a short impulse blooms beyond its expected body | Build effect families around action/material and readable outcomes. Do not invent per-spell lore or claim all magic is Source energy. |
| Source-related experience | Loss of distinguishable boundaries, expressed sparingly through formerly separate resonances becoming one continuous relationship | Proposed perceptual treatment, not new canon or a universal spell sound. No holy choir, serenity, power-up charge or sensory overload. |
| Void encounter | The local soundscape loses detail, sustain or participants while necessary action feedback remains legible | Reduction at encounter scale; no evil whispers, hungry growls or villain bass. Do not portray every encounter as retroactive regional erasure. |
| Interface | Quiet, tactile confirmation that respects attention: a brief material cue only when an action benefits from confirmation | No mandatory hover ticks or constant musical chimes. Important information must also be visible. |
| Combat and aftermath | Readable physical agency under pressure; evolving chamber-scale score, then space to perceive the consequence | Keep score and action effects separate. Relief is a change in density, not an obligatory victory fanfare. |

Identity comes from relationships shared across these domains: physical detail, restrained impossibility and deliberate space. It does not require one instrument or a three-note jingle on every interaction. Existing musical candidates remain reference material until heard in the integrated mix; do not silently replace the sponsor's selected overworld take.

## Tavern replacement brief

The listener is inside the common room, several metres from the hearth. Small groups converse around tables; the innkeeper works behind the bar. Speech is unintelligible, broad and softly overlapping, with enough midrange body to imply people rather than hiss. Occasional mugs, bench movement and footsteps belong to the same modest timber-and-stone room. Nothing should sound recorded with a microphone against a burning log.

For the first audition, favour a room bed and separately controllable sparse activity. Omit fire from the room-bed generation entirely if it keeps dominating. A later fire layer should become noticeable when listened for, not announce the setting. Generate longer source material where available, preserve original takes and provenance, then inspect/edit the actual join. A loop setting is not evidence of a seamless result.

Choose crowd density to match the shot: a populated common room can imply people beyond camera, but a room showing only two quiet patrons needs a lighter bed. Do not have the sound invent a festival offscreen. Avoid distinct phrases and repeated laughter hooks, which expose a short loop quickly and compete with reading.

The near-term audition should expose room sound independently of music. Compare at similar perceived loudness; simply making the replacement louder is not a quality test. Introduce the existing score separately once the room works. A proposed refuge variation can later keep the family resemblance of the travel theme while reducing pulse and arrangement density; it does not need to sound like a musician physically present unless one is shown.

For the parallel implementation, request separate 30-second room and activity candidates where the connected provider supports that duration. A provisional human-to-activity gain ratio of 1:0.25 is an audition starting point, not a measured mix: generated source loudness can differ substantially. Keep the old hearth file out of the initial replacement. Provide the old/new sound comparison independently of the illustrated/3D comparison. Use a simple room-sound level plus mute rather than requiring a full production mixer to judge this experiment.

## Experience and mix direction

1. **Approach:** the outside establishes exposure and place. A later doorway transition can reveal indoor human presence before entry, if the view and interaction support it.
2. **Enter:** exterior yields over a short natural transition; room body and company become apparent. The player's first impression is people, then hearth and furnishings.
3. **Look and choose:** audio supports the room without issuing constant demands. In 3D, moving the camera should preserve believable source positions; fixed illustrated views should use a consistent listening perspective.
4. **Converse:** reduce incidental activity sufficiently for reading or future voiced dialogue; do not make all the inhabitants abruptly vanish. Preserve explicit mute and independent controls as the system expands.
5. **Leave:** room sound ends with the room, outside returns, and eventual score transitions carry continuity without restarting a recognisable hook at every door.

Proposed long-term mix categories are music, ambience, action effects and dialogue, under master gain. Important action/voice information has priority over decorative activity. Camera perspective is not a requirement to spatialise every sound: diffuse room conversation is a bed, while clearly visible hearth or localized action can have a position. Avoid changing the apparent room size between adjacent effects by applying unrelated reverb tails.

Silence has creative value, but do not use it to remove required warnings or to hide playback failure. Audio remains optional. No control, quest state or combat outcome may depend on hearing alone.

## Fair 2D / 3D trial

Use the same tavern action set, comparable lighting/composition, NPC information and replacement audio for both presentations. The experiment is whether actual depth, parallax, occlusion and a small amount of camera freedom add presence and help the player understand the room. A high-quality background image alone does not answer that question.

One large accessible common room is sufficient. Keep a direct path between entrance, tables and bar, a clear exit, and no backroom requirement. Three-dimensional geometry need not be an automatic image conversion: generated art can guide materials and composition while constructed geometry supplies stable spatial relationships. Judge any simplified prototype's depth and interaction separately from unfinished furniture/art polish.

## Acceptance evidence

- In an initial audio-only listen, the sponsor identifies an inhabited indoor social space before being told that it is a tavern. The dominant impression is people in a room, not crackle, hiss or one repeated mug.
- Audition several consecutive loops on headphones and ordinary speakers. Record audible seams, recognizable repeated events, brittle upper frequencies, intelligible phantom words and listening fatigue. “Playback advances” is a technical check, not sound approval.
- With the room visible, population, source distance and room size feel plausible. Hearth placement agrees with its sound if positional audio is used.
- During a full conversation/rest/exit sequence, the room supports attention; it neither overwhelms text nor goes unnaturally dead. Mute and tab/exit behaviour remain reliable.
- Compare illustrated and 3D views with the same audio at matched perceived level. Ask which provides greater presence, clearer interaction and stronger desire to remain; record the sponsor's preference rather than inferring immersion from polygon count.
- Listen to a travel → tavern → conversation → travel → combat sequence before accepting the overall identity. Existing music, room beds and effects must sound like the same authored game without every segment sharing equal intensity.
- Keep generation, editing, browser validation and listening acceptance as separate recorded facts. Candidate sound does not become approved because generation succeeded.

## Ownership and handoff

Creative Director owns this experiential direction and integrated coherence review. Creative Prompt Engineer translates the tavern and magic briefs into model-specific candidate prompts. Frontend owns presentation and audition controls; architecture owns any production mix-system change. Worldbuilder retains authority over new cultural/music customs and cosmological claims. The documentation handoff should record exactly which audition assets and controls were actually implemented; the larger identity above remains proposed until integrated and accepted by the sponsor.

## Candidate generation briefs

Creative Prompt Engineer supplied these executable ambience prompts for the connected tool's 450-character limit. Suggested settings: `duration_seconds: 30`, `loop: true`, `prompt_influence: 0.65`. These are briefs, not generation records; actual output IDs, settings and editing belong with the generated candidate's provenance.

Human bed (434 characters):

```text
Populated frontier inn, heard from entrance: 8–12 adults in groups 3–8 metres away. Continuous low overlapping unintelligible conversation dominates, rounded human midrange, natural pauses, warm short timber-and-stone room reflections. Stable perspective, irregular variation, seamless ambient bed. No intelligible words, close voices, whispers, cheering, singing, music, instruments, hearth, crackle, hiss, modern bar or cavern echo.
```

Activity (445 characters):

```text
Sparse frontier inn activity heard 3–8 metres away: occasional earthenware mugs softly set on wooden tables, one bench creak, a few soft boot steps on floorboards. Irregular quiet intervals, rounded pottery and wood, short warm timber-and-stone reflections, stable distant perspective. Supporting ambient loop. No voices, music, hearth, crackle, glass clinks, metal clangs, loud impacts, close microphone, modern appliances, hiss or cavern echo.
```

A subsequent magic timbre study should begin with one dry stone-and-wood contact, then develop a few quiet inharmonic resonances with differing decay lengths before settling. Its physical origin must remain recognisable. This explores material impossibility without asserting a spell, Source energy or Void intent. It is a separate study, not tavern ambience.
