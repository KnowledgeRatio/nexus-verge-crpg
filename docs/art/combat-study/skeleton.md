# Skeleton presentation

The canonical `skeleton` now has a dedicated runtime body, built by
`tools/combat-art/build_skeleton.mjs` as `data/graphics/combat/skeleton-v1.glb`.
Its original bone geometry reuses the traveller's armature, weapon sockets and
44 animation clips. It does not use the rejected cartoon skeleton candidate.

The study's “Skeleton swordsman and archer” encounter uses the monster's actual
shortsword and shortbow choices. The creature-attack preview resolves the action
matching its equipped weapon. Ranged previews do not require melee engagement.
This preview does not simulate action economy; the main game remains authoritative.

Validation: the full suite passed 982 tests after registration. Real GLB tests
sample sword idle, bow shot, walking, death and prone clips for finite geometry,
and verify both canonical weapons have supported presentation. Isolated poses
are recorded in `original-skeleton-poses.png`; the live study swordsman is in
`live-skeletons-encounter.png`.
The same live browser run selected the archer and executed its Shortbow preview
without hero engagement or browser errors (`live-skeleton-archer.png`). Affected
files pass ESLint, and all 12 legal artifact checks pass.

This is a first-pass anatomical mesh with simple bone materials. Isolated pose
and live encounter checks do not establish final surface quality, precise weapon
contact at every frame, or full campaign/save acceptance. Other undead remain
separate asset work; registering this skeleton does not admit them automatically.
