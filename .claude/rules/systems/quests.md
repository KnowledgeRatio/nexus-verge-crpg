---
paths: src/systems/QuestManager.js, src/systems/QuestGenerator.js, src/systems/SettlementManager.js, data/quests.json
---
# Quest System Rules

## State Location
Quest state lives in `gameState.quests.available` — **not** `questManager.availableQuests`. Always read and write through gameState:

```javascript
const questState = gameState.get('quests');
questState.available.push(quest);
gameState.set('quests', questState);
```

## Quest Lifecycle
`available` → `active` (on accept) → `completed` or `failed`

Progress tracked via:
- `onCreatureKilled(creatureId, location)` — kill objectives
- `onItemAcquired(itemId)` — retrieve objectives
- `onNPCInteraction(npcId)` — return/interact objectives
- `onLocationDiscovered(location)` — explore objectives

## NPC Assignment by Role
Quests are distributed to NPCs based on role:
- Leaders / guards → combat/patrol quests
- Merchants → retrieval/delivery quests
- Innkeepers → social/investigation quests

NPC's `questIds` array stores assigned quest IDs. Quest's `questGiver` field stores the NPC details.

## Placeholder Fill Order
When evaluating formula strings with `{variable}` placeholders, **sort variable names by length descending** before replacement. Prevents `{difficulty}` from matching inside `{difficultyMultiplier}`.

## NPC Name Placeholder
`{npcName}` in quest descriptions is replaced **after** NPC assignment in `assignQuestsToNPCs()`, not at generation time.

## RNG API
QuestGenerator uses `SeededRandom` class (not raw RNG function):
- `rng.nextInt(min, max)` — not `rng.intBetween()`
- `rng.choice(array)` — not `rng.pick()`

## Monster CR Field
`monster.challengeRating || monster.cr || 0` — check both field names.

## Quest Turn-In
`QuestManager.completeQuest()` → grants XP, gold, items. `getQuestsFromNPC(npcId)` queries `gameState.quests.available` (not a manager-local property).

## Procedural Investigation

### Unified composition and shared capabilities

New town offers first use `data/quests.json.questComposition`: compatible cause/subject/custody/hazard/materialState/goal components contribute generic activities. `getCompatibleCompositions()` enumerates compatible assignments, not distinct adventures. Campaign filtering applies to component entries at load time; the shared activity library is core content. Saved legacy bundles remain interpretable. Publication prefers unused activity arrangements, reserves combat sites against ordinary jobs and rejects already defeated/cleared occupations. Finite budgets and old boards remain intact.

`isRichQuest` detects richer capabilities independently of procedural provenance. Authored content may use top-level `participants`; legacy `procedural.participants` remains supported. Objectives have stable IDs; `baseline.objectiveId` completes the intended observation, and `requiresObjectives` joins facts/actions in guarded choices. Legacy objectives-only completion remains supported.

Boss jobs are always labelled Deadly, with distance displayed separately. `DungeonManager.getQuestDungeonType(feature)` mirrors the actual seeded first type selection without generating or freezing a dungeon. `getQuestEncounterSource(actualBossId)` validates the live boss room and snapshots `{siteId, encounterRole, encounterKey, roomIndex, targetId, encounterId}`. Pass this as the fourth `CombatManager.startCombat` argument. Victory requires all enemies defeated; `onQuestEncounterVictory` grants only matching objective proof. `buildBossEncounter` honors a valid already-generated boss ID rather than independently replacing it.

Recovery actions `acquire`/`salvage` produce actual inventory goods with `questSource:{questId,sourceId}`. Ordinary inventory cannot merge, sell, use, drop or remove that custody. Resolutions declare `custody` requirements and transfer/consume the delivered quantity once. `merchant_stock.quantityFromCustody` supplies actual delivered stock. Damaged goods provide two units; Craft can salvage one more, total three, without a second commission. Configurable amounts remain in `RULES.quests.proceduralCore`.

`target_cleared.sourceObjectiveId` consumes captured proof through DungeonManager's validated owner API. Feature-owned `questEncounterVictories` and `questEncounterClears` persist; resolved boss-slot suppression survives revisit/regeneration without removing unrelated encounters. Resolution receipts/pending state support interrupted application without duplicated rewards/effects. Abandonment/failure removes only that quest's custody; a partially applied resolution cannot be abandoned.

The following bundle-specific notes describe the saved first slice and fallback, not the full new generation method.

`data/quests.json.proceduralBundles` supplies campaign-filtered causal bundles for the actual settlement Investigation slot. `RULES.quests.proceduralCore.enabled` controls new offers; disabling generation must not strand saved quests. Bind real participants and an eligible site before publishing; retain finite town budgets and existing boards. Do not publish unsupported effect/action combinations.

New records retain `type: 'investigate'` with optional `family`, `procedural`, `baseline`, `actions`, `resolutions` and `evidence`. Participant names and causal facts are instantiated into saved content. Basic room observations require no roll. Optional interpretation uses the configured task DC; another attempt uses existing fatigue cost. Failure never rewrites the incident's truth.

Use QuestManager's shared `getQuestActions`, `recordQuestAction`, `getResolutionOptions` and `resolveQuest` APIs for journal and NPC flows. The manager validates live location, required facts/actions and bound NPC testimony. Generic `completeQuest` cannot bypass a procedural resolution. Board acceptance supplies the bound giver; generated giver assignment must not replace that binding.

Resolution rewards/effects apply once, including under synchronous reentry. Explicit culture reputation uses RelationManager's shared API; personal changes from that event suppress indirect faction contribution. Ordinary Investigation and legacy reputation reward declarations do not acquire these new semantics automatically.

Recovered merchant stock belongs to `world.settlements[].questStock`, with `sourceQuestId`, `effectId`, `itemId`, `merchantRole` and `remaining`. MerchantManager consumes that quantity on purchase; UI decrements only its displayed row. Preserve exhausted receipts, ordinary inventory and other towns. Faction scores remain a plain object across saves, including fractional values; legacy entry arrays are accepted at the save boundary.
