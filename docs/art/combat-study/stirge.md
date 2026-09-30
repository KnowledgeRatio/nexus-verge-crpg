# Stirge runtime presentation

The Stirge uses the adapted CC0 wasp source with original proboscis geometry,
reduced eyes and rust-red/dark-wing materials. `build_creature.mjs stirge`
exports a roughly 584 KB GLB using `creatureSpecs.json`. Generic authoring options
keep living clips 0.906 metres above the floor, preserve flight during recoil,
and lower the body smoothly to ground clearance during its adapted collapse.
The source +X forward axis is rotated into combat's +Z frame.

The canonical Blood Drain action selects a feeding presentation with the existing
contact planner. Two Stirges can be previewed together through **Stirges** in the
study. Prone is still unsupported by this model and triggers the existing card
fallback. No attachment or recurring-drain mechanic is invented by this change.

The actual GLB tests sample all flight, feeding, hit and defeat clips for finite
skinning and authored floor/hover clearance. Canonical admission and size/action
mapping pass. All 1,016 tests pass; affected lint is clean. The woodland browser
check loaded both actors and played Blood Drain without page or scene errors.
`live-stirges-woodland.png` shows separate hovering bodies at a 1024px viewport.
Their detail is limited at normal tiny-creature scale; translucent abdomen and
wing veins remain unfinished art work.

Impact-frame inspection initially found the needle 0.38 m horizontally from the
target's torso centre. Reducing the presentation reach to 0.34 brings it to
0.20 m from that centre at 1.207 m height, meeting the torso surface while the
planner still preserves separate body clearance. The runtime contact regression
loads the actual GLB and planner, verifies torso-height/surface contact, and passes.
The corrected browser capture is `live-stirge-contact-woodland.png`; it completed
without page or scene errors. The final contact test and lint pass, in addition
to the preceding 1,016-test suite and all 12 legal checks.
