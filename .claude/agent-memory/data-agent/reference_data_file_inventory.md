---
name: reference-data-file-inventory
description: Where ability-score-like fields live across data/*.json, and pre-existing schema drift found while surveying them (as of 2026-07-29)
metadata:
  type: reference
---

Notes from surveying every `data/*.json` file for ability-score references (STR/DEX/CON/INT/WIS/CHA). Useful as a starting map for any future full-repo data survey, not just the attribute rework. Re-verify before relying on specifics — this is a snapshot.

**Full six-key ability blocks** (`{str,dex,con,int,wis,cha}`): `monsters.json` (`abilities` object, 46 monsters), `kits.json` (one preset, `dedication.knight.preset.abilities`), `races.json` (`abilityScoreIncrease`, partial keys per race), `practices.json` (`scoreChoices` array on the "meal" practice effect).

**Pre-existing schema drift for the same underlying concept (DEX-affects-AC):** `items.json`/`magicItems.json` use a boolean `addDexModifier` + separate `maxDexBonus` fields on armor; `merchantInventory.json` independently re-declares armor with a *string enum* `dexModifier: "full"|"none"` instead — two different field names/formats for the same mechanic, already inconsistent before any rename. Any change to how DEX (or its successor) affects AC needs to touch both representations.

**`weaponMasteries.json`** uses uppercase full-word abbreviations for saves (`"savingThrow": "STR"`, `"CON"`) — different casing/format convention from `monsters.json`'s lowercase `savingThrows: {wis: 0}` object and `classes.json`'s lowercase `savingThrowProficiencies: ["str","con"]` array. Three different shapes for "which save" across the codebase: uppercase scalar, lowercase object-with-bonus, lowercase array-of-proficiencies.

**`skills.json`** — 13 core skills + 4 campaign-specific skills (`nautical`, `dark-sun`), each with a single `"ability"` field (lowercase 2-3 letter code) AND a prose `description` that names the ability inline (e.g. "Your Wisdom (Empathy) check..."). Renaming the `ability` field without touching the description text creates a mismatch between structured data and narrative text — description edits are `worldbuilder` territory, not `data-agent`'s to fix silently.

**Confirmed clean (no ability-score fields at all):** `dungeonRooms.json`, `dungeonTypes.json`, `dungeons.json`, `npcNames.json`, `relations.json`, `mythicEpithets.json`, `quests.json`, `campaigns.json`, `cultures.json`, `companions.json`, `dialogueTemplates.json`, `skillChallenges.json` (references skills by ID only, per rule — good example of the rule being followed correctly), `spells.json`, `specializations.json`, `itemProperties.json`.

**`.json.example` files** (`abilities.json.example`, `traits.json.example`, `spells.json.example`, `specializations.json.example`, `classResources.json.example`) are unused schema/template references — confirmed not loaded by any code in `src/` via grep. Low priority for any data-wide rename sweep.
