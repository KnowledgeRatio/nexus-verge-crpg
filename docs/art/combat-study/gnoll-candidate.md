# Gnoll combat integration

The gnoll now has its own registered runtime appearance and combat-study encounter.
Its canonical Spear and Bite actions select a two-handed thrust and a head-led
bite with an articulated jaw. Prone continues to use cards until a suitable
creature pose exists. This is first-pass art, not final visual acceptance.

The body combines the retained CC0 Quaternius anatomical humanoid with the
head of our CC0 wolf-derived hyena. `hyena_features.mjs` extracts the muzzle
and rounded ears, removes the human face, closes the skull, seats replacement
eyes and fits the anatomy to the humanoid Head joint. The original procedural
hyena coat is reused unchanged with separate upper/lower body UV mapping.
The body is narrower, with longer arms and fitted hide clothing retaining its
skin weights. The surface pattern and low-detail face remain refinement areas.

`retarget_anatomical_melee.mjs` adapts the retained CC0 KayKit two-handed guard
and thrust onto the anatomical rig using rest-frame corrections. The gnoll also
reuses UAL walking, hit and defeat. `Gnoll_Bite` starts from the same guard,
leans and advances the upper body, opens the lower jaw during approach and
closes it at impact. Ground tracks are sampled after all motions and anatomy
are assembled.

The spear mount keeps its shaft facing forward and the support hand on it.
At the inspected thrust impact, the support-hand joint is 0.022 m from its
configured shaft grip point.
`appearance.contact.reachByMotion` optionally selects a different presentation
reach for each motion. The gnoll stops farther away for the spear than for Bite.
This changes visual approach paths only; it adds no distance or movement rule.
The recipient remains stationary during the attacker's approach.

Rebuild:

1. `node tools/combat-art/prepare_ogre.mjs gnoll`
2. `node tools/combat-art/build_anatomical_models.mjs gnoll`

The body preparer reads the `gnoll` entry in `giantBodySpecs.json`. Optional
melee retargeting, jaw articulation and forward shift leave other body defaults
unchanged. The packager accepts authored PNG data URIs and preserves their bytes
in local textures.

Runtime/browser evidence:

- `live-gnoll-spear-grassland.png`: spear-head centre 0.27 m horizontally from
  the recipient centre and 0.11 m below the torso effect anchor at impact.
- `live-gnoll-bite-grassland.png`: mouth marker 0.17 m horizontally from the
  recipient centre, at 1.52 m height (head/neck contact).
- Spear → Bite → spear completed uninterrupted and restored the spear.
- `live-gnoll-defeat.png`: actual runtime defeat render.
- Candidate close-up and six-pose sheets are retained as authoring evidence.

The study was exercised at 1024×768 and 1280×900. No page or shader errors were
reported. Natural encounter traversal and a full mixed-monster battle are not
established by these isolated study checks.

The source model and motion licences remain CC0; retained licences and exact
provenance are listed in `legal/ASSET_ATTRIBUTIONS.md`. No new download,
dependency or purchase was required.

Validation: 1,089 tests across 88 files pass, including canonical gnoll admission,
action mapping, jaw closure, grounded poses and per-motion contact routing.
New authoring scripts and tests lint cleanly; the renderer retains its existing
warnings. Repository lint remains at 203 errors and 858 warnings. Legal
verification passes all 12 checks with existing audio-attribution and SBOM
freshness warnings.
