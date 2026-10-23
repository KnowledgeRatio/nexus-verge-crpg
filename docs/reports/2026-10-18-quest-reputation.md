# Quest culture-standing rewards

Date: 2026-10-18. Status: reputation slice of [#39](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/39) implemented and validated locally. No issue mutation, closure, commit or deployment.

## Rewards and player feedback

Explicit quest standing rewards use existing cultures. `settlement` rewards distinct valid cultures represented in the issuing town's real NPC roster; only an unusable roster permits giver-culture fallback. `both` rewards the deduplicated issuer/destination union, using an actual bound delivery town. `all` rewards the campaign culture catalogue. No new organizations or factions are created.

If a required community cannot be identified, the entire standing award is unavailable; known targets are not partially paid. Other quest rewards and completion still proceed with a clear warning. Authored reward amounts are unchanged, including large campaign awards; existing score limits apply.

Offers, journal and NPC flows preview culture names. Turn-in reports actual score changes after clamping, including no gain at the ceiling. The character sheet shows current culture standing and refreshes after changes/load. Personal NPC bonuses remain; explicit culture awards suppress their indirect culture spillover. Quests without explicit standing retain that earlier behavior. Rich faction resolution effects retain their existing award path without duplicate legacy payout.

The handover flow also uses the shared rich-quest capability check. Ordinary acceptance creates evidence bookkeeping, but that alone must not turn a normal ready job into a rich-choice quest or hide its NPC turn-in button.

## Persistence and integration

`QuestReputation.js` resolves preview targets through actual issuer/destination records and the loaded culture catalogue. Delivery generation saves `generationData.targetSettlementId`; placeholders or the player's current town do not stand in for the bound destination.

`reputationRewardReceipt.changes` saves target IDs, names, actual deltas and before/after scores. Repeated payout skips recorded targets. Turn-in summaries expose actual reputation changes and an unavailable-warning field. RelationManager remains the score/pricing authority; no balance amounts or score limits change.

## Validation

The backend focused suite passes 127 tests in nine files; frontend checks pass 23 tests. The final full suite passes **1,691 tests in 149 files**, using `npm test -- --maxWorkers=2 --testTimeout=60000` (74.91 seconds). Final web build passes with 185 app files and 107 media files. Repository lint reports 171 errors/1,134 warnings; broader lint reports 3,247 errors/2,379 warnings, lower error counts than the initial 175/3,251. The new helper/system/UI test files are clean; quest/culture/relation JSON and diff-whitespace checks pass.

The [final browser artifact](../../tools/balance-sim/quest-reputation-browser.results.json) records passing desktop 1440×900 and mobile 390×844 flows with a controlled authored skill quest: actual template generation, NPC assignment, offer acceptance, journal tracking and NPC turn-in, with skill-completion events injected. Claimed buttons disable; normal dialogue close and character-sheet scrolling expose the updated culture scores. The mobile standing section was inspected and is readable.

Using real RelationManager data, Kethara standing moves from 95 to 100 for an authored +40 award, correctly reporting +5; Vaethori moves from 0 to 40. The sheet shows Allied at 100 and Trusted at 40. An unrelated Vaethori NPC's personal score stays 15 while effective relation becomes 21; the same real merchant price falls from 96 to 91 in both viewports. SaveManager JSON roundtrip preserves scores. Repeat completion before/after load returns false without additional XP/gold, and neither viewport reports page errors. This verifies controlled reward/pricing/save flows, not a naturally played journey or broad campaign acceptance.

References: [player quests](../../README.md), [data contract](../DATA_SCHEMA.md), [quest rules](../../.claude/rules/systems/quests.md).
