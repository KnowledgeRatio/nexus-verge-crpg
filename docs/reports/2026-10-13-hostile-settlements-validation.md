# Hostile settlements: implementation and validation

**Date:** 2026-10-13  
**State:** Implemented locally; validation evidence below is scoped, not release or whole-journey acceptance. Nothing committed or deployed.

## Reachable player behavior

New finite worlds reserve a hostile share of existing settlement locations. The medium-world baseline is 165 settlements, previously 150; map-size scaling still applies. Current tuning assigns a rounded 10% quota, capped by eligible sites, using a separate seed stream. Most selected sites come from nearest-neighbour patches of 2–4. A 15% singleton allocation target prefers normal nearest neighbours and distance from those patches; this does not promise exactly 15% isolated sites on every geographic layout. The nearest starter settlement and the 96-tile starter radius remain ordinary. Saved metadata is not retroactively changed.

Crossed swords and an entry warning identify occupation. Entering starts combat through SettlementManager and the shared EncounterBuilder. Only victory against all enemies with the captured settlement/step/attempt receipt completes that stage. Fleeing, defeat, stale receipts and interrupted saved combat do not grant liberation credit.

New-world generation preselects seeded local content in `hostileState.contentPlan`: one combat stage, one exploration challenge and one survivor conversation, plus rebuilding order. First actual entry consumes the plan and freezes character level in plain settlement state; phase-only older hostile receipts use the same selector as a compatibility fallback. Current content has three alternatives for each liberation pillar. The conversation has a skill-based opening and a repair/relief crew choice granting advantage to later matching Craft/Survival checks. This is bounded template variation, not an unrestricted generated conversation.

Completing these stages liberates the settlement and replaces swords with tools. Three distinct rebuilding projects follow in seeded order: shelters, water supply and a local relief commission. The commission branches between family and worker deliveries with a corresponding Survival or Craft check. All three current projects occur in each recovery sequence; variation is their order and approach. This commission is local authored multi-step work, not a new QuestManager quest type or a wilderness journey.

Ordinary buildings, merchants, safe-inn rests and settlement quest generation remain unavailable while hostile or rebuilding. Completing the final project restores the existing settlement and enters its ordinary service flow.

## Clock and persistence contract

Recovery uses the existing `world.worldClock`, also used by accepted urgent quests. One long rest advances one tick, displayed as one week. Short rests, travel, reload and real elapsed time do not advance it. A fully recovered character can long-rest at a safe inn to advance time; normal supply/fatigue effects and accepted quest deadline checks still apply. Rest duration configuration is not a separate rebuilding timer.

The first project unlocks two ticks after liberation. Each completed project unlocks the next after two more ticks; final completion restores immediately. Failed rebuilding checks delay retry one tick. Successful nodes within one project have no extra gate; failed liberation checks have no clock delay. Every skill roll costs normal skill-challenge fatigue. With no failures, restoration requires six long rests elsewhere after liberation, plus completing the projects.

`hostileState` saves selected content, frozen level, phase, stage/node indexes, decisions, support skill, readiness and combat receipts. Settlement persistence mirrors it through `world.settlements`, metadata features/settlements and loaded region copies. Combat itself is not saved; manager initialization clears interrupted receipts without stage credit. Old worlds are not backfilled.

## Evidence and verification

Implementation inspected: `data/hostileSettlements.json`, `src/core/rulesEngine.js`, `src/systems/HostileSettlementManager.js`, `src/systems/hostileSettlementContent.js`, WorldGenerator assignment/content-plan/persistence, SettlementManager entry/action/services, CombatManager captured victory, RestManager safe-inn/clock behavior, Player entry warning, MapRenderer phase markers, SettlementUI restricted options and SettlementSceneUI restriction. Settlement combat uses the existing settlement scenery context.

The delivery owner reports 50 targeted tests passing in seven suites, including 30 feature-owned tests: generation 8, lifecycle 9, UI 5 and integration 8. Generation includes a synthetic 20-seed neighbour audit and real small-world metadata creation; lifecycle covers branching, readiness and persistence; integration covers captured victory at levels 1/5/10, plain restored characters, service restrictions and safe fully recovered long rests. A final rest feature-disable guard and settlement scenery change pass 84 integration/combat-presentation tests. These are automated functional checks, not representative played liberation fights.

The delivery owner reports the final full suite after content-plan/helper changes passing: 1,539 tests in 138 files using `npm test -- --maxWorkers=2 --testTimeout=20000`. The initial default-timeout run had two unrelated five-second rendering timeouts; this changed runner configuration is disclosed rather than claimed as an unchanged default-command pass. The subsequent rest guard and settlement scenery changes received the scoped 84-test check above.

Final web build passes (181 application files and 107 media); legal verification passes 12 checks with zero failures. Repository lint remains red with 175 errors and 1,104 warnings in existing file blocks; targeted lint passes for the new lifecycle/helper/tests/audit and modified RestManager/SettlementManager paths. These validation results were supplied by the delivery owner.

Chrome fixtures at 1440px and 390px exercise entry, fleeing, captured victory, skill and social stages, gated rebuilding, save/load/region regeneration, six safe long rests and restoration. Final fixtures bind a real nearby dungeon and confirm eight restored NPCs, three available ordinary quests, clock progression 0→2→4→6 and no page errors. Separate UI fixtures pass at six viewport widths. Chrome's local sandbox initially crashed with SIGTRAP; the approved escalated local browser run supplied this evidence. Fixtures use controlled progression outcomes and do not constitute played combat acceptance.

The reproducible [encounter/combat audit script](../../tools/balance-sim/hostile-settlement-audit.js) and [results](../../tools/balance-sim/hostile-settlement-audit.results.json) cover 9,000 actual EncounterBuilder outputs and 5,400 actual CombatManager trials at levels 1/5/10. Direct solo level-10 encounters fill approximately 37.5–58.3% of the requested medium budget; fresh upper-level Knight profiles retain approximately 84–86% median HP under the audited weapon-only policy. These figures expose weak upper-level pressure rather than establish satisfactory difficulty. Spells, signature abilities, party combat and journey attrition are not simulated.

Documentation checks: changed claims traced to current producers/consumers; links and referenced paths checked locally. No production changes or runtime tests were performed by the documentation pass.

## Limits and provisional tuning

The 10% share, 165 baseline, 2–4 patch size, 15% singleton preference, 96-tile safety radius, two-tick project gate, one-tick retry delay, medium encounter difficulty and DC12/14/16 tiers are current configurable tuning, not established whole-run balance. Combat templates use level-tier monster pools; shared-engine integration does not establish win rates or resource sufficiency at those levels.

Whole-journey travel/supply costs, actual geographic clustering across generated worlds, encounter attrition, replay value and sponsor play acceptance remain unverified. Desktop/mobile fixture evidence establishes only the exercised UI states. This implementation does not add town proliferation, external rebuilding quests, calendar travel costs or real-time timers.
