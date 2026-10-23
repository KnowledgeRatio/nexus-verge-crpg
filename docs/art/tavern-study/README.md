# Tavern illustration / 3D comparison — historical experiment

**Superseded direction, 2026-10-23:** the sponsor prefers generated room images
with character-image layers, including a first-person merchant counter, over
the 3D interior. The current implementation is documented in
[illustrated building interiors](../building-interiors/README.md). Normal game
and study interiors no longer mount the 3D comparison; `?view=3d` no longer
activates it. The renderer, builder and GLB remain archival development artifacts;
the room GLB is no longer explicitly included in the application bundle.

The accepted two-stem tavern soundscape remains unchanged. The old fireplace
comparison has been removed from the current catalogue. Everything below records
the earlier experiment and its historical validation, not current UI controls.

Implemented locally on 2026-10-23; no deployment or final art acceptance is
implied. Enter a settlement's tavern in `index.html` to see a fixed-view common
room with selectable NPC names, then choose **3D room** to compare real geometry.
The outdoor town scene is unchanged. For a direct 3D preview, open
`settlement-study.html?building=tavern&view=3d` on the local preview server
(current review instance: port 8779). Omit `&view=3d` to start with the
illustration. This study uses three NPC fixtures from
[`tavernStudy.json`](../../../data/tavernStudy.json), real dialogue/rest UI and a
temporary character; it does not write a saved campaign.

Both views present one common room with a bar, hearth and tables. There is no
accessible backroom or player walking system. The 3D view uses an authored GLB,
not automatic image reconstruction; no Blender conversion or `.blend` file is
included.
The backdrop and three transparent person illustrations are shared by taverns.
These are reusable visual stand-ins, not likenesses of generated NPCs; names and
available interactions still come from the current settlement. Optional generated
room ambience starts off on every entry.

## Interaction and fallback

In the illustration, up to three actual NPCs appear in configured slots: an innkeeper at the bar,
then two remaining NPCs around the tables. Unfilled slots are omitted. Selecting
a name opens the existing NPC dialogue and services in a right-hand drawer on
desktop or a bottom panel on mobile. The collapsed **Everyone here** list includes
all NPCs, including those without a picture, with their relation and quest
information. While the backdrop loads, if it fails, or when presentation is
disabled, the original expanded NPC list remains available. A failed person
image leaves its named interaction button usable.

The 3D view loads ten ambient residents using existing traveller models separately
from the room GLB. They are visual dressing, not named-NPC likenesses or a count
of the settlement's actual inhabitants. All actual NPC conversations remain
available through named buttons below the 3D viewport. Seven residents have
procedurally seated skeleton poses, with restrained head gestures; the groups
gather at the bar and tables. The room now has a bar on the left, a hearth on the
right, stone flooring, a timber ceiling and leaded windows.
`inhabitantHiddenGeometry` removes travel-pack geometry from cloned resident
instances; the shared traveller source assets are unchanged. Those instance
geometries are disposed with the scene.

**Inside tavern** is the default enclosed entrance view. **Room overview** offers
a cutaway by hiding the ceiling and right wall. Drag to orbit; focus the
canvas to use scroll-wheel zoom, arrow-key rotation, `+`/`−` zoom or `Home` reset.
**Reset camera** and `Home` restore the current camera mode's initial view.
Each mode has bounded orbit/zoom controls. Reduced motion retains posed residents,
stops their animation and light flicker, and renders the scene on demand. Switching to
**Illustration** disposes the 3D renderer; graphics failure restores illustration
and conversation access.
**Download 3D model** saves the room GLB for import into Blender or another glTF
editor. It contains the room and embedded textures, not the separately loaded
travellers. This download is not a native `.blend` authoring file.

At widths up to 767px, person illustrations and buttons appear beneath the room and the
hearth glow is hidden. Desktop has a subtle CSS hearth pulse; reduced-motion
preference stops that animation. Buttons support keyboard focus. Building entry
focuses the close button. Close, Leave Building and backdrop click return to the
settlement; Escape also returns when no NPC dialogue or active modal overlay is
open. Within the illustrated room, dialogue Escape or backdrop click closes the
dialogue first. Dialogue focuses its first option and restores the triggering
control on close.

**Sound** selects the two-layer **Inhabited room · audition** or the retained
**Earlier fireplace · comparison**, independently of visual mode. The new mix
uses 30-second voices/activity stems at provisional gains 0.55 and 0.14; the
earlier fireplace uses 0.45. **Room level** multiplies the selected mix's gains.
The sponsor accepted this tavern soundscape for the experiment on 2026-10-23
(“i love the soundscape btw”); the broader audio identity remains proposed.
The same sound continues
across visual-mode switches. **Enable ambience** starts playback;
**Mute ambience** pauses it.
Hiding the tab pauses playback without automatic resumption. Leaving or
rerendering the building, or exiting the settlement, disposes playback. In the
game, `AudioManager` applies master/music volume and global sound enablement;
the standalone study has no game audio manager and uses the configured volume.

## Configuration and source

- [`data/buildingInteriors.json`](../../../data/buildingInteriors.json) maps
  building types to an image, alt text, caption, optional glow coordinates and
  `people` slots, optional `scene3d` config path and `ambience` mixes containing
  labelled `tracks` with URL/volume. Slot `x`/`y` and `width`
  are percentages; optional `roles` filters eligible NPCs. Slots consume the
  first eligible remaining NPC, avoiding duplicate assignment. Only `tavern`
  is configured in this prototype.
- [`BuildingInteriorArt.js`](../../../src/ui/BuildingInteriorArt.js) fetches
  configuration and loads the selected image on building entry.
  [`SettlementUI.js`](../../../src/ui/SettlementUI.js) supplies the building's
  NPCs and existing dialogue callback.
- [`BuildingInteriorComparison.js`](../../../src/ui/BuildingInteriorComparison.js)
  owns the visual switch and lazy 3D loading;
  [`BuildingAmbience.js`](../../../src/ui/BuildingAmbience.js) owns sound selection,
  room gain and playback lifecycle. The broader
  [audio identity direction](../audio-identity-direction.md) remains proposed.
- [`tavernInteriorScene.json`](../../../data/tavernInteriorScene.json) configures
  the room asset, camera, lighting and ambient residents;
  [`TavernInteriorScene.js`](../../../src/rendering/TavernInteriorScene.js) renders it.
- `RULES.buildingPresentation.enabled` in
  [`rulesEngine.js`](../../../src/core/rulesEngine.js) disables the illustration
  and 3D comparison/ambience, retaining the original NPC list.
- [`styles.css`](../../../styles.css) controls layout, focus indication and glow.
  The web build includes the illustrated assets and room GLB in its application
  bundle; resident models reuse the existing character-art pipeline.

## Rebuild the room

Run `node tools/tavern-art/build-room.mjs` from the repository root. The original
procedural builder reads room/table configuration and writes
`data/graphics/interiors/tavern-common-room-v1.glb`. The visual-fidelity pass
rebuilds that same asset path with 29,172 triangles, 19 material batches, three
embedded textures and 9,563,812 bytes. Asset counts exclude separately loaded residents, their
animation and rendering overhead; they are not a frame-rate benchmark. Wood is
an original procedural texture; stone reuses existing generated
`dungeon-masonry-v1.png` and `dungeon-flagstone-v1.png`, embedded in the GLB.
No new downloaded geometry or source texture is introduced.

## Artwork provenance

[`tavern-interior-v1.png`](../../../data/graphics/tavern-interior-v1.png) was
generated on 2026-10-23 using OpenAI's built-in image generation tool. The exact
generation prompt is retained in [`prompt.txt`](prompt.txt). It requests an
unoccupied frontier common room so generated NPCs can remain separate interactive
UI elements. This record describes generation provenance, not a third-party
asset licence or a claim of exclusive rights.

The transparent `tavern-keeper-v1.png`, `tavern-patron-v1.png` and
`tavern-guest-v1.png` in `data/graphics/` were also generated on 2026-10-23 with
OpenAI image generation. They are illustrative stand-ins for the room slots.

[`tavern-ambience-v1.wav`](../../../data/sound/tavern-ambience-v1.wav) was generated
on 2026-10-23 with ElevenLabs `eleven_text_to_sound_v2`, generation ID
`Wuv02Xke4rAqXC6amv42`. The eight-second source was converted to PCM with
`afconvert`, then given a 0.3-second overlap crossfade to produce the 7.7-second,
44,100 Hz stereo WAV loop. Source terms have not been independently verified;
this is provenance, not a licence clearance or deployment claim.
The people/audio prompts and processing record are retained in
[`inhabited-prompts.txt`](inhabited-prompts.txt).

The replacement two-stem audition and its exact generation/editing record are in
[`audio-v2-provenance.md`](audio-v2-provenance.md). Technical playback success does
not establish a seamless loop, convincing room identity or sponsor approval.

## Validation

The visual-fidelity pass is locally implemented and source-inspected.
`npm test -- --testTimeout=30000` passed all 1,691 tests in 149 files.
Deterministic rebuild and finite-geometry checks passed; GLB counts were
independently inspected. `npm run build:web` passed with a 92.67 MiB application
bundle; legal verification passed 12 checks. Repository lint reports 171 errors
and 1,173 warnings, and broad lint reports 3,247 errors and 2,418 warnings;
focused checks have no errors.

Integrated browser flows at 375, 768, 1024 and 1920px verified Talk without
document horizontal overflow, rest, camera-mode controls, unchanged audio across
view switches, mute/exit cleanup and global sound settings. Scene checks verified
ten actors, seven seated poses with hip height 0.58m (0.52m seat + 0.06m), finite
transforms and 20 filtered per-instance geometry clones. Ceiling/right wall hide
only in overview. Reduced-motion rendering remained stable between changes;
normal animation advanced without invalid transforms. Exit disposed the cloned
geometry and no page errors were reported. These checks use fixtures and do not
establish full-campaign acceptance or hardware performance.

The accepted tavern sound files are unchanged by this pass. Current captures:
[inside tavern](inhabited-3d-room.png), [room overview](inhabited-3d-overview.png)
and [mobile](inhabited-3d-mobile.png). Earlier captures below are retained as
historical comparisons.

The following records the preceding 3D/two-stem implementation. Its GLB counts
and WAV formats were inspected.
`npm test -- --testTimeout=30000` passed all 1,691 tests in 149 files;
`npm run build:web` passed with an 88.61 MiB application bundle including the
room model, and `npm run legal:verify` passed. `npm run lint` reports 171 errors
and 1,154 warnings; `npm run lint:all` reports 3,247 errors and 2,399 warnings.
Focused checks of the new UI, renderer and authoring tool report no errors.
Integrated Chromium checks verified 3D loading, camera keys/reset,
dialogue/rest, opt-in advancing two-stem playback, mute, sound selection and
visual switching without replacing audio instances. Exit cleanup and silent
reentry passed. At 375, 768, 1024 and 1920px, Talk worked without document
horizontal overflow. Actual AudioManager checks covered master gain, global
disable and unregistration. Missing-GLB fallback retained Talk; room level 0.5
produced configured gains 0.275/0.07; exit stopped all tracks. The mobile camera
fit was refined using the actual model bounds with an 8% margin; projected-bound
checks and inspection of the refreshed mobile capture confirm the full room is
visible. Final build and focused lint passed after that refinement, with no
browser errors reported. Captures: [3D room](3d-room.png),
[rotated view](3d-orbit.png), and [mobile](3d-mobile.png).
The sponsor subsequently accepted this tavern soundscape for the experiment;
that listening judgment is distinct from the technical checks above.
These fixture checks do not establish generated-campaign
acceptance or hardware performance.

The following evidence is historical validation of the earlier
illustrated/one-track version.

Earlier Chromium
checks booted the actual study and verified three figures, named NPC dialogue,
the existing rest modal, opt-in audio with advancing playback, mute, exit
disposal and silent reentry. At 375, 768, 1024 and 1920px widths, named Talk
worked without document horizontal overflow. Inspected captures:
[desktop](inhabited-desktop.png), [mobile](inhabited-mobile.png) and
[conversation](conversation.png). The earlier backdrop-only captures remain
[desktop](desktop.png) and [mobile](mobile.png).

An actual `AudioManager` check verified volume multiplication
(`0.2 master × 0.7 music × 0.45 ambience = 0.063`), global-disable pause and
unregistration on exit. Edge checks covered a fourth NPC in **Everyone here**,
an empty room without invented occupants, reduced motion, tab-hide pause,
unavailable audio with usable conversation, failed background with original Talk
fallback, disabled presentation, and exiting before delayed configuration loaded.
These are controlled fixture flows, not acceptance of a generated campaign.
Final keyboard checks verified that Escape closes dialogue while keeping the
tavern open, focus returns to the named button, and backdrop click closes
dialogue. The edge checks above were rerun successfully after that refinement.

`npm run build:web` passed with 192 application files (73.42 MiB).
`npm run legal:verify` passed 12 checks with no failures, retaining warnings about
existing sound attribution and SBOM freshness. `npm run lint` reports 171 errors
and 1,134 warnings in existing code; `BuildingInteriorArt.js` and
`SettlementStudy.js` have no findings. The final
`npm test -- --testTimeout=30000` run passed all 1,691 tests in 149 files.
The initial backdrop-only default run had four existing
creature-animation timeouts resolved by the longer test timeout.
No deployment or hardware performance benchmark was performed.
