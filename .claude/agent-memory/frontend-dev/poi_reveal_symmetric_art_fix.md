---
name: poi_reveal_symmetric_art_fix
description: MapRenderer.js renderFeature() dungeon/sanctuary cases resolve art via feature.originalPoiType, never a generic icon, per the Unified POI System's symmetric reveal-art decision
metadata:
  type: project
---

Unified POI System (`docs/plans/2026-08-09-terrain-atlas-overhaul.md`, "Related Design Thread" section) locked a symmetric reveal-art rule 2026-08-09: entering an ambiguous `poi` feature retypes it to `sanctuary` or `dungeon` (`Player.js` `_revealPoiAtPlayerPosition()`, sets `feature.originalPoiType = feature.poiType` before flipping `feature.type`), but the tile must keep showing its *original* POI-type painted art forever after — never downgrade to a generic sanctuary icon or the plain `'D'` ASCII dungeon marker. That generic-icon behavior was the actual bug fixed 2026-08-09: `case 'sanctuary':` used to call `getTerrain('sanctuary')` unconditionally, `case 'dungeon':` had no art lookup at all (ASCII-only, hardcoded `'D'`/`#8b0000`).

**Fix pattern (both cases now identical):** `imageTerrain = getTerrain(feature.originalPoiType) ?? getTerrain('sanctuary' | fallback)`. The `?? fallback` branch only exists for the dead legacy non-finite-world generation path, which never sets `originalPoiType` — unreachable in practice since `finiteWorld.enabled` defaults `true`. Don't be tempted to "clean up" that fallback thinking it's unused; it's intentionally dead-but-safe, not delete-worthy live code.

**Standalone `dungeon` feature type does not exist anymore** (retired same design pass, superseded a "backbone mountain/hills dungeon generator" idea the user explicitly rejected: "i dont want different categories of dungeon"). Every `dungeon`-typed feature on the map going forward is POI-resolved and carries `originalPoiType` — `backend-dev` deleted the standalone generation loop in `WorldGenerator.js` in the same pass. If you ever see a `dungeon` feature without `originalPoiType` outside the legacy fallback path, that's a regression, not an expected case.

See [[canvas_corner_badge_overlay_pattern]] for the reveal-state badge shipped in the same change, and [[worldbuilder_ui_removed_dead_fixed_count_fields]] for the paired index.html cleanup.
