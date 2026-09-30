# 0 A.D. brown bear source

Original author: **Wildfire Games**, https://wildfiregames.com/.
Source: https://github.com/0ad/0ad/tree/master/binaries/data/mods/public/art
Retrieved 2026-09-27. Exact file hashes are retained in `SHA256SUMS.json`.

License: **Creative Commons Attribution-ShareAlike 3.0 Unported**,
https://creativecommons.org/licenses/by-sa/3.0/.
The upstream art-directory `LICENSE.txt` is retained unchanged. The model,
texture, animation files, conversions and adaptations of this asset remain
CC BY-SA 3.0; they are not covered by the project's default code licence.
No endorsement by Wildfire Games is implied.

Retained source paths below `binaries/data/mods/public/art/`:

- `meshes/skeletal/bear.dae`
- `textures/skins/skeletal/animal_bear_brown.png`
- `actors/fauna/bear_brown.xml`
- `variants/quadraped/base_bear.xml` and `base_bear_death.xml`
- `animation/quadraped/bear_idle_01.dae` through `bear_idle_04.dae`
- `animation/quadraped/bear_attack_01.dae` through `bear_attack_03.dae`
- `animation/quadraped/bear_walk.dae`, `bear_run.dae`, `bear_death_01.dae`

Purpose: inspect the bear body, rig and motion as an owlbear adaptation base.
The XML files are retained as provenance and animation reference, not executed
as game content. No 0 A.D. engine or gameplay code is imported.

The candidate conversion links the original brown-bear texture to the original
UVs, combines the separate animation files onto their matching rig, converts to
glTF Y-up coordinates and applies a uniform inspection scale. A separate sampled
ground wrapper removes floor penetration, particularly in the source death clip,
while preserving the run's airborne phases. These conversions are marked
modifications under CC BY-SA 3.0. Runtime integration is separate.
