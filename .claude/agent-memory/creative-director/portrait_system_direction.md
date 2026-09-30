---
name: portrait-system-direction
description: Direction for the BG-style portrait system — culture-keyed NPC pool with role tiers, why species is NOT an axis, and the pool-sizing logic behind the commission count
metadata:
  type: project
---

**Status: PROPOSED, delivered 2026-09-09.** Chief Designer approved the *system* (BG-style portraits on party screen, in combat, in NPC conversation); the sizing and structure below are my direction and not yet ratified.

**Structure: `pool[culture][roleTier][hash(npc.id) % size]`. Species is NOT an axis.**

**Why species is not an axis (the highest-cost decision here, and it went the cheap way):** procedural NPCs carry **no race field at all** — `NPCGenerator.generateNPC()` returns `{id, name, role, personality, culture, ...}` and `data/races.json` is loaded only as a *name-pool fallback* when culture data is absent. Canon agrees: `docs/world/PEOPLES.md:3` — the six cultures "are not races — each is multi-racial... defined by *when* someone arrived and *why* they stayed." A `[culture][species]` cross-product would be ~1000 assets for an axis nothing can key to.

**How to apply — the rule that replaces the species axis:** spend species variety *inside* each pool, never across a cross-product. A Kethara general pool of 16 should span human/dwarf/elf/halfling/dragonborn. This renders the multi-racial claim *more* visibly than a grid would, and it is the mechanism that stops culture calcifying into ethnicity.

**Borne, not inherited.** Culture is never identified by anything a person is born with — no features, skin, bone, hair colour, eye shape. Markers are worn, chosen, done to oneself, or done by circumstance. Worldbuilder's test: canon says Delhari become Kethara (`PEOPLES.md:60`); if a marker would survive that change of culture, it is inherited — cut it. Full per-culture marker table: `.claude/agent-memory/worldbuilder/portrait_culture_markers.md`.

**Role tiers (not all seven roles read in a bust):** guard / blacksmith / leader get their own art; merchant + innkeeper have only weak accessory signal and should draw from the general pool; patron + citizen have none by design and are the *largest* share. Four bands, not seven.

**Pool sizing is frequency-weighted, not uniform.** `data/cultures.json` `npcWeight`: kethara .45, vaethori .20, verathi/delhari/sirathi .10 each, vethri .05. Kethara appear 9x as often as Vethri; equal pools would be nine-tenths wasted on Vethri.

**The single biggest cost saver is code, not art: per-settlement de-duplication.** Excluding already-assigned pool entries within one settlement eliminates same-town duplicate faces at *any* pool size, which is where repetition actually hurts. Without it, pool sizes have to roughly triple. Direct this before commissioning anything.

**Vethri hard ban** (put in negative prompts, not just prose): glowing/luminous eyes, black or white sclera, absent pupils, void cracks, ash pallor, veining, scarification, thousand-yard stare. `PEOPLES.md:47` marks "Null-touched" as a **slur** — art must not render the slur. Vethri are the most *composed* people in the Verge, not the most damaged.

**Known style-guide bugs blocking this class:**
- `tools/image-gen/style-guide.md` `## Character Portraits` lists only **five** cultures — Vaethori is missing entirely. Predates this work.
- The global `## Negative Prompts` block carries terrain-motivated terms (`directional dramatic lighting`, `relief shading`, ...) and `buildNegativePrompt` applies it to portraits, directly contradicting that section's own "strong chiaroscuro." Was cosmetic when portraits were zero assets; now blocks the whole class.
- `generate.js:87` keys portraits off `races.json` — correct for the *player-character* surface, wrong as the NPC source. There is no culture axis in `generate.js` at all.

Related: [[player-sprite-direction]], [[unisex-player-figure-constraint]].
