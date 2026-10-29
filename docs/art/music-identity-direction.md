# Music identity: people making a place worth returning to

Creative direction, 2026-10-24.

**Sponsor-approved intent:** add actual music over selected tavern, town and city soundscapes, including solo travelling performers and small groups, with variation associated with the relevant cultures. The sponsor requested a music identity document and creative-agent involvement. The specific palettes, instruments, tempi and arrangements below are proposed audition direction, not approved traditions or accepted recordings.

This document directs the first diegetic music slice: music understood to be played by people in the scene. It complements [audio identity](audio-identity-direction.md) and the [audio generation style guide](../../tools/audio-gen/style-guide.md). It does not replace the selected overworld/combat score. World meaning remains governed by [WORLD](../world/WORLD.md), [PEOPLES](../world/PEOPLES.md) and [COSMOLOGY](../world/COSMOLOGY.md). No musical custom or instrument is currently established for these cultures in those sources; the palettes are production interpretations reviewed for compatibility by Worldbuilder.

## Creative thesis

**After a dangerous journey, hearing someone choose to make music should make the player feel that this place contains lives worth returning to.**

The desired memory is a particular room or street with a particular performance: a small melody being answered, a player finding a quiet corner, a familiar phrase returning with a different ending. Earned relief can be warm, companionable and occasionally playful. Desperate wonder does not require every performance to sound frightened or mournful. Neither does refuge require an endless drinking party.

The musical identity comes from audible human scale, expressive variation and local social context. Worn instruments remain musical and playable; damage, detuning and noise are not substitutes for character. The convergence premise permits different musical practices to coexist without reducing an entire culture to one real-world musical stereotype.

## Experience arc

Arrival establishes the ordinary room or street first. Enabling a musical option reveals one plausible nearby performance, with the surrounding activity still audible. The player can listen, read, speak to people or return to a music-free mix. On leaving, that performance belongs to the place left behind; it does not become an invisible companion following the player through every doorway.

Preserve the illustrated rooms and existing people. An offscreen musician is plausible, but the audio must not imply a packed stage, cheering audience or elaborate visible event absent from the scene. Do not add performer NPCs or rewrite their identities merely to justify a reusable cue.

## First audition palette

Four performances provide a bounded first comparison. Culture IDs below are the actual IDs in [`data/cultures.json`](../../data/cultures.json). Instrument names are practical production vocabulary, not new canonical ethnomusicology. Tempo ranges are compositional targets, not claims about generated audio.

| Culture ID | Canon anchor | Proposed ensemble and musical behaviour | Intended use and feeling |
| --- | --- | --- | --- |
| `kethara` | Pragmatic solidarity; people making their lives here | Plucked strings with a softly played frame drum; two performers, roughly 88–100 BPM. A clear shared pulse, short melodic turns and varied answering endings. | Tavern company or a modest town/city gathering. Warmth chosen in the present; capable and sociable without compulsory revelry. |
| `vaethori` | Emotion held within structure; civic belonging alongside colonial power | A low reed with bowed or plucked strings; two or three performers, roughly 76–88 BPM. Measured phrases, restrained counterline and a regular pulse without military accents. | An evening tavern or town/city public space. Composure and fellowship, without advertising imperial triumph. |
| `verathi` | Memory, open debate and interpretations that remain revisable | Plucked strings and a low reed; two performers, roughly 64–76 BPM. One line proposes a phrase; the other changes its ending, with unhurried ornament and breathing space. | A tavern corner or quieter town/city courtyard. Attentive curiosity and layered memory, not an ethereal racial stereotype. |
| `sirathi` | Survivors who have already passed through grief and continue with purpose | One travelling plucked-string performer, roughly 68–80 BPM. A sustained melodic thought with small variations, a steady sense of continuation and occasional open, warmer intervals. | A quieter tavern or sheltered town/city corner. Tenderness and resolve; neither a perpetual lament nor a sentimental tragedy cue. |

These are individual performances associated with communities, not the only music any member can play. A Kethara town can host a Verathi musician. The same performance can plausibly appear in multiple places; more varied arrangement and repertoire can follow listening acceptance.

`delhari` and `vethri` are intentionally outside the first generated set. Delhari come from many origins and must not acquire a fictitious uniform national music. A later Delhari brief should describe a particular visitor's portable ensemble. Vethri minimalism suggests a later very sparse solo study, but neither compulsory silence nor ominous supernatural drones should define them. Deferring their cues does not remove existing ambience from their communities. Villages retain their size-specific ambience in this slice; village performances are a later extension, not a requirement to fill every scene with music.

## Cultural assignment

Cultures are social histories, separate from mechanical race and visual appearance. Use authored culture IDs, never inferred names, faces, gender or race. The current source of local membership is `settlement.npcs[].culture`; there is no established single `settlement.culture` identity. Existing quest reputation also derives local communities from NPC culture membership.

For exterior performances, eligibility should come from communities actually represented in the settlement roster. For taverns, use the relevant people present when that roster is available; the barkeep alone does not culturally determine every performer or patron. A scene can offer more than one local culture's performance. If no supported culture is present, retain the ordinary ambience options rather than relabelling an unrelated cue as local music. An explicit future visiting-performer record could justify other eligibility; a random invented ethnicity cannot.

Keep assignment seeded and independent of gameplay and artwork. Preserve stable saved choices when new cues arrive. Existing visits should not unexpectedly change because a library grew. Manual audition can expose available alternatives without silently rewriting a settlement's community or pretending that a player's choice establishes new canon. Precise receipt and migration details belong to the implementation owner and accompanying schema documentation.

## Composition and mixing

Generate separate instrumental performances, then overlay existing room or street ambience. Do not ask the music source to bake in crowds, mugs, work noises, dialogue or applause. Retain the accepted ambience sources unchanged. Independent stems allow a musician to remain intelligible without making the room louder or irreversibly replacing an accepted mix.

Start with approximately 60–90 seconds of musical development where the provider supports it. Let phrases change through register, ornament, counterline and endings rather than repeating one four-bar hook throughout. Natural breath and phrasing belong in the performance. A travelling troubadour may be represented instrumentally in this first slice; lyrics, invented languages and intelligible singing need their own narrative and voice direction later.

The ensemble should remain plausibly one to three players. Use acoustic body and intimate phrasing, with modest room reflections indoors and a less enclosed impression outside. A shared recording can serve both contexts if its recorded reverberation is restrained enough; do not claim positional room simulation when it is merely a gain-adjusted layer. Larger settlement size changes the surrounding density, not automatically the ensemble size or music volume.

At the default mix, melody should be audible without turning ordinary conversation into an indistinct noise floor. Reading several paragraphs should remain comfortable. A music-free option must remain readily accessible. Keep mute and local level controls clear and retain existing opt-in playback, scene departure and tab-hide behaviour. Separate per-stem controls, automatic dialogue ducking, spatialisation and doorway crossfades are future capabilities unless explicitly implemented and validated.

Do not require every culture to restate the travel/combat motif. A light family resemblance through tactile timbre and restrained scale is enough. Literal universal quotation would make independent local musicians sound like a single omnipresent score.

## Red lines

- No heroic orchestra, choir, trailer bass, modern pop production or American Western/saloon shorthand. Acoustic instruments are the first-slice palette, not a claim that world canon prohibits other technologies.
- No real-world culture reduced to an exotic preset, racial instrument assignment or presumed biological musical trait.
- No military march as the default Vaethori social life, mystical choir as Verathi identity, compulsory dirge as Sirathi identity or sinister emptiness as Vethri identity.
- No constant cheering, intelligible phantom speech or recognisable vocal hook baked into a repeating music layer.
- No replacing player-selected score, accepted ambience or music-free options as a side effect of adding performances.
- No new canon, final recording approval or deployment claim inferred from a successful generation request.

## Acceptance evidence

Audition each candidate first by itself, then over its intended tavern and exterior beds at comparable perceived level. Record actual instruments heard, ensemble scale, musical development, seam quality and any unwanted voice or production artifacts; prompted instruments and BPM are not listening evidence.

Listen through at least three repeats on headphones and ordinary speakers. Reject distracting loop edits, repeated transient hooks and fatigue. Compare two contrasting cultural performances in the same ambience to judge musical distinction, then the same performance indoors and outside to judge plausible perspective.

In the illustrated scene, read a full conversation and use a service while the mix plays. The performance should make the place more worth inhabiting without competing with comprehension. Verify that switching options stops the previous music, leaving stops the scene, returning stays muted, and unavailable private media cannot leave an unusable option in a public build. Technical playback checks establish operation; the sponsor's listening response establishes acceptance.

## Ownership and current evidence

Creative Director owns the emotional thesis and integrated coherence. Worldbuilder owns canonical cultural meaning. Creative Prompt Engineer owns executable prompts, generation and provenance. Implementation owners own eligibility, playback, persistence and controls. Documentation records the resulting runtime and validation separately from this proposed direction.

This document records the brief and canon compatibility review. Generated assets, their edits, measured properties, implemented catalogue entries and listening decisions must be linked in the delivery record when available. No recording has been listened to or accepted by writing this document.
