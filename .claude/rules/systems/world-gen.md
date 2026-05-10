---
paths: src/systems/WorldGenerator.js, src/rendering/MapRenderer.js
---
# World Generation Rules

## Region Architecture
- Regions are 32×32 tiles, keyed as `"${regionX}_${regionY}"` in `gameState.world.generatedRegions`
- `gameState.world.generatedRegions` is the **single source of truth** — no separate `regionCache` in WorldGenerator
- Regions are pruned when the player moves far away; settlement data persists via `persistSettlementData()` / `restoreSettlementData()` to `gameState.world.settlements`

## Terrain Sampling Without Loading a Region
Use `_sampleTerrainAt(x, y)` to get the terrain type at any world coordinate without loading the full region. Required for worldMetadata computations at generation time. Never load a full region just to check terrain type.

## Compute at World-Gen Time
Anything derivable from the world seed must be computed at **world-gen time** and stored in `worldMetadata`. Do not defer these computations to region-load time — it breaks the determinism guarantee and causes inconsistencies when regions are pruned and regenerated.

## Encounter Accumulator
- Replaces per-tile encounter probability check
- Fires when `accumulator >= RULES.movement.encounterAccumulatorThreshold`, then resets
- Net rate per tile: `encounterModifier × movementCost × 0.01`
- Terrain `encounterModifier` values are calibrated for this **multiplicative** formula — do not treat them as additive
- Accumulator persists to `gameState.encounterAccumulator` (survives save/load)

## Variable Move Delay
`currentMoveDelay = RULES.movement.baseMoveDelay × movementCost`, capped at `RULES.movement.maxMoveDelayMultiplier × baseMoveDelay`.

## Settlement Persistence on Prune
Before a region is deleted from cache, call `persistSettlementData()` to save NPC, inventory, quest, and visit state to `gameState.world.settlements`. Call `restoreSettlementData()` when the region is regenerated. Without this, active quests break and merchant inventories reset.

## Inland Beach Prevention
Before assigning `beach` terrain, sample 4 cardinal neighbors' raw elevation. If no neighbor is at ocean-level elevation, demote to grassland/plains.

## Climate System
- Latitude-based temperature: `latitudeInfluence: 0.6` blends temperature noise with a cos curve (warm equator, cold poles)
- Elevation-based moisture: `elevationWeight: 0.6` — mountains are drier
- Continental biome scale: `continentalScale: 0.005` — creates large coherent regions
