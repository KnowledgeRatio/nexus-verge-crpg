# Expedition review: product scope and acceptance

Date: 2026-10-13. Review only; no gameplay tuning, commit, deployment or issue closure is authorised by these findings.

**Subsequent repair (2026-10-13):** following sponsor authorisation, specialization validation now checks the singular selection and continues to other required choices, avoiding the nonexistent plural array. Four callback/validator regressions with real progression data and a stub DOM pass, including completed Exemplar/Oath choices and incomplete selections. This clears the reproduced confirmation-gate defect locally; hands-on browser progression and expedition acceptance remain open. Rest recharge and shared-door repairs remain unresolved. The recommendations below preserve the original review baseline.

**Subsequent rest repair (2026-10-13):** sponsor-authorised integration now restores eligible ability/equipment resources and Resolve through actual rest controls, sharing a resource-only helper with `Character`. Automatic Calling abilities qualify by class, level and specialization; tactics and vows remain gated by known choices. Twenty-three new regressions cover restored levels 1/5/10, recharge types, loading/failure/concurrency, state replacement, costs and button callbacks with stub DOM; validation is recorded in `docs/CHANGELOG.md`. Hands-on browser acceptance and repeated route evidence remain open. Shared-door repair remains unresolved. The recommendations and route findings below still describe the pre-repair baseline.

## Player question

Do ordinary expeditions give skill investments worthwhile, understandable benefits while preserving reasons to prepare, buy supplies, return to town and take risks? This review evaluates the current game before proposing additional Craft or escape mechanics.

## Live product scope

GitHub connector reads on 2026-10-13 confirm [#41](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/41), [#57](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/57) and [#39](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/39) remain open. These are the roadmap; this report is acceptance evidence, not a substitute backlog.

- **#41:** whole-game skill exposure, legal-build achievability, useful consequences and sponsor experience acceptance. This expedition sample contributes evidence but cannot establish whole-game balance.
- **#57:** actual quest journeys, combat/resource costs, total rewards and sponsor acceptance. Quest generation and controlled victory fixtures do not complete this gate.
- **#39:** truthful quest tracking and reputation surfaces. Existing consequence integration does not establish broad completion.

Current source inspected includes `src/core/rulesEngine.js`, `src/systems/FatigueManager.js`, `RestManager.js`, `MerchantManager.js`, `Player.js` and `data/merchantInventory.json`. Expedition Supplies directly restore one carried supply, capped at three, with provisional base value 35 gold. Finite provisioning uses DC12, +1 supply, ordinary attempt fatigue and one saved attempt per site. Detected, avoided traps remain armed; stepping onto them again triggers them once. Hostile/rebuilding settlements lack ordinary services until restoration and must not count as immediate refuges.

## Required experiment accounting

| Question | Denominator and evidence |
|---|---|
| Does Survival appear during normal travel? | Independent generated worlds, declared route policies and map sizes; report zero-source and zero-use routes, not just worlds with sources. |
| Is the opportunity useful? | Separate generated, reachable, encountered, offered, attempted and resolved sources; record actual capped supply gain, fatigue paid and detour distance. |
| Does training change expedition decisions? | Same-world, same-route trained/untrained comparisons with creation-valid profiles at levels 1/5/10; disclose projected progression and helpers. |
| Is preparation worthwhile? | Starting/ending supplies and gold, actual purchase prices, camps, long rests, fatigue, exhaustion, HP and resource ledgers. Account for supply-free rest penalties. |
| Do traps justify detection/disarming? | Generated and crossed traps, detection, avoidance, disarm attempts, successes, triggered damage and actual rewards. Distinguish safe alternative routes from unavoidable crossings. |
| Are refuges accessible? | Usable ordinary towns and inn/shop availability, excluding hostile/rebuilding sites. Geometric distance is not a played journey. |
| Is essential progress viable? | Failures, retreats, deaths and zero-payoff expeditions under declared policies; untrained characters retain a route. |

Independent worlds and route pairs are experimental units. Dice rolls and repeated actions within a route are not independent player journeys. Every result must state whether actual movement, encounters/combat, rests, purchases, provisioning and quest turn-in ran, or whether a controlled substitute was used.

## Dependency gates

1. Validate route and legal-build measurement before interpreting totals.
2. Diagnose current supply/trap/provisioning exposure and cost before proposing frequency, price or DC changes.
3. Obtain Game Designer intent and sponsor agreement for substantive gameplay changes; then implement and repeat the same evidence policy.
4. Evaluate new Craft shelter benefits and Athletics/Finesse escape options separately. New mechanics are not repairs justified merely by this review.
5. Broader rune, Lore, social and quest outcome review remains necessary for #41; sparse Survival sources cannot establish the usefulness of all skills.

## Decision register

The live `decision`-label search returns #16, #34, #35, #36, #37, #46, #50 and #58. None prevents bounded-session expedition evidence. Run structure (#35) matters before claiming cross-run depletion or progression; current receipts establish saved-world single use. Restored-town ownership (#58) remains Later discovery, not an expedition-refuge assumption. No GitHub or Project mutation was requested or performed in this review.

## Evidence status

Existing provisioning evidence establishes deterministic bounded placement and one-use mechanics, not natural-route exposure. Its five small-world seeds contain 1–3 sources each (mean 1.8). Conditional rested level-1 trained Knight odds imply about 0.99 successful supplies across the entire map versus 0.81 untrained, before discovery or detours. These are map-wide expectations, not played-route benefits. Route findings and ranked recommendations must remain distinguished from this earlier functional evidence.

## First material dependency finding

The implementation trace identifies a live recovery mismatch: `RestManager.shortRest()` / `longRest()` update HP, hit dice, spell slots and relevant rest counters but do not invoke the ability-use/equipment-charge recharge logic present in `Character.shortRest()` / `longRest()`. `RestManager` also does not replenish Dedication Resolve. The UI calls RestManager, so Character-method-only assertions cannot prove player recovery. This affects full-ability expedition costs and viability, including restored plain characters.

**First recommendation:** present the recovery integration repair to the sponsor before considering supply price or provisioning density. Keep unmodified-runtime route evidence as a diagnostic baseline. After approval and repair, repeat matching routes before attributing attrition to intended resource balance. This is a repair candidate, not an authorisation to change rest rules or a reason to hide current depletion inside a simulation helper.

## Final bounded evidence and recommendation

The [balance report](2026-10-13-expedition-balance.md) records 360 overland executions across 15 independent small worlds and 180 matched build pairs, including 884 real combat executions. These worlds contained 45 provision sources, but the routes revealed and attempted **none**. The independent exposure denominator is therefore 0/15 worlds, not 0/360 independent populations. This establishes zero benefit under this route policy, not zero Survival value throughout the game.

Among returning characters, median supply purchases cost 102/99/62 gold at diagnostic levels 1/5/10. Main routes received actual combat loot but no quest commissions. Upper levels are conditionally constructed progression snapshots, not verified playable UI progression. Full-terrain A* supplies navigation foresight, and the policy declines optional road challenges. These figures cannot establish typical player routes or whole-run affordability.

The separate 27-trial dungeon pilot produced 16 dungeon entries, two genuinely completed and paid Investigation quests, five physical trap crossings and 26 blocked outbound doors. No boss was reached; no boss difficulty or universal quest-completion claim follows.

| Order | Recommendation | Acceptance before advancing |
|---|---|---|
| 1 | Present three existing correctness repairs together: rest recharge, level-three specialization validation, and shared door state. | Sponsor approves scope; Game Designer validates intended recovery/progression/passage behavior and Architect validates shared boundaries. Actual UI rest callbacks restore eligible counters/Resolve; an ordinary legal character confirms specialization; a successfully traversed connection stays consistent from both sides, including save/load. |
| 2 | Repeat the same route seeds after approved repairs. | Keep current-runtime diagnostics; show differences in exhaustion, HP, ability resources, deaths, retreats and cost without silently granting helper recovery or forced passage. |
| 3 | Investigate where finite Survival opportunities can actually be encountered. | Compare generated sources with visible/revealed sites and destination-route exposure, including zero-use journeys and bounded detours. Recommend placement/frequency only against a designer-defined expedition benefit; preserve one-use receipts and no XP/cash farming. |
| 4 | Extend resource/economy and quest-journey evidence. | Earned equipment/progression, later towns, cautious retreat, usable refuges and actual commissions are included before tuning the provisional 35-gold supply price or claiming affordability. |
| 5 | Consult separately on Craft shelters and skill-based fleeing, then remaining rune/Lore outcomes. | These are new mechanic/content decisions for the sponsor; they do not substitute for repairing and accepting current mechanics. |

The reverse-door trace reproduced a fresh reverse challenge that failed and locked a connection already entered successfully, preventing retreat. The rest defect was reproduced through the actual UI callback, rather than only isolated helper methods. Specialization confirmation is blocked by the live level-three validator despite data-eligible selection. These are distinct current defects, not demonstrated reasons to increase skill bonuses or reduce encounter difficulty.

**Acceptance ruling:** this diagnostic review is complete for its declared sample; expedition balance, whole-game skill value and sponsor play acceptance remain open. No production numerical tuning is justified yet. No gameplay repairs, new feature approval, GitHub edits or issue closures were performed. The ranked recommendation is ready for sponsor consultation.
