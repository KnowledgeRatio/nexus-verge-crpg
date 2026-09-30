# Minotaur body candidate

`tools/combat-art/minotaur-candidate.gltf` is the authoring source for the registered
first-pass `minotaur-v1.glb` combat model. It reuses the retained CC0 anatomical body and weapon
motion library with original bovine head, horns, eyes and split hooves from
`bovine_features.mjs`. Proportions are in `giantBodySpecs.json`.

Build with:

```sh
node tools/combat-art/prepare_ogre.mjs minotaur
node tools/combat-art/build_anatomical_models.mjs minotaur
```

`minotaur-candidate-poses.png` records the current browser-rendered guard, walk,
weapon strike and hit reaction. The club is the shared giant pipeline's authoring
prop, not the Minotaur's canonical equipment. The game data names its Battleaxe
action with item `greataxe`, and its separate Gore action.

The first render exposed reversed left/right hoof binding; this has been
corrected against the source bone positions. Human foot geometry is collapsed
inside the replacement hooves. The head was narrowed and elongated after the
first rounded silhouette read too softly. Candidate tests check attachment,
standing height, finite motion and grounding through the existing clips.

The runtime model now uses its canonical axe and an original head-led `Horn_Gore`
clip from `author_horn_attack.mjs`. The axe uses the shared weapon strike with
the renderer's two-hand grip solver. In the ruins-scene browser check, the
support hand was approximately 3 mm from its grip point at impact. The axe blade
centre passed 18 cm from the target's torso centre horizontally, at hip height;
the horn tip passed 20 cm from that centre at upper-torso height. Screenshots are
`live-minotaur-axe-contact-ruins.png` and `live-minotaur-gore-contact-ruins.png`.

Select **Minotaur** in the combat study to exercise **Battleaxe** and **Gore**.
Main-game canonical Minotaur encounters select the same body. The study switches
to empty hands for Gore and restores the axe for Battleaxe. Prone still falls
back to cards for this body. Stronger surface and facial detail remain needed:
it still reads as assembled primitive geometry at close range, and final art
acceptance remains outstanding.

The initial candidate validation passed 1,049 tests across 77 files. Repository-wide
`npm run lint:all` fails with 3,279 errors and
1,468 warnings elsewhere (including API globals and older tool-script formatting).
Legal verification passes 12 checks with the existing audio-attribution and SBOM
freshness warnings.

After runtime integration, all 1,052 tests across 78 files pass, including
canonical Minotaur admission, configured clips and horn contact at impact.
Changed-file lint passes. The older global lint failures remain outside this change.

## Source investigation

The creator's public [Ultimate Animated Animal Pack](https://quaternius.com/packs/ultimateanimatedanimals.html)
was checked for an Owlbear foundation. Its glTF folder contains Alpaca, Bull,
Cow, Deer, Donkey, Fox, Horse, Horse White, Husky, Shiba Inu, Stag and Wolf;
there is no bear. The public Bull download returned Google Drive's quota-exceeded
page on 2026-09-27. No Bull geometry was imported. The original bovine features
avoid that download dependency; the Owlbear still needs a suitable source.
