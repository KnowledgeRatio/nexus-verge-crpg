---
name: project_race_origin_debate
description: Worldbuilder proposed replacing race with dimensional "origin" system; devil's advocate analysis of the trade-offs
metadata:
  type: project
---

Worldbuilder proposed replacing the 5 SRD races (human, elf, dwarf, halfling, dragonborn) with a dimensional "origin" system native to Nexus Verge's convergence premise.

**Why this came up:** Races were imported unchanged from D&D PHB; cultures (Verathi/Kethara/Vethri/Delhari/Sirathi) are doing the actual identity work, making race feel like a redundant layer.

**Key facts from code audit (2026-05-25):**
- `races.json` is 158 lines, 5 entries with full SRD traits
- Race used as plain object stored in `character.race` — no hardcoded race ID checks EXCEPT one: `Character.js` line 353 checks `this.race?.id === 'elf'` for Trance trait (long rest half-time)
- `NPCGenerator.js` lines 332-349: hardcoded if-else for 'human'/'elf'/'dwarf' race strings for NPC name generation — this is an ADR-010 violation that breaks if race IDs change
- `main.js` line 5967 renders `character.race.name` in character sheet — display only
- `CharacterCreation.js` line 924 labels the field "Culture:" not "Race:" — cosmetic divergence already in place

**What the debate revealed:** The actual cost of switching is low for the player-character path (pure data file swap) but NPCGenerator.js needs to be decoupled from hardcoded race IDs regardless. The `elf` Trance check in Character.js is the only logic branch on race ID.

**Recommendation captured:** Proceed with modifications — keep current mechanical layer (traits, ASI, speed), replace flavor frame, fix NPCGenerator race-ID coupling as prerequisite. Do NOT add "convergence-born" as a new origin type without a fully authored trait set.

**How to apply:** If a race system redesign is proposed, check NPCGenerator.js lines 332-349 first — that's the only structural blocker.
