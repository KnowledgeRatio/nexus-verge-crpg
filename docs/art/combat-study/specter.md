# Specter — shared spirit body

`specter-v1.glb` shares the Shadow's humanoid proportions and existing armature,
with an original continuous surface from `spirit_surface.mjs`. Its pale
translucent material, stationary pose and gliding movement
follow the canonical Specter description. The shared reach presents Life Drain;
recoil uses the shared hit clip. Defeat contracts the body to a vanishing trace
instead of leaving a solid corpse. It casts no ground shadow.

Rebuild with `node tools/combat-art/build_shadow.mjs` followed by
`node tools/combat-art/build_specter.mjs`. Select **Specter** in the combat study.
The same appearance mapping is available to canonical game encounters.

The actual asset tests verify translucent material, unchanged idle bounds across
the clip, near-zero final defeat bounds, canonical presentation admission and
shared idle/gliding pose. Runtime attachment checks for both spirit GLBs also
cover absent weapon offsets: the shared mount now defaults to the joint origin.
All 1,007 tests pass; affected lint has zero errors with existing runtime warnings,
and all 12 legal checks pass.

The browser loaded Shadow and Specter in sequence, formed engagements and played
their canonical attacks without scene or page errors. Evidence:
`live-specters-encounter.png`. The initial version's overlapping body primitives
created bright segmented joints. Rebuilding a smooth union surface removes those
internal overlaps. Screenshot review of the continuous version shows a coherent
translucent figure without the former bright joint patches.

The surface is authored offline and exported with shared vertices and normalized
blended skin weights. The runtime does no surface generation. Unused source
geometry and clips are removed by `compact_skinned_glb.mjs`; the intermediate
8.8 MB export is reduced to approximately 1.3 MB, retaining still/glide, reach,
hit and vanishing clips. An asset connectivity test checks that the body is one
connected surface instead of separate intersecting pieces.

The compact asset was reloaded in the browser and played Life Drain without
scene or page errors; `live-specters-continuous.png` records that final export at
a 1024px viewport. All 1,008 tests pass with two workers. An earlier simultaneous
browser/full-suite run hit three unchanged asset-test timeouts; the browser was
closed before the successful rerun. The changed authoring files and tests pass
ESLint, and legal verification passes all 12 checks.

This is first-pass geometry, not final spirit art: transparency in dark
environments and the vanishing silhouette need continued visual review.
No max-HP reduction, incorporeal movement or other description-only mechanic is
implemented by this presentation. Wraiths now use a separately exported trailing
lower-body variant; see `wraith.md`.
