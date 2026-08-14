---
name: tone-visual-style
description: Established visual tone and art direction for Nexus Verge — palette, mood, rendering style, asset-type conventions
metadata:
  type: project
---

Updated 2026-05-25. Corrected mood descriptor and portrait background conventions to match canonical world design. Image gen style guide rewritten 2026-05-24: oil painting for monsters/items/portraits; hand-painted cartographic map tile style (NOT oil painting, NOT pixel art) for terrain; hard bans on grid/graph texture and white borders/frames across all asset types; hard ban on modern/industrial/post-apocalyptic elements in monster art. 2026-05-25 additions: universal lighting rule moved to Art Style block (applies to all asset types, not just portraits); convergence seam rule added to terrain (abrupt material shift at biome boundaries, not a gradient); worn-not-ruined rule added; convergence evidence rule added (every asset shows mismatched materials, two-climate details, or rift-geometry seams); portrait lighting line removed from Character Portraits block (now universal).

**Overall palette:** Desaturated earth tones (ash grey, iron brown, deep slate). Isolated warm pops of amber/ember light as accent. NOT bright saturated fantasy.

**Mood:** Weathered and weary — not grimdark, not grim-hopeful. The world is a strange living frontier: desperate wonder, survival on a plane that is strange and still being mapped. Equipment is worn, people look serious and watchful, but the world is active and in-progress, not ruined.

**Lighting rule:** Single warm source upper-left, cool fill from opposite. Universal — applies to all asset types. Now explicitly stated in Art Style block of style guide (not just Character Portraits).

**Convergence evidence rule:** Every asset must show evidence of the world's convergence — mismatched materials, two-climate details, or rift-geometry seams. No object or creature is wholly from one world.

**Worn-not-ruined rule:** Equipment and surfaces show use (scars, repairs, improvisation) but do not exaggerate decay.

**Convergence seam rule (terrain):** At biome boundaries, render an abrupt material shift — a thin line, not a gradient blend.

**Biome accent colours (terrain tiles):**
- Marshes: sickly yellow-green
- Forests: dark teal shadow
- Mountains: blue-grey frost
- Plains: pale straw

Terrain textures suggest layered origin — each biome is a fragment of another world that took root. Edges that don't quite match their neighbours. Flora belonging to two climates at once. Not post-apocalyptic ruin.

**Correction (2026-08-07):** the "flora belonging to two climates at once" ambition above was aspirational and is NOT what shipped in the two actually-migrated reference tiles (grassland, forest — see `terrainAtlas.js` continuousAtlas system). Both are single-biome, restrained, no mixed-climate motifs, and tile invisibly. Treat the shipped tiles as the real standard: individual terrain tiles stay neutral/restrained; convergence-weirdness belongs at atlas seams (hard cuts between transitionGroups) and rare landmark tiles, not saturating every biome's per-tile motifs. Full reasoning in [[terrain-atlas-taxonomy]].

**Monster portraits:**
- Voidborn: absence given shape — geometry that shouldn't cohere, edges bleeding into background, no face, no intent
- Beasts/humanoid enemies: naturalistic but wrong — out-of-place climate, wrong proportions, dimensional displacement visible
- No "desperate and hungry" humanoids as default

**Item rarity colour temperature:**
- Common: raw iron and worn leather
- Uncommon: faint blue-silver sheen
- Rare: cold violet edge-light
- Legendary: deep amber aura with visible heat distortion

**Portrait backgrounds (by culture, not race):**
- Kethara: pragmatic stone-and-timber settlements
- Verathi: biome edges where two ecologies meet
- Vethri: minimal open terrain near the Void boundary
- Delhari: structured interiors or transit camps
- Sirathi: sparse outposts that look newly built and already grieving

**Portrait expression rule:** Serious, watchful — never smiling.

**Why:** Canonical world design established in `docs/plans/2026-05-15-world-design.md`. The Verge is a living frontier, not a broken world. Visual tone must reinforce strangeness and stakes without grief-and-ruin aesthetics. The Void threat is physics, not apocalypse.

**How to apply:** All image generation prompts, any visual description in flavour text, and art-direction notes should conform to this palette, mood, and per-culture backgrounds.

Related: [[established-canon-nexus-verge-world]]
