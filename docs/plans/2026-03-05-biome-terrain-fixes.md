# Biome & Terrain Generation Fixes

**Date:** 2026-03-05
**Status:** Approved (unverified — flagged 2026-07-17; check against current terrain generation code before treating as current)
**Scope:** 3 targeted fixes (DA-approved, not a full rewrite)

---

## Context

The procedural world generation has pain points:
1. **Inland beaches** - beaches appear in small low-elevation plots nowhere near ocean
2. **No climate coherence** - desert next to tundra, no latitude-based climate bands
3. **Double-scaling bug** - worldbuilder custom values get scaled twice in `getScaledFeatureGeneration()`

A full brainstorm with game-designer, architect, frontend, backend, and devil's advocate concluded:
- The world gen system has **massive unused config** in `rulesEngine.js` (lines 684-736) that `generateTile()` never reads
- Full rewrites (flow-based rivers, continental noise layers, World Climate Map) are Phase 4+ territory
- 3 targeted fixes address the worst pain points with minimal risk

### Games Studied
- **Minecraft 1.18**: Separate continentalness from elevation; biome = lookup(temp, moisture)
- **Caves of Qud**: Authored macro-regions + procedural micro-fill; biome identity through encounters/palette, not just terrain
- **Civ VI**: Latitude = temperature; rain shadow behind mountains
- **RimWorld**: Latitude drives climate bands; beaches only where adjacent to ocean
- **Dwarf Fortress**: Rivers trace downhill; erosion simulation (aspirational)

Key insight: "Players say worlds feel real when deserts aren't next to tundra, beaches are at coastlines, and biomes are large enough to feel like regions."

---

## Fix 1: Double-Scaling Bug (30 min)

### Problem
`getScaledFeatureGeneration()` multiplies base counts by `scaleFactor`. But worldbuilder values are **already scaled** when displayed to the user, then stored as `baseSettlements`, `baseDungeons`, etc. On medium worlds (scaleFactor = 1.0) this is invisible. On small (0.25) or large (2.25) worlds, counts are wrong.

### Location
- `src/main.js` → `applyWorldbuilderSettings()` (~line 578) - stores already-scaled values
- `src/systems/WorldGenerator.js` → `getScaledFeatureGeneration()` (~line 1115) - scales again

### Fix
In `applyWorldbuilderSettings()`, store the **raw base values** (divide by scaleFactor before storing), OR mark worldbuilder overrides so `getScaledFeatureGeneration()` skips scaling for them.

**Preferred approach:** Add a `preScaled: true` flag to worldbuilder overrides, and check it:
```javascript
// In getScaledFeatureGeneration():
if (overrides.preScaled) {
    return {
        settlements: fg.baseSettlements,
        dungeons: fg.baseDungeons,
        // ... use values as-is
    };
}
```

---

## Fix 2: Inland Beaches (2 hrs)

### Problem
`selectMacroBiome()` returns `'coastal'` for any tile with normalized elevation < 0.30. Within coastal, elevation 0.15-0.22 becomes beach. No water adjacency check. Config flag `requiresAdjacentDeepWater: true` exists in `RULES.worldGen.waterGeneration.beaches` but is **never enforced**.

### Fix Approach (DA-approved: in selectTerrain, not post-processing)
In `selectTerrain()`, when the coastal biome would produce a beach tile, sample 4 cardinal neighbors' elevation. If none are below the ocean threshold, demote to grassland/plains.

```javascript
// In selectTerrain(), coastal biome beach case:
if (macroBiome === 'coastal' && e >= 0.15 && e < 0.22) {
    // Check if any cardinal neighbor has ocean-level elevation
    const scale = RULES.worldGen.biomeNoiseScale;
    const hasAdjacentWater = [[-1,0],[1,0],[0,-1],[0,1]].some(([dx, dy]) => {
        const neighborElev = this.elevationNoise.octaveNoise2D(
            (worldX + dx) * scale, (worldY + dy) * scale, 4, 0.5
        );
        const normElev = (neighborElev + 1) / 2;
        return normElev < 0.10; // ocean threshold
    });

    if (hasAdjacentWater) return 'beach';
    return moisture > 0.5 ? 'grassland' : 'plains'; // demote
}
```

**Why not post-processing:** DA flagged that `generateTile()` depends on mutable state (`worldMetadata`), so cross-chunk calls during post-processing can return inconsistent results. Sampling raw noise in `selectTerrain()` is pure and deterministic.

**Cost:** 4 extra noise lookups per beach candidate tile. Beach candidates are a small fraction of all tiles.

---

## Fix 3: Wire Existing Config - Temperature & Moisture (3 hrs)

### Problem
`RULES.worldGen.biomeGeneration` defines `latitudeInfluence: 0.4`, `continentalScale: 0.005`, and `elevationWeight: 0.6`. None of these are read by `generateTile()`. Temperature and moisture are pure noise with no geographic coherence.

### Fix: Latitude-Based Temperature

In `generateTile()`, blend the raw temperature noise with a latitude gradient:

```javascript
// Current: pure noise temperature
const rawTemp = this.temperatureNoise.octaveNoise2D(worldX * scale * 0.8, worldY * scale * 0.8, 3, 0.5);

// NEW: latitude-based blend
const worldHeight = this.worldBounds.size * RULES.worldGen.regionSize;
const worldMinY = this.worldBounds.minY * RULES.worldGen.regionSize;
const normalizedY = (worldY - worldMinY) / worldHeight; // 0=north, 1=south
const latitudeTemp = Math.cos((normalizedY - 0.5) * Math.PI * 2); // +1 equator, -1 poles

const latInfluence = RULES.worldGen.biomeGeneration.latitudeInfluence; // 0.4 default, bump to 0.6
const temperature = rawTemp * (1 - latInfluence) + latitudeTemp * latInfluence;
```

**Effect:** Creates climate bands (polar→temperate→tropical) while noise adds local variety. Increase `latitudeInfluence` to 0.6 for stronger bands.

### Fix: Elevation-Based Moisture Reduction

Mountains should be drier. This is a cheap approximation of rain shadow without the 20 extra noise evals/tile the backend proposed:

```javascript
// Current: pure noise moisture
const rawMoisture = this.moistureNoise.octaveNoise2D(worldX * scale * 0.6, worldY * scale * 0.6, 3, 0.5);

// NEW: reduce moisture at high elevation (mountains are dry)
const normElevation = (elevation + 1) / 2; // 0-1
const elevationWeight = RULES.worldGen.biomeGeneration.elevationWeight; // 0.6
const moisturePenalty = normElevation > 0.6 ? (normElevation - 0.6) * elevationWeight : 0;
const moisture = rawMoisture - moisturePenalty;
```

**Effect:** High-elevation areas get reduced moisture → mountains produce less forest, more barren rock. Combined with latitude, this creates believable geography:
- Tropical lowlands = jungle (hot + wet)
- Tropical highlands = grassland/savanna (hot + dry from elevation)
- Polar regions = tundra/snow regardless of moisture
- Mid-latitude mountains = hills/barren rock

### Fix: Continental Scale for Biome Coherence

Wire `continentalScale: 0.005` to make the existing `biomeNoise` channel influence biome selection at a larger scale. Currently `biomeNoise` uses `0.02` scale - change it to read from config:

```javascript
// In constructor or generateTile:
const biomeScale = RULES.worldGen.biomeGeneration.continentalScale; // 0.005 instead of hardcoded 0.02
const biomeNoise = this.biomeNoise.octaveNoise2D(worldX * biomeScale, worldY * biomeScale, 2, 0.5);
```

**Effect:** Biome regions become ~4x larger (0.005 vs 0.02), creating continent-scale biome zones instead of confetti.

---

## Config Changes (rulesEngine.js)

```javascript
biomeGeneration: {
    continentalScale: 0.005,    // was 0.005 (unused) → now wired
    latitudeInfluence: 0.6,     // was 0.4 (unused) → now wired, increased
    elevationWeight: 0.6,       // was 0.6 (unused) → now wired for moisture
    // existing keys unchanged
}
```

---

## Landmark Validation Summary

Validated by backend-dev: under normal configs, all feature types hit their targets.

| Feature | Target (medium) | Has Retry? | Issue |
|---|---|---|---|
| Settlements | 150 | No | No terrain validation (can spawn in water) |
| Dungeons | 200 | Yes (2nd pass) | Only feature with retry |
| Sanctuaries | 100 | No | Missing actual-vs-target logging |
| POIs | 300 | No | Missing actual-vs-target logging |

**Additional fixes to consider (not in scope for this PR):**
- Add terrain validation for feature placement (skip water/mountain regions)
- Add actual-vs-target logging for sanctuaries and POIs
- Add retry pass for settlements (match dungeons)

---

## Explicitly Deferred (Phase 4+)

| Feature | Why Deferred |
|---|---|
| Flow-based rivers | High complexity, current rivers work |
| Rain shadow (upwind sampling) | 20 extra noise evals/tile, elevation moisture is cheaper |
| Continental noise layer | Existing biomeNoise at lower frequency may suffice |
| World Climate Map overlay | New system, not needed for these fixes |
| 16 new terrain types | Only 3 have pixel art, scope creep |
| Transition terrains | Nice-to-have, not a pain point |
| World map canvas (M key) | Separate feature, not terrain gen |
| Biome lookup table | Current if/else works, table is refactor not fix |

---

## Implementation Order

1. **Fix 1** - Double-scaling bug (30 min, standalone)
2. **Fix 3** - Wire config: latitude temp + elevation moisture + continental scale (3 hrs, biggest visual impact)
3. **Fix 2** - Inland beaches (2 hrs, depends on Fix 3 since elevation thresholds may shift)

Total estimated effort: ~5.5 hours

---

## Testing

After implementation:
1. Generate 3 worlds with different seeds
2. Walk north-to-south: verify temperature gradient (snow→temperate→desert/jungle)
3. Walk to mountains: verify reduced moisture (less forest on peaks)
4. Find coastlines: verify beaches only at water edges
5. Use worldbuilder on small world: verify counts match what was set
6. Check console logs for feature placement counts
