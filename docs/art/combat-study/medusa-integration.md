# Medusa first-pass integration

The canonical Medusa selects `medusa-v1.glb`, built by `build_medusa.mjs` from
the reusable traveller. Nine original serpent meshes use animated morph targets
for subtle idle motion and a head-led Snake Hair strike. Olive clothing and
gold-green eyes distinguish the body. Shared bow, walking and reaction clips
remain in use; this is functional creature coverage, not final surface art.

In the combat study, select **Medusa**, then use the creature-action selector
to compare **Longbow** and **Snake Hair**. These actions come from the game's
monster data. Browser playback verified longbow → Snake Hair → longbow without
page errors and with the correct weapon model restored after each change.

`medusa-snake-close.png` is a diagnostic close-up, not a change to the standard
camera. The leading serpent reaches the target's head area at impact. Serpent
jaws are not independently articulated, and the crown still needs surface and
silhouette refinement. Prone remains a card fallback for this creature.

Asset tests check all nine morphs, idle variation, strike extension, finite
motion bounds and floor alignment through bow, strike, walking, hit and defeat.
The art does not implement the description-only Petrifying Gaze or additional
Snake Hair poison mechanics.
