# Saved player appearance — implementation audit

The character sheet now offers four outfit presets: Slate, Olive, Ash and Ochre.
They share the traveller rig and differ in coat/scarf material tints. They are
not four distinct character models. Hair geometry choices are now available
independently, as described below, alongside separate coat and trouser cuts.

`data/combatScene.json.playerAppearances` is the selectable catalogue. The sheet
loads it without starting WebGL; the combat study uses the same catalogue.
`Character.combatAppearance.avatarId` persists through toJSON/fromJSON and plain
JSON storage. The appearance object can carry future part selections without
losing them on restoration. Existing saves retain the default traveller look.
Unknown/unselectable IDs safely fall back to the default. Main-game presentation
applies the saved choice only to the player; weapons still derive from equipment.
Outfit changes are disabled during combat to avoid replacing rigs during actions.

Validation: all 976 tests passed, including appearance round-trip and equipment
independence. Real browser DOM checks verified four choices, selection writes,
plain-object restoration and combat locking. That component check mounted the
sheet control in an isolated overlay on the study page; it was not a full
campaign save-slot/reload acceptance test. The selector is wired into
Game.renderCharacterSheet. Study and sheet share the same preset IDs.

Remaining: modular body/head/hair/clothing assets and controls, broader visual
variety, full campaign save/reload acceptance, and reuse outside combat. The
original goal remains incomplete.

## Independent part settings

The sheet also offers complexion, hair colour, trouser colour and scarf/no-scarf
controls. These persist as catalogue IDs under combatAppearance.parts. The
presentation bridge resolves IDs into allowed material tints/visibility; unknown
IDs fall back to the catalogue default and cannot inject arbitrary materials.
The player gets an independent clone, so scarf removal does not alter companions,
enemies or the shared source mesh. Tests verify that isolation with the real GLB.

The current model merges hair with eyebrows, so hair recolouring affects both.
At that stage no alternative head shape, hairstyle or trouser geometry was claimed. Scarf
removal is the first actual clothing visibility option. All 978 tests passed;
changed runtime modules have no lint errors (existing warnings remain).
Browser checks verified all four slot controls and JSON restoration without page
errors. `player-parts-selector.png` shows the isolated control harness;
`player-parts-render.png` shows the real renderer with resolved player overrides
injected into the study fixture. This visual test deliberately substituted that
fixture; it does not establish full main-game save-slot acceptance.

## Reusable hairstyle meshes

`build_player_parts.mjs` derives `traveller-modular.glb` from the existing animated
traveller. It separates scalp components from eyebrows/eye shadows, retains the
original swept hair and adds a shorter crop. Bald hides both scalp meshes without
removing facial details. All share the existing head joint and 44 motion clips.
The original rig and skeleton-monster asset remain independent build inputs.

The model's data-defined `meshVariants` catalogue controls visibility per cloned
actor. Saved `parts.hairstyle` resolves through the approved player catalogue;
unknown IDs use swept hair. NPCs retain the default. Hair colour continues to
include eyebrows. The short crop is a first-pass undercut silhouette, not final art.

The study now exposes all part controls under “Customise player appearance”.
Study choices reset the demonstration and are temporary; character-sheet choices
use the existing saved appearance object. `player-hairstyles.png` is a close
authoring review of the three shapes, not an in-game inspection feature.

Validation: 983 tests pass, including real GLB facial retention, clone visibility
and skeleton isolation, invalid-choice fallback, and hair/head proximity through
sword idle, bow shot and death animation. Runtime lint has zero errors and 118
existing warnings. Head/body alternatives, more clothing geometry, remaining
monsters and full campaign save/reload acceptance are still outstanding.

## Independent coat and trouser geometry

The same modular asset now includes long travelling coat / short field coat and
fitted / gathered trouser meshes. These are independently selectable through the
existing `meshVariants` contract and saved `parts.torso` / `parts.legShape` IDs.
Existing tint choices apply to both cuts. NPCs keep the original long/fitted
combination. No weapon or armour mechanics derive from these cosmetic choices.

The short coat retains overlapping hip panels rather than exposing an absent
body underneath the base model. Its sleeves and all higher vertices are unchanged.
Gathered trousers add thigh volume while keeping the knee/boot interface and
soles unchanged. Both reuse the complete existing skin weights and animations.
These are original mesh derivatives, with no new external asset dependency.

`player-clothing-shapes.png` records the three comparison silhouettes. Automated
checks verify stable sleeve/boot geometry, independent selection and finite
bounds for all four coat/trouser combinations through sword, bow, walk, defeat
and prone samples. All 984 tests pass. This is first-pass clothing variety;
alternative heads/body proportions and broader outfit designs remain unfinished.
The live study selected short/gathered clothing and formed engagements without
browser errors (`player-clothing-live.png`). An isolated character-sheet overlay
verified both saved IDs and JSON restoration (`player-clothing-selector.png`).
This still does not establish full campaign save-slot/reload acceptance. Affected
builder/test files pass ESLint and all 12 legal artifact checks pass.

## Headwear

The modular asset now includes an original open-faced travelling hood, bound to
the existing head joint and using the selected coat's material tint. Headwear is
an independent saved `parts.headwear` choice: uncovered or hood. The model's
generic `hiddenMeshes` metadata hides scalp hair under the hood without changing
the saved hairstyle; uncovering restores that selection. NPC/default appearances
remain uncovered. This is a headwear option, not an alternate face or body type.

All 997 tests pass, including actor-isolated hood/hair visibility, restored
hairstyle, matching fabric tint and head attachment through sword, bow, defeat
and prone poses. Runtime lint has zero errors with existing warnings.
`player-hood-options.png` records the close authoring review; the open face remains
visible and full face concealment is not claimed. The hood is a first-pass rigid
garment, without cloth simulation. Full campaign save-slot acceptance remains
outstanding, as do the uncovered monster families.
The live study formed engagements with the selected hood (`player-hood-live.png`)
without browser errors. An isolated character-sheet control check saved headwear
and hairstyle IDs and restored them from JSON (`player-hood-selector.png`). All
12 legal artifact checks pass.

## Campaign save/load verification

An isolated browser selected cropped hair, a hood, short coat, gathered trousers,
grey hair, deep complexion, olive trousers and no scarf through the real
character-sheet controls. It saved to a verified-empty local slot, fully reloaded
the page and loaded through the campaign save flow. All selections returned in
the sheet and the combat model used the hood, short coat and gathered trousers,
with scalp hair hidden and the equipped sword retained. No browser page errors
occurred. Evidence: `campaign-restored-appearance.png` and
`campaign-restored-combat.png`.

This used a canonical study character in a generated campaign and an injected
encounter after loading; it does not establish character-creation or natural
travel-encounter acceptance. The check exposed and fixed loss of appearance in
plain-object character serialization, missing challenge-manager initialization
on a fresh-page load, and a road lookup cache that JSON restored as an object
instead of a Set. All 999 tests pass. Repository-wide lint remains failing on
existing unrelated errors; no broad lint cleanup was included.
