# Gargoyle first-pass integration

Canonical Gargoyle encounters now select `gargoyle-v1.glb`. The study's **Gargoyle**
entry exposes its actual **Bite** and **Claws** actions. The body reuses the CC0
anatomical base and the existing clawed-body animation family. Shared hit and
defeat clips retain their sampled floor correction.

Original folded stone wings attach to the upper spine, fitted in the crouched
reference pose. An initial bind-pose fit made them stand too upright; the retained
version fits along the back. Its authored idle is static, appropriate to the
canonical stone guardian. Attacking and moving remain animated.

## Build

```sh
node tools/combat-art/prepare_anatomical_ghouls.mjs gargoyle
node tools/combat-art/build_anatomical_models.mjs gargoyle
```

Proportions and surface flags are in `clawedBodySpecs.json`; `stone_wings.mjs`
authors the original wing geometry. No creature-specific renderer branches or
new gameplay mechanics are required.

## Evidence and limits

- Close rendered idle/Bite/Claws/defeat comparison:
  `gargoyle-candidate-poses.png`.
- Live ruins-scene contact screenshots:
  `live-gargoyle-bite-contact-ruins.png` and
  `live-gargoyle-claw-contact-ruins.png`.
- Shared asset tests load the real GLB, resolve canonical actions, check grounded
  finite motion and measure Bite/Claws reach. The static idle and wing attachment
  have additional assertions.
- Full validation: 1,048 tests across 76 files pass; changed-file lint has no
  errors. Legal verification passes its 12 checks with the existing audio
  attribution and SBOM freshness warnings.
- This is a first-pass body: the stone surface still needs richer geological
  texture and the face retains much of the source human anatomy. The jaw does not
  articulate independently, and the folded wings have no flight animation.
- Prone still uses cards for this body; the presentation does not grant immunity.

This adds monster coverage; it does not establish final art acceptance or complete
coverage of the remaining creature roster.
