# Kobold combat body

2026-09-27. `kobold-v1.glb` replaces the generic small humanoid for the canonical
kobold. It reuses the original traveller rig, clothing and attributed CC0 motion
library, with original rust-red reptilian facial geometry, recessed copper eyes
with vertical pupils and a tapered tail. The short coat, fitted trousers and
0.64 runtime scale provide a distinct small silhouette.

Rebuild with `node tools/combat-art/build_kobold.mjs`.
`glb_derivative.mjs` shares GLB editing, packaging and animation grounding
with the goblin builder. Refactoring the goblin to this helper reproduced its
GLB byte-for-byte (SHA-256
`2cd61bf273f7b1efb274a19a9ac7bd4b9af7f2476cd26a8c43f7606de8f94883`).

The tail attaches to the pelvis, with original sampled rotation and morph tracks.
It remains oriented behind the body and flattens its downward curve as the hips
lower. Its height is measured against the body’s supporting plane, so the tail
cannot lift the character off the ground during a fall. Tests sample every
retained clip and check both tail clearance and body contact independently.

The study's **Kobold** option and normal combat selection share this asset. Real
monster actions resolve Dagger to a stabbing motion and Sling to the existing
throwing motion. Browser validation exercised Sling → Dagger → Sling and defeat
without console errors. Dagger impact was 0.300 m from the target centre
horizontally, at 0.742 m height. Captures: `kobold-candidate-close.png`,
`live-kobold-dagger-grassland.png`, `live-kobold.png`, `live-kobold-defeat.png`.

First-pass limitations: clothing and scales remain coarse; the sling uses the
shared throw instead of a bespoke wind-up. Prone encounters retain the card
fallback until grounded dagger and sling actions are validated. Floor-safe
geometry alone is not sufficient to enable prone combat presentation.
