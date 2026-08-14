---
name: canvas_corner_badge_overlay_pattern
description: Reusable Canvas corner-badge idiom in MapRenderer.js for stacking multiple independent semi-transparent state indicators on one tile
metadata:
  type: project
---

`MapRenderer.js` has a small-square corner-badge idiom used for tile-level state indicators that must stay independent of each other and not leak hidden information. First instance: `renderTile()`'s `_modifiedTilesMap` quest-tag dot (top-right corner). Second instance, added for the Unified POI System reveal-state marker (2026-08-09): `drawRevealStateBadge()` (bottom-right corner), called from inside `renderFeature()` right after both the painted-art draw path and the ASCII fallback draw path.

**Pattern to follow for any future third badge:**
- Size: `Math.max(3, Math.floor(this.config.tileWidth * 0.18))`.
- Position: pick an unused corner. Top-right is taken (quest tag), bottom-right is taken (reveal state). Next one goes top-left or bottom-left.
- Draw via `this.ctx.fillStyle = rgbaColor; this.ctx.fillRect(x, y, size, size)` — no new rendering infrastructure, no image assets.
- Gate strictly on a generic field (`feature.type`, not `feature.poiType`/`feature.resolvedType`) when the badge must not leak an outcome that's supposed to stay hidden until reveal — this was an explicit design constraint from `game-designer`'s spec, not just a style preference.
- Decide independently per-badge whether it needs `visible`-only gating (quest tag dot does; the POI reveal badge does not — reveal state is durable info about an explored tile, not an ephemeral world-tag, so it draws on fog-dimmed remembered tiles too. This was a frontend-dev judgment call, not spec-mandated either way — the plan didn't say).

See [[poi_reveal_symmetric_art_fix]] for the companion change this badge shipped alongside.
