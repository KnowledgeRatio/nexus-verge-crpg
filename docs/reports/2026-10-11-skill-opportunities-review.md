# Skill opportunities and journey review

Date: 2026-10-11. Status: initial implementation trace and design consultation. This records the sponsor-approved review, not approval of new gameplay mechanics. More quest content is deferred; no production tuning is included.

Follow-up: the sponsor approved the first supplies/trap repair tranche. Its implemented behavior and validation are recorded in [the repair report](2026-10-11-supply-trap-repair.md). The table below remains the pre-repair baseline; broader skill/journey acceptance and the other recommendations remain open.

2026-10-13 follow-up: sponsor-approved finite Survival provisioning is implemented for new worlds. See [implementation and bounded evidence](2026-10-13-wilderness-provisioning.md). This supplies an actual extra-camp benefit, while natural-route exposure and overall marginal skill value remain open.

## Scope and ownership

Product Owner coordinates existing skill-value issue #41, quest acceptance #57 and tracking/reputation #39. The live GitHub connector confirmed all three remain open during this review; no issue/project mutations were made. Game Designer owns mechanic intent, Mechanics Master traces current behavior, and Balance Engineer measures actual consumers. New gameplay changes return to the sponsor for review.

The broader review still requires complete legal Dedication builds at levels 1, 5 and 10, actual travel/combat/rest/turn-in, marginal skill comparisons and several world seeds. Conditional arithmetic or short consumer trials must not be described as complete journeys.

## Verified current behavior

| Candidate | Current reachable behavior | Gap or limitation |
|---|---|---|
| Traps | Dungeon movement invokes passive Perception detection; detected traps offer Finesse disarm or avoidance. Failed detection/disarm inflicts damage. | Avoidance, success and failure all clear the trap flag; avoidance does not preserve an armed known hazard. Detection happens upon tile entry. |
| Trap persistence | Flags change in live dungeon state. | Active dungeon state is excluded from saves and cleared on load. Re-entry regeneration was not browser-tested. |
| Craft equipment maintenance | No equipment durability, recurring wear or maintenance path found. Forgecraft is a separate practice. | This would add a new resource/economy system, not activate an existing skill opportunity. |
| Athletics/Finesse combat and fleeing | Flee uses blended Prowess/Intuition plus universal proficiency, with action cost and opportunity attacks. | Named skill training does not contribute. Weapon finesse is distinct from the Finesse skill. |
| Expedition supplies | Separate fatigue supplies are consumed by camp and long rest; empty supplies reduce rest recovery and interact with exhaustion. | No skill conservation/refill consumer found. Inventory provisions and merchant stock do not replenish this counter. |
| Foraging and Survival | Foraging practice banks extra loot rolls; Survival has environment/wayfinding outcomes. | Neither replenishes/conserves expedition supplies. Loot descriptions do not establish supply-counter restoration. |

Trace sources: [Player](../../src/systems/Player.js), [DungeonGenerator](../../src/systems/DungeonGenerator.js), [skill challenge data](../../data/skillChallenges.json), [CombatManager](../../src/systems/CombatManager.js), [FatigueManager](../../src/systems/FatigueManager.js), [SaveManager](../../src/systems/SaveManager.js), [Character](../../src/systems/Character.js), [main](../../src/main.js), [SkillChallengeManager](../../src/systems/SkillChallengeManager.js).

Mechanics Master ran 41 existing integration/characterization tests successfully. This supports the covered checks, not browser verification of all rows or natural dungeon exposure rates.

## Consultation recommendations — not approved changes

1. Traps: preserve a choice between detecting, bypassing, disarming and triggering. Detection without disarming should be useful. Persistence must create a route/access decision rather than repeated dismissal prompts. Resolve the physical-tile and separate authored-challenge behavior together.
2. Expedition supplies: investigate the missing replenishment link immediately because it affects baseline journeys. Consider bounded Survival provisioning with a finite source or meaningful cost; unlimited repeated checks would erase expedition pressure and distort urgent deadlines.
3. Escape: consider distinct Athletics/Finesse approaches while retaining baseline escape for untrained characters. Do not simply add both bonuses to existing proficiency. Preserve action and opportunity-attack costs.
4. Craft: prefer optional repairs that unlock access or expedition benefits before recurring equipment wear. Universal maintenance risks making Craft compulsory and adding routine chores.

## Remaining evidence and decision gate

Bounded pilot artifacts: [harness](../../tools/balance-sim/skill-journey-pilot.js) and [results](../../tools/balance-sim/skill-journey-pilot.results.json). Execution covered 72 synthetic movement/check cells, 1,440 exhaustive d20 resolutions and 72 real inn-rest calls at levels 1/5/10. Creation-valid paired Knight profiles differ in Finesse versus Empathy; higher levels use conditional level-up/attribute projections, not earned progression or complete specialization builds. Diagnostic DC12/14/16 does not imply existing quests have Finesse routes.

In the synthetic 180-tile rough route, level-1/5 profiles without camp ended at exhaustion 1 with all three supplies retained; camping at fatigue 75 prevented exhaustion but consumed all three supplies. The projected level-10 profile's stronger Resilience ended at fatigue 67.5 without needing camp. From exhaustion 0, consecutive zero-supply inn rests yielded exhaustion 0/1/0/1/0/1 and HP at half maximum; from exhaustion 2 the result alternated 1/2. These are observed consumer interactions, not a ruling that the rules are bugs or balanced. Conditional Finesse training improved success by 10/15/20 percentage points at levels 1/5/10; exhaustive dice support requires no sampling confidence interval.

The pilot did not execute actual terrain generation/movement input, combat, quest acceptance, retries, payment or turn-in. It establishes measurement feasibility and rest/supply interactions, not full journeys, skill encounter frequency or win rates. Harness execution and diff checks passed; harness lint has zero errors and 26 warnings. No production changes were made.

Measure generated opportunities, reachable opportunities, selected approaches, successes and observable consequences separately. Include zero-use sessions, fatigue/HP costs, travel, combat/death, gold and supplies, access and information. Check distinct-payoff concerns for Craft/Investigation rune alternatives and Lore information consumers alongside the new candidates.

Before implementation, return ranked findings and proposed changes to the sponsor. Full quest/combat/economy acceptance and whole-run skill value remain open; content combinations, unit tests and simulated check odds do not close them.
