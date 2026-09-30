# Shadow — first-pass runtime presentation

The canonical `shadow` monster now has an original faceless, unlit humanoid
silhouette. Geometry is authored in `tools/combat-art/build_shadow.mjs` and bound
to the established traveller armature, reusing its attributed animation library.
No clothes, equipment, eyes or facial details are shown. Model metadata disables
cast shadows through a generic asset-loader option, matching the creature's
description. Other assets retain their existing shadow behaviour.

The canonical Strength Drain action uses the shared reaching gesture rather than
a weapon swing, with its contact timing aligned to the presentation profile.
Walking, idle, hit and defeat currently reuse humanoid motion. Prone remains
unsupported by this presentation (the canonical monster is immune).

Choose **Shadow** in `combat-study.html`. The local browser check loaded it in
Open meadow, formed an engagement and played Strength Drain without page errors.
`live-shadows-encounter.png` records the first-pass silhouette at gameplay scale.
The silhouette is readable against the meadow; darkness in crypt/woodland scenes
still needs visual acceptance. Animated bleeding edges, dissolution on defeat
and a less human gait remain polish gaps. Specters and wraiths are not claimed
covered by this model: their descriptions require different surfaces and shapes.

Asset tests sample the actual GLB through idle, walking, reaching, hit and defeat,
check unlit texture-free materials and finite pose bounds, verify clip/profile
timing and admit the canonical monster through combat presentation. All 1,002
tests passed; affected lint has zero errors (existing renderer warnings), and
all 12 legal checks passed. No combat mechanics or description-only stat-drain
rules were added by this visual change.
