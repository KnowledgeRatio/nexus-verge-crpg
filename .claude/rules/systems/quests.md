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
