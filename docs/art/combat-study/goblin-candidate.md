# Goblin combat body

2026-09-27. First-pass shared body for the canonical Goblin and Goblin Archer.

`tools/combat-art/build_goblin.mjs` derives `goblin-v1.glb` from the original
modular traveller: enlarged head, original pointed ears, amber eyes and nose,
yellow-green skin, short scavenged coat and gathered trousers. Runtime scale is
0.6 of the traveller. The model retains the shared, attributed CC0 combat motions;
every clip is grounded after the geometry changes.

Both monster IDs use this asset in the normal combat presentation. The study
offers **Goblins — melee and archer** and **Goblin archer**. The creature action
selector includes canonical backup weapons, so the archer can preview Shortbow,
Scimitar and Shortbow again without pretending the sword is an off-hand weapon.

Browser verification exercised that sequence and defeat without console errors.
`live-goblin-archer.png` and `live-goblin-archer-defeat.png` record the result.
Integration tests use actual monster data and Combatants; geometry tests sample
every retained animation for floor penetration. This is a reusable first-pass
body, not final facial art or a bespoke goblin crouch animation.
