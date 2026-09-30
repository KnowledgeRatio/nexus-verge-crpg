# Giant hyena — first-pass runtime presentation

The revised derivative is now mapped to canonical giantHyena encounters and the
study's “Giant hyenas” scenario. The investigation below records why the first
candidate was withheld; subsequent corrections and validation follow it.

Canonical data calls for a horse-sized spotted hyena with overdeveloped forequarters,
a sloping back, pale sand coat, dark rosettes, dark muzzle/feet and amber eyes.
The retained CC0 Quaternius animal pack has a reusable wolf rig, not a hyena mesh.

`prepare_hyena.mjs` retains that source unchanged and writes an intermediate
`hyena-candidate.gltf`: heavier shoulders/head, lowered haunches, shortened muzzle
and tail, plus an original deterministic coat texture embedded in glTF.
`build_wolf.mjs giantHyena` then uses the configured candidate source and existing
mouth/floor-correction pipeline to produce `giant-hyena-v1.glb` at 0.76 scale.
The builder's texture decoder stub is authoring-only: browser exports retain the
real PNG. No added dependency or external texture is used.

The initial model had only an authoring catalogue entry, with no appearance
mapping, preload or study scenario. The initial vertex
coat lost spots on sparse triangles; the new texture restores clear rosettes,
but planar projection stretches them along the spine. The ears and facial outline
still read too strongly as wolf-derived. `hyena-candidate-poses.png` records idle,
bite, walk and death inspection. Next authoring work must address the ears/head
and texture projection before live encounter contact/size review.

## Corrections and integration

The revised mesh removes pointed ear tips and adds original rounded ears bound
to the existing head rig. A 1024×512 two-panel texture uses separate side/top
projection per triangle, retaining circular dorsal markings and the dark feet
and muzzle. Skin attributes are copied when projection seams split vertices;
the original source file remains unchanged. Projection seams and the stylised
source anatomy remain visible at close authoring scale; this is not final art.

The large-body footprint and contact reach are configured independently of the
wolf. The canonical Bite uses the existing mouth socket, attack, reaction and
defeat clips, with sampled floor correction. The study forms a two-to-one
engagement and offers the real Bite action. Prone remains unsupported for this
quadruped and falls back to cards; no Rampage mechanics were added.

Browser verification loaded the savanna encounter and executed Bite without
errors (`live-hyenas-encounter.png`). The larger formation widens camera framing;
ordinary-view readability and full campaign/save acceptance remain to review.
Automated checks sample all clips for finite grounded bounds, embedded texture,
large-creature admission, canonical action mapping and distinct footprint.

Source provenance and licence remain in
`tools/combat-art/sources/quaternius-animals/README.md` and `License.txt`.
The original source comes from [the creator's animal pack](https://quaternius.com/packs/ultimateanimatedanimals.html).
