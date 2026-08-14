---
name: terrain-atlas-taxonomy
description: Consultative taxonomy for the 43-terrain continuousAtlas overhaul — transitionGroup/priority proposal, materials-vs-landmark split, restrained-tile precedent correction
metadata:
  type: project
---

Produced 2026-08-07 as a design-review pass (no files edited) ahead of a creative-prompt-engineer pass that will turn this into concrete `data/terrains.json` values. Full writeup delivered in-conversation; this is the durable summary.

## Precedent correction driving this pass
[[tone-visual-style]]'s "flora belonging to two climates at once" line was aspirational and is NOT what shipped in the only two migrated reference tiles (grassland, forest) — both are single-biome, restrained, no mixed-climate motifs, tile invisibly. The shipped tiles are the real standard now: individual terrain tiles stay neutral/restrained; convergence-weirdness lives at atlas seams and rare landmarks, not saturating every tile's motifs. `tone_visual_style.md` amended in place with a pointer here.

## Framing principle for the taxonomy
Same-transitionGroup = organic noise-blend (already implemented for grassland/forest) = two textures of the *same* converged fragment thinning into each other. Different-group = hard cut = the literal "convergence seam" where two different world-fragments meet — this is how the older "abrupt material shift, not gradient" memory language survives: it's scoped to *between* groups, not *within* one.

## SUPERSEDED 2026-08-09 — see correction section below
The groups in this section were built on narrative/geographic plausibility, not the actual world-gen code. The user (not an agent) asked for them to be checked against `WorldGenerator.js` directly before treating them as real. That check found several pairings wrong. Do not use this section's groups — use "2026-08-09 code-verified correction" below.

## Proposed groups (20 atlas-worthy materials) — ORIGINAL, PARTIALLY WRONG, KEPT FOR HISTORY
- **temperateNatural** (existing, extended): grassland 10, plains 12, hills 15, forest 20 (existing), denseForest 30, swamp 40, farmland ~45
- **coastal**: beach 10, shallowWater 20
- **openWater**: ocean 10, deepWater 20
- **alpine**: mountain 10, mountainPeak 20
- **coldNatural**: tundra 10, snowyPlains 20, snowForest 30
- **aridTropical**: desert 10, desertHills 20, savanna 30, jungle 40

Single-blend-partner tradeoffs (transitionGroup is one string field, so a terrain with two plausible real-world neighbors had to pick one): savanna picked jungle over grassland (tropical gradient, avoids double-booking swamp); swamp picked forest over shallowWater (mud creeping under trees; the water edge reads fine as a hard shoreline cut anyway); mountain didn't need a second partner — rock-against-hills/desertHills/tundra are all plausible hard geological lines in reality, not a compromise.

## Materials vs. landmarks
Atlas-worthy (20): grassland✓, forest✓, plains, hills, denseForest, swamp, farmland, desert, desertHills, savanna, jungle, tundra, snowyPlains, snowForest, mountain, mountainPeak, ocean, deepWater, shallowWater, beach.

Stay legacy single-tile, not atlas-ified (8): sanctuary, road, bridge, town, residential, industrial, cave, ruins — all discrete instanced features/structures, not repeating materials.

Dungeon interior (15 tiles): NOT resolved — flagged as an architecture question (does `terrainAtlas.js`'s infinite mirror-wrap sampling even apply to bounded dungeon rooms?). Provisional split if it does get built: dungeonFloor/Rubble/Wall are true materials; dungeonDoor/Exit/Altar/Treasure/Trap are landmarks; dungeonLava/Ice/Water/Web/Mushroom/Bones are hazard-floor materials that should only ever pair against dungeonFloor, never against each other (a lava chamber and an ice chamber are different rooms, not a gradient).

## Narrative texture pass findings
- Default for all wild/cultivated biome materials: neutral, restrained, no baked-in convergence weirdness — matches shipped grassland/forest and extends TECHNOLOGY.md's "anachronism intrudes rarely, reads as startling" rule to terrain.
- **ruins** (landmark): only terrain where a riftborn-material accent ([[riftborn-materials]]) — e.g. a broken wall with Splitstone's dual-fracture signature — would be earned; rare accent, not saturation; creative-prompt-engineer's call.
- **sanctuary** (landmark): good fit for the existing Verathi "biome edges where two ecologies meet" portrait-background convention, since it's a single hand-painted landmark tile already, not an atlas material — doesn't conflict with the neutral-tile default.
- **dungeonAltar**: must stay ambiguous multi-origin ritual site, not divine iconography — GODS.md is explicit (no pantheon, no church). Existing description ("dark stains") already leans this way; flagged so the eventual image prompt doesn't drift into "evil altar" cliché.
- **No terrain id exists for the Void boundary itself**, despite WORLD.md/CREATURES.md describing it in detail and Vethri settlements near it. Flagged for game-designer/architect — not invented here.

## Open questions left for creative-director / creative-prompt-engineer / architect
1. ~~Does dungeon interior rendering use `terrainAtlas.js`'s continuous system?~~ RESOLVED 2026-08-07 by creative-prompt-engineer: `DungeonUI.js` renders all 15 `dungeon*` terrains via flat ASCII/color fill, never reads `tileImage`. Dungeon interiors are excluded from this whole overhaul — rendering-plumbing gap, not a design question. No taxonomy work needed until someone wires image rendering into that file.
2. Sanity-check the hard-cut tradeoffs (savanna/jungle, swamp/forest) against real painted art once it exists — reconfirmed 2026-08-07, no changes, see below.
3. Void-boundary terrain: reconfirmed as a real gap on 2026-08-07 review (second time flagged). No id exists at all despite Vethri settlements being placed near the boundary in canon. Recommended to user as a standalone follow-up (game-designer/architect: new terrain id + placement + eventual art) — out of scope for *this* atlas overhaul but should not be dropped silently.
4. Ruins riftborn-material accent: RESOLVED 2026-08-07 — ruins stays legacy landmark (not atlas-ified, correctly so per `isDungeon: true`), accent gets authored directly into its one-off `imageDescription` by creative-prompt-engineer. No new lore needed; reuses the existing Item Icons material-impossibility convention.

## 2026-08-07 confirmation pass (creative-prompt-engineer's concrete proposal, review only, no files edited)
- transitionGroup/priority table and materials-vs-landmark split (20 atlas / 8 landmark) copied from this file exactly, zero deviation — locked as-is.
- New recommendation approved: restyle all 8 legacy landmark terrains (sanctuary, road, bridge, town, residential, industrial, cave, ruins) to the new gouache palette too, as single tiles not atlas, to avoid a visible style seam next to the new atlas terrain.
- Checked `industrial`'s actual description (`data/terrains.json`: "Warehouses, workshops, and forges bustle with activity") against TECHNOLOGY.md's no-tech-ceiling/rare-intrusion rule ([[worldbuilding-expansion-2026-07]]) — it's a craft/guild-quarter tile, not a modern-factory tile, so it doesn't carry TECHNOLOGY.md's anachronism weight and has no lore reason to stay visually distinct from the natural-biome palette. Precedent: keep "industrial" content in guild/forge register unless someone deliberately wants to spend a TECHNOLOGY.md rare-intrusion moment on it.
- savanna/jungle and swamp/forest boundary picks re-justified under [[established-canon-nexus-verge-world]]'s convergence-fragment framing (same-origin-world gradient reads more coherent than real-world climate adjacency) — stronger argument than the original real-world-geography justification. No change to the picks themselves.
- Confirmed via `Grep` on `data/terrains.json`: no `lava` (only `dungeonLava`, excluded per finding 1) and no void/voidBoundary/voidEdge terrain id exists anywhere. Both are real gaps for `game-designer`, not invented here.

## 2026-08-09 code-verified correction (locked, supersedes all groupings above)

User directly asked whether transitionGroup pairings reflect what `WorldGenerator.js` actually generates, not narrative instinct. Read `selectMacroBiome()`/`selectTerrain()` directly. Findings, all confirmed by the user:

- **`beach` is dead code.** No path in `WorldGenerator.js` ever assigns it (`// Beach retired: non-orientation-safe tile` comment; coastline is `shallowWater → grassland/plains`). `MapRenderer.js` even has a debug warning for if it's never found. Dropped from the art pass entirely — cannot appear in a generated world. Retire-or-fix is a separate `game-designer`/`data-agent` decision, not resolved here.
- **`shallowWater`/`deepWater` are not coastal-only** — they're carved as **rivers** through almost any land terrain via a `riverMask` threshold that runs after biome selection (can cut through grassland, forest, desert, tundra, anywhere terrain isn't already water). `ocean` is a separate true sea body (its own macro-biome, `e < 0.10`, never touches `deepWater` directly in the generator). Consequence: water needs to hard-cut against every land biome uniformly, which not-sharing-a-group already achieves — so the old `coastal`(beach+shallowWater)/`openWater`(ocean+deepWater) split is merged into one **`openWater`** group: `shallowWater 10 → ocean 20 → deepWater 30` (depth itself gradients organically; every land-water edge stays a hard cut regardless of which land biome, since no land terrain shares this group).
- **`savanna` is not desert/jungle-adjacent.** It's a moisture-variant of the `grassland` macro-biome (`m > 0.5`, same noise field as plain grassland/plains). Its real frequent neighbor is grassland/plains. The actual hot-band moisture gradient in the generator is `desert → grassland/plains → savanna → jungle` — grassland sits between desert and savanna, not desert directly. **Moved into `temperateNatural`**, next to grassland/plains.
- **`desertHills` is not in the desert→jungle chain either.** It comes from the `mountain` macro-biome (hot+dry variant of `hills`) or `badlands` at elevation — an elevation branch, structurally unrelated to the moisture-driven desert/savanna/jungle gradient. Its real code-verified sibling is `hills` (same macro-biome branch). **New group `uplands`**: `hills 10, desertHills 20` — elevation-driven, hard-cuts against whatever sits below/above (reads fine as a natural line, same logic as the water/land cut).
- **`swamp`↔`forest` is not code-backed.** Swamp's real macro-biome neighbors are grassland/shallowWater (`coastal`, `swampland` biomes) and jungle (the `jungle` biome's wet extreme) — forest never appears in the same branch as swamp anywhere in `selectTerrain()`. The "mud creeping under trees" justification (see confirmation-pass note above) was aspirational, not generated. **Kept in `temperateNatural`** — the grassland/shallowWater connection is real — but the forest justification is retracted.
- **`farmland`** is not biome noise at all — placed in a concentric ring around settlements (`industrial → residential → farmland`, outer ring), always bordering `residential` (a landmark tile) on the inner side. Kept in `temperateNatural` for its outer edge as before; just note the adjacency mechanism is settlement placement, not a moisture gradient.
- `aridTropical` shrinks to just `desert 10, jungle 20` — they rarely touch directly in practice (grassland/savanna usually buffers them) but keeping a shared group is a harmless safety net for the rare case they do.

**Final locked groups (2026-08-09):**
- `temperateNatural`: grassland 10, plains 12, forest 20, denseForest 30, swamp 40, savanna 45, farmland 50
- `uplands` (new): hills 10, desertHills 20
- `openWater` (merged): shallowWater 10, ocean 20, deepWater 30
- `alpine`: mountain 10, mountainPeak 20 (unchanged — no code contradiction found)
- `coldNatural`: tundra 10, snowyPlains 20, snowForest 30 (unchanged — this one *is* a real single-macro-biome moisture chain, checked and confirmed correct)
- `aridTropical`: desert 10, jungle 20
- `beach` excluded from art generation (dead code)

Related: [[tone-visual-style]], [[riftborn-materials]], [[established-canon-nexus-verge-world]], [[worldbuilding-expansion-2026-07]]
