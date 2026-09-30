# Combat graphics coverage audit

2026-09-27. Implementation evidence, not a replacement roadmap or a declaration
that the full graphics goal is complete.

## Terrain

The explicit mappings and encounter-context checks are recorded in
`terrain-coverage.md`: 29 overworld contexts including forced town combat, and
11 dungeon contexts. Actual challenge-trigger paths were checked separately.
The main-game renderer catalogue sweep and per-context screenshots are in
`terrain-runtime/`. It starts a real forest encounter and then supplies each
context explicitly. Separate Player entry-point tests cover random encounter
routing for all 28 ordinary overworld and 11 walkable dungeon terrains.
The framing pass centres the projected scenery/formation envelope to avoid
shrinking actors around tall landmarks; it preserves the fixed encounter focus.
A natural campaign walkthrough across every context remains unproven; data
mapping alone does not establish visual quality or a complete player journey.

## Monster roster

`CombatRosterCoverage.test.js` builds every canonical monster through the same
factory as normal encounters, alongside level-1, level-5 and level-10 players.
All 46 monsters are admitted, and all 82 canonical action entries resolve to
packaged animation clips and timing profiles. The check also verifies idle,
defeat and handed action variants in the actual GLB files.

This proves base admission and action wiring, not every pose or encounter layout.
Individual creature tests and browser captures provide the additional evidence
for contact, motion and effects. Four ordinary humanoids intentionally use the
shared enemy appearance: bandit, commoner, spy and banditCrossbowman.

29 monsters explicitly fall back to cards when prone. The shared traveller now
uses `traveller-grounded.glb`: armed and handed action variants keep the torso
down, with weapon-specific resting poses, grounded recovery and defeat. Rifles
retain aiming/support grips; bows are canted sideways to clear the floor.
The original modular meshes and source animation tracks are preserved.
Goblin (including the archer), skeleton, wight and zombie now have their own
grounded derivatives using the shared authoring path. Their original meshes and
standing tracks are unchanged. Canonical sword/bow attacks, life drain, slam and
grounded defeat were checked in the browser. Medusa now also preserves all nine
serpent morphs in her grounded clips, with a forward-supported torso for the
head-led strike, bow attack, recovery and separate collapsed defeat.
Kobold now also retains its tail-clearance motion in the grounded dagger/sling
clips, recovery and defeat. The other creature rigs still need separate condition
work; the 29 prone card fallbacks
remain. Orc and bugbear have separate grounded attack/recovery coverage.

Do not subtract authored prone immunities from that fallback count yet.
`conditionImmunities` is carried by EncounterBuilder but is not checked by the
current condition-application code. This missing mechanics work is tracked in
[issue #49](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/49), separate
from the graphics rollout.

The shared traveller's browser check covered sword, greatsword, dagger, Battle
Rifle and bow through the real runtime asset. Melee approach is closer while
prone, but exact contact remains approximate: the sampled nearest blade vertices
were 0.40 / 0.50 / 0.57 metres horizontally from the opponent's root for sword /
greatsword / dagger. This is not proof of anatomical contact, particularly for
short weapons. The pose does not provide a crawling locomotion clip.
`TravellerGrounded.test.js` verifies all new armed/handed clips remain low,
recovery, grounded defeat, resume and reduced motion. Full suite: 1,151 passing.

## Player appearance

The real `renderCharacterAppearance` component was exercised in an isolated
browser context, using the actual local save store and `saveGame`/`loadGame`.
The page was reloaded between saving and loading. The selected ochre outfit,
deep complexion, grey cropped hair, short coat, gathered olive trousers, hood
and no scarf survived, and the restored combat model showed the chosen meshes.
Removing the hood restored the saved crop. Replacing the equipped sword with
the canonical Battle Rifle changed the weapon model without replacing the outfit.

Captures: `player-appearance-saved-hood.png` and
`player-appearance-saved-rifle.png`. These show the actual component and combat
renderer in a verification harness, not the full character-sheet modal.
The save test covers every catalogue option with each selectable outfit through
serialization and `Character.fromJSON`, including equipment preservation and
independent restored appearance objects.

The available choices are outfit colour, complexion, hair colour/style, coat cut,
trouser colour/cut, hood and scarf. Face/body types are not offered. The goal
permits clothing choices; those options should not be described as distinct body
types.

The main-game walkthrough subsequently exposed missing `knight.png`/`monk.png`
portrait assets in character creation. Creation now reads the same four outfit
choices from `combatScene.json`, with packaged portraits rendered from the actual
traveller model. Choosing an outfit sets the new character's `combatAppearance`;
it does not change equipment or class. These are static starting-outfit portraits,
not live thumbnails of later hair/clothing customisation.

The real main page was then exercised through character creation, the character
sheet, save-file download, page reload and main-menu file import. All eight part
choices and the outfit survived. A forced forest encounter through the real
Player/EncounterBuilder/main combat UI selected woodlandBend and rendered the
restored hood, short coat and gathered trousers with the equipped sword. This
does not establish a full random-travel campaign walkthrough.

Captures: `player-appearance-creation.png`,
`player-appearance-character-sheet.png`,
`player-appearance-character-sheet-restored.png`,
`player-appearance-character-sheet-mobile.png`, and
`player-appearance-main-game-combat.png`. Desktop was 1440×1000, mobile 390×844.
The mobile pass exposed and corrected character-sheet grid overflow. Clothing
controls now use the game's colours, visible focus and larger input targets.
After these changes: 1,152 tests pass and legal verification passes. Existing
repository lint errors remain; the changed character-creation/appearance files,
portrait renderer and scene-data test lint cleanly.
