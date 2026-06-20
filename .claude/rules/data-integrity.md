# Data Integrity Rules

## Items Must Exist Before Loot Tables Reference Them
`data/items.json` and `data/magicItems.json` are the single source of truth for all items. A loot table entry must reference an `itemId` that already exists in one of those files. If adding an item to a loot table that doesn't exist yet — create it in `items.json` first. Ghost IDs silently produce nothing and break tables without errors.

## Campaign IDs
All data entries (items, monsters, races, quests, etc.) support a `campaignIds` field:
- `["core"]` — appears in all campaigns via inheritance
- `["nexus-verge"]` — only in Nexus Verge campaign and descendants
- Missing `campaignIds` — defaults to `["core"]`

Never add content without considering which campaigns it belongs to.

## Terrain Graphics
Terrains use an explicit `tileImage` field in `data/terrains.json` — not a convention-based filename lookup. `null` = ASCII fallback. Always set this field explicitly when adding a terrain type.

## Skills
Skills are defined in `data/skills.json`. Skill challenges are in `data/skillChallenges.json`. Never hardcode skill names in system logic — always reference by ID. Adding, merging, or retiring a skill requires only data file changes, not code changes.

## Monster Fields
Monsters use `challengeRating` (not `cr`) in `monsters.json`. Code must check both: `const cr = monster.challengeRating || monster.cr || 0`.

## Formula Evaluation
When evaluating formula strings with variable substitution (e.g. `"300 * difficultyMultiplier"`), sort variable names by **length descending** before replacement. This prevents substring collisions (e.g. `difficulty` replacing the start of `difficultyMultiplier`).

## Quest State Location
Quest state lives in `gameState.quests.available` — not in `questManager.availableQuests`. Always read/write through gameState.

## Encounter Accumulator
`gameState.encounterAccumulator` persists to save/load. Do not reset it on region load.
