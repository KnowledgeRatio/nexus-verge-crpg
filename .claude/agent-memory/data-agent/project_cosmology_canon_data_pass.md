---
name: cosmology-canon-data-pass
description: COSMOLOGY.md is binding canon for Source/Void text in data/*.json; what the writing rules forbid, which data files carry residual violations, and which arrays feed procedural name generation
metadata:
  type: project
---

`docs/world/COSMOLOGY.md` (authoritative as of 2026-09-08) governs every Source/Void string in `data/*.json`. A canon-compliance pass on `campaigns.json`, `dungeons.json`, `monsters.json`, `dialogueTemplates.json`, and `quests.json` was completed that date.

**Why:** the Void had accumulated appetite, a face, and a congregation across shipped data (a `cult` dungeon theme literally listed `"the Void"` beside `"Endless Hunger"` and `"the Faceless One"` as an object of worship). The canon position is that the Void has no intent, no target, and no worshippers, and the Source is not benevolent, not divine, and not a power supply — neither is the good one.

**How to apply** when touching any data string that mentions the Source or the Void:

- Grep-level red flags, all on COSMOLOGY.md's never-use list: `consumed`, `devoured`, `destroyed`, `erased`, `claimed`, `taken`, `swallowed`, `hungry`. Any of these with the Void as subject is a break.
- The Void never takes a verb with an object. Describe the *boundary* moving, or a condition applying — not the Void doing something to someone.
- Cosmological claims must be attributed as belief (Tier B), never narrated as fact (Tier A). Per-culture registers are fixed: **Delhari** say "the entropic boundary event" and are confidently, technically wrong; **Vethri** have exactly one word for the Void — *it* — and refuse to theorise (they have no scholars); **Kethara** treat it as weather; **Sirathi** carry the memory of lost regions. `data/monsters.json` `wraith` (~3129) is the reference-quality tonal model.
- Scale rule: encounter-scale Void reads as *reduction*; only regional scale reads as never-was. Never write a Voidborn attack as retroactive unmaking.
- "Source" is now a capitalised cosmic proper noun, so bare lowercase "the source of X" in quest text is a grep hazard even when not a contradiction.
- Six cultures, not five: Verathi, Vethri, Delhari, Kethara, Vaethori, Sirathi.

**Known residual violations, deliberately not fixed in that pass** (broader content questions, not pure canon breaks):
- `data/dungeons.json` `cult` theme `adjectives[]` still contains `"Void-Touched"`, which re-admits the Void into cult name generation through a different array than the one that was cleaned. Same theme's `adjectives[]`/`nouns[]` also carry corruption/holiness framing and a full church vocabulary (`Cathedral`, `Tabernacle`, `Reliquary`) in a setting with no church.
- `data/cultures.json` sirathi `etymology` uses "have been **consumed**" of the Void.
- `data/itemProperties.json` `voidwoven` grants a flat +2 damage, implying the Void is a power source — owned by `game-designer`.

**Structural note:** dungeon theme `adjectives`/`nouns`/`concepts` arrays are consumed generically by `rng.choice()` in `src/systems/WorldGenerator.js` (`{concept}` token substitution), so entries can be added or removed freely without ghost-reference risk — the only constraint is that the array stay non-empty.

Related: [[data-file-inventory]]
