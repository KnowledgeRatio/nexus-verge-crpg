# Terrain Atlas Art Overhaul

**Status:** Implemented (2026-08-15) — the terrain art overhaul is complete. All 19 `continuousAtlas` terrains, all 8 legacy landmarks, and all 5 POI-only terrains (`temple`, `monastery`, `camp`, `watchtower`, `villa`) have generated art wired via `tileImage`; no terrain entry has a null `tileImage`. Full suite 579/579. Only deferred item from this plan is the dungeon-tile cleanup (delete the 15 dead `dungeon*-mai-2.png` + `beach-mai-2.png`), still not done. A second, separate design thread (Unified POI System, end of file) was spun off from this same conversation; its first spec shipped to code on 2026-08-09, but the user rejected one outcome (standalone `dungeon` generation kept as a second parallel pipeline alongside POIs) after seeing it live. A redesign spec resolving that (see that section's "Scope Revision — Redesign Spec") is written but **not yet implemented** — treat the POI system as mid-migration, not done.

## Implementation Status (2026-08-09)

- Tier-1 data (`hills`, `plains`, `desert`, `swamp`, `tundra`, `snowyPlains`): all `transitionGroup`/`transitionPriority`/`imageDescription`/`visual.mode` fields written to `data/terrains.json`. Verified by directly invoking `buildPrompt()` — all 6 assemble correctly with the new style-guide language included.
- Style-guide diff: all 4 additions applied to `tools/image-gen/style-guide.md`. Verified the relief-shading ban and other additions appear in both the prose and the assembled negative-prompt string.
- **Tier 2 (water) + Tier 3 (dramatic/extreme) data complete:** `ocean`, `deepWater`, `shallowWater` (`openWater` group), `mountain`, `mountainPeak` (`alpine`), `denseForest` (`temperateNatural` 30), `snowForest` (`coldNatural` 30), `jungle` (`aridTropical` 20), `desertHills` (`uplands` 20), `savanna` (`temperateNatural` 45) all got `imageDescription`/`visual` blocks per the Tier 2/3 Identity Notes table, `tileImage` renamed to the `-cartographic-atlas-v1.png` convention. Verified via a full-script `buildPrompt()` run against all 18 `continuousAtlas` entries (8 shipped/tier-1 + these 10) — all assemble correctly, and a standalone field-completeness script confirms every atlas entry has a valid `imageDescription`, `atlasTilesPerSide`, `atlasWrapMode`, `transitionGroup`, `transitionPriority`, and `motifsPerTile.{min,max}`.
- **Tier 4 (landmark restyle) + all 7 POI types complete, legacy single-tile mode:** `sanctuary`, `road`, `bridge`, `town`, `residential`, `industrial`, `cave`, `camp`, `ruins`, `temple`, `monastery`, `watchtower`, `villa` (13 total) all got `imageDescription` written (no `visual` block — legacy mode, confirmed no stray `visual` field was added). `ruins` carries the one riftborn material-impossibility accent (fracture pattern of shattered glass flowing into liquid-poured continuity, confined to one wall fragment) per its plan-approved exception. All 7 POI types (`cave`, `camp`, `ruins`, `temple`, `monastery`, `watchtower`, `villa`) were read back and confirmed neutral to the hidden dungeon/sanctuary outcome — each explicitly excludes both danger-coded cues (glow, bones, carvings, guards, fire) and safety-coded cues (glow, worshippers, monks, banners) and closes with an explicit "reads as simply [X], not clearly safe or clearly dangerous" instruction, since the mechanic depends on the art carrying zero directional signal either way. `tileImage` filenames were left untouched (still `-mai-2.png` or `null`) — renaming to the new art convention is deferred to whoever runs generation, matching how tier-1 only renamed once its target filename was locked.
- All 23 of this session's prompts (10 atlas + 13 legacy) were individually assembled via `buildPrompt()` and read back in full — confirmed correct guide-section selection (Terrain Atlases vs Terrain Tiles), correct motif-range injection, and correct negative-prompt inclusion for every one.
- **~~Open question flagged for `game-designer`~~ — RESOLVED later in this same file (2026-08-09), see "Reveal-art decision — symmetric" below, and shipped: `MapRenderer.js` `renderFeature()` resolves both the `sanctuary` and `dungeon` branches via `feature.originalPoiType` first, so a revealed POI keeps its own art permanently and never switches to generic `sanctuary` art. Left here for the record only; do not re-litigate.** Original text: `sanctuary`'s standalone `terrains.json` entry (art now written above) is also what `MapRenderer.js` currently falls back to when a POI resolves to `sanctuary` and gets revealed — meaning a revealed POI (e.g. a `monastery` that turns out to be a sanctuary) may visibly switch from its own POI art to generic `sanctuary` art at the reveal moment, rather than keeping its POI-type art forever. Whether that's intended or a bug is a mechanic question, independent of this session's art work — this session's `sanctuary` `imageDescription` was written as a self-contained landmark (small roadside waystation shelter) without trying to pre-resolve that question either way.
- ~~**Blocked:** `npm run gen:terrain` requires Azure credentials, no images generated yet~~ — **resolved.** Generation ran (commit `8ca51c7`); all 19 atlas terrains + all 8 landmarks have art on disk. `tests/data/terrainVisuals.test.js` now passes (2/2), replacing the previously expected single failure.
- ~~**Still open:** the 5 POI-only terrains have no generated art~~ — **done 2026-08-15.** `temple`, `monastery`, `camp`, `watchtower`, `villa` generated and wired. Their `imageDescription` strings were rewritten first, after a `creative-director` + `worldbuilder` review; see "POI Tile Generation (2026-08-15)" below for what the review changed and the known remaining artifacts.
- **Still open:** the dungeon-tile follow-up pass (audit ASCII-only rendering, delete the 15 dead `dungeon*-mai-2.png` and `beach-mai-2.png`) is unstarted.

## POI Tile Generation (2026-08-15)

Four generation rounds; the accepted set is round 2 for `monastery`/`watchtower`/`villa` and round 4 for `temple`/`camp`.

**Root-cause fix to `tools/image-gen/style-guide.md`:** the `## Terrain Tiles` section granted *every* landmark tile a riftborn material-impossibility accent, contradicting this plan's decision that `ruins` carries the only one. That defect put a cyan slash across the temple roof, a crystal cluster in villa's garden, and flecks on monastery and watchtower. The section now makes the accent authored-per-entry (opt-in via the tile's own description, which is how `ruins` keeps its) and explicitly bans crystal/gemstone/iridescent/anomalous objects otherwise. It also gained a ban on the halo/contour-ring artifact that appeared around the structure in all five first-round images.

**Prompt-authoring constraint discovered — important for any future terrain generation.** The active model is `MAI-Image-2.5-Pro`, which does not end in `2e`, so `azure-client.js` drops the `negative_prompt` field entirely; `terrainPrompt()` also builds a `negativeClause` and never adds it to the prompt. **The style guide's `## Negative Prompts` section therefore reaches the model on no path at all** — every guardrail must be inline prose in the entry's own `imageDescription`. Worse, because those inline "No X" clauses ride in the *positive* prompt, naming a failure mode can summon it: round 2 added "never at an angle or isometric perspective" and "no concentric contour lines" and got 3/4-perspective buildings and heavy topographic contours. The fix that worked was asserting the geometry positively ("drawn strictly as a flat architectural roof plan… every shape lies flat in the picture plane, as on a surveyor's plan") rather than banning the alternative. The anti-border language that finally worked on `camp` is the same swatch-cropped-from-a-larger-field phrasing `deepWater` already needed.

**Known remaining artifacts, accepted:** `temple` has a faint edge rim, a swirl-textured ground field, and a smaller subject than intended — the weakest of the five, though distinct at 32px. `monastery` and `watchtower` carry concentric contour-like ground texture. `camp` and `villa` are clean.

**Not verified:** the plan's neutrality audit ("show all five and ask which look safe or dangerous") requires someone who does not know the resolution rates, so it cannot be self-administered. Still outstanding.
**Scope:** Overworld terrain tiles only (42 `data/terrains.json` entries minus 15 `dungeon*` interior tiles, which are explicitly out of scope — see Dungeon Tiles below)

---

## Context

Nexus Verge's world map has no movement grid (ADR-014). Terrain renders via a "continuous atlas" system (`src/rendering/terrainAtlas.js`): one square painted image per terrain type represents a 16x16 sheet of world tiles, sampled by world coordinate with mirror-wrapping so it repeats seamlessly forever. Where two adjacent terrains share a `visual.transitionGroup` (and differ in `transitionPriority`), the renderer clips an organic noise-based boundary between them so the seam looks hand-blended rather than a hard grid cut.

Only 2 of 42 terrains (`grassland`, `forest`) were migrated to this system before this review. The other 40 used legacy `-mai-2.png` art — a different visual language entirely (cool relief-map style) that also bakes a whole miniature region (rivers, roads, other biomes) into a single tile, which structurally can't tessellate as a repeatable material.

This plan was produced via a consultative review: `creative-director`, `worldbuilder`, and `creative-prompt-engineer` each contributed and cross-checked each other's work across three rounds, then the user directly reviewed and corrected the transitionGroup taxonomy against the actual world-generation code before approving it.

## Locked Creative Direction

Identity: **hand-drawn, painted overland atlas cartography** — inspired by Judges Guild / West Marches-era hex-crawl poster maps, specifically their more detailed/illustrated end (hand-painted texture and ink linework carrying terrain identity), not the crude flat-block-color end of that tradition. Deliberately not a DM battle mat (wrong scale metaphor — the game has no grid) and not illuminated-manuscript (implies borders/gilding, which violates the no-border rule).

Reference images (already shipped, locked as the bar): `data/graphics/grassland-cartographic-atlas-v1.png`, `forest-cartographic-atlas-v1.png`.

Dramatic/extreme terrain (mountain, mountainPeak, jungle, denseForest, snowForest) earns visual intensity from **increased ink density, tighter motif clustering, and a wider local value-contrast band** relative to grassland's calm baseline — never from relief shading, elevation gradients, hillshade, or directional dramatic lighting. That relief-shading instinct is exactly what made the old `mai-2` art wrong, not just its palette.

Terrain identity differentiation (so a large tessellating world doesn't go visually mushy) comes from three independent axes per terrain: **hue family, motif-glyph silhouette, contrast band** — layered on top of the shared gouache-and-ink material grammar that unifies the world.

Note on terminology: earlier drafts of this plan used "hex-crawl poster" as shorthand for the target genre. That was retired 2026-08-09 — the game has no hex grid and none is implied or planned; the term only ever meant the physical-object aesthetic, not a mechanic.

## Final transitionGroup Taxonomy

Corrected 2026-08-09 against `WorldGenerator.js`'s `selectMacroBiome()`/`selectTerrain()` directly (the original taxonomy was narrative-plausibility-based and got several pairings wrong — see Corrections below).

| Group | Members (priority) | Basis |
|---|---|---|
| `temperateNatural` | grassland 10, plains 12, forest 20, denseForest 30, swamp 40, savanna 45, farmland 50 | moisture-gradient chain within shared macro-biomes (temperateForest, grassland, coastal, swampland) |
| `uplands` (new) | hills 10, desertHills 20 | both from the `mountain`/`badlands` elevation branch — same macro-biome, hot+dry variant |
| `openWater` (merged) | shallowWater 10, ocean 20, deepWater 30 | shallowWater/deepWater are river-carved through almost any land terrain, not coastal-specific; merging means every land-water edge hard-cuts uniformly regardless of which land biome, while water depth itself gradients organically |
| `alpine` | mountain 10, mountainPeak 20 | foothill rock into sheer summit, unchanged from original proposal |
| `coldNatural` | tundra 10, snowyPlains 20, snowForest 30 | verified as a real single-macro-biome moisture chain (`coldForest` macro-biome) — unchanged |
| `aridTropical` | desert 10, jungle 20 | rarely touch directly in practice (grassland/savanna usually buffers them) but a shared group is a harmless fallback |
| — (legacy, no group, restyled palette) | sanctuary, road, bridge, town, residential, industrial, cave, ruins | discrete instanced features/structures, not repeatable materials |
| — (excluded) | beach | dead code — no path in `WorldGenerator.js` ever assigns it (comment: "Beach retired: non-orientation-safe tile") |
| — (excluded) | 15 `dungeon*` ids | see Dungeon Tiles below |

### Corrections made to the original narrative-based taxonomy (2026-08-09)
- **`beach`**: confirmed dead in worldgen; dropped entirely rather than art'd for a tile that can never appear.
- **`savanna`**: originally grouped with desert/jungle. Code shows it's a moisture-variant of the `grassland` macro-biome — real neighbor is grassland/plains. Moved to `temperateNatural`.
- **`desertHills`**: originally in the desert/savanna/jungle chain. Code shows it comes from the same macro-biome branch as `hills` (elevation-driven), unrelated to that moisture gradient. New `uplands` group with `hills`.
- **`swamp`↔`forest`**: no code path puts these in the same branch. Swamp's real neighbors are grassland/shallowWater/jungle. Swamp stays in `temperateNatural` for the grassland connection; the forest justification is retracted.
- **`coastal`/`openWater` split**: beach's death left `coastal` with one member. Discovered shallowWater/deepWater are primarily river-cut through arbitrary land terrain, not coastal-specific — merged into one `openWater` group covering ocean too.
- **`farmland`**: not biome noise at all (placed in a concentric ring around settlements — industrial→residential→farmland). Kept in `temperateNatural`, mechanism noted as different.

## Ruins Resolution

`ruins` stays **legacy single-tile** (`Terrain Tiles` mode), not atlas-ified. It carries `isDungeon: true` (same flag as `cave`) — a portal to a specific bounded instance, not a repeatable ground material. Architectural fragment motifs are also directionally anisotropic and would visibly repeat under mirror-wrap. It gets one authored riftborn-material accent (an impossible dual-material property on a wall fragment, reusing the existing Item Icons convention) confined to one small detail within the frame — not distributed across the composition, and not something a tessellating atlas could keep "rare" the way a one-off image can.

## Landmark Restyle (Tier 4)

Restyle the 8 legacy landmark terrains (sanctuary, road, bridge, town, residential, industrial, cave, ruins) to the new gouache-and-ink palette too, even though they stay single-tile/non-atlas — otherwise they create a visible style seam against the new atlas terrain. Checked `industrial`'s actual description ("warehouses, workshops, and forges") against TECHNOLOGY.md's anachronism rules — it's a craft/guild quarter, not a modern factory, so it carries no lore reason to stay visually distinct.

**Sequencing:** gated-interleave, not strictly last. Runs immediately after tier-1 generates and passes a legibility check — it's a cheap, structurally separate production track (no tiling/transitionGroup engineering) that only needs the style-guide diff validated first, not the full tier 2/3 atlas work.

## Style Guide Diff (to apply to `tools/image-gen/style-guide.md`)

Four additions, refined during creative-director's sign-off pass:

**`## Terrain Art Style` (append):**
```
Dramatic terrain (mountain, mountainPeak, jungle, denseForest, snowForest, and similarly intense members of a terrain group) earns visual intensity from increased ink density, tighter motif clustering, and a wider local value-contrast band relative to the calm baseline set by grassland — never from relief shading, elevation gradients, embossed or bevelled terrain, hillshade, drop shadows implying height, or directional dramatic lighting. Distinguish neighbouring terrains within the same transition group by hue family, motif-glyph silhouette, and contrast band only.

Pale or snow-covered terrain must remain a visibly painted surface — retain the warm stone-grey substrate and enough dark ink accent marks to stay legible; never render as a blank or near-white fill.

Cultivated or human-worked ground may use evenly spaced motif strokes (furrow lines, planted rows) rendered as loose hand-painted brushstrokes with irregular natural variation — never as mechanically ruled, perfectly straight, or grid-aligned lines.
```

**`## Terrain Tiles` (append, for the ruins case):**
```
A landmark tile depicting worn architecture may include no more than one small material-impossibility accent — two incompatible physical properties visible in the same surface, per the Item Icons riftborn-material convention — confined to one small detail within the frame, not distributed across the composition.
```

**`## Negative Prompts` (append literal terms):** `relief shading, elevation gradient, embossed, bevelled, hillshade, height shadow, drop shadow implying elevation, directional dramatic lighting`

Reasoning for mirroring the relief-shading ban into literal negative-prompt tokens rather than leaving it as prose only: the old `mai-2` art proves the model's default instinct is dramatic relief/hillshade for elevation terrain (mountainPeak is the named risk case) — prose alone isn't enough force against a proven prior; the Negative Prompts list is the section demonstrably doing suppression work today (borders, grids, pixel-art).

## Sequencing

| Tier | Terrains | Notes |
|---|---|---|
| 1 — core biome | hills, plains, desert, swamp, tundra, snowyPlains | Highest screen time; validates the style-guide diff before anything else generates against it. Production-ready `imageDescription` drafts below. (`beach` dropped — dead code.) |
| 4 — landmark restyle | sanctuary, road, bridge, town, residential, industrial, cave, ruins | Runs right after tier 1 passes legibility check, not after tier 2/3 |
| 2 — water | shallowWater, ocean, deepWater | Structurally distinct (translucent depth vs. opaque land); validates the merged `openWater` group |
| 3 — dramatic/extreme | mountain, mountainPeak, denseForest, snowForest, jungle, desert-adjacent (desertHills, savanna via uplands/temperateNatural) | Needs tier 1's restrained baseline locked first so the raised contrast budget reads as a deliberate break, not the new default |

## Draft `imageDescription` — Tier 1 (production-ready)

Same voice/structure as grassland/forest's shipped strings.

| id | imageDescription |
|---|---|
| `hills` | Continuous uneven sage-olive-brown grass-and-scrub upland ground, expressed with three to six broad clustered tussock and low scrub-brush ink dabs per notional world square and sparse dry pale grass-blade accents. No cliffs, ridgelines, elevation shading, contour lines, rocks, paths, water, or landmarks. |
| `plains` | Continuous wide open dry golden-straw grassland ground, expressed with three to six broad sweeping tall-grass-blade brushstroke clusters per notional world square and sparse small pale flower-dot accents. No trees, rocks, paths, water, clearings, or landmarks. |
| `desert` | Continuous pale warm ochre-cream sand terrain, expressed with three to six broad wind-ripple ink line clusters per notional world square and sparse small dune-crest dash accents. No rocks, oases, water, paths, vegetation, or landmarks. |
| `swamp` | Continuous murky desaturated olive-brown wetland ground, expressed with three to six broad dark stagnant-water-pool ink patches per notional world square and sparse reed-and-rush tuft clusters. No open river, clear water, paths, trees, or landmarks. |
| `tundra` | Continuous pale cool blue-grey frozen ground, expressed with three to six broad sparse low scrub-tuft ink dab clusters per notional world square and small dark exposed-ground stipple patches. No snow drifts, ice, rocks, paths, water, or landmarks. |
| `snowyPlains` | Continuous pale blue-white snow-covered ground over a visible warm stone-grey painted substrate, expressed with three to six broad soft wind-drift ink stroke clusters per notional world square and sparse small dark exposed-scrub or stone accent dabs for value anchoring. No trees, mountains, paths, water, or landmarks. |

`motifsPerTile`: 3–6 for all tier-1 terrains (matches grassland/forest baseline). `atlasTilesPerSide`: default 16 for all.

## Tier 2/3 Identity Notes (one-liners, full prompts once tier 1 validates)

| Terrain | Hue family | Motif glyph | Contrast band |
|---|---|---|---|
| denseForest | cooler near-black teal | tighter overlapping canopy masses, no floor glimpses | one step above `forest` |
| ocean | deep desaturated teal-blue | broad rolling swell strokes | medium, even |
| deepWater | near-black slate-blue (darkest water value) | sparse widely-spaced long swell strokes | slightly higher than ocean |
| shallowWater | pale desaturated teal-blue | short current-ripple strokes + wave-crest dashes | low-medium |
| mountain | warm iron-brown/grey stone | clustered angular ridge-mark ink dashes | raised (tier-3 budget) |
| mountainPeak | cool pale slate-grey + frost-white mineral dabs | tighter fracture-line ink | highest in alpine group |
| snowForest | cold slate-teal-green canopy | pale snow-load edge dabs | medium-high |
| savanna | warm dry gold | flat-topped canopy-blob clusters + dry grass dashes | low-medium |
| jungle | deep saturated humid green (most saturated hue in set) | dense overlapping broad-leaf canopy + vine-stroke accents | highest density/contrast in group |
| desertHills | warm rust-ochre (deeper than desert) | clustered angular erosion-fracture dabs, echoes mountain's language but warmer/rounder | raised, not full alpine intensity |

`motifsPerTile`: water tapers down (shallowWater 3-5, ocean 2-4, deepWater 2-3 — sparsest reads as stillest/deepest); dramatic tier raised (desertHills/savanna 4-6, mountain/denseForest/snowForest 4-7, mountainPeak/jungle up to 5-8).

## Dungeon Tiles — Deliberately Out of Scope

`DungeonUI.js` renders all 15 `dungeon*` terrains via flat ASCII/color fill (`getTerrainDef()` → color + symbol) and never reads `tileImage` at all — a completely separate fixed-grid room renderer from the overworld's `MapRenderer.js`/`terrainAtlas.js`.

**Decision (2026-08-09): this stays ASCII deliberately, as a contrasting art style vs. the painted overworld — not a gap to eventually fill with images.**

Follow-up pass (not scheduled, revisit later):
1. Audit that dungeon rendering is 100% ASCII with no stray image usage anywhere.
2. Delete the now-pointless `dungeon*-mai-2.png` files from `data/graphics/` — they're dead weight, never rendered.
3. Redesign the ASCII symbol set for dungeon tiles freely — it no longer needs to share conventions with the overland map now that overland is fully art-based.

## Flagged, Not Blocking (raised twice by worldbuilder / surfaced during this review — do not silently drop)

- **No overworld `lava` terrain id exists** (only `dungeonLava`, itself excluded per the dungeon decision above). Tier-3's dramatic-contrast budget is still fully delivered without it. Reframed as a canon question for `worldbuilder`/`game-designer`: whether visible volcanism fits a world whose terrain is convergence-pulled matter rather than native geology, before any art is meaningful. Drafted "restrained emissive warmth" phrasing exists in `creative-director` agent memory if this returns.
- **No Void-boundary terrain id exists**, despite `docs/world/PEOPLES.md` explicitly placing Vethri settlements near it. Recommended as a standalone follow-up for `game-designer`/`architect` (new terrain id, placement rules, eventual art) — out of scope for this overhaul.

## Acceptance Checkpoint (before generating beyond tier 1)

- 16px/32px/48px thumbnail test: each new terrain identifiable by silhouette alone, matched against grassland/forest as the bar.
- 3x3 atlas-repeat mockup per terrain: confirms invisible wrap, no "obviously-the-same-photo" repetition tell.
- Live adjacency test: two same-`transitionGroup` terrains rendered edge-to-edge with the organic clip active, at normal play zoom — reads as "one map, two regions," not a blurred wash or a collage seam.
- snowyPlains/tundra specifically checked for painted substrate, not blank white.

## Next Steps

1. Write tier-1's six `transitionGroup`/`transitionPriority`/`imageDescription`/`visual.mode` fields into `data/terrains.json`.
2. Apply the style-guide diff to `tools/image-gen/style-guide.md`.
3. Run `npm run gen:terrain` for the tier-1 batch, review against the acceptance checkpoint.
4. On pass: proceed to tier 4 (landmarks), then tier 2 (water), then tier 3 (dramatic/extreme).

---

# Related Design Thread: Unified POI System

**Status:** Proposed (2026-08-09) — spun off from the same conversation while reviewing how `sanctuary`/`ruins` display on terrain. `game-designer` and `architect` have now produced a full spec (below); still **Proposed, not Approved** — pending your sign-off on the judgment calls flagged near the end before any code/data work starts.

## How this surfaced

While reviewing terrain art, found that `sanctuary`, `ruins` (as a POI), and `cave` (as a POI) never render painted art at all — they're `feature` overlays drawn as ASCII/emoji markers (see Dungeon Tiles / landmark-rendering findings above). Digging into `ruins`/`cave` further surfaced a real, unrelated mechanical gap: **the `isDungeon: true` flag on their `terrains.json` entries is vestigial.** Two disconnected systems currently exist:

| System | Real dungeon generated? | Theme source |
|---|---|---|
| `feature.type: 'dungeon'` (placed on mountain/hills tiles via `dungeonFrequency` chance) | Yes — `DungeonManager.enterDungeon()` → `dungeonGenerator.generateDungeon()` | `data/dungeons.json` `terrainThemeWeights[terrain]`, keyed off the underlying terrain |
| `feature.type: 'poi', poiType: 'ruins'/'cave'` (1 of 5 random POI flavors, `shrine`/`ruins`/`cave`/`camp`/`landmark`) | **No** — `Player.js.handleFeature()` just prints "✨ You discover a ruins!" and marks it discovered. Nothing calls dungeon generation. | n/a |

`DungeonManager.getDungeonAtPlayerPosition()` does check `tile.feature?.isDungeon` generically (not just `type === 'dungeon'`), so the wiring capability already exists — nothing currently sets that property when a POI feature is generated, that's the only missing link.

Also found a working precedent for "learn what's there before you go": dungeons already carry an optional `questHook` (`_computeQuestHook()` in `WorldGenerator.js`) — if a settlement is within `RULES.quests.maxHookDistanceTiles`, the dungeon gets linked to it, and `namedBossId` gets populated once the dungeon's theme/creatures are known. This is the existing "intel from townspeople" mechanic the new design should reuse, not invent from scratch.

## User's proposed design (2026-08-09, not yet detailed by game-designer)

1. **No POI does nothing.** Every generated POI resolves to something real when entered — no more flavor-only markers.
2. **Every POI is either a sanctuary or a dungeon**, decided at generation time but **hidden from the player** until they physically enter it — unless they've picked up "intel" in advance (reusing/extending the existing `questHook`/settlement-rumor precedent).
3. **Generation ratio (how many resolve to dungeon vs. sanctuary) is config-driven** — by campaign settings and/or the player's custom world-gen settings — not a fixed hardcoded split. Should follow the same pattern as other worldgen-tunable counts (see `getScaledFeatureGeneration()` / the `preScaled` override flag precedent in `docs/plans/2026-03-05-biome-terrain-fixes.md`).
4. **New POI type list** (replaces the current `shrine`/`ruins`/`cave`/`camp`/`landmark` five): **cave, camp, temple, monastery, watchtower, villa, ruins.** Room for more POI types later and what they translate to.
5. **POI type is contextual**, in two ways, both open for game-designer to actually define:
   - Influences *which* dungeon theme or sanctuary flavor gets picked when that POI resolves (e.g. a `watchtower` that resolves to a dungeon should weight toward a different theme than a `temple` that does) — likely an extension of `dungeons.json`'s existing `terrainThemeWeights` pattern, keyed by POI type in addition to (or instead of) terrain.
   - Can be restricted to appear only in certain biomes/terrain (e.g. a `monastery` fitting `alpine`/`uplands`, a `villa` fitting `temperateNatural`/near farmland) — exact mapping not decided, flagged for game-designer.

## Art requirement (2026-08-09, ties back to the main overhaul above)

Each of the 7 POI types needs a **painted terrain tile** (legacy single-tile, not atlas — same rendering mode as the other landmarks above), replacing the current ASCII/emoji marker. Critically: **the art must not reveal whether a given POI instance is a dungeon or a sanctuary.** One `cave` image regardless of what's inside; same for the other 6 types. The mystery is entirely mechanical (only resolved on entry, or via intel) — the visual layer must stay neutral to that outcome. This also requires a rendering-path change: POI features currently draw via `MapRenderer.js`'s `renderFeature()`, which is hardcoded to ASCII-only for all `feature` objects — a `game-designer`/`architect`-reviewed change to route POI features through the normal `tileImage` path instead.

## Locked Scope Decision (game-designer, 2026-08-09)

**Fold `sanctuary` into the unified POI system. Do NOT fold the standalone `dungeon` feature type in** — it already works end-to-end (terrain-biased placement, theme weighting, quest hooks, `DungeonManager` wiring); pulling it in would risk a working system for no stated benefit. Standalone dungeons = "the region's marked backbone dungeon." POI-resolved dungeons = "that cave might be something" — a deliberate roguelike texture distinction, not a gap.

Two real, previously-unknown bugs the design must not repeat (confirmed by reading the live code, not assumed):
1. `RULES.worldGen.featureGeneration.dungeonTerrainWeights` / `sanctuaryTerrainWeights` / `excludedTerrains` are defined in `rulesEngine.js` but **nothing in `WorldGenerator.js` ever reads them** — feature placement today has zero terrain filtering. Biome eligibility below is new functionality, not "hooking up an existing weight."
2. `cave`/`ruins` `terrains.json` entries are already reused for POI symbol/color (`MapRenderer.js`), but never `tileImage` — confirms painted art genuinely needs the rendering-path change below, not just a flag flip.

## Generation Flow (replaces the current sanctuary-loop + POI-loop)

One pass per candidate position (retry logic and region-skip cadence unchanged from today):
1. Pick a position; **new**: reject if `_sampleTerrainAt(x,y)` isn't in the chosen POI type's `biomeEligibility` list (bounded retry, same pattern already used elsewhere).
2. Pick `poiType` from a data-driven distribution (7 types).
3. Roll `resolvedType` (`dungeon` | `sanctuary`) against that type's own chance (see Ratio below).
4. Resolve theme/flavor from **the POI type's own weight table**, not terrain (see Theming below).
5. If `dungeon`: run the existing `enrichDungeonFeature()`-equivalent immediately at world-gen time (deterministic) — creatures, difficulty (reuses the existing difficulty distribution unchanged), `questHook` via the existing `_computeQuestHook()`.
6. If `sanctuary`: generate a name from that POI type's own name-pattern fields (same template shape dungeons already use, not the old generic prefix+type generator).
7. Push one `{ type: 'poi', poiType, resolvedType, x, y, discovered: false, intelKnown: false, ... }` feature.

`sanctuary`'s standalone spawn loop and its top-level `baseSanctuaries` count are retired.

## `data/pois.json` (new file, ADR-010 — full schema and worked examples for `monastery`/`watchtower` in the underlying design session; full 7-type table follows)

| Type | Biome eligibility | Dungeon-lean modifier | Dungeon theme lean | Sanctuary flavor |
|---|---|---|---|---|
| cave | mountain, hills, desertHills, tundra, snowyPlains, forest, denseForest, desert | +0.15 | beast_lair, warren, tomb, dragon_den (rare) | hermit's grotto |
| camp | grassland, plains, forest, hills, savanna, desert, tundra, snowyPlains | +0.10 | bandit, warren, beast_lair | wayfarer's camp |
| ruins | grassland, plains, forest, denseForest, hills, desert, jungle, swamp | +0.10 | tomb, cult, warren | reclaimed shrine |
| temple | grassland, plains, forest, jungle, hills | -0.20 | cult, tomb, fey_grove | working shrine |
| monastery (new) | hills, mountain, tundra, snowyPlains | -0.35 | cult, tomb, frost_hold | quiet retreat |
| watchtower (new) | hills, mountain, grassland, plains, desert, desertHills, savanna | +0.15 | bandit, warren, dragon_den, tomb | garrisoned post |
| villa (new) | grassland, plains, forest | -0.30 | bandit, cult, warren | noble estate |

`shrine` and `landmark` are dropped entirely (not aliased) — their `MapRenderer.js` symbol cases go away with them. Proposed generation-share distribution: cave 0.18, camp 0.16, ruins 0.20, temple 0.14, monastery 0.10, watchtower 0.12, villa 0.10.

## Dungeon:Sanctuary Ratio — Config Surface

`finalDungeonChance = clamp(baseDungeonChance + poiType.dungeonWeightModifier, 0, 1)` — an additive per-type delta over one global base, matching the existing rulesEngine base+modifier idiom rather than inventing a new blend mechanism.

- **New rule:** `RULES.worldGen.featureGeneration.poiResolution.baseDungeonChance`.
- **Campaign override:** `data/campaigns.json`'s existing per-campaign `featureGeneration` block (already how `defeatLichKing`/`uniteKingdoms` override `baseDungeons`/`baseSettlements` today).
- **Worldbuilder/custom-world override:** a new slider alongside the existing `wbDungeons`/`wbSanctuaries`/`wbPOIs` overrides in `main.js:applyWorldbuilderSettings()`, same `preScaled` pattern.
- **Proposed default: 0.60 (dungeon-leaning)** — game-designer's reasoning: this is a roguelike, "points of interest" should mostly carry risk, with sanctuary as the reward for reading type/biome cues (or getting intel) correctly; 50/50 would flatten that tension. **This number is a playtest-tunable judgment call, not settled — flag if you want a different default.**
- **Migration needed:** `defeatLichKing`'s existing `baseSanctuaries: 80` no longer has a field to live in — its "harsher world" intent should convert to a higher `baseDungeonChance` for that campaign (e.g. ~0.75) rather than being silently dropped.

## Theming — POI Type Replaces Terrain (for this path only)

POI-resolved dungeons pick their theme from the POI type's own `dungeonThemeWeights` in `pois.json`, not `dungeons.json`'s terrain-keyed table — reasoning: biome eligibility already constrains terrain for the narrow types, and for broad types (cave, camp) the site's own fiction should dominate over ambient biome noise; blending two weighted sources adds real normalization complexity for little gain. **Standalone dungeons are untouched** — they keep using `terrainThemeWeights` exactly as today.

## Reveal Mechanic (revised 2026-08-09 per user)

Resolution (`resolvedType`, theme, creatures) computes at world-gen time, deterministically — same rule as everything else in world-gen. Hiding it from the player is purely a rendering/UI concern, and the reveal moment is intentional, not passive tile-stepping:

- `MapRenderer.js` renders POI features **by `poiType` only, never by `resolvedType`** — this is what makes the "art can't leak the outcome" requirement true by construction, not something requiring careful sequencing (confirmed independently by architect's parallel rendering review above). Standing next to or walking onto a POI tile shows only its type art (a cave, a watchtower, a temple) — never which outcome it is.
- **The reveal happens on an explicit "enter" action, mirroring the dungeon-entry pattern exactly** — not on physical tile entry. Verified the real pattern: `Player.js`'s `E`-key handler (~line 555) already does `if (this.dungeonManager) { const dungeonFeature = await this.dungeonManager.getDungeonAtPlayerPosition(); if (dungeonFeature) { await this.dungeonManager.enterDungeon(); ... } }` on the world map. The same handler needs a new branch: check for an ambiguous POI at the player's position, and pressing `E` on it is what triggers the retype (`feature.type = feature.resolvedType`, keep `originalPoiType` for flavor text) **and** immediately routes into the correct downstream flow — `dungeonManager.enterDungeon()` unchanged if it resolved to `dungeon`, or the new sanctuary-enter flow below if it resolved to `sanctuary`.
- After this one-time reveal, the tile behaves exactly like a normal `sanctuary`/`dungeon` feature always has — e.g. `RestManager.isPlayerInTavern()`'s existing proximity check (current tile + nearby 2-tile radius, `tile.feature.type === 'sanctuary'`) and the existing `R`-key rest modal keep working completely unchanged for a revealed sanctuary. The `E`-key "enter" is specifically the discovery/reveal moment, not a replacement for ongoing rest access.

## Enter Sanctuary — v1 (new mechanic, minimal scope per user)

Sanctuaries currently have **no explicit enter action** — long rest is reachable only via proximity (`isPlayerInTavern()`) + the existing `R`-key rest modal. This is new: pressing `E` on a POI that resolves to `sanctuary` should, for now, just:
1. Show a discovery message (reuses the flavor name generated in §POI type table, e.g. "You find [sanctuary name] — a peaceful place to rest.").
2. Immediately offer the existing Short Rest / Long Rest choice — reuse `RestManager.shortRest()`/`longRest()` and whatever UI currently backs the `R`-key rest modal, don't build new rest logic or a new modal.

**Explicitly out of scope for now:** any richer sanctuary-specific interaction (NPCs, events, "sanctuary encounters"). **Follow-up:** roadmap a "sanctuary encounters" initiative with `product-owner` as a separate future item — not designed or scheduled here.

## Intel — Two Tiers, Both Already Precedented (extend, don't invent)

- **Tier 1 (primary, all 7 types, both outcomes):** the existing settlement Influence-check dynamic-dialogue system (`SettlementUI.js` + `DialogueManager.getDynamicLines()`, which already scans nearby loaded features and fills line pools from `dialogueTemplates.json`). Widen its feature-type match to include `poi`, dispatching on `resolvedType` to new `poiDungeon`/`poiSanctuary` line pools — generic dispatch on a resolved-outcome field, stays ADR-010 compliant.
- **Tier 2 (dungeon-outcome POIs only):** the existing settlement quest-hook system (`QuestGenerator.js:getHooksForSettlement()`, currently filters `feature.type === 'dungeon'`) widens to also match POI features whose `resolvedType === 'dungeon'`. Everything downstream (kill/negotiate/investigate quest generation) already works generically off the hook fields POI-dungeons already carry.
- **Sanctuary-outcome POIs deliberately never enter Tier 2** — kill/negotiate/investigate are danger-shaped archetypes with no natural fit for "there's a safe place to rest." Tier 1 alone covers it. This is an intentional asymmetry: dungeon-outcome POIs have variable intel availability (sometimes a full quest, sometimes nothing), sanctuary-outcome POIs are reliably knowable once in range.
- **No new mechanic proposed** — no approach-based scouting/investigation check; it would duplicate Tier 1 without adding a distinct decision.

## Rendering-Path Feasibility (architect, 2026-08-09, parallel review)

**Feasible, small change (~15-20 lines), scoped to `sanctuary`/`poi` only** — leave `dungeon`/`settlement` markers as ASCII (not asked for, `dungeon` has no backing terrain entry today to even show art for).

- `MapRenderer.js`'s `preloadTileImages()` **already loads every `terrains.json` `tileImage` regardless of use** — `sanctuary`/`ruins`/`cave` art is already cached in memory today, just never drawn. `getTerrainImageOptions()` already handles legacy single-tile mode correctly with no `visual` field set (same as `town`/`ruins`/`cave` today) — no new atlas logic needed.
- **Change shape:** `renderFeature()` gains an image-lookup step (same `getTileImage()`/`drawImageTile()` calls the base-terrain path already uses) before its existing ASCII fallback — falls back to ASCII if no art authored yet or pixel-art toggle is off.
- **Real cleanup this change should make, not defer:** replace the current growing per-`poiType` `switch` (hardcoded string literals mapping type → terrain lookup) with a direct `poiType === terrain.id` convention — makes adding an 8th POI type later a pure data change, zero code touched.
- **Do not** wire `drawTerrainTransitions()` (organic-edge blending) into POI rendering — these are one-off discrete landmarks, not a repeating material; simply not setting `visual.mode` on their `terrains.json` entries keeps them out of that system automatically, no explicit exclusion code needed.
- **Respect the existing pixel-art toggle** (`nexusVerge_usePixelArt`) rather than a special "POIs always show art" path — reuses `getTileImage()` as-is, keeps the toggle meaning one consistent thing. Flagged as an explicit design choice (game-designer/creative-director could override later if POI salience matters more than toggle consistency).
- **New config flag recommended:** `RULES.terrainRendering.poiMarkers.usePaintedArt` (default `true`) — an independent kill switch from the base-terrain toggle, per ADR-000.
- **Data placement:** `tileImage`/`imageDescription` for all 7 POI types live directly on their `terrains.json` entries (the 4 new types need entries added) — **not** a second art block inside `pois.json`. Keeps exactly one source of truth per POI type: `pois.json` owns mechanical identity (what it can resolve to), `terrains.json` owns what it looks like, joined implicitly by the shared `id`/`poiType` string. This placement is also what makes the "art can't leak the hidden outcome" guarantee automatic — the mechanical `resolvedType` field never gets read by anything that selects art.

## Scope Revision (2026-08-09, reopens the "dungeon feature stays separate" decision)

User rejected the "two pools" outcome of the approved design: standalone `dungeon` features (mountain/hills, `wbDungeons`) and POI-resolved dungeons (`wbPOIs` × `wbPoiDungeonChance`) are two independent, parallel ways to generate a dungeon today. **Directive: one fully-wired generation path only**, configurable in either of two modes:
- **Mode A (already built):** total POI count + a dungeon-resolution rate (global and/or per-type).
- **Mode B (new, not built):** direct fixed target counts — a fixed number of dungeons and a fixed number of sanctuaries — rather than a probabilistic rate.

This means the standalone `dungeon` feature type/generation loop (kept deliberately separate in the original spec, approved by the user at the time) needs to be reconsidered — not necessarily deleted, but no longer a parallel system alongside the POI pool. Sent back to `game-designer` (mechanic) and `architect` (migration feasibility against the already-implemented code) — see their findings once returned.

**game-designer's spec for this reopened decision is below, under "Scope Revision — Redesign Spec".** It supersedes the "Dungeon feature type stays fully separate" row in the Judgment Calls table immediately below (left in place, not rewritten, so the decision trail stays honest — see workflow.md's plan-update discipline).

## Judgment Calls — Approved (2026-08-09, user sign-off)

| Call | Decision |
|---|---|
| Default `baseDungeonChance` | **Approved: 0.60 (dungeon-leaning)** |
| `defeatLichKing` migration (`baseSanctuaries: 80` → ratio) | **Approved: ~0.75 dungeon-lean for that campaign** |
| POI generation share (cave 0.18 / camp 0.16 / ruins 0.20 / temple 0.14 / monastery 0.10 / watchtower 0.12 / villa 0.10) | **Approved as first pass** — `balance-engineer` still checks monastery/villa don't starve on biome-poor seeds before ship |
| Sanctuary-outcome POIs get no quest-hook (Tier 2) intel | **Approved** — asymmetric by design |
| ~~Dungeon feature type stays fully separate from the POI system~~ | **Superseded 2026-08-09** — user rejected this outcome after seeing it live. See "Scope Revision — Redesign Spec" below: `dungeon` retires as a standalone concept entirely and becomes just one `resolvedType` outcome shared by the existing 7 POI types — no separate type, category, or flag of any kind (simplified further, 2026-08-09, per user: "i dont want different categories of dungeon"). |

Status: the "two pools" shape of this thread (data layer + rendering path) is implemented and working, but is being replaced by the unified-pipeline redesign below before it's considered done. Not shippable as-is per the user's explicit directive — treat "Implementation Status" further down as describing what exists on disk today, not as sign-off.

## Scope Revision — Redesign Spec (game-designer, 2026-08-09)

Answers the four numbered questions the Scope Revision above raised, plus the sanctuary-reveal-art question `creative-prompt-engineer` flagged in parallel. Written against the live code (`WorldGenerator.js` `preGenerateFeatures()` lines ~1567-1822, `rulesEngine.js` `featureGeneration`/`getScaledFeatureGeneration()`, `data/pois.json`, `MapRenderer.js` `renderFeature()`, `main.js` worldbuilder functions, `index.html` worldbuilder panel) — a redesign against working code, not a greenfield spec.

### 1. Standalone `dungeon` feature — **RESUPERSEDED 2026-08-09, simplified per user**

~~Original decision: fold in as an 8th, always-resolves-to-dungeon POI type (`alwaysDungeon`/`useTerrainTheming` flags).~~ **Rejected by the user: "i dont want different categories of dungeon."** A dedicated always-dungeon type, however implemented, is exactly a second category of dungeon wearing a data-flag instead of a second code path — same complaint, different mechanism. Simplified decision below replaces §1 in full; §2-4 are corrected to match (see inline notes).

**New decision: `dungeon` is not a POI type at all — it's just one of the possible `resolvedType` outcomes for the existing 7 POI types, exactly like `sanctuary` already is.** No 8th type, no special flags, no separate biome-bias carve-out. The old standalone mountain/hills-biased dungeon simply retires — its terrain character isn't preserved as its own thing, because `cave` and `watchtower` already have `mountain`/`hills` in their `biomeEligibility` and already lean dungeon-heavy (`dungeonWeightModifier` +0.15 each) — that's sufficient texture without inventing a category to protect it.

**Consequence for §2-4 below:** every "8 types" reference becomes "7 types," and no backbone-specific config knob of any kind (carve-out ratio or otherwise) ever needs to exist. (§2's fixed-count "Mode B" concept was itself retired shortly after this — see §2 below — so this point is now doubly moot, kept for the history trail.)

**Forward-compatibility note (user: "we may have other things in the future... poi that resolve into things even more so than just dungeons or sanctuaries"):** `resolvedType` must stay a generic string read from data, never a hardcoded two-value check (`=== 'dungeon' ? x : y`) anywhere in code — always dispatch off the field's actual value or off a per-type weight table in `pois.json`, so a third/fourth possible outcome later is a data change, not a code change (ADR-000/ADR-010). Today only `dungeon`/`sanctuary` exist as real outcomes and that's fine to ship as-is — this is a constraint on *how* the two are implemented, not a requirement to build more outcomes now.

### 2. Fixed-count "Mode B" — **RETIRED 2026-08-09, replaced by per-type rate control**

The token-bag exact-count design that stood here was withdrawn before implementation. Reason: it can only guarantee an exact total by silently under-delivering on biome-scarce types (e.g. `monastery`/`villa`) with no bound on how large that shortfall could actually get — nobody had quantified it, and "exactly N" is a real promise that a silent shortfall breaks, not a soft one. Rather than build a mitigation (a preflight feasibility check, or deficit-redistribution across types — both real options, neither built), the user chose to drop the exact-count guarantee entirely and get equivalent control a simpler way: **one config, one mode, total POI count + a dungeon-chance percentage that's tunable per POI type**, not just one global number. Since it's still fundamentally "roll a chance per instance," there's no exactness promise to break — the whole feasibility problem above doesn't apply.

### 3. Config surface — one mode, per-type-tunable rate

```js
// rulesEngine.js — featureGeneration block
featureGeneration: {
    baseSettlements: 150,
    settlementDistribution: { ... },        // unchanged
    settlementSpacing: { ... },              // unchanged
    // baseDungeons: RETIRED — no replacement; dungeon is a resolvedType outcome, not a count
    dungeonDifficultyDistribution: { ... },  // unchanged — used by every dungeon-resolving feature
    basePOIs: 300,                            // total POI count, unchanged from before this revision
    poiResolution: {
        baseDungeonChance: 0.60,              // global default, applies to any type without its own override
        typeOverrides: {}                      // optional per-type dungeon-chance overrides, e.g.
                                                // { cave: 0.70, monastery: 0.20 } — only listed types
                                                // deviate from the global default; unlisted types still
                                                // fall back to clamp(baseDungeonChance + dungeonWeightModifier)
    },
    edgeBuffer: 2
}
```

- `finalDungeonChance = typeOverrides[t] ?? clamp(baseDungeonChance + t.dungeonWeightModifier, 0, 1)` — an explicit per-type override wins outright if set; otherwise falls back to today's already-implemented global-rate-plus-data-modifier formula. No new algorithm, one extra lookup.
- `basePOIs` is unchanged — always an independently-set total, no derived-vs-independent conflict to resolve since there's no second number (targetDungeons/targetSanctuaries) to disagree with it anymore.
- `getScaledFeatureGeneration()` needs no structural change beyond scaling `basePOIs` as it already does — `typeOverrides` is a percentage map, not a count, so it doesn't scale with world size.

**Worldbuilder/campaign UI:** the existing `wbPOIs` (total count) and `wbPoiDungeonChance` (global default %) fields are unchanged. `wbDungeons`/`wbSanctuaries` are fully retired now, not repurposed — there's no fixed-count concept left for them to control. New: an optional per-type override section (7 fields, one per POI type, each defaulting to blank/"use global default") — exact UI treatment (always-visible 7 fields vs. an "Advanced" disclosure toggle) is a `frontend-dev` call, not decided here; either is a straightforward extension of the existing single-slider pattern. Same for `data/campaigns.json`: a campaign can already override `poiResolution.baseDungeonChance` (see `defeatLichKing`'s existing `0.75` override, still valid, no migration needed) and can now optionally add `poiResolution.typeOverrides` the same way.

### 4. Standalone-dungeon-specific behavior — disposition (simplified 2026-08-09: no `dungeon` POI type exists to inherit any of this)

| Piece | Disposition |
|---|---|
| `dungeons.json` `terrainThemeWeights` (terrain-keyed theming) | **Retired.** No feature reads it anymore once the standalone loop is deleted — every dungeon outcome now themes via its POI type's own `dungeonThemeWeights` in `pois.json` (the contextual theming the user specifically wants — a `cave`-dungeon and a `temple`-dungeon already pick from different, appropriate theme pools). Leave the data file in place (harmless, undeleted per data-integrity norms against ghost-breaking removals) but it's dead weight going forward — flag for a future cleanup pass, not this one. |
| Quest-hook wiring (`_computeQuestHook()`) | Already shared/generic — every dungeon-resolved feature (any of the 7 types) calls the identical function. Zero new code. |
| `placeDungeon()` helper + two-pass 60%-skip/refill region loop (`WorldGenerator.js` ~1618-1686) | **Deleted outright**, not migrated anywhere. Mountain/hills dungeon placement isn't preserved as its own mechanism — it happens now purely because `cave`/`watchtower` already list `mountain`/`hills` in `biomeEligibility` and already lean dungeon-heavy. No replacement loop, no data-flagged variant — this is the actual deletion the user's simplification asked for. |
| `RULES.worldGen.featureGeneration.baseDungeons` | **Retired**, deleted from `rulesEngine.js` (not deprecated-in-place). |
| `RULES.worldGen.dungeonFrequency` (legacy) | **Untouched** — only read by `WorldGenerator.generateFeatures()`, the non-finite-world fallback path that's dead in practice (`finiteWorld.enabled` is never `false` by default, per the doc's existing Loose Ends note). Out of scope for this revision; don't conflate with the live path. |

### Reveal-art decision — **symmetric** (revised 2026-08-09 per user, overrides game-designer's original asymmetric call)

**Decision: keep the original POI-type art permanently for BOTH outcomes. The reveal is purely mechanical/textual — never a visual downgrade.** A `watchtower` that turns out to be a dungeon still looks like a watchtower, not a plain `'D'`. Explicit user rejection of the asymmetric version: painted POI art was just built for all 7 types specifically so entering one doesn't degrade the map back to an ASCII letter — reverting on the dungeon outcome would throw that away for roughly `baseDungeonChance` (60%+) of all POIs, the majority case, not an edge case.

- **Sanctuary case** (unchanged from the original call): `MapRenderer.js`'s `renderFeature()` `case 'sanctuary':` resolves art via `getTerrain(feature.originalPoiType) ?? getTerrain('sanctuary')` instead of unconditionally `getTerrain('sanctuary')`.
- **Dungeon case** (reversed): `case 'dungeon':` needs the identical `getTerrain(feature.originalPoiType) ?? null` lookup before falling back to the plain `'D'`/`#8b0000` marker — drawing via the same `imageTerrain`/`getTileImage()` path the `poi`/`sanctuary` cases already use, not the hardcoded ASCII-only branch it has today.
- **No backbone type exists anymore (§1, simplified 2026-08-09), so this applies uniformly** — every dungeon on the map is POI-resolved and carries `originalPoiType`, meaning every dungeon now shows its original painted art on reveal. The only remaining `?? null` fallback case is the dead legacy non-finite-world path's raw `type: 'dungeon'` features (no `originalPoiType` there, correctly falls through to `'D'` — unreachable by default, not a live concern).
- `feature.originalPoiType` already exists on every reveal (`Player.js` ~622) — no new data needed for either branch, purely a rendering-path change.
- Falls back correctly for the dead legacy fallback path's standalone `type: 'sanctuary'`/`type: 'dungeon'` features (no `originalPoiType`, correctly fall through to their generic markers — unaffected, unreachable by default).

### Reveal-state marker (new, 2026-08-09 per user)

Base POI art staying constant (above) isn't the whole ask — the user also wants the map to visibly distinguish three states per tile: **undiscovered POI**, **revealed sanctuary**, **revealed dungeon**. Design: reuse the existing corner-badge overlay pattern already in `MapRenderer.js` (`_modifiedTilesMap`'s quest-tag dot, drawn top-right, semi-transparent color square) rather than inventing a new rendering mechanism — same idiom, a second independent overlay.

- **Undiscovered** (`feature.type === 'poi'`, not yet entered): its own small neutral/mystery badge (muted grey, e.g. `rgba(180, 180, 180, 0.55)`, or a small `?` glyph) — corrected 2026-08-09: "no badge" isn't a real third state, it's indistinguishable from a tile with no reveal mechanic at all. This badge signals "this is a POI with a hidden nature" without hinting which way it resolves — fully compatible with the "must not leak the outcome" constraint, since neutral-badge-vs-neutral-badge carries no information about resolvedType.
- **Revealed sanctuary** (`feature.type === 'sanctuary'`): small warm gold/cream badge, echoing the existing sanctuary color (`#f0e68c`).
- **Revealed dungeon** (`feature.type === 'dungeon'`): small dark-red badge, echoing the existing dungeon marker color (`#8b0000`), on top of the original POI art (no backbone type exists anymore — every dungeon is POI-resolved, per §1's simplification).
- **Positioning:** bottom-right corner, distinct from the existing quest-tag dot's top-right position, so the two overlays never collide on a tile that happens to carry both a quest tag and a POI reveal state.
- Drawn as a small addition inside/after `renderFeature()`'s existing draw call, gated on `feature.type` — generic dispatch on the field already used everywhere else in this system (ADR-010: no per-poiType branching, just the three `feature.type` values).

**Flagging, not deciding:** exact badge shape (filled square matching the existing quest-tag idiom, vs. a small circle, vs. a tiny icon) and exact color values are my proposal, not locked — cheap to adjust once someone looks at it in-game. If you want `creative-director`/`frontend-dev` to actually design this visually rather than take my direct proposal, say so before implementation; otherwise this ships as specified.

### Next Steps — Scope Revision (final, 2026-08-09)

1. `data-agent`: no `data/pois.json` structural change needed — still 7 types, `generationShare` unchanged. Just add the new optional `poiResolution.typeOverrides` shape awareness if any campaign wants to use it (none do yet by default).
2. `backend-dev`: `rulesEngine.js` (add `poiResolution.typeOverrides: {}`, delete `baseDungeons`, no `resolutionMode` field needed); `WorldGenerator.js` (delete `placeDungeon()`/standalone loop outright — no replacement mechanism, dungeon outcomes now come purely from the 7 POI types' existing resolution formula, extended with the `typeOverrides` lookup); `main.js` (`applyWorldbuilderSettings()` reads any new per-type override fields if `frontend-dev` adds them).
3. `frontend-dev`: `index.html` — remove `wbDungeons`/`wbSanctuaries` entirely (no fixed-count concept left to back them); optionally add a per-type override section (7 fields) alongside the existing `wbPOIs`/`wbPoiDungeonChance`, exact UI shape (always-visible vs. an "Advanced" toggle) is `frontend-dev`'s call.
4. `frontend-dev`/`backend-dev`: `MapRenderer.js` art-lookup fix for **both** `case 'sanctuary':` and `case 'dungeon':` (symmetric, see Reveal-art decision above — every dungeon now carries `originalPoiType` since there's no backbone type left to lack it) — plus the new reveal-state corner-badge overlay (undiscovered/sanctuary/dungeon, see Reveal-state marker above).
5. `balance-engineer`: re-run the placement-count simulation post-migration, confirm the existing 7-type `generationShare` distribution and per-type dungeon lean still behave as expected once the standalone mountain/hills dungeon loop is gone (does removing it change how "risky" mountain/hills terrain feels overall, now that `cave`/`watchtower` carry that weight alone?).

## Implementation Status (2026-08-09)

Data layer, core logic, and rendering path are all implemented. `node --check` passes on every edited file; `npx vitest run` is 559/560 (the 1 failure is the tier-1 art-pending case noted in the main overhaul's Implementation Status, unrelated to POI work). Verified with a throwaway 5000-iteration simulation against the real data: `generationShare` sums to 1.0, dungeon/sanctuary ratios lean correctly per type, every `dungeonThemeWeights` id resolves to a real `data/dungeons.json` theme.

**Real integration catch:** implementation was checked against data-agent's actual JSON output, not just this doc's prose — found and fixed 3 field-name mismatches (`poiTypes` not `types`; `generationShare` is per-type not a top-level map; sanctuary naming fields are nested under `sanctuaryNaming`, not flat).

**Loose ends — status as of the final simplified redesign (2026-08-09):**
- ~~`camp` has no `data/terrains.json` entry~~ — **fixed**, entry added directly, matching the `temple`/`monastery`/`watchtower`/`villa` shape.
- ~~`shrine`/`landmark` dangling references in `skillChallenges.json`/`quests.json`~~ — **fixed**: `shrine` → `monastery` in the ritual-trigger list; `landmark` → the 5 not-already-listed POI types in the explore-quest location list (verified both were flavor/matching-only, not load-bearing, before editing).
- ~~`wbSanctuaries`/`wbDungeons` functionally disconnected~~ — **fixed**: both removed from `index.html` entirely (not repurposed — no fixed-count or backbone-count concept survived to need them). Verified zero remaining references in `main.js`/`index.html`.
- **Still open, not blocking:** the legacy non-finite-world fallback generation path (dead in practice, `finiteWorld.enabled` never `false` by default) still has old logic — out of scope, untouched by design.
- **Still open, not blocking:** `feature.intelKnown` exists in the data shape but nothing sets it `true` yet — no consumer was ever specified, correctly left inert.
- **Still open, not blocking:** `dungeonThemeWeights` numbers, `pois.json`'s `sanctuaryNaming` word banks, and the dialogue line pools are first-pass placeholder content — need a `worldbuilder` polish pass and `balance-engineer`/`game-designer` sign-off before considered final.

### Final simplified redesign — implementation status (2026-08-09)

`backend-dev` and `frontend-dev` implemented the fully simplified version (no 8th POI type, no fixed-count mode, no backbone concept — see "Config surface — one mode, per-type-tunable rate" above): standalone `dungeon` generation (`placeDungeon()` and all mountain/hills-biased placement) deleted outright; `poiResolution.typeOverrides` added with generic per-type lookup (verified directly: `WorldGenerator.js` reads `featureConfig.poiResolution?.typeOverrides?.[poiType]`, falling back to the existing modifier formula, no hardcoded type branching); reveal-art fixed symmetrically for both `sanctuary` and `dungeon` cases (a revealed POI keeps its original painted art permanently, verified via `feature.originalPoiType` lookup in both `MapRenderer.js` branches); new three-state reveal badge added (grey/undiscovered, gold/sanctuary, dark-red/dungeon, bottom-right corner, reusing the existing quest-tag dot pattern). Verified directly: `node --check` clean on all changed files, `npx vitest run` 559/560 (same single pre-existing art-pending failure, no new failures), zero remaining `wbDungeons`/`wbSanctuaries` references anywhere in the codebase.

## Next Steps

1. `data-agent`: author `data/pois.json` (7 types), migrate `defeatLichKing`'s campaign override, add `dynamicTemplates.poiDungeon`/`poiSanctuary` to `dialogueTemplates.json`.
2. `backend-dev`: rulesEngine additions/retirements, `WorldGenerator.js` generation-flow rewrite, `Player.js` `E`-key handler branch for ambiguous-POI enter/reveal (mirrors the existing dungeon-entry branch at ~line 555), new minimal sanctuary-enter flow (message + short/long rest reusing `RestManager` as-is), `applyWorldbuilderSettings()` slider, `DialogueManager`/`QuestGenerator` filter widening.
3. `frontend-dev`/`backend-dev`: `MapRenderer.js` rendering-path change per architect's assessment.
4. `creative-prompt-engineer`: art for the 4 new POI types (`temple`, `monastery`, `watchtower`, `villa`) plus restyled `cave`/`ruins`/`sanctuary` — same painted-overland-atlas identity as the main terrain overhaul, legacy single-tile mode.
5. `balance-engineer`: post-implementation placement-count check per the table above.
6. **Not scheduled, flagged only:** roadmap "sanctuary encounters" (richer future sanctuary interactions beyond v1's message+rest) with `product-owner` as a separate initiative.
