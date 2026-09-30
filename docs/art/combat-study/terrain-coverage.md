# Combat terrain coverage

Current implementation audit, 2026-09-27. This records coverage, not a replacement
for the product backlog. The goal remains a distinct scene for every terrain
where combat can happen, followed by complete monster presentation and saved
player appearance choices.

## Explicit overworld mappings

| Canonical terrain ID | Scene |
| --- | --- |
| grassland | Open meadow |
| forest | Woodland road, glade or bend |
| mountain | Mountain scree shelf |
| desert | Wind-scoured dune hollow |
| snowyPlains | Windswept snowfield |
| snowForest | Snowbound pine clearing |
| hills | Rolling hillside saddle |
| desertHills | Eroded sandstone pass |
| plains | Open grass plain |
| tundra | Lichen-covered tundra shelf |
| beach | Tidal strand |
| shallowWater | Broad shallow ford |
| swamp | Reed-choked marsh clearing |
| denseForest | Old-growth forest hollow |
| jungle | Jungle clearing |
| savanna | Acacia grassland |
| road | Frontier road |
| bridge | Broad timber crossing |
| farmland | Farm field headland |
| camp | Weathered tent camp |
| cave | Limestone cave mouth |
| ruins | Collapsed stone precinct |
| temple | Roadside stone shrine |
| monastery | Monastery garden court |
| watchtower | Watchtower forecourt |
| villa | Walled estate courtyard |
| residential | Residential lane |
| industrial | Forge and warehouse yard |
| town | Settlement street (forced challenge combat; random encounters disabled) |

The terrain additions use the existing outdoor builder with data-defined surface colors,
gravel density, sand/snow ripples, vegetation and rock shape. Their assets are
original, and are selected by the existing overworld terrainId metadata.
The study menu adds scenes directly from sceneVariants so new assets can be
reviewed without a second manually maintained HTML list.

## Dungeon mappings

| Canonical terrain ID | Scene |
| --- | --- |
| dungeonFloor | Dungeon chamber |
| dungeonDoor | Barred dungeon passage |
| dungeonExit | Stairs toward daylight |
| dungeonTreasure | Forgotten strongroom |
| dungeonTrap | Ancient pressure-plate hall |
| dungeonAltar | Subterranean ritual altar |
| dungeonRubble | Collapsed underground gallery |
| dungeonWeb | Web-choked crypt |
| dungeonIce | Frostbound vault |
| dungeonMushroom | Fungal cavern |
| dungeonBones | Ossuary gallery |

## Coverage limits

The main-game renderer catalogue sweep covers all 40 mapped contexts with a
real generated combat roster. It checks the selected scene, loaded environment
meshes and absence of legacy scenery, and captures each canvas under
`terrain-runtime/`. The harness starts a real forest encounter, then supplies
the remaining contexts explicitly; this is not a natural travel walkthrough.
The preview server restricts index.html, so the harness serves the actual local
index file through a browser route for this check.

Separate entry-point regressions exercise `Player.checkForEncounters` for every
positive-modifier traversable overworld terrain and `checkForDungeonEncounter`
for every walkable dungeon tile, including restored plain-object dungeon state.
They verify the terrain context reaching pending combat; encounter generation
is stubbed in these focused routing tests. Safe overworld terrain remains safe.

The catalogue review exposed excessive foreground space around tall scenery.
Camera framing now centres the combined projected scenery/formation envelope,
holding that focus during play. A shared minimum span reduces terrain-to-terrain
scale variation. Tests retain landmark clearance at two desktop sizes, stable
approach/retreat framing, and comparable duel readability across all scenes.

After the framing correction, all 40 contexts passed a fresh browser sweep with
no page errors. Open `terrain-runtime/gallery.html` for the complete screenshot
catalogue. Full suite: 1,201 passing tests. Legal verification passes. Changed
JavaScript has no lint errors; repository baselines remain 203 errors / 868
warnings for lint and 3,279 errors / 1,483 warnings for lint:all.

All 28 traversable overworld terrains with positive encounter modifiers, town
for forced challenge combat, and all 11 walkable dungeon terrains now have
explicit mappings. This does not yet prove full campaign travel/save/load.

Dungeon floor explicitly selects the existing dungeon chamber. Random and boss
encounters now capture tile terrain through DungeonManager.getEncounterContext.
The selector uses a separate dungeonTerrains mapping, preserving the dungeon
fallback and explicit study override. Their encounter probability uses a room
modifier: all 11 walkable dungeon tiles can reach the encounter check, including
dungeonDoor, dungeonExit, dungeonTreasure and dungeonTrap, now mapped explicitly.
Generator-authored dungeonWall, dungeonWater, dungeonPit and dungeonLava are
blocked by isWall and do not need combat scenes for normal traversal.
Settlement ambush context still selects settlement. Inaccessible or
zero-encounter overworld terrain must not be
treated as needing encounters solely to justify a visual asset.

## Forced encounter routing correction

The challenge-combat path previously passed a world tile's string terrain ID into
a function expecting a terrain object. It silently used grassland for scenery
and habitat filtering. `Player.triggerCombatEncounter` now accepts either form.
This corrects the generator's terrain input; XP budgets, difficulty, requested
enemy pools and combat rules are unchanged.

The same path was also labelling failed dungeon challenges as overworld combat.
It now captures `DungeonManager.getEncounterContext()` before asynchronous
generation, preserving the actual dungeon tile and type. The challenge entry
point awaits encounter setup so its returned promise represents completed setup.

Town has zero random-encounter probability, but the authored Sneak Past Guards
challenge names town and can initiate combat. Town therefore explicitly maps to
the existing settlement street. Coverage tests now include terrain names in
combat-producing challenge data, not just positive random-encounter modifiers.

Regression tests exercise all 11 restored dungeon tile types, normal overworld
challenges at levels 1/5/10, forced town combat and location capture across an
asynchronous room change. An isolated browser harness ran the actual challenge
entry point and encounter generator, then rendered the resulting pending-combat
context for dungeonDoor, dungeonWeb, dungeonIce and town. Captures are
`challenge-dungeonDoor.png`, `challenge-dungeonWeb.png`, `challenge-dungeonIce.png`
and `challenge-town.png`. No page or shader errors occurred. The harness supplies
the current world tile directly; it is not evidence of full campaign traversal.

This correction passed all 1,107 tests across 89 files. New/updated tests lint
cleanly. Repository lint remains blocked by 203 existing errors; this pass adds
no lint errors. Canonical challenge-terrain coverage is checked against
`terrains.json`; noncanonical challenge labels such as `mountains` do not create
new scene IDs or terrain aliases.

## Verification for this addition

Full suite: 815 tests passed; 33 presentation tests passed after adding four
explicit terrain-selection cases. Asset tests inspect GLB modules, texture
coordinates and tall scenery clearance. Camera tests cover every configured
scene at two desktop sizes. Legal verification passed; changed JavaScript has no
lint errors. Repository-wide lint remains affected by existing failures.

Browser captures are live-mountain.png, live-desert.png,
live-snowyPlains.png and live-snowForest.png. Study rendering and selector
checks do not constitute a full campaign travel/save/load acceptance test.

The subsequent hills/desertHills/plains/tundra addition passed all 835 tests.
Slope-mesh checks verify upward-facing surfaces. Scenery clearance uses precise
transformed mesh vertices: the prior loose rotated bounding box overestimated a
mountain outcrop's reach into the clearing; its actual forward extent is -7.76,
behind the -6 rear boundary. Legal verification and changed-test lint passed.
Additional live captures: live-hills.png, live-desertHills.png, live-plains.png
and live-tundra.png. These remain first-pass terrain art, not final asset polish.

Beach, shallowWater and swamp use data-defined shore/pool masks, water color and
static ripple detail in their baked surface textures. Swamp adds reusable bare
trunks and broken limbs, with tall reeds kept behind the fighting boundary.
Water is currently an opaque surface depiction, without animated waves,
refraction, foot splashes or immersion. It does not alter the engine's movement,
cover or terrain rules. Their live-review captures are live-beach.png,
live-shallowWater.png and live-swamp.png.

The shoreline/wetland addition passed all 848 tests and legal verification.
Terrain-selection tests now cover every explicit single-scene terrain mapping;
forest's seeded choice has a separate test. Asset checks also cover snag
clearance and validate the wet-zone data. Changed-test lint is clean; wider
repository lint is not a clean gate because of existing failures.
After visual review, swamp fill/key lighting was increased for actor readability;
47 focused data/presentation tests and a fresh browser capture passed afterward.

Dense forest, jungle and savanna add reusable forked-tree crowns and arching
fronds, controlled by broadTrees/fronds authoring data. Savanna crowns are wide
and shallow; jungle combines tall fronds with low broad-leaf plants; dense forest
layers taller crowns and undergrowth. These are first-pass procedural silhouettes.
All 860 tests passed, including clearance checks on both authored data and GLB
geometry, plus camera/selection checks. Changed-test lint and legal verification
passed. Captures: live-denseForest.png, live-jungle.png and live-savanna.png.
Visual review initially found cropped crowns, especially on the savanna trees.
Their framing landmarks now derive from the near crown heights and forward
extents; 96 focused camera/data/presentation checks passed after that adjustment.

Road, bridge, farmland and camp add reusable scenery boxes, canvas tents and
baked plank/furrow surface patterns. The bridge is deliberately broad for the
non-grid fighting formation, with its railing beyond the rear movement boundary;
it adds no chokepoint mechanic. Camp furniture, tents and field fences are also
behind that boundary. All 876 tests passed, as did changed-test lint and legal
verification. The four live browser captures completed without page errors:
live-road.png, live-bridge.png, live-farmland.png and live-camp.png.

Cave, ruins, temple, monastery, watchtower, villa, residential and industrial
complete the positive-modifier overworld mappings. They reuse frontage and arch
modules; caves use an irregular rock arch. Built courtyards reuse the approved
flagstone texture. Batch exports now discard unused Blender data between scenes.
All 909 tests passed, plus legal verification and changed-test lint. All eight
scenes loaded in the live browser without page errors. Captures are named
live-<terrainId>.png. Visual review caught cropped roofs and tower tops; framing
landmarks were adjusted to include the actual building heights and depths.
After that adjustment, 133 focused camera/data/presentation tests passed and
all eight live browser captures were refreshed without page errors.
These are first-pass environments; dungeon coverage, comprehensive monster
models and saved modular player appearance remain unfinished.

Dungeon metadata integration passed all 922 tests. New checks read actual
canonical tile IDs through restored plain-object dungeon state, exercise random
and boss selection, and verify missing-location fallback and context separation.
This establishes the selection path, not new dungeon art or a full campaign
playthrough. Lint on affected modules reports 37 existing errors outside the
edited blocks; the new test and metadata method introduce no lint errors.

Six new dungeon assets cover doors, exits, treasure, traps, altars and rubble.
They reuse the original arch/box/rock authoring modules and approved floor image.
The pressure plate and dart apertures are scenery, not additional combat traps;
the existing engine remains authoritative for hazards and their effects.
All 947 tests passed, including actual GLB loading/clearance, camera framing and
both random/boss scene selection. Changed-test lint and legal verification passed.
All six live browser captures completed without page errors and were visually
reviewed (live-dungeonDoor.png through the corresponding terrain-named captures).
These remain visibly simple first-pass assets, not final dungeon art quality.

Web, ice, mushroom and bone scenes complete the walkable dungeon mapping set.
The builder supports reusable data-defined tubes and ellipsoids, sharing detail
materials by color to limit draw calls. The original authored details include
web spokes/strands, fungal stalks/caps, bones/skulls and ice formations. Ice has
its own seeded surface texture. All 964 tests passed, including complete
walkable-dungeon mapping coverage, model geometry clearance and scene selection.
Changed-test lint and legal verification passed. All four live browser captures
loaded without page errors and were inspected: live-dungeonWeb.png,
live-dungeonIce.png, live-dungeonMushroom.png and live-dungeonBones.png.
The frozen surface remains stylised and the new scenes share a cave surround;
this is functional terrain breadth, not final scene-specific art polish.

Entry-point audit: Player.triggerCombatEncounter supplies overworld terrainId;
Player.triggerDungeonEncounter and the main boss route supply current dungeon
tile metadata. ConsequenceManager._triggerAmbushCombat is the remaining live
pendingCombat producer: it runs on settlement entry and selects the settlement
scene using context=ambush. Town is a zero-random-encounter terrain covered by
that context. Sanctuary has no normal random encounter path. Direct startCombat
calls outside main are confined to the study harness. This is a code-path audit;
full browser campaign traversal and restored-save acceptance remain unverified.
