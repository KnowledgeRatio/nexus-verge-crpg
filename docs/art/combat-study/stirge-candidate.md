# Stirge — adapted authoring candidate

Historical candidate stage. Runtime calibration and integration now continue in
`stirge.md`; the limitations below describe the uncalibrated source artifact.

`prepare_stirge.mjs` adapts the retained CC0 wasp source into
`tools/combat-art/stirge-candidate.gltf`. It replaces yellow/blue surfaces with
rust-red body and dark translucent wings, reduces oversized eye geometry,
removes triangles dominated by the rear-sting joint, and adds original hollow
proboscis geometry attached to the head. `StirgeContact` marks the needle tip.

The source abdominal-sting attack is removed. `Stirge_Feed` preserves flight
posture with a shorter wing cycle; it is an input for a future forward feeding
strike, not proof of calibrated contact. Source flight and death remain for
inspection. `stirge-candidate-poses.png` shows those three candidate clips.
The actual asset test samples every clip, checks finite bounds and verifies
that the proboscis/contact marker stay attached to the head.
All 1,013 tests pass (67 files, two workers); the changed authoring/test files
pass ESLint and all 12 legal checks pass. Browser pose inspection used the actual
adapted candidate and shows a forward needle with no retained rear sting.

Not registered in runtime yet. Remaining work includes tiny-creature scale,
normalizing the source's +X facing to combat's +Z, hover clearance, hit reaction,
forward feeding contact and a grounded fall on defeat. The original death still
penetrates the floor. Abdomen translucency and wing veins are also unfinished.
No attachment or recurring-drain gameplay has been added from description text.
