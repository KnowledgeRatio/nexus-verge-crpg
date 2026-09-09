---
name: player-sprite-direction
description: Proposed art direction for the player map sprite — "the map is the record, you are the hand still drawing it"; 3 calling-derived traveller figures, awaiting Chief Designer decision
metadata:
  type: project
---

**Status: PROPOSED, awaiting Chief Designer decision (delivered 2026-09-09).** Do not treat as locked.

Direction for the player-character map sprite (`character.avatar` → `MapRenderer.setPlayerAvatar`, `DungeonUI.setPlayerAvatar`, drawn at tile size, default 16px).

**Why this came up:** `CharacterCreation.js` offered two avatars named "Knight" and "Monk" — D&D class names in a three-calling game — and both PNGs were **deleted** in `632f2e5` ("cleanup dev art") while the code references stayed live. Every player since has been forced through a picker of broken images and then rendered as the `@` fallback. The real failure mode is **asset/reference decoupling**, which the Azure Blob migration makes *more* likely, not less — any avatar work must land a reference that fails loudly, not silently.

**Creative thesis:** the terrain is a painted field atlas — the record of what has been surveyed. The player figure is *the hand still drawing it*. That makes the sprite the map's only sanctioned figure-ground exception: it is allowed the focal centre, hard contour, and contact shadow that the terrain rules explicitly forbid. Direct it as an **ink-and-gouache traveller's mark**, never as a miniature painting of a person.

**How to apply:**
- **Taxonomy: calling, not culture.** `worldbuilder` confirmed from `docs/world/WORLD.md` that the PC's origin is player-defined with no assumed culture, so culture-keyed sprites contradict canon. Callings are dispositions, not uniforms — so calling must read by **inference from what is carried** (worldbuilder's #3 distance signal), never as insignia or costume.
- **Three figures. One shared travel-load silhouette, differentiated only by carried load.** Reject any proposal that multiplies along a second axis (species, culture, specialisation, gear tier) — art volume is the standing risk here.
- **One master file per figure suffices.** `frontend-dev` confirmed an offscreen step-halving downscale cache in `setPlayerAvatar` handles all 12 `RULES.zoom.levels` sizes in ~30 lines. Do **not** commission per-zoom mip sets.
- **Nearest-neighbour is the silent killer.** `imageSmoothingEnabled = false` globally (`MapRenderer.js:23`, `DungeonUI.js:19`); a detailed painting blitted 1024→16 is point-sampled noise that *shimmers* as the rect moves. Any painted-asset-at-tile-size direction must specify the downscale path or it will look broken regardless of art quality.
- **Alpha discipline is a red line.** The player draws last, edge-to-edge over the tile, `globalAlpha` 1.0, no compositing ops. An opaque sprite punches a square hole in the map.
- **Two-tone contour, because dungeons are black.** World map is warm parchment; `DungeonUI` renders flat `#000` + per-tile colour (deliberate ASCII-contrast choice, see [[terrain-atlas-direction]]). A single dark rim vanishes on one of the two surfaces.
- **Findability is already solved in code** — the camera re-centres on the player every frame (`MapRenderer.js:646`), so the figure is permanently at viewport centre. Do not spend art budget on "help the player find themselves."
- Unisex is a hard constraint on all of the above: see [[unisex-player-figure-constraint]].

**Pre-existing style-guide bug found in passing:** the global `## Negative Prompts` block in `tools/image-gen/style-guide.md` carries terrain-motivated terms (`relief shading`, `directional dramatic lighting`, `drop shadow implying elevation`, ...) and `buildNegativePrompt` applies that whole block to portraits, monsters, and items. It directly contradicts `## Character Portraits`' own "strong chiaroscuro" instruction. The block needs splitting into shared + per-asset-class before any character art is generated.
