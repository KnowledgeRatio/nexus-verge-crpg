# Ettin body candidate

`tools/combat-art/ettin-candidate.gltf` reuses the retained anatomical body and
shared giant animation source. Its first-pass runtime derivative is now registered
as `ettin-v1.glb` for canonical Ettin encounters.
The canonical creature has two heads, a right-hand axe and a left-hand morningstar.

Original adaptation in `twin_heads.mjs` extracts the source head and neck using
skin weights, retains the face textures and colours, and fits two copies with
different jaw widths and depth offsets. The original single head is removed.
An earlier height-based extraction also copied raised shoulder/arm fragments;
the skin-weight selection fixes that error. `ettin-candidate-poses.png` shows
the corrected idle, walk, shared weapon strike and hit reaction.

```sh
node tools/combat-art/prepare_ogre.mjs ettin
node tools/combat-art/build_anatomical_models.mjs ettin
```

Proportions and head differences are specified in `giantBodySpecs.json`.
The authoring reader now decodes normalized vertex colours and preserves the
integer component types of remapped skin joints; these are required when splitting
the source mesh without changing its skinning or material appearance.

## Runtime integration

`mirror_body_motion.mjs` mirrors the shared strike in world space with rest-frame
correction for each destination bone. The packaged asset includes right- and
left-handed strikes, shared idle/walk, hit reaction and defeat.

The axe remains in the right hand; a spiked morningstar remains in the left.
Appearance data declares a visual loadout and weapon-action hand assignments.
Loadout items are admitted only when present in the creature's canonical actions;
actual equipped items take precedence. The main combat UI and study preserve the
other weapon during each attack. This changes presentation, not game-mechanical
off-hand attacks or action economy.

The morningstar now has original spike geometry, shared with other actors using
that weapon. It keeps the existing mace grip and motion compatibility.

Select **Ettin** in the combat study and use **Axe** / **Morningstar**. Live ruins
captures are `live-ettin-axe-contact-ruins.png` and
`live-ettin-morningstar-contact-ruins.png`. After correcting initial overreach,
weapon-head centres pass approximately 31 cm and 35 cm from the target's torso
centre horizontally, respectively; the heads' geometry intersects the target's
body envelope. Axe contact is lower; morningstar contact is at torso height.

Neck transitions, clothing edges and surface detail still need refinement. Both
heads currently follow the same underlying head joint, and prone still uses
cards. Final art acceptance and broader roster coverage remain outstanding.

Candidate tests cover complete head geometry, exclusion of stray arm fragments,
UV preservation, stature, finite clips and grounding. These checks do not
establish final art acceptance. Runtime tests additionally check canonical loadout
preservation, hand routing through the main UI, mirrored hand motion and grounded
configured clips.

Validation after integration: 1,057 tests across 81 files pass. Browser playback
verified right → left → right attacks with both weapons retained and no page
errors. Lint has no errors in the changed files; `npm run lint` reports 203 errors
elsewhere in the worktree. Legal verification passes 12 checks with its existing
audio-attribution and SBOM-freshness warnings.
