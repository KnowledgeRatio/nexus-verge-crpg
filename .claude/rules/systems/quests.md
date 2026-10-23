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

## Single Quest Tracking and Information

`QuestManager.setTrackedQuest(idOrNull)` selects one active quest; stale selection clears on load and terminal lifecycle changes. Journal Track/Untrack, overworld/dungeon HUD and world-map guidance consume `getTrackedQuestGuidance()`. Keep getters/renderers pure: only `refreshTrackingIntel()` records actual location discovery, including visibility and successful location-reveal consequences.

An offer's `intelQuality` does not itself grant navigation. Acceptance displays the selected nonempty `intelDialogue` and then saves `trackingIntel` for that bound target. High means an exact entrance; medium means a globally aligned 64×64 search area with exclusive upper bounds and no pin; low means a saved eight-way bearing from the issuer, not a changing bearing from the player. None or old saves without receipts remain unknown until actual discovery. `trackingDiscoveries['x,y']=true` durably upgrades discovered sites to exact guidance. `RULES.quests.tracking` owns enablement, area size, mode mapping and bearings.

The projection chooses the next available required objective without skipping unmet prerequisites. Once required fieldwork is complete, guide to the giver; optional Investigation is not forced. Clear selection on completion, failure, expiry or abandonment. Do not leak exact target distances through board/journal cards or nonexact map/HUD views. Generation must bind briefing templates, including the composed medium `{siteName}`, before publication; receipt creation remains at acceptance.

## Shared Quest and Rebuilding Clock

`world.worldClock` is the shared logical clock: `RestManager.longRest()` advances `RULES.quests.clockUnitsPerLongRest` (currently one), presented as one week. Short rests, overworld travel and wall-clock time do not advance it. Safe-inn long rests are allowed even when fully recovered and still apply supply/fatigue rules and accepted quest deadline checks. Hostile/rebuilding settlements cannot provide safe-inn services.

Hostile settlement recovery uses `hostileState.readyAt` on this same clock: two ticks after liberation and after each completed rebuilding project; a failed rebuilding roll delays retry one tick. No delay is imposed between successful nodes of one project or after failed liberation skill checks. All skill attempts retain ordinary fatigue costs. Three distinct local projects restore the settlement. The relief commission is a data-authored local branching project, not a new QuestManager quest type or external wilderness quest; normal settlement offers become available only after restoration.

Liberation combat passes `{settlementId, stepId, attempt}` as the fifth `CombatManager.startCombat` argument, separately from the fourth quest encounter source. Only a matching captured receipt with actual enemy defeat advances the combat stage. Fleeing, defeat, stale receipts and interrupted combat reload do not credit victory.

## Procedural Investigation

### Unified composition and shared capabilities

New town offers first use `data/quests.json.questComposition`: compatible cause/subject/custody/hazard/materialState/goal components contribute generic activities. `getCompatibleCompositions()` enumerates compatible assignments, not distinct adventures. Campaign filtering applies to component entries at load time; the shared activity library is core content. Saved legacy bundles remain interpretable. Publication prefers unused activity arrangements, reserves combat sites against ordinary jobs and rejects already defeated/cleared occupations. Finite budgets and old boards remain intact.

`isRichQuest` detects richer capabilities independently of procedural provenance. Authored content may use top-level `participants`; legacy `procedural.participants` remains supported. Objectives have stable IDs; `baseline.objectiveId` completes the intended observation, and `requiresObjectives` joins facts/actions in guarded choices. Legacy objectives-only completion remains supported.

Boss jobs are always labelled Deadly. Board/journal cards do not expose exact target distance; navigation follows received information and actual discovery. `DungeonManager.getQuestDungeonType(feature)` mirrors the actual seeded first type selection without generating or freezing a dungeon. `getQuestEncounterSource(actualBossId)` validates the live boss room and snapshots `{siteId, encounterRole, encounterKey, roomIndex, targetId, encounterId}`. Pass this as the fourth `CombatManager.startCombat` argument. Victory requires all enemies defeated; `onQuestEncounterVictory` grants only matching objective proof. `buildBossEncounter` honors a valid already-generated boss ID rather than independently replacing it.

Recovery actions `acquire`/`salvage` produce actual inventory goods with `questSource:{questId,sourceId}`. Ordinary inventory cannot merge, sell, use, drop or remove that custody. Resolutions declare `custody` requirements and transfer/consume the delivered quantity once. `merchant_stock.quantityFromCustody` supplies actual delivered stock. Damaged goods provide two units; Craft can salvage one more, total three, without a second commission. Configurable amounts remain in `RULES.quests.proceduralCore`.

### Iteration progression, urgency and real aftermath

`RULES.quests.iteration.enabled` adds profiles to newly composed offers; old boards, legacy bundles and signatures retain their saved semantics. Offers save `offeredLevel`, `taskTier` and `risk`. At levels 1–3 / 4–7 / 8–10, optional task DCs are 12 / 14 / 16. Risk is routine, demanding (salvage or specialist supply) or perilous (combat). One commission is `80 XP × offeredLevel × riskMultiplier` and `20 gold × offeredLevel × riskMultiplier`, with multipliers 1 / 1.5 / 2; faction gains are 10 / 15 / 20 by risk. Combat XP/loot remain separate. Incomplete commission retains the existing half-payment rule.

Urgent publications never exceed 25% of each iteration-offer history prefix; this is a ceiling, not a guaranteed share. Duration is 3 / 4 / 5 world-clock ticks by task tier, and each long rest advances one tick. `acceptQuest` starts the timer; `deadlineObjectives` completed or a pending resolution suspends it before travel back. Expiry applies supported `failureEffects` with saved receipts, releases that quest's goods and deducts 10 giver trust / 5 faction standing once. Abandonment applies the standing loss but does not manufacture expiry's physical outcome. Offers awaiting acceptance do not expire, and partially applying resolutions cannot be abandoned.

ConsequenceManager owns immediate typed `local_safety`, `merchant_availability` and `reveal_location` effects. Safety changes actual overworld encounter likelihood within 12 tiles: success ×0.75, failure ×1.25. Latest state per site replaces earlier state; overlapping areas select the strongest deviation rather than multiply, with configured bounds. Merchant availability changes the bound ordinary item/role stock fraction with a 0.5 floor; latest state replaces earlier state. Corroborated information can reveal a real unexplored nearby feature through the actual map state. Persistent receipts live in `world.metadata.questOutcomes`; merchant availability also lives on the settlement. Do not describe these as globally safe roads or a simulated economy.

Specialist supplies produce one finite paid enchanted equipment offer through the actual loot-property producer. Fine / great / heroic quality applies at the same three level tiers, with configured value premiums 1,350 / 3,000 / 6,000 above the merchant-pool base. The saved generated item has a stable instance ID, properties and value; normal relation-sensitive shop pricing still applies. This unlock does not imply immediate affordability or a free reward.

Generating a dungeon bound to an iteration offer freezes `questEncounterLevel`; shared encounter lookup otherwise takes the bound iteration offer's `offeredLevel`, then the current level. Boss construction and preview use that lookup. Already-generated dungeon layouts are not regenerated; boss jobs still advertise Deadly. Finite board budgets and renewal deferral remain unchanged.

New combat compositions require every possible level-eligible boss to meet `RULES.quests.iteration.minimumBossBudgetFraction` (0.75) of the offered level's deadly XP threshold, using actual CR XP and the existing boss XP multiplier. Generated layouts use their actual boss; ungenerated layouts use the same eligible pool and fallback as DungeonGenerator. Weak upper-level sites yield other supported compositions. This floor does not inflate monster stats or establish full combat balance. The level compatibility/floor filters apply only while the iteration is enabled; saved quest consumers remain available.

Subject components may supply a data-authored `resolutionReply` override for fulfilled reporting. Selected aftermath descriptions are included in the persisted reply, so NPC recollection states the actual effect and distinguishes paid specialist access from commission rewards.

`target_cleared.sourceObjectiveId` consumes captured proof through DungeonManager's validated owner API. Feature-owned `questEncounterVictories` and `questEncounterClears` persist; resolved boss-slot suppression survives revisit/regeneration without removing unrelated encounters. Resolution receipts/pending state support interrupted application without duplicated rewards/effects. Abandonment/failure removes only that quest's custody; a partially applied resolution cannot be abandoned.

The following bundle-specific notes describe the saved first slice and fallback, not the full new generation method.

`data/quests.json.proceduralBundles` supplies campaign-filtered causal bundles for the actual settlement Investigation slot. `RULES.quests.proceduralCore.enabled` controls new offers; disabling generation must not strand saved quests. Bind real participants and an eligible site before publishing; retain finite town budgets and existing boards. Do not publish unsupported effect/action combinations.

New records retain `type: 'investigate'` with optional `family`, `procedural`, `baseline`, `actions`, `resolutions` and `evidence`. Participant names and causal facts are instantiated into saved content. Basic room observations require no roll. Optional interpretation uses the configured task DC; another attempt uses existing fatigue cost. Failure never rewrites the incident's truth.

Use QuestManager's shared `getQuestActions`, `recordQuestAction`, `getResolutionOptions` and `resolveQuest` APIs for journal and NPC flows. The manager validates live location, required facts/actions and bound NPC testimony. Generic `completeQuest` cannot bypass a procedural resolution. Board acceptance supplies the bound giver; generated giver assignment must not replace that binding.

Resolution rewards/effects apply once, including under synchronous reentry. Explicit culture reputation uses RelationManager's shared API; personal changes from that event suppress indirect faction contribution. Rich quests with `faction` resolution effects retain that path and suppress a duplicate legacy reputation award.

Ordinary explicit `rewards.reputation` resolves `settlement` to distinct valid cultures in the bound town's actual NPC roster, with giver-culture fallback only when no usable roster exists. `both` unions issuer and actual destination cultures; `all` uses the campaign culture catalogue. Never substitute the player's current town or an invented destination. Missing required community data blocks the whole standing award with a clear warning while other rewards/completion proceed. Keep authored amounts and existing score clamps.

`QuestReputation.js` supplies the shared target preview. Successful payout saves target IDs and actual clamped deltas in `reputationRewardReceipt`; repeat calls skip paid targets. Feedback reports actual gains, including no change at the ceiling. Explicit standing preserves personal NPC bonuses with `contributeToFaction:false`; quests without explicit standing retain the previous spillover. Offer/journal/NPC previews and live character-sheet scores use these existing cultures, without adding organizations or factions.

Recovered merchant stock belongs to `world.settlements[].questStock`, with `sourceQuestId`, `effectId`, `itemId`, `merchantRole` and `remaining`. MerchantManager consumes that quantity on purchase; UI decrements only its displayed row. Preserve exhausted receipts, ordinary inventory and other towns. Faction scores remain a plain object across saves, including fractional values; legacy entry arrays are accepted at the save boundary.
