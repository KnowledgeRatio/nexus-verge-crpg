# 0 A.D. lion source

Original author: **Wildfire Games**, https://wildfiregames.com/.
Source: https://github.com/0ad/0ad/tree/master/binaries/data/mods/public/art
Retrieved 2026-09-27. Exact file hashes are retained in `SHA256SUMS.json`.

Licence: **Creative Commons Attribution-ShareAlike 3.0 Unported**,
https://creativecommons.org/licenses/by-sa/3.0/.
The upstream art-directory `LICENSE.txt` is retained unchanged. This model,
texture, animation, conversions and adaptations remain CC BY-SA 3.0 and are
not covered by the project's default code licence. No endorsement is implied.

Retained paths beneath the upstream art directory:

- `meshes/skeletal/animal_lion.dae`
- `textures/skins/skeletal/animal_lion.png`
- `actors/fauna/lion.xml`
- `animation/quadraped/lion_walk.dae`, `lion_run.dae`, `lion_death.dae`
- `animation/quadraped/lion_idle_01.dae` through `lion_idle_03.dae`

Purpose: inspect the lion body, rig and motion as a manticore adaptation base.
The source actor uses an idle clip for its attack; that does not establish
suitable manticore bite, claw or tail-spike motion. These require separate work.
The XML is retained as source reference, not executed as game content.
