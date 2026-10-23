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

## Hostile Settlement Assignment and Recovery

New finite worlds assign `hostileState: { phase: 'hostile' }` to a bounded share of the existing settlement quota before metadata persistence. `RULES.worldGen.featureGeneration.baseSettlements` is 165 (previously 150), scaled by map size; restoration never creates another settlement. `RULES.hostileSettlements` defaults to 10% hostile, nearest-neighbour patches of 2–4 and a 15% singleton allocation target. Singleton placement prefers a normal nearest neighbour and distance from selected patches; this is a placement preference, not a guarantee of exact graph isolation. The nearest starter settlement and sites within 96 tiles of the starting position are protected. A separate seed stream and sorted candidates preserve assignment across metadata ordering without consuming the base RNG. Campaign generation overrides can change the share/enablement; saved metadata is not backfilled or rerolled.

`prepareHostileSettlementContent()` freezes campaign-filtered liberation/rebuilding templates in `hostileState.contentPlan` before new metadata is persisted, using the shared `hostileSettlementContent.js` selector and a settlement-specific seed. `HostileSettlementManager` consumes that plan and freezes character level on the first actual entry; phase-only older hostile receipts use the same selector as a compatibility fallback. Saved state owns subsequent visits. The sequence is combat → exploration → survivor conversation → rebuilding → restored; the survivor choice grants Craft or Survival advantage on matching rebuilding checks. Ordinary services/quests are withheld until restored. Map and entry messages distinguish hostile and rebuilding sites.

Persist `hostileState` through settlement pruning/restoration, metadata features and loaded region copies. The lifecycle manager validates player presence and combat receipts; interrupted unsaved combats grant no liberation credit. See `quests.md` for the shared clock contract and `docs/DATA_SCHEMA.md` for content/state fields.

## Inland Beach Prevention
Before assigning `beach` terrain, sample 4 cardinal neighbors' raw elevation. If no neighbor is at ocean-level elevation, demote to grassland/plains.

## Provisioning Purpose and Validation

Sponsor-confirmed intent, 2026-10-18: wilderness provisioning helps players travel farther when they cannot easily buy supplies. Distance from a town alone does not define this. Sources near towns are allowed, but increasing starter-town exposure is not a goal. The earlier recommendation to move sources nearer towns is withdrawn; distant sources may suit the purpose.

Test existing generated sites first on real long journeys at levels 1/5/10. State where players can actually buy supplies and what route information they know. Compare otherwise matched characters with and without Survival training, and gathering versus passing it up where useful. Use real movement, combat, rests and supply spending. Record where/how supplies run out, sources reached, extra distance or objectives gained, avoided turnbacks, safe return and costs. The 2026-10-13 starter-route test found no clues on its narrow routes; it does not show that remote provisioning fails or that source placement is wrong. Remote usefulness is still untested, with no numerical target yet.

The purpose confirmation alone approved no placement changes. The sponsor subsequently approved standalone supply objects and their terrain-overlay rendering on 2026-10-18. New-world generation now places them after roads, using separate seed streams, on traversable compatible ground without overlapping roads or existing features. `RULES.provisioning.wilderness` provisionally allows at most one object per 32×32 region, 75% region chance, six placement attempts, 24-tile spacing from existing supply sites and 32-tile settlement exclusion. These limits do not guarantee one object in an eligible region. Existing shelter allocation is now 50%, retaining its 96-tile spacing and 6/24/54 map caps. Standalone objects are additional to those shelter caps.

Standalone `type:'provisioning'` features use `renderLayer:'overlay'`: keep terrain beneath the marker, hide it outside visibility and dim spent markers. They open gathering through E/touch Interact without opening rest or creating a sanctuary. Canonical metadata retains the existing finite attempt receipt; old worlds are not backfilled. Base world RNG is not consumed. Density remains provisional, remote-travel usefulness needs validation, and supply price/DC/reward are unchanged.

## Climate System
- Latitude-based temperature: `latitudeInfluence: 0.6` blends temperature noise with a cos curve (warm equator, cold poles)
- Elevation-based moisture: `elevationWeight: 0.6` — mountains are drier
- Continental biome scale: `continentalScale: 0.005` — creates large coherent regions
