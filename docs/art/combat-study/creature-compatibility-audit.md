# Creature presentation compatibility audit

Inspected 2026-09-25 against the working tree. This is implementation evidence and
an asset-contract investigation, not a replacement for the GitHub roadmap.

## Roster evidence

`data/monsters.json` contains 46 entries: 14 humanoids, 6 beasts, 9 undead,
4 giants, 1 elemental, 4 monstrosities, 3 dragons and 5 aberrations.
`data/combatScene.json` currently admits only small/medium humanoids. Therefore
32 entries are outside the creature-type filter, before checking action support.
Even admitted humanoids currently share traveller-derived appearances; admission
does not establish anatomical or visual fidelity.

Action audit also found that the admitted `gnoll` has a canonical Bite action,
while `combatScene.json` maps `Bite` to the unarmed `Punch_Jab` motion. This is
misrepresentation within current humanoid coverage, not just a future beast
problem. A natural-attack motion and appropriate anatomy must be proved before
claiming full humanoid action fidelity. Weaponless action support alone is not
evidence of a suitable animation.

Rules types are not animation families. Skeletons and some giants are bipeds;
undead also include a floating skull and incorporeal forms. A single beast rig
cannot convincingly cover wolves, spiders and flying stirges.

| Candidate asset family | Existing roster examples | Reuse limits to prove |
| --- | --- | --- |
| Canine quadruped | wolf, direWolf | Proportions, shoulder height, stride and bite reach; not merely uniform scale |
| Other quadrupeds | giantRat, giantHyena | Rat haunches/tail and hyena sloping back require different anatomy and gait adaptation |
| Articulated bipeds | skeleton, zombie, ghoul, ghast, wight, ogre, ettin, troll, hillGiant, minotaur, medusa | Body meshes, natural attacks, extra heads/hair and large footprints need separate validation |
| Winged and many-limbed | stirge, giantSpider, gargoyle, manticore, youngWhiteDragon, youngGreenDragon, youngRedDragon | Wings, leg count, tails, grounded/flying states and natural projectile sockets |
| Floating or incorporeal | shadow, specter, wraith, flameskull, voidTrace, voidSpawn, voidHunter, voidShaper, voidTitan | Read each canonical imageDescription; smoke silhouettes are not interchangeable ghost people |
| Heavy hybrid | owlbear | Beak/claw attacks and a distinct body/gait; do not assume canine reuse |

These are investigation groups, not approved rig compatibility claims.

## Concrete renderer constraints

- `CombatPresentation.combatPresentationSnapshot`: unsupported type/size sends
  the entire encounter to cards. This remains the honest fallback until assets
  and actions are supported. Do not simply admit all beasts.
- `CombatSceneLayout`: staging and movement reserve one equal-sized cell per
  actor. Contact routing already accepts per-actor radii in `CombatContact`,
  but formation placement and movement corridors do not reserve larger bodies.
- `CombatScene` contact setup derives both radius and reach from humanoid
  appearance height. Long low bodies need independently authored footprint and
  attack-contact measurements, with conservative turning clearance.
- Resolved after this audit: `CombatScene` effect playback now uses a model's
  configured `effectTarget` joint and local offset for projectiles, impact
  flashes and healing destinations. The traveller uses its animated spine;
  unloaded art uses a body-local fallback that follows scale and rotation.
  Each new creature still needs an authored and visually verified socket.
- `CombatArtAssets` grip setup assumes left/right humanoid hands. Natural
  attacks need mouth/claw/tail origins and must not require dummy weapons or
  fabricated hand bones. Head aim and support-hand IK must be optional rig
  capabilities.
- Camera framing must include the actual body, tail and wings at the normal
  gameplay view. Enlarging a rig is not proof that the framing still works.

## First proof candidate: wolf

The existing medium wolf has a Bite action with no weaponId. Its canonical art
description specifies a grey-brown timber wolf, hip-high shoulders, two coat
textures, a low deliberate stance and a straight-carried tail. That provides a
concrete art target without inventing a new creature or mechanic.

The proof should exercise idle, approach, bite hit/miss, recipient reaction,
withdrawal and defeat in a mixed humanoid/wolf encounter. Bite must originate at
the mouth, impacts must land on the actual recipient, and feet must remain
grounded. Three wolves engaging one humanoid should retain separate bodies and
avoid sweeping tails/haunches through neighbours. Then use direWolf to test the
large-body assumptions; that is a second validation, not an automatic rescale.

Action records, damage, conditions and engagement remain authoritative engine
outputs. Trait descriptions in monster data are not evidence that those rules
execute; trace the engine before promising Pack Tactics, knockdown or other
secondary effects. Do not add mechanics to make the visual proof work.

Subsequent implementation: the medium wolf now has a dedicated runtime rig,
per-appearance contact dimensions, hand-optional attachment, and its own action
mapping. The earlier roster and constraint observations above describe the
pre-integration audit. See `wolf-integration.md` for current scope and limitations.

## Effect-anchor browser check

`effect-anchor-check.png` records the settlement renderer with the real animated
traveller at 0.76 scale, standing and in its held prone pose. Each pair captures
25% and 90% of spell/healing travel. The browser harness invoked existing effect
presentation directly; this is not evidence of reachable player spell mechanics.
No browser errors occurred. The animated target anchor dropped from approximately
0.665 m standing to 0.074 m prone and projectile travel followed it.

Initial inspection found that healing interpolated downward toward the prone
anchor and became obscured by floor/body detail. Healing now rises above the
higher of its start and recipient anchor by the configured `healingRise` amount.
The repeat capture shows the ring clearing the prone body. Its contrast remains
subtle against paving; these sampled frames do not establish final effect-art
acceptance, impact-flash quality, or readability throughout a live encounter.
