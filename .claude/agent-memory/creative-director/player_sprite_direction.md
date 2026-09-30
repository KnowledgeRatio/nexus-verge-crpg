---
name: player-sprite-direction
description: Direction for the player map sprite — nine unisex traveller figures on a calling x mass x accent Latin square, bottom-anchored oversize rendering, revised legibility floor
metadata:
  type: project
---

**Status: REVISED 2026-09-09 after Chief Designer decisions. Spec below reflects those decisions; asset counts still awaiting ratification.**

Player-character map sprite (`character.avatar` → `MapRenderer.setPlayerAvatar`, `DungeonUI.setPlayerAvatar`).

**Why this came up:** `CharacterCreation.js` offered two avatars named "Knight" and "Monk" — D&D class names in a three-calling game — and both PNGs were **deleted** in `632f2e5` ("cleanup dev art") while the code references stayed live. Players since have been forced through a picker of broken images, then rendered as the `@` fallback. The real failure mode is **asset/reference decoupling**, which the Azure Blob migration makes *more* likely, not less.

**Creative thesis:** the terrain is a painted field atlas — the record of what has been surveyed. The player figure is *the hand still drawing it*. The sprite is therefore the map's only sanctioned figure-ground exception: it alone gets a focal centre, a hard contour, and a contact shadow, all of which the terrain rules forbid. Direct it as an ink-and-gouache traveller's mark, never as a miniature painting of a person.

**Chief Designer decisions (2026-09-09) that overruled my recommendations — do not re-litigate:**
- The avatar picker **stays**. I recommended deleting it and deriving the figure from calling; overruled.
- **Nine figures, three per calling**, all unisex; grouped by calling with the player's own three surfaced first, but all nine selectable.
- Variation axis within a calling: **silhouette mass + accent colour** (chosen because they are the two properties that read at tile size).
- Sprite renders **oversize, bottom-anchored, ~1.5-1.75x tile**, feet on the logical tile, overhanging upward.

**How to apply:**
- **"Mass" means load mass, never body type.** Lean/broad/compact describe the outer layer and pack, not the person — broad is a wide *pack and wrap*, not wide shoulders. Say this explicitly every time or it slides straight into body types and gendered reads, defeating [[unisex-player-figure-constraint]].
- Calling reads from **what is carried** (worldbuilder: inference, not insignia — callings are dispositions, not uniforms, and nobody in the Verge calls themselves "a Curiosity").
- **Culture is not an axis.** The PC's origin is player-defined with no assumed culture (`docs/world/PEOPLES.md`), so culture-keyed player figures contradict canon.
- **The legibility floor moved but did not vanish.** Destination range is 15px (zoom 10 x 1.5) to 84px (zoom 48 x 1.75); default is ~28px. Reframe: the figure must stay *locatable* at 15px but need only be *identifiable* at 28px. Deep zoom-out is a deliberate act — the player is looking at the map, not at themselves.
- **The contact ellipse became load-bearing.** With the figure overhanging upward, it is the only thing telling the player which tile they actually occupy. It is no longer decorative.
- **Author at 128px, not 512** (frontend: step-halving 128→64→32→16 brackets every target within one bilinear step). The offscreen downscale cache is load-bearing, not an optimisation — smoothing is off globally (`MapRenderer.js:22`) and per-draw (`:461`), so a painted figure blitted straight to 17px aliases and *shimmers* as the rect moves.
- **`centerOn` does not clamp** (`MapRenderer.js:406-408`) — the player is always the exact centre tile even at a world corner, so overhang can never clip and findability is already free. Do not spend art budget on a halo or marker.
- **Do not reuse `.avatar-image`** (`styles.css:1359`) or `.avatar-review-image` (`:1387`) for anything painted — both set `image-rendering: pixelated`.
- Alpha discipline is still a red line: the player draws edge-to-edge over the tile at `globalAlpha` 1.0 with no compositing ops, so an opaque sprite punches a square hole in the map.
- Two-tone rim still required and unaffected by the size increase — it exists because the world map is warm parchment and `DungeonUI` is flat `#000`.

Related: [[portrait-system-direction]], [[unisex-player-figure-constraint]], [[terrain-atlas-direction]].
