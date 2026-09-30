# Flameskull presentation

The canonical image description specifies a hand-sized scorched skull floating
at eye level, intact jaw, remaining ivory at the forehead/orbital ridges and two
steady orange-white fire points. `build_flameskull.mjs` authors that original body
and four rigid-node clips: Float, Fire, Hit and Death. No humanoid body, borrowed
skin weights or surrounding flame plume is used. Defeat drops the skull and
extinguishes the eye points. Heat-shimmer distortion is not implemented.

The runtime uses a skull-local ray origin and target anchor. Fire Ray is a narrow
orange projectile travelling straight; Fireball uses a larger orange projectile.
Optional profile colour, scale and arc height are generic presentation fields.
The study's new Creature action selector exposes both canonical actions and
filters weapon actions to the creature's currently equipped item.

The current special-action engine resolves Fireball on one target despite its
description's area/damage/recharge text. The presentation follows the actual
resolved target, not an invented area result. This is an engine backlog item,
separate from the existing-mechanics-only graphics work.
Tracked in [GitHub issue #48](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/48).

Validation: 993 tests pass, including actual GLB floating size/height, socket,
extinguishing defeat, canonical tiny-undead admission, both action mappings and
straight-ray trajectory. Runtime lint has no errors (existing warnings remain).
The body is deliberately tiny; normal-camera readability still needs sponsor
review. Full campaign encounter/save acceptance remains pending.
The live dungeon study loaded the body and executed both Fire Ray and Fireball
without browser errors (`live-flameskull-encounter.png`). All 12 legal artifact
checks pass. `flameskull-poses.png` captures the initial authoring review before
the smaller eye points and rectangular teeth refinement, not the final mesh.
