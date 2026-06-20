---
name: canon-docs-audit-2026-06
description: Audit of data files against new docs/world/ canon (WORLD.md, PEOPLES.md, CREATURES.md, HISTORY.md) — findings and unfixed punch list
metadata:
  type: project
---

Audit run 2026-06-16 against the four new canon docs in `docs/world/` (WORLD.md, PEOPLES.md, CREATURES.md, HISTORY.md), which supersede and formalize [[established-canon-nexus-verge-world]]. Read-only audit — nothing was edited.

## Result summary

`data/monsters.json` Voidborn block (Void Trace/Spawn/Hunter/Shaper/Titan, lines ~3619-4128) is already fully canon-compliant — no emotional/intent language, correct physics framing, culture-specific Voidborn naming baked into flavor text per CREATURES.md's "Voidborn in Dialogue" table. No action needed there.

`data/campaigns.json` confirmed clean — `nexus-verge` entry already uses "Aevorn" nativeName and correct frontier/Void framing. No "Fracture" references anywhere in data files.

## Unfixed issues found (not yet corrected — flag if asked to do a fix pass)

1. **`data/quests.json` L1045** — `"Corrupted"` sits in the global `wordLists.creatureAdjectives` pool used to procedurally generate quest titles for ANY creature ("Corrupted Goblins Menace" etc.), untethered from the Void. CREATURES.md explicitly forbids calling ordinary creatures "corrupted" — that word is now reserved/poisoned vocabulary. Should be swapped for a neutral synonym.
2. **`data/quests.json` L49-152** (`campaign-stage-2/3/4`) — "Ancient Corruption" / "corrupted artifact" / "mastermind behind the corruption" in the `core`-tagged campaign chain. Low risk since core-tagged generic content, but will read as Void-adjacent once nexus-verge Void quests exist alongside it.
3. **`data/dialogueTemplates.json` L186, L725** — "the realm," "three kingdoms" — Aevorn has no kingdom/monarchy structure; this is a convergence dimension of settlements and factions. Two-string fix.

## Confirmed gaps (expected, not bugs)

- `data/dialogueTemplates.json` is entirely generic (organized by role/mood, not culture) — zero Verathi/Kethara/Vethri/Delhari/Sirathi/Vaethori voice anywhere. This is the single biggest narrative-text file with zero culture identity. Biggest lever for a future pass.
- No quest in `quests.json` references the Void, riftborn materials, or any of the six cultures yet — only the monster layer has Void content so far.
- `data/npcNames.json` gap already self-documented in PEOPLES.md (generic D&D race tables, not culture-based) — confirmed still true, not re-flagged as new.
- `data/items.json` / `data/magicItems.json` riftborn material references (Coldcast Bronze, Meridian Amber, Weftglass) are sparse but well-aligned where present — correct "impossible composite" framing, no generic magic-glow language. No Void/null-flux item content exists yet.

## Recommended next-pass order (per this audit)

1. Fix `creatureAdjectives` wordlist (5 min)
2. Fix "the realm"/"kingdoms" dialogue lines (5 min)
3. Culture-voice pass on dialogueTemplates.json (biggest gap, highest value)
4. Write nexus-verge-tagged Void-aware quests (rift-sealing, Sirathi refugee threads, Vaethori boundary garrisons)
5. Core-layer quest reskin — lowest priority, acceptable as generic foundation per the three-layer content model

Related: [[established-canon-nexus-verge-world]]
