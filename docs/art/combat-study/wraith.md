# Wraith — trailing spirit body

The canonical Wraith now has a dark, faceless upper body and a tapered trailing
lower form. It reuses the spirit armature, stationary/gliding pose, Life Drain
reach, hit reaction and vanishing defeat clip. Its continuous surface has no
legs or feet. The canonical Wraith mapping and **Wraith** study encounter select
this body; no mechanics are added or inferred from its description.

Build with `node tools/combat-art/build_specter.mjs --wraith`. The shared authoring
surface accepts a trailing profile; the Specter's default human profile remains
unchanged. The compact GLB is approximately 1.1 MB, retaining only the four clips
used by the runtime profile. The source geometry is original; shared animation
provenance remains recorded in `legal/ASSET_ATTRIBUTIONS.md`.

Tests examine the actual GLB's narrow lower silhouette, translucent dark material,
finite animated bounds, runtime attachment without weapon metadata, and canonical
Life Drain mapping. Atmospheric cold and uncertain/animated edges from the
description remain art polish gaps. This is a first-pass model, not finished art.

All 1,012 tests pass (66 files, two workers); affected authoring/test lint is clean
and all 12 legal checks pass.

Browser verification loaded the Wraith, formed engagements and played canonical
Life Drain on both Open meadow and Dungeon chamber without page or scene errors.
At a 1024px viewport the dark tapered silhouette remains distinguishable against
both floors. Evidence: `live-wraith-grassland.png` and `live-wraith-dungeon.png`.
This is study verification, not a full natural campaign encounter acceptance run.
