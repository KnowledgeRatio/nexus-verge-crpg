# Character and waystation — visual target 01

Created 2026-09-23 with the built-in image-generation tool. Original generated
concept, retained for review; not an imported 3D asset, gameplay screenshot,
approved character identity, production asset or demonstrated performance budget.

Image: [character-waystation-v1.png](character-waystation-v1.png).
Browser review: [combat-art-study.html](../../../combat-art-study.html).

## Sponsor review — 2026-09-23

The sponsor likes this character direction and approves the scene/waystation's
visual direction. Preserve grounded adult proportions, practical worn clothing,
restrained detail, distinct materials and room for player projection.

Visible faces may present as masculine or feminine, or lean toward one without
an explicit identity label. This is acceptable; concealing every face or forcing
perfect neutrality is not required. This does not lock the player to the depicted
face or decide a male/female selector, body-type system or final appearance inventory.
Weapon choice remains separate from character appearance, with room for later
equipment-driven changes. The approval is of the visual direction, not proof of
the unbuilt 3D asset's animation or performance.

## Review scope

Adult proportions, restrained identity cues, cloth/leather/iron separation,
surface wear, courtyard atmosphere and silhouette readability at an elevated camera.
The face is one candidate, not a fixed player identity. The existing 2D avatar
and portrait decisions are not replaced by this concept.

## What it does not prove

The image cannot establish rig quality, weapon attachment, contact accuracy,
animation blending, occlusion, load time or browser performance. The courtyard
composition is illustrative; the exact current camera and action poses must be
checked in the live renderer. The decorative banner and stone marking generated
in the image are not approved faction symbols or canon. The shown gap is a resting
engagement composition, not evidence that a sword reaches at impact.

## Smallest playable art proof

Author or source one original/licensed humanoid asset with a reusable rig, separate
weapon attachment, clear forward orientation, grounded feet and a controlled
scale. Export through a documented asset pipeline, then prove idle, movement,
strike, hit, miss and withdrawal in the existing encounter before expanding the
cast. Keep sword and carbine visibly separate from the clothing/character asset.
Use a small wall/ground section to judge lighting and material readability at the
existing camera. Establish measured asset/performance budgets from that running
slice, not from this concept image. At the concept-review stage, no existing
GLB/GLTF/Blender assets were found in the repository. The subsequent authoring
proof now lives in `data/graphics/combat/`, with a rebuild script and limitations
documented in `tools/combat-art/README.md`. That first articulated export is not
evidence that this concept's production quality has been achieved.

The live roadmap remains in GitHub. This file records the generated reference,
its limits and the exact prompt; it is not a second backlog.

## Generation prompt

```text
Use case: stylized-concept.
Asset type: original visual development board for Nexus Verge, a browser CRPG combat art study. This is a concept target for a future real-time 3D character and small environment, not a screenshot, not a marketing poster.
Create one sophisticated landscape board with two clearly separated panels: left approximately 36% shows a full-body adult frontier traveller in an easy neutral three-quarter standing stance at close scale; right approximately 64% shows the same traveller at actual small gameplay scale within a restrained, elevated three-quarter orthographic encounter scene (camera looking down about 35 degrees). Both panels share coherent material design and lighting.
Creative target: grounded and tactile painterly realism suitable for a mature CRPG, evocative of Wartales and Pillars of Eternity atmosphere without copying characters or assets. Desperate wonder on a living frontier. Adult human proportions, roughly seven-and-a-half heads tall; anatomically credible hands and feet, no chunky toy proportions, no visibly faceted low-poly surfaces, no chibi or cartoon.
Traveller: deliberately ambiguous identity, practical layered weathered deep slate and muted olive clothing, worn leather belt, repaired asymmetrical knee-length travel coat with split skirt for movement, compact travel pack, scuffed boots, plain understated scarf, no fixed gender emphasis, unornamented face partly shaded by hair and collar but not a faceless black void or oversized hood. Serious watchful stance. One plain usable sword carried in the right hand, separate from body/clothing, empty left hand. No shield, glowing armour or decorative spikes. Functional cloth folds and edge wear clearly distinguish cloth, leather, iron.
Environment right panel: a small piece of a weathered frontier waystation courtyard, damp irregular stone slabs transitioning to compacted earth, one broken masonry wall and old timber lintel in the back, one modest warm oil lantern, sparse rubble only beside the collapsed wall, grasses at wall edges. A restrained convergence detail: a small section of pale smooth foreign stone incorporated into older dark local masonry. This is an inhabited fantasy frontier, not a post-apocalyptic scene. Cool atmospheric fill with one warm directional key from upper left. Composition keeps the central combat floor clear and readable, with soft shadows grounding feet; no circle of stones, no encircling scenic diorama pedestal.
At gameplay scale, show the traveller and a single ordinary adult human bandit facing each other with clear separation and plausible sword reach. No additional crowd. Figure silhouettes must remain legible against ground. No attack VFX, blood or gore. The close traveller is larger for judging proportions and materials; it is not an oversized character actually standing in the courtyard.
Palette: iron brown, ash grey, slate blue, restrained moss green, small amber light accent. Rich material detail with controlled contrast; neither muddy black nor cheerful saturated fantasy.
No text, labels, logos, UI, health bars, grids, watermarks, panel captions or decorative borders. Original designs. The board must communicate a achievable game art target rather than a cinematic illustration with depth of field or photographic effects.
```
