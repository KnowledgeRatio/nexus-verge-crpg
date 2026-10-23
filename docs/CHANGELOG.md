# Development Changelog

Archived session notes. For active work see `docs/plans/` and `.claude/rules/architecture.md`.

---

## 2026-10-18 — Quest culture-standing rewards

The reputation slice of [#39](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/39) connects explicit ordinary quest rewards to real culture communities: issuer, issuer plus destination, or the campaign catalogue. Bound NPC rosters select cultures without duplicates; missing required communities warn without partial standing payout while other rewards/completion proceed. Authored amounts retain existing score clamps. Saved actual-change receipts prevent repeated awards; rich faction resolutions and personal bonuses avoid duplicate culture payout. UI previews name cultures and turn-in reports actual changes; the character sheet shows live scores.

Final suite passes 1,691 tests/149 files with two workers/60-second timeout; build passes with 185 app files/107 media files. Controlled desktop/mobile actual offer/accept/track/turn-in/save flows verify clamped scores, unchanged unrelated personal relations, merchant price 96→91 and no repeated payout. The ordinary NPC handover classifier now uses real rich-quest capabilities rather than incidental evidence bookkeeping. Repository lint reports 171 errors/1,134 warnings; broader lint 3,247 errors/2,379 warnings, with new helper/tests clean. See the [reputation report](reports/2026-10-18-quest-reputation.md) for artifacts and scope limits. No new organizations, issue closure, commit or deployment.
## 2026-10-18 — Quest tracking with received information

The tracking slice of [#39](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/39) is implemented locally: one Track/Untrack journal selection drives overworld/dungeon HUD and world-map guidance. Acceptance records only a briefing actually displayed. High information gives an exact entrance; medium gives an aligned search area without a pin; low preserves an issuer-based bearing. Real discovery grants exact guidance. Required fieldwork switches to the giver without forcing optional investigation; terminal lifecycle changes clear selection. Board/journal cards stop disclosing exact target distances.

The final suite passes 1,664 tests/147 files with two workers and a 60-second timeout; web build passes with 184 app files/107 media files. Controlled desktop/mobile flows verify selection, guidance, saving, lifecycle behavior and real mouse/touch panning without page errors or hidden region generation, including a nonempty-region save roundtrip. Repository lint retains 175 existing errors/1,131 warnings; broader lint retains 3,251 errors/2,376 warnings. New tracking helper/tests are clean. See the [tracking report](reports/2026-10-18-quest-tracking.md) for evidence and saved-fog limits. Broader reputation work and #39 closure are not included. Nothing committed or deployed.
## 2026-10-18 — Condition immunity enforcement

Local repair for [#49](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/49) makes Combatant use the source character's immunity array and reject immune conditions before stacking/refreshing. Generic effects and mastery messages now distinguish immunity from a successful application. Immune control does not consume Exposed or start concentration; valid damage, resource costs and unrelated effects remain. Topple skips its condition save/reaction for prone-immune targets. No monster data or numerical tuning changed.

Twenty-three new regressions pass; the final full suite passes 1,627 tests/145 files with a 30-second timeout. Canonical Shadow/Ogre browser encounters verify immune/control outcomes, hit damage and Resolve costs at desktop/mobile sizes; the live Dodge entry point also reports immunity correctly. Scoped CSS repairs clipped feedback and makes logs/actions reachable; existing nine-pixel mobile horizontal overflow remains under #6/#7. Lint retains 175 errors/1,115 warnings and broader lint 3,251 errors/2,360 warnings; new helper/tests are clean. Final web build passes with 183 app files/107 media files. See the [repair report](reports/2026-10-18-condition-immunities.md) and its browser artifact. This records local implementation, not issue closure, commit or deployment.

## 2026-10-18 — Wilderness supply coverage validation

Validation-only follow-up runs 180 journeys from 15 functioning town fixtures across five reused worlds at levels 1/5/10. It sees 19 distinct sites and attempts 13, including 11 outward sites, with 54 repeated attempts and 37 supplies. Three-move detours give occasional extra target reach; eight-move detours add supplies without increasing total arrivals. Return differences are not statistically distinguishable. Game Designer retains current settings and accepts the local first slice with provisional density; no automatic tuning follows.

The [coverage report](reports/2026-10-18-wilderness-supply-coverage.md) records source-independent town selection, later-town fixture limits, real resupply access, policy comparisons and reproduction. Full suite passes 1,604 tests/143 files with a 30-second timeout. Scoped lint has zero errors/104 warnings; broader lint retains 3,251 errors/2,356 warnings. All 119 checked production inputs are unchanged. Earlier journey artifacts remain historical; natural routing and whole-campaign balance remain open. Nothing committed or deployed.

## 2026-10-18 — Standalone wilderness supply objects

Sponsor-approved plants and game tracks now generate on compatible traversable wilderness ground, separate from safe shelters. Visible markers draw over the terrain and dim after use. E/touch Interact opens the existing gathering prompt without opening shelter/rest. Seeded placement avoids roads, feature overlaps and nearby settlements; old saved worlds are not backfilled. Shelter allocation rises from 25% to 50%; standalone density remains provisional. DC12, one capped supply, two-fatigue attempts and saved depletion are unchanged.

Focused validation passes 53 tests in six files; the full suite passes 1,604 tests in 143 files with a 30-second timeout. Web build and desktop/mobile interaction fixtures pass. Repository lint retains 175 errors/1,111 warnings; broader lint retains 3,251 errors/2,312 warnings. Three map-size audits verify placement and unchanged base-layout hashes. A separate 120-execution journey sample across five reused worlds records 12 attempts at one source location, seven supplies and two paired level-one target-and-return gains. Overall return differences are not statistically distinguishable; density remains provisional. See the [implementation report](reports/2026-10-18-wilderness-supply-objects.md) for controls and limits. Earlier purpose-only approval statements remain historical; this later approval covers these objects and rendering. No balance clearance, commit or deployment.

## 2026-10-18 — Provisioning purpose confirmed

Sponsor confirmed wilderness provisioning exists to extend travel far from functioning settlement resupply. The near-town relocation recommendation and inferred requirement to raise starter-route exposure are withdrawn. The earlier 1,080 starter-route executions remain valid measurements of that narrow policy; they do not establish failure of the intended remote-travel function or prove distant source placement wrong.

Next validation uses existing generated sites on actual long journeys at levels 1/5/10, with declared real resupply access, matched training/gathering comparisons where appropriate, and onward travel, turnback, cost and safe-return evidence. Remote usefulness remains unverified; no numerical target, new resource host, relocation, density or price change was approved. Governing intent and validation are recorded in `.claude/rules/systems/world-gen.md`; production code/data remain unchanged.

## 2026-10-13 — Provisioning exposure experiment

Harness-only comparison completes 1,080 actual expedition executions across 15 reused worlds. Increasing candidate allocation from 25% to 100% raises sources from 45 to 89 but yields zero encountered clues under eight-step primary and zero/sixteen-step sensitivity policies. No eligible provisioning sanctuary was revealed. Catchment census finds no eligible shelters within 64 geometric tiles of sampled starter departures and only four worlds within 128; shelter intelligence alone is not demonstrated as a cheap local remedy. Finite roadside sources are a proposed direction requiring design approval, not delivered content. Production allocation, prices, DCs and rewards remain unchanged.

See the [exposure report](reports/2026-10-13-provisioning-exposure.md) for artifacts, exact reproduction and denominator limits. Syntax, all seven artifact parses, all recorded source hashes and whitespace checks pass; new-tool lint has zero errors and 12 warnings. Broader lint retains 3,251 existing errors and reports 2,272 warnings. Nothing committed or deployed.

## 2026-10-13 — Combat tactic costs and automatic reactions

Sponsor-authorised follow-up restores authored Resolve charging for queued on-hit tactics: the shared effect dispatcher applies the cost once after a hit, rejects unaffordable tactics, and leaves misses without a tactic cost. Reaction eligibility now uses shared class/level/specialization definitions, so automatic Indomitable is offered without a `selectedAbilities` entry; tactic/vow choices and existing availability gates remain enforced. No numerical tuning or data changes.

Nine new regressions cover restored Trip Attack hits at levels 3/5/10, insufficient Resolve, misses and automatic-reaction offer/click behavior. The focused suite passes 86 tests across three files; the final full suite passes 1,586 tests in 141 files (`npm test -- --maxWorkers=2 --testTimeout=30000`, 65.33 seconds). Repository lint retains 175 errors and 1,103 warnings. The new 360-route artifact records 902 actual fights and unchanged return counts of 46/39/35 per 60 sampled routes at levels 1/5/10, with zero provisioning encounters despite 45 sources. A separate 27-trial dungeon batch records 17 entries, 11 returns, seven deaths and nine planner stops. These samples do not clear balance or justify numerical tuning. Reaction-modal evidence uses unit callbacks; the route sampler overrides reaction policy and cannot establish natural reaction-UI balance. Earlier expedition results remain historical. See the [repair report](reports/2026-10-13-expedition-repairs.md) for artifacts and limits. Nothing committed or deployed.

## 2026-10-13 — Approved expedition correctness repairs, consolidated

The sponsor approved rest recharge, level-three specialization confirmation and shared dungeon-door state. The live rest path and Character methods now share resource-only recovery, including plain saves and definition-driven ability/equipment recharge; asynchronous preparation rejects replacement characters/worlds and does not consume a rest after failed loading. Level-three Exemplar/Oath confirmation accepts the scalar specialization while still requiring its branch selections and attribute increase. Opened dungeon passages share completion/lock state in both directions and retain sparse endpoint-validated receipts across saving and regeneration; unsuccessful opening preserves the existing lock rule.

Settled targeted checks pass: rest 54 tests, progression 20/five files, doors 40/three files. The first overland rerun exposed automatic Calling abilities missing from the initial recharge helper; actual class/level/specialization eligibility now includes these abilities, with tactics/vows still restricted to known choices. Actual creation and JSON-restored-character regressions verify Steady Nerve recovery with empty `selectedAbilities`. The final suite passes **1,577 tests in 141 files**, using `npm test -- --maxWorkers=2 --testTimeout=30000`. The final 27-cell dungeon pilot gives 17 entries and 12 returns, versus 16/10 before; the two prior alive-but-stranded exit failures disappear. Six deaths and nine planner stops remain unchanged; no boss verdict follows. All 360 overland cells repeat with actual recharge assertions and 1,560 validated level-up steps; 888 fights run, but numerical balance remains open. Zero provision clues are encountered despite 45 sources in 15 worlds; price and placement values remain unchanged. Repository lint retains 175 errors/1,103 warnings. See the [repair report](reports/2026-10-13-expedition-repairs.md). Earlier partial-delivery entries below are historical and their unresolved-door statements are superseded by this consolidated entry. Nothing committed or deployed.

## 2026-10-13 — Rest resource recovery integration

Sponsor-authorised repair wires resource recovery into the actual short/long-rest controls, including restored plain characters. `Character` and `RestManager` share `src/systems/restRecovery.js`: short rests recharge eligible short-rest ability uses and equipment charges and restore Resolve; long rests also recharge long-rest resources. Automatic Calling abilities are eligible by class, level and specialization even with empty `selectedAbilities`; tactics and vows still require known choices. Unknown definitions retain their spent counters. The shared helper owns resource recovery only, leaving healing, supplies and world-clock effects with each caller.

RestManager uses loaded ability definitions or fetches/caches them when spent abilities need lookup. A failed load refuses the rest without consuming resources; eligibility is checked before and after loading, overlapping rest attempts are blocked, and replacement of the character or world cancels the pending rest. Rest information now describes recharge. Twenty-three new tests cover levels 1/5/10 after serialization, automatic abilities from actual creation, level/specialization/choice eligibility, recharge types, blocked rests, loading/failure/concurrency, state replacement, supply/time behavior and actual button callbacks with stub DOM. The focused suite passes 74 tests across three files; new helper/test lint passes. Repository lint retains 175 existing errors and 1,103 warnings. Hands-on browser acceptance and repeated expedition routes remain open. Earlier unresolved-door status is superseded by the consolidated entry above. Nothing committed or deployed.

Final full regression run passes 1,577 tests in 141 files (`npm test -- --maxWorkers=1 --testTimeout=30000`), including the automatic-ability eligibility correction. The rest helper, controls and regression files were unchanged during final verification.

## 2026-10-13 — Specialization confirmation validation repair

Sponsor-authorised repair stops required specialization validation after checking the scalar selection, instead of also demanding a nonexistent plural array. Level-three Dedication choices can now enable Confirm when the specialization, its required tactics or aura, and the attribute increase are selected. Missing selections remain blocked; no progression data or rest behavior changed.

Four regression tests use actual progression data and selection callbacks with a stub DOM. Two tests reproduced the defect before the fix; all four pass after it. This validates the confirmation gate, not hands-on browser progression or a played level-1-to-10 campaign. Expedition rest recharge and reverse-door findings remain unresolved. Nothing committed or deployed.

Full regression suite passes 1,543 tests in 139 files (`npm test -- --maxWorkers=1 --testTimeout=30000`). The new test file passes scoped lint; repository lint retains 175 existing errors and 1,104 warnings, including an unchanged conditional-formatting error in `LevelUpManager`.

## 2026-10-13 — Expedition and skill-value diagnostic review

Product Owner, Game Designer, Mechanics Master and Balance Engineer completed a coordinated bounded review: 360 overland route trials across 15 worlds, 884 actual combat executions and 27 dungeon pilots. No provision clue was encountered in the route sample despite 45 generated sites. Independent live probes confirmed rest-resource recovery, level-3 specialization validation and reverse-door state defects; no production repairs or tuning were made. Two genuine Investigation turn-ins were exercised; no boss balance verdict follows. Upper-level snapshots, terrain-planning foresight, correlated samples and excluded optional skill events are documented. The [review summary](reports/2026-10-13-expedition-review.md) records sponsor consultation and repair-before-tuning recommendations, with reproducible artifacts and source hashes. Harness syntax/JSON/replay/whitespace checks pass; scoped lint has zero errors and 71 warnings. Nothing committed or deployed.

## 2026-10-13 — Hostile settlement liberation and recovery

Sponsor-requested hostile settlements are locally enabled for new finite worlds: the medium-world settlement baseline increases from 150 to 165, with a seeded 10% hostile share drawn from that same quota. Assignment prefers neighbouring patches and occasional solitary sites, protects the starter area and leaves old saved metadata unchanged. Restoration opens the original settlement rather than multiplying settlement locations.

Entry starts a mandatory shared-engine encounter, followed by a seeded exploration challenge and a two-exchange survivor conversation. A repair/relief crew choice grants matching Craft/Survival rebuilding advantage. Three distinct local recovery projects, including a branching relief commission, restore ordinary services and quests. Seed-derived content freezes during new-world generation; level freezes on first actual entry, and progress/decisions persist. Recovery uses the quest clock: two long rests before the first/next project, one after a failed rebuilding roll. Short rests, travel and wall time do not advance it. Safe-inn long rests can advance time even at full recovery, with the existing supply costs and urgent deadlines. The local relief commission is not an external QuestManager quest.

See the [validation report](reports/2026-10-13-hostile-settlements-validation.md) for functional evidence, provisional tuning and remaining play/balance limits. Nothing committed or deployed.

## 2026-10-13 — Finite Survival provisioning

Sponsor-approved hunting/gathering opportunities now appear at a sparse seeded subset of existing suitable wilderness shelters in new worlds. Tracks, plants and cache clues lead to a shared Survival + Intuition DC12 check. Success adds one capped supply; every confirmed attempt costs normal fatigue and permanently spends that site, with no XP/gold/item reward. Cancellation and full supplies preserve it. Camp/Interact access, canonical reveal/receipt persistence and visible unspent map badges are integrated. Fixed-generation caps and spacing prevent adjacent-tile provisioning loops; source placement does not change existing world RNG. Old worlds are not backfilled. See the [implementation and evidence report](reports/2026-10-13-wilderness-provisioning.md). Encampment construction and whole-journey skill acceptance remain open. Nothing committed or deployed.

Validation: 1,537 tests in 138 files pass, including 27 focused provision checks; desktop/mobile interaction fixtures, web build and legal verification pass. The audit covers 18 seeded world generations and 7,200 exact skill resolutions, proving finite receipt/cap behavior while leaving natural-route exposure unmeasured. Existing repository lint errors remain.

## 2026-10-11 — Stepping onto an avoided trap

Sponsor clarified that stepping onto a known armed trap after avoiding it should trigger damage once. Dungeon movement now activates these traps without another check/prompt, then persists them as spent. Explicit Finesse + Composure disarming remains available on the initially avoided tile before leaving; successfully disarmed tiles remain safe. Warnings and player guidance reflect the change.

Validation: all 1,482 tests in 131 files pass, including 19 trap tests. Desktop/mobile crossing fixtures and build pass; scoped lint retains five existing DungeonManager errors.

## 2026-10-11 — Remove healing potions

Follow-up: both trap-disarm reward tables now include arrows and shot cartridges with equal ammunition weights. The total ammunition-versus-other-loot probability is preserved; each roll selects one entry rather than automatically awarding both types.

Sponsor confirmed healing potions do not belong in the game. Removed their canonical and merchant definitions, monster and loot-table drops, campaign item reward, dialogue advertisement and item-healing handlers. Trap disarming retains XP/gold and its remaining loot choices. Rest, abilities and other healing systems are unaffected. Existing saved potion objects are not automatically deleted, but cannot heal through item use. Archived art remains. No commit or deployment.

Validation: all 1,478 tests in 131 files pass, including data-wide potion-reference and legacy-use regressions. Changed JSON is valid and affected loot tables remain nonempty. Web build and legal verification pass; the new regression file has no lint errors. Existing main/Character lint errors remain.

## 2026-10-11 — Expedition refill and distinct physical trap choices

Sponsor-approved first repair tranche adds direct merchant supply refill within the existing carry cap, with provisional base price 35 gp and normal relationship pricing. Avoided floor traps remain known/armed, allow later E disarming, and preserve sparse state across save/regeneration; disarmed/triggered traps cannot repeat their rewards or damage. Stable regeneration retains appropriate boss selection. The authored physical-trap template no longer doubles as an unrelated random room challenge while enabled. Survival provisioning, equipment wear and skill-based escape remain proposals. Functional evidence and limitations are recorded in the [repair report](reports/2026-10-11-supply-trap-repair.md); whole-journey economy and skill acceptance remain open. Nothing committed or deployed.

## 2026-10-11 — Quest progression, urgency and typed aftermath

Final validation: 1,439 tests in 128 files, six desktop/mobile fixtures, web build and legal verification pass. Lint retains 175/3,251 existing errors. See the [functional evidence and limits](reports/2026-10-11-quest-iteration-validation.md).

New combat compositions enforce a rising minimum boss XP budget without changing global monster statistics. Weak upper-level sites yield other supported activities; the three-world publication check retains 108/114 towns with composed or ordinary Investigation offers at every tested level. This is bounded publication evidence, not full combat or economy acceptance.

Sponsor-authorized iteration is enabled locally for newly composed offers. Optional task DCs progress through 12/14/16 at levels 1–3/4–7/8–10; routine/demanding/perilous risks scale one commission by 1/1.5/2 and grant faction standing 10/15/20. Combat XP and loot remain separate. Urgent offers are capped at 25% of each publication prefix, begin counting down only on acceptance, and stop when required work is complete. Expiry applies saved physical failure effects and standing loss once; abandonment applies standing loss without triggering physical expiry outcomes.

Typed effects change actual local encounter likelihood, bound ordinary merchant stock availability and discovery of real map features. Latest-state receipts prevent compounding repeated/overlapping effects. Specialist supply jobs unlock one finite paid enchanted item, preserving generated properties/value across save/load; they do not grant free equipment or promise immediate affordability. A shared offer/frozen level lookup keeps bound dungeon construction and boss preview aligned. Old boards/signatures, finite budgets and deferred renewal remain intact. See the [iteration balance evidence](reports/2026-10-11-quest-iteration-balance.md); final functional validation remains with the delivery owner. These implementation notes do not claim completed whole-journey balance or sponsor acceptance. Nothing committed or deployed.

## 2026-10-10 — Unified quest composition

Sponsor-approved composition is enabled locally for new town offers. Six compatible component dimensions yield seven activity structures combining observation, interpretation, actual boss victory, source-bound recovery and Craft salvage. Shared decisions work for generated and authored content; signatures retain their conversations. Handover drives actual finite stock, and resolved boss threats remain removed across revisit/save/regeneration. Ordinary purchases cannot contaminate quest custody; competing board jobs reserve combat targets. Boss contracts show Deadly regardless of proximity. Existing boards and legacy bundles are preserved; renewal remains deferred.

All 1,418 tests in 123 files pass, as do six desktop/mobile integration fixtures, web build and legal verification. Repository lint retains 175/3,251 existing errors. The audit distinguishes 19 compatible assignments from seven structures, samples 20 worlds at levels 1/5/10 under two visit orders, enumerates 5,280 skill checks and runs 3,000 conditional attack-policy fights. Severe level-5 combat attrition requires complete-policy investigation; neither those fights nor synthetic browser locations clear whole-journey balance or sponsor acceptance. See [validation](reports/2026-10-10-unified-quest-validation.md). Product Owner amended #57; #39/#41/#57 remain open. Nothing committed or deployed.

## 2026-10-10 — Procedural quest core

Sponsor-approved Trace a disruption is implemented and enabled locally: four causal bundles, actual named participants/sites, no-roll observations, optional DC12 interpretation, evidence-sensitive choices, full/incomplete commissions, culture standing and saved replies. Recovery restores a finite shipment to the bound merchant; purchases and exhausted receipts persist. Generated kill/retrieval contracts and faction serialization are repaired. Existing boards and legacy quests are not regenerated or migrated.

All 1,368 tests in 117 files pass with one worker and a 30-second timeout for asset tests; default-timeout runs hit existing rendering timeouts. Desktop/mobile recovery, resolution, purchase and save/load fixtures pass. Legal verification passes; existing repository lint failures remain. A reproducible 20-world audit finds 95.26% combined Investigation coverage, 71.05% procedural coverage and no duplicate simultaneous procedural targets; optional Knight/Sage check arithmetic is separately enumerated. These are publication/check measurements, not played-run profitability or sponsor acceptance. Median procedural target distance is 131 tiles. See the [validation report](reports/2026-10-10-procedural-quest-validation.md) and [approved design](plans/2026-10-10-procedural-quest-core.md). Board renewal and additional families remain deferred. Nothing committed or deployed.

## 2026-10-10 — Investigation target prevention

Sponsor-approved continuation expands Investigation availability: settlements without owned hooks can use the nearest real eligible dungeon within a separate 300-tile radius. The all-town audit checks 6,800 settlements in 120 worlds at levels 1/5/10: 97.64% of small-world towns and 99.56% of actual-entry medium-world towns have valid offers, including later towns. Shared destinations and travel cost remain measured limitations, not full skill-value acceptance. World generation, other quest candidates, rewards and DCs are unchanged.

The separately authorized reward repair resolves the turn-in blocker below. XP/gold work for real/restored/plain characters, earned pending level-ups survive saving, and completion rewards remain exactly once. Desktop/mobile fallback quest acceptance, search/retry and successful turn-in pass. All 1,325 tests in 113 files pass; existing lint errors remain. The original prevention validation below is historical; the latest evidence is appended to the report/specification. Old generated offers and targetless saved quests remain unchanged. Nothing committed or deployed.

With sponsor authorization, newly generated Investigation offers are withheld when no eligible world hook exists. Valid targets and RNG behavior retain their baseline; old saved targetless quests remain unchanged. Twenty new integration tests cover matching, excluded hooks, budgets and persistence. A reproducible audit of 120 worlds at levels 1/5/10 produced zero newly targetless Investigations. The full suite passes 1,296 tests in 112 files; existing lint errors remain.

Desktop/mobile fixtures verify reduced offers, acceptance and deliberate room-search retry. Full completion acceptance is blocked by an existing `QuestManager.awardRewards` call to nonexistent `character.addXP`; actual characters implement `gainXP`. Recorded for separate sponsor approval, without expanding this repair. See the [repair specification](plans/2026-10-09-investigation-target-repair.md) and [investigation report](reports/2026-10-09-skill-balance-investigation.md). Nothing committed or deployed.

## 2026-10-07 — Whole-game skill checks and challenge paths

Follow-up skill-value review: #41 now requires generated/reachable/offered/attempted/resolved exposure, legal-build and acquisition evidence, and qualitative consequences; earlier catalogue odds are not campaign balance proof. Verified real social intel/relations and combat avoidance, but generated Investigation remains single-room completion/rewards with a cosmetic map tag, rather than evidence interpretation or branching resolution. Created #57 for a bounded quest-consequence slice after the #41 baseline, then a repeat evaluation; #39 remains narrow parallel tracking/reputation work. Added a real-generation dungeon-offer diagnostic with explicit synthetic-route limits. No production balance tuning in this follow-up.

Audited skill consumers across dialogue, settlement services, quest investigation, terrain, dungeon rooms/traps/doors and pricing; combat currently has no skill-roll consumer. Repaired shared party/fatigue math, plain-save handling, incompatible choice shapes, staged preparation/progression, reward duplication, authored dialogue endings, cancellation/death promises and paid/no-roll approaches. Quest room reentry no longer gives free Investigation rerolls: E offers a deliberate search using the existing fatigue cost. NPC knowledge and cooldowns persist. Kept nine skills and helper/expertise caps; adjusted a few existing authored approaches following designer review.

The full suite passes 1,276 tests in 111 files; desktop/mobile browser fixtures, web build, legal verification and data checks pass. Repository lint retains existing errors. Generic world-discovery/path/clue and untargeted reputation flags still need authored context, and true opposed checks remain unimplemented. See `docs/reports/2026-10-07-whole-game-skill-audit.md` for the map, repairs, evidence and limits. #41 remains open for this content work and sponsor play acceptance. Nothing committed or deployed.

## 2026-10-07 — Compensated blood damage over time

Local playtest activation: at the user's request, `RULES.combat.damageOverTime.enabled` is now `true`. The 120-percent budget and 80/40 delivery are unchanged; the independent resistance system remains disabled. Reload the local game to exercise the feature. This activation is not a deployment or completed hands-on acceptance; setting the switch to `false` rolls back. Activation checks passed in 105 test files; the remaining weapon-damage regression fixture was updated to exercise both explicit rollback and enabled modes, and its five tests passed alongside the 27 blood-damage tests.

The Game Designer replaced the uncompensated 80/20 prototype with a 120-percent potential budget: 80 percent of eligible weapon-base damage on impact plus 40 percent bleeding over three target turns. Total multiplier and timing split are independent rules controls; the tested 140-percent alternative remains configurable. Paid riders remain immediate and unboosted. The same rules apply to player, companion and eligible monster weapon hits. Intervene now predicts lethal immediate HP damage using the same partition, defenses and temporary-HP calculations as actual resolution. Pending damage messages distinguish damage before defenses and avoid claiming a schedule survives target defeat.

The Balance Engineer ran 271,200 actual-engine fights plus 12,100 concentration trials. Higher-sample matched-weapon probes show a smaller durable-target advantage at 120 percent than 140 percent, while short-target outcomes retain a timing cost. The independent review found no remaining production blocker. All 1,243 tests across 106 files passed using `npm test -- --testTimeout 10000` before local activation; standard lint retains the same 205 pre-existing errors with no new error signatures. Full Calling kits, actual concentration/cleanse choices, Void interactions and hands-on presentation remain acceptance work. The user subsequently authorized the local playtest activation recorded above; global resistance and authored elemental effects retain their independent configuration.

Evidence and reproducibility: [compensated report](../tools/balance-sim/results-compensated/report.md), [matched follow-up](../tools/balance-sim/results-compensated/matched-followup.md), [final-source verification](../tools/balance-sim/results-compensated/final-verification.json), and [updated specification](plans/2026-10-04-blood-dot-precision.md). The original 100-percent-budget simulation report is explicitly historical and superseded.

Elemental proposal, not implemented: add a generic authored periodic-damage producer using the existing typed/flavored resolver and schedule consumer. Compare an optional fire Burn at 120-percent total/80-40 delivery against an equally costly instant fire effect; do not add automatic burn to all fire attacks. Cold and lightning should spend their effect budget on meaningful non-grid control or reaction suppression; acid/poison sustained effects should price damage and debuffs together. Preserve authored necrotic/Void escalation. No broad damage-type remap is necessary.

---

## 2026-10-04 — Blood damage over time prototype

Added a default-disabled combat fork using 1,000 integer units per HP. Positive eligible blood-weapon damage splits into 80 percent immediate damage and 20 percent bleeding over three independent target-turn starts. Reapplication preserves earlier schedules; immunity, cleansing, target defeat, and encounter completion follow explicit cancellation rules.

Shared fractional resolution covers direct and periodic damage, healing, temporary HP, elemental-flavor defenses, and neutral damage types. The fork repairs periodic expiration and lethal-tick turn advancement, and adds fractional health displays and bleed details. Global resistance remains independently disabled; ordinary weapons retain single damage types. Elemental burn content and hands-on activation are not part of this delivery.

Validation: 1,235 tests passed with an explicit ten-second test timeout; 128,800 actual-engine simulation fights and 19 numerical/lifecycle fixtures completed. Existing lint errors are unchanged. Concentration pressure, complete Calling and companion gameplay, and mobile visual acceptance remain gates before enabling the fork. Design and evidence: `docs/plans/2026-10-04-blood-dot-precision.md` and `docs/plans/2026-10-04-blood-dot-simulation.md`.

---

## Session 21 — 2026-09-22
**Nine-skill redesign and attribute-integrity completion pass** — Plan: `docs/plans/2026-09-22-skill-system-redesign.md`; backlog: #41 and #42.

Replaced the thirteen-skill stopgap with nine broad skills: Athletics, Finesse, Survival, Craft, Lore, Investigation, Perception, Empathy, and Influence. Each skill has one primary and one secondary NVSystem attribute; players choose authored fictional approaches rather than freely attaching their best attribute. `SkillRegistry` is now the shared boundary for identifiers, aliases, modifiers, rolls, and old-save migration.

Migrated existing challenge, class, background, companion, quest, relation, and monster content. Repaired missing DC/critical plumbing, conversational d20 resolution, locked-door lookup, choice/stage attributes, and stage-specific quest progress. The 10,000-roll-per-cell live-resolver audit found no invalid mappings and level-5 trained aggregate success of 51.4–56.9% across specialised profiles. Automated suite: 603 tests passing.

Also completed the canonical Insight→Intuition and Vitality→Resilience migration, removed `acSoak`, prohibited Resilience-based AC/general damage reduction, and routed initiative through Intuition. ADR-019 now finalises NVSystem AC as a 2:1 Intuition:Prowess weighted average under the existing armour gates, while 5EClassic remains Dexterity-only. A 36,000-fight real-engine comparison covered levels 1/5/10, three allocation shapes, and all four armour categories; all 46 monster native attribute blocks passed structural validation. Automated suite: 610 tests passing. Hands-on acceptance remains for #42; hands-on skill acceptance and party-help ceiling validation remain in #41.

---

## Session 19a — 2026-07-31 to 2026-08-04 (backfilled 2026-09-08)
**Six-attribute system remap (NVSystem)** — STR/DEX/CON/INT/WIS/CHA → Prowess/Vitality/Intellect/Insight/Presence/Composure. Plan: `docs/plans/2026-07-30-attribute-system-remap.md`. Forked behind `RULES.attributes.system` per ADR-015; **default flipped to `'NVSystem'` on 2026-08-03**.

*Backfilled entry — this shipped without a changelog record, which is why the change was invisible in session history for five weeks. The rule requiring an entry when a plan reaches `Implemented` was added to `workflow.md` on 2026-09-08 as a result.*

`src/utils/attributeResolver.js` is the single translation point (`getRawAttributeModifier`, `getAttributeModifierFor`, `getBlendedAttributeModifier`). `RULES.attributes.derivedStatMap` maps every derived stat to its attribute(s), `type: 'single'` or `type: 'blend'` — blends sum raw unfloored modifiers and floor once on the total, which is now a standing rule in `d5e-compliance.md`. Four blends live: concentration, flee, menacingAttackDC, challengeDC.

Data converted to the dual-field pattern: all 46 monsters (`abilitiesNVSystem`), 5 races, 5 backgrounds, 3 classes, kits, and all 13 skills (`attributeNVSystem` + `descriptionNVSystem`). Chargen remapped to allocate natively into the six new attributes.

Saves narrowed to the three Inward attributes (Vitality, Insight, Composure); Prowess-save and Intellect-save retired. One save proficiency per calling, not two. Only **Dedication** was remapped to an NVSystem identity (Prowess+Vitality) — Curiosity and Audacity have no NVSystem identity yet, and no `savingThrowProficienciesNVSystem` was invented for them (both legacy pairs included `int`, which has no valid target). Tracked as #14.

ADR-015 ("Forking a Live System") and ADR-016 ("NVSystem Balance Baseline") were both established out of this work. ADR-011 save-file compatibility was **waived** on 2026-08-01 — old saves are not required to keep working, and `Character.fromJSON` upconversion was dropped.

Gotchas recorded: a stray `git checkout` briefly reverted 19 monsters' ability blocks to `[]` — the incident behind `workflow.md`'s "Git Safety for Subagents" rule. Balance validation proved CR parity by construction across all 46 monsters rather than by sampling; two SRD deviations found (minotaur WIS 20 vs 16, hillGiant INT 3 vs 5), both CR-inert and left as-is.

Epic #19 closed 2026-09-08. Step 13 (shim retirement, flag removal) was **not** done and is now superseded by ADR-016 — see #34.

---

## Session 20 — 2026-08-14
**Server-Held Saves (ADR-017)** — built behind `RULES.saves.backend`, default remains `'local'`.

Setup doc: `docs/CLOUD_SAVES_SETUP.md`.

`SaveManager` reduced to serialization only; persistence moved behind an async store contract (`getSlots`/`read`/`write`/`remove`). `LocalSaveStore` preserves the original LocalStorage behaviour; `CloudSaveStore` wraps it as a write-through cache and falls back to it on every failure path, returning `{ synced, warning }` so the UI reports "device only" instead of a false success.

Identity is a player name **plus** a recovery code, both required — blob key is `HMAC-SHA256(username + ":" + code, SAVE_TOKEN_SECRET)`. No identity provider, no password, no PII. Azure Functions API in `api/` (4 routes) over a single new storage account; SWA Free plan is sufficient.

Restored a real 5-slot save/load UI — `renderSaveSlots`/`renderLoadSlots` had been reduced to file export/import only, and `saveToSlot`/`loadFromSlot`/`getSaveSlots` had no UI callers at all.

Gotcha recorded: `SAVE_TOKEN_SECRET` can never be rotated once players have saves — every storage path derives from it.

---

## Session 19 — 2026-03-09
**Party Member System — Design Review & Decisions Locked (Planning Only)**
Plan: `docs/plans/2026-03-09-party-system-amendments.md`

Locked decisions: BG3-style direct control, individual initiative for all combatants (team: 'companion'), 4 relationship event triggers only (`companionDowned`, `winHardFight`, `fleeCowardly`, `takeAllLoot`), fled = permanent death for downed companions.

Key values: `companionActionEconomyFactor: 0.75`, `splitTheSpoils` max delta 10 (requires Trusted), companion level-up batch modal.

Architecture gaps flagged: `combat.ended` event missing, `sourceCharacter` back-reference needed, `getEffectivePartySize()` float bug, `activeSynergies` computed not persisted, `devotedPassiveUsedThisRest` excluded from save/load.

---

## Session 18b — 2026-03-07
**Party Member System — Design & Architecture (Planning Only)**
Docs: `docs/designjams/2026-03-07-party-member-system.md`, `docs/plans/2026-03-07-party-member-architecture.md`

Max party 4 (player + 3 companions). Companions from: taverns (primary), quest rewards, combat rescue (6%), dungeon rescue. Permanent death. Relationship score -100 to +100, 5 motivation archetypes, Devoted tier unlocks unique passive. No code implemented.

---

## Session 18 — 2026-03-07
**Ranged Combat Balance Phase 1 + Terrain Movement**
Plan: `docs/plans/2026-03-07-ranged-combat-balance.md`

Added 5 ranged enemies with `preferRanged: true` flag (Goblin Archer CR0.25, Bandit Crossbowman CR0.125, Manticore CR3, Mage CR6, Medusa CR6). `preferRanged` AI wiring in CombatManager pending.

Terrain movement: `RULES.movement` config block, variable move delay (`baseMoveDelay × movementCost`), step accumulator for encounters, `encounterAccumulator` persists to gameState. All terrain `encounterModifier` values recalibrated for multiplicative formula.

Terrain skill challenges: `terrainModifiers` added to all challenges in `skillChallenges.json`. SkillChallengeManager method stubs added. Full logic pending. Hardcoded `terrainChallengeMap` in Player.js not yet replaced.

---

## Session 17 — 2026-03-05
**Biome & Terrain Generation Fixes**
Plan: `docs/plans/2026-03-05-biome-terrain-fixes.md`

Fix 1 — Double-scaling bug: `preScaled: true` flag in worldbuilder overrides; `getScaledFeatureGeneration()` skips re-scaling.
Fix 2 — Inland beaches: sample 4 cardinal neighbors before assigning beach; demote to grassland if no ocean-level neighbor.
Fix 3 — Climate coherence: latitude-based temperature, elevation-based moisture, continental biome scale wired into WorldGenerator.

New terrain types: `desertHills`, `snowForest`. Combat fixes: melee blocked with `pushed` condition, `hasEngaged = true` on melee attacks, advantage/disadvantage rules tightened.

---

## Session 16 — 2026-03-04
**Flee Mechanic Redesign**
Plan: `docs/plans/2026-03-04-flee-mechanic-redesign.md`

New flee formula: `d20 + max(DEX, WIS) + prof >= DC`. DC = `10 + 2×(engaged-1) + situational`. Boss: +5, Ambush round 1: +3. DC cap 25. `hasEngaged` flag on combatants. Opp attacks resolve before flee check. `attackType` field added to all monsters.

---

## Session 15 — 2026-02-28
**Social Challenge System — Multi-Turn NPC Conversations**

New files: `src/systems/SkillChallengeManager.js`, `data/skillChallenges/bandit-negotiation.json`.

Architecture: environmental challenges use `skillCheckModal`; social challenges use `socialChallengeModal` + SkillChallengeManager. Tension meter 0-100, combat at threshold 80. Conversation trees in JSON.

---

## Session 14 — 2026-01-20
**Tile Graphics Mapping & Zoom System**

Explicit `tileImage` field in `terrains.json` (single source of truth). 4 zoom levels: 16/24/32/48px via `+`/`-` hotkeys and settings UI. Zoom persisted to localStorage. Current tiles: `grassland.png`, `forest.png`, `mountain.png`. All others null (ASCII fallback).

---

## Session 13 — 2026-01-19
**Campaign Filtering System**

New: `data/campaigns.json`, `src/utils/campaignFilter.js`. Inheritance system: core → nexus-verge → campaign-specific. All data entries support `campaignIds` field; missing defaults to `["core"]`. Systems (CharacterCreation, QuestGenerator, LootManager, MerchantManager, NPCGenerator) filter by campaign ID.

---

## Session 12 — 2026-01-14
**Skill Challenge Damage Persistence — Critical Bug Fix**

Bug: `character.takeDamage()` modified character in memory but never saved back to gameState. Fix: add `gameState.set('character', character)` + `updateHUD(character)` after both `applyConsequences()` call sites in main.js.

Also: equipment slot harmonization — removed redundant Shield slot, added Helmet/Artifact slots. Off-Hand is unified for weapons and shields.

---

## Session 11 — 2026-01-08
**Combat Audio System**

New: `src/systems/AudioManager.js`. Audio pooling (3 instances per sound). Three-tier volume (master/sfx/music). Combat sounds: melee/ranged × hit/miss/critical. Framework ready for exploration, UI, terrain, ambient music.

---

## Session 10 — 2026-01-03
**Floating Combat Text**

Floating text above combatant cards: red=damage, yellow=critical (rotation animation), green=healing, cyan=buff, orange=condition, grey=miss. `showFloatingCombatText(combatantId, text, type)` in main.js. 1.5s lifetime. Triggered from CombatManager for all combat events.

---

## Session 9 — 2025-12-23
**In-Game Help Manual (H key)**

8-section help modal: Controls, Exploration, Combat, Progression, Rest, Trading, Quests, D&D 5e Rules. Styled `kbd` tags, responsive grid, scrollable. Closes via X, ESC, backdrop click.

Also: responsive combat UI, fixed combat log overflow, widened sidebar (350px → 600px at 1920px+).

---

## Session 8 — 2025-12-21
**Hydrology Pass + Lower Encounter Rate**

River noise channel added to WorldGenerator. Encounter base rate 4% → 1%. Water thresholds shifted for deeper lakes.

---

## Session 7 — 2025-12-18
**Multi-Enemy Encounter System**

Removed single-enemy limit. Level 1-2: 1-2 enemies; Level 3+: 1-3. CR-based enemy selection. Bugbear moved from level 5 bracket to level 3. Encounter fallback now preserves type restrictions (no more level-1 bugbears).

---

## Session 6 — 2025-12-18
**Weapon Mastery Character Sheet Display**

Weapon masteries section in character sheet with icons and descriptions. `renderWeaponMasteries()` in main.js. Orange accent color to distinguish from class features.

---

## Session 5 — 2025-12-18
**Conditions System**

Object-based conditions array on Combatant replacing ad-hoc flags. Supports `untilStartOfTurn`, `untilEndOfTurn`, `rounds`, `combat`, `permanent` durations. Buff/debuff distinction. Curability flag. Slow mastery migrated as proof-of-concept. UI shows condition icons with tooltips.

---

## Session 4 — 2025-12-18
**All 8 Weapon Masteries in Combat**

Implemented Nick, Push, Sap, Slow, Topple, Vex (Cleave and Graze were already done). `masteryEffects` object on Combatant. Advantage/disadvantage wired for Sap, Vex, Topple/prone.

---

## Session 3 — 2025-12-18
**Weapon Mastery Corrections & UI Fixes**

Corrected all weapon-to-mastery mappings to match official D&D 5e variant rules. Cache-busting (`?v=${Date.now()}`) for data files. Inventory Off-Hand slot fix. Character sheet spellcasting crash fix.

---

## Session 2 — 2025-12-18
**Two-Weapon Fighting**

Light weapon off-hand equipping. Combat bonus action Attack (Off-Hand) button. Off-hand attack deals weapon damage only (no ability modifier). D&D 5e RAW compliant.

---

## Session 1 — 2025-12-18
**Weapon Mastery Combat (Cleave, Graze) + Inventory UI**

Cleave: extra attack on adjacent enemy for ability modifier damage. Graze: miss still deals ability modifier damage. Armor/shield proficiency enforcement (hard block). Inventory tag system (armor type, weapon type, properties). Load game screen → file upload.

---

## Sessions 1-7 (2025-12-09 to 2025-12-17)
Core systems built: world generation, map rendering, player movement, combat (rewritten from grid to non-grid), rest system, save/load (5 slots LocalStorage), NPC generation, trading system (CHA-modified pricing), 13-skill system redesign, quest system phases 1-7 (generation, lifecycle, UI, NPC integration, settlement persistence), calling system redesign (7 → 3 callings: Dedication/Scholar/Wanderlust), weapon masteries data, abilities data, spells data.
