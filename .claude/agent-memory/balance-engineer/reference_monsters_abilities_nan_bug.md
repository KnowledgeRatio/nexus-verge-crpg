---
name: reference-monsters-abilities-nan-bug
description: 19/46 monsters in data/monsters.json ship `abilities:[]` instead of a score object, silently NaN-ing every ability modifier for that monster via EncounterBuilder.js
metadata:
  type: reference
---

`EncounterBuilder.js:182-189` computes monster ability modifiers as `Math.floor((monster.abilities.str - 10) / 2)` etc. Verified (2026-07-30) that 19 of 46 monsters in `data/monsters.json` have `"abilities": []` (an empty array) instead of a `{str,dex,con,int,wis,cha}` object — `[].str` is `undefined` in JS, so every modifier for these monsters evaluates to `NaN`.

Downstream effect confirmed by reading `EffectDispatcher.js`'s `rollDefenderSave`: `NaN < saveDC` is always `false` in JS, so any save-or-condition effect (Trip Attack, Pushing Attack, Disarming Attack today; anything keying off `defender.character.abilityModifiers[saveType]` in general) takes the "resists" branch unconditionally against these monsters — the condition can never land, regardless of the attacker's build.

Severity by level bracket (cross-referenced against `RULES.difficulty.scalingByLevel.enemyTypesByLevel` in `rulesEngine.js`):
- L1 bracket (8 monsters): 0 broken
- L5 bracket (11 monsters): 5 broken (ghoul, specter, ghast, gargoyle, manticore)
- L7 bracket (8 monsters): 7 of 8 broken (minotaur, wight, owlbear, flameskull, ettin, mage, medusa)
- L10 bracket (4 monsters): 4 of 4 broken — troll, wraith, hillGiant, youngWhiteDragon are ALL affected

**Why this matters:** it's orthogonal to any specific save-type reassignment (the bug is in ability-score sourcing, not which key is read) but means any save-based maneuver already silently fails against the entire iconic L10 monster roster today. Not yet reported to `data-agent`/`backend-dev` as of this discovery — surfaced as a byproduct of building [[project-attribute-remap-saves]]'s simulation harness, worth raising as a standalone defect next time monster data or maneuver balance comes up.

**Practical implication for future balance-sim work:** don't pick opponents for a harness from this NaN-broken set if the scenario involves any ability-modifier-dependent mechanic (saves, ability-keyed attacks) — results will be silently wrong. Monsters confirmed to have real ability-score objects (safe to use): commoner, bandit, giantRat, kobold, stirge, banditCrossbowman, goblin, wolf, skeleton, zombie, goblinArcher, voidTrace, orc, gnoll, scout, voidSpawn, bugbear, giantSpider, direWolf, giantHyena, spy, ogre, berserker, voidHunter, veteran, voidShaper, voidTitan (CR10, the highest-CR real-ability monster in the file — useful boss-tier stand-in when the "real" high-CR bracket monsters are NaN-broken).
