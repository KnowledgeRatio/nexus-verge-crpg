# Expedition review: design brief

**Date:** 2026-10-13. **Status:** diagnostic review specification; no gameplay tuning approved. This is evidence and review scope, not a replacement product roadmap.

## Question and boundaries

Do the current trap, supply, camp and finite provisioning systems make an ordinary expedition meaningfully different for a Survival-trained Dedication character? Measure complete departure, local discovery, attempted work, return, purchases and actual rest behavior. Do not count conditional skill success as proof of useful exposure or completed journeys.

The supplies cap, fatigue thresholds, finite source receipts and current check DC are Nexus Verge house rules. This brief makes no claim that their specific numbers are tabletop rules. Keep bounded accuracy: changing a check DC or training bonus cannot remedy opportunities that players rarely encounter. Non-grid combat policies must not invent distances or movement abilities.

## Representative builds

Primary matched pair uses a human Dedication Knight, Soldier background, Dueling, the Knight standard-array preset and Sap/Topple/Vex masteries. Both retain Perception; the sole creation difference is Empathy versus Survival as the second Calling skill. Soldier grants Athletics and Influence. Neither receives Expertise, unsupported Curiosity features or free magic gear.

| Snapshot | Actual human attributes: Prowess / Resilience / Intellect / Intuition / Presence / Composure | HP | Proficiency | Resolve |
|---|---|---:|---:|---:|
| 1 | 16 / 15 / 9 / 11 / 14 / 13 | 12 | 2 | 0 |
| 5, conditional | 20 / 15 / 9 / 11 / 14 / 13 | 44 | 3 | 7 |
| 10, conditional | 20 / 20 / 9 / 11 / 14 / 13 | 90 | 4 | 15 |

Apply +1 Prowess at levels 2–5 and +1 Resilience at levels 6–10. At level 3 choose Exemplar and Precision Strike, Trip Attack and Parry. Level 4 Hearthcraft, level 6 Forgecraft, level 8 Trading; level 7 Rally and level 9 Riposte. These are eligible current data choices, not an assumption that every optional practice is active. Apply meals/modifications only through their actual UI-supported rest consumers and record actual effects. The level-3 Resolve grant and specialization traits must run through `LevelUpManager.confirmLevelUp`, not stats-only projection. Traits auto-granted are Grace Under Pressure at 3 and Vanguard at 5.

Secondary expedition-oriented profile: human Dedication, Folk Hero, Dueling, class choices Athletics/Perception and background Survival/Empathy. Base standard array is Prowess15, Resilience14, Intellect8, Intuition13, Presence10, Composure12. Human yields Intuition14; otherwise the same progression and martial kit. This is a sensitivity case, not a matched estimate of Survival training: attributes, background, starting money and Influence differ.

Use actual starting-equipment setup, then explicitly equip the owned longsword, shield and chain mail; do not assume its automatic equipment order leaves that loadout active. Starting money is 114 for Soldier and 122 for Folk Hero. Higher-level starting-money fixtures are controlled diagnostic budgets, not earned campaign wealth. No free upper-level enchantments or fabricated item purchases.

### Progression validation limitation

A direct Node probe of the current `LevelUpManager` with actual data, character pending-level creation and DOM validator controls found level 3 disabled despite an eligible Exemplar selection and three tactics. The specialization branch passes its nonempty check, then falls through to a generic `currentSelections.specializations` count that does not exist. Its hint is “Select 1 specialization(s)”. Other tested levels 2 and 4–10 pass that validator. Direct `confirmLevelUp` applies the selected specialization, auto-grants and Resolve correctly, producing the snapshots above; that bypass is not UI reachability or earned progression. Upper-level review must retain the conditional label until the player-facing blocker is repaired and verified.

The independent mechanic trace also identifies live rest recharge discrepancies. Review actual `RestManager` behavior; do not call Character rest methods separately to manufacture the advertised ability/Resolve/equipment-charge recharge. Report intended and observed values separately.

## Play policies

- Primary journey targets a published quest destination, or a locally revealed dungeon where no eligible quest is offered. Movement uses the revealed map and destination direction. No worldwide provisioning lookup, teleporting, forced successful checks or replacing impassable terrain.
- Use the same travel and combat random streams for paired comparisons where feasible; source placement is seeded, live rolls are sampled. Report divergence after different check/resource outcomes.
- Act on a provision clue only when actually revealed, with space below the supply cap. Record full-meter opportunities preserved rather than pretending they were attempts. Primary policy allows a local detour of at most eight additional moves over the planned route; compare zero and sixteen as behavior sensitivities. These limits are diagnostic policies, not proposed gameplay tuning.
- Camp at fatigue 75 or higher while holding more than one supply. Reserve one for return/rest; spending it is allowed when visible circumstances justify it and must be logged. Distinguish ordinary outdoor camping from a usable wilderness sanctuary, where the actual rest eligibility check can permit a long rest. Decisions may use a refuge only after it has actually been seen/revealed. Return decisions use known working towns or revealed sanctuaries, current HP/resources and known route, not future encounter knowledge. Hostile/unrestored settlements are not assumed inns or shops.
- Disarm a detected physical trap through its initial detection prompt, or with Interact after choosing Avoid while still standing on its tile, before leaving. There is no adjacent-tile disarming action: returning onto an avoided armed trap triggers its damage. Untrained Finesse remains permitted. Compare avoiding/disarming under the same known layout; record actual revisit crossings, damage, loot and repeated-trigger prevention.
- End an outward journey with a real return, completed turn-in where applicable, actual merchant refill and actual rest. Log failure, fleeing, death, resource exhaustion, blocked services and unreachable destinations as outcomes rather than silently dropping them.

## Combat policy

Use owned longsword/shield, ordinary attack sequencing and actual mastery application. Steady Nerve heals when HP is around half or lower and missing HP can use the heal. Action Surge is available from level 2: spend it on a boss or dangerous multiple-foe encounter to remove a threat early. At 3+, use Trip Attack on a healthy unprone opponent, Precision Strike against a visibly hard-to-hit opponent when the natural roll required is at least 12, and Parry against damaging melee hits when its reaction and Resolve are available. At 7+, Rally may preserve HP when no temporary HP exists; Riposte is available at 9+ when its real reaction trigger occurs. Actual action, reaction and Resolve restrictions decide legality. Do not stack one-shot abilities freely or substitute hypothetical healing potions. The thresholds are reproducible reasonable-play heuristics, not an optimized policy or a promised win rate.

Attempt the actual flee action when HP and depleted resources make continuing clearly unsafe; report its opportunity attacks and failures. A successful simulation must not impose a skill-based flee mechanic that remains unimplemented. Player ability dispatch runs through the real generic effect/action/use pipeline; the stub `CombatManager.useAbility` alone cannot represent normal Dedication play.

## Evidence and acceptance

For each level/build/seed/policy retain denominators: generated sources and traps, locally reachable, seen, offered, attempted, successful and consequential. Report zero-opportunity journeys, extra supply actually gained and spent, camps supported, fatigue cost, detour moves, trap damage avoided, quest completion, survival/flee outcomes and net gold including loot and purchases. Separate unavoidable encounters from optional combats and include attempted return failures.

Compare matched Survival investment with the alternative skill opportunity cost. A supply obtained at the end of a route with no use is not equivalent to one that enables another camp or saves a purchase. Higher-level sample gear/wealth and missing recharge make combat/economy findings conditional. Do not set an arbitrary acceptable win-rate target before a valid encounter and journey sample exists.

Design acceptance requires opportunities to occur often enough on normal routes to be noticed, training to change a useful outcome, and untrained characters to retain essential progress. Provisioning must stay finite; merchants and returning to town must remain relevant. Trap disarming needs understandable risk and durable safety, not repeatable rewards. Current whole-map counts alone cannot establish any of these.

## Recommendation and handoff

First resolve or explicitly isolate progression/rest integration defects before interpreting upper-level expedition balance. Then measure natural local exposure and actual expedition expenditure before proposing source-density, supply-price or skill/DC changes. Do not add Craft encampments or flee skill bonuses during this audit: new systems would confound the current baseline.

For Creative Director: judge whether cues feel like occasional discoveries and whether the return decision feels like a legible frontier risk, rather than mandatory scavenging or routine check spam. For implementation owners after sponsor approval: preserve generic data-driven effects, the one-attempt source receipt, actual UI resource boundaries and save/load behavior. Product Owner coordinates recommendations and remaining acceptance; documentation ownership remains with the review documentation handoff.

Verified against `data/kits.json`, `data/classes.json`, `data/backgrounds.json`, `data/races.json`, `data/levelProgression.json`, `data/abilities.json`, `data/practices.json`, `src/systems/Character.js`, `src/systems/LevelUpManager.js`, `src/core/rulesEngine.js` and the provisioning implementation report. The probe validates effect application and identifies an explicit UI blocker; it is not a played level-1-to-10 campaign.
