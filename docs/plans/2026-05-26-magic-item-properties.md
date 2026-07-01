# Magic Item Properties System

**Date:** 2026-05-26 (retiered 2026-07-01)  
**Status:** Implemented

## Problem

- Magic item properties today are static strings with no mechanical weight
- Rarity is implicit (which loot table you land on), not computed
- Quest difficulty multiplies XP/gold but has zero effect on item quality
- Forgecraft modifications are defined inline in `practices.json` — no shared property catalog

## Design

### Rarity → item shape (deterministic) — retiered 2026-07-01

Original tiers used SRD names (common/uncommon/rare/veryRare/legendary) 1:1. Retiered per design conversation: `common` is now strictly non-magic (0/0), the SRD names below it are replaced with in-world tier names, and a new top tier (`mythic`) was added above the old `legendary`. `variants` = randomly choose one of the listed `{bonus, propertyCount}` pairs — this is a real coin-flip at generation time (`rng`-driven), not keyed off which item template happened to get picked.

| Rarity | +n Bonus | Properties | Note |
|--------|----------|-----------|------|
| common | +0 | 0 | not magic at all |
| fine | +1 **or** +0 | 0 **or** 1 | `variants`, exclusive (coin flip) |
| great | +1 | 1 | both together |
| heroic | +2 | 2 | both together |
| legendary | +2 **or** +3 | 3 **or** 2 | `variants` — inverse pairing, same total budget |
| mythic | +3 | 3 | can additionally roll properties gated `minRarity: "mythic"` in `itemProperties.json` |

True named uniques (Vorpal Sword, Armor of Invulnerability) stay hand-authored in `magicItems.json`'s `legendary` category, outside this generic table — unaffected by the retier.

### Quality score → rarity

```
qualityScore = d6 + levelBonus + encounterBonus + questBonus
```

**Level bonus:** 1–3 → +0, 4–6 → +1, 7–9 → +2, 10 → +3  
**Encounter bonus:** easy -1, normal 0, hard +1, deadly +2, boss in encounter +1  
**Encounter difficulty** computed from avgCR − playerLevel delta (thresholds in RULES)  
**Quest bonus:** tier 1 → 0, tier 2 → +1, tier 3 → +2

Score → rarity: ≤2 common, 3–4 fine, 5–6 great, 7–8 heroic, 9–10 legendary, 11+ mythic

All thresholds live in `RULES.magicItems` in `rulesEngine.js`.

### Generic bonus assignment (fixed 2026-07-01)

`LootManager.applyMagicProperties()` previously only added rolled properties on top of whatever `bonus` the selected item template already carried statically (from `magicItems.json`'s `-plus-1/2/3` entries) — two independently-random axes that could disagree (e.g. a `+1` template could roll 3 properties, or a `+3` template could roll 0). Fixed: the function now **overwrites `item.bonus`** from the same rarity roll that determines `propertyCount`, so one roll governs both. Only applies to `weapon`/`armor`/`shield` types; no-op otherwise. This only affects the procedural generation path (combat/quest loot) — merchant-purchased items never pass through this function and keep their static template bonus.

**Known follow-up, not done today:** the original 2026-05-26 plan called for removing the now largely-redundant generic `-plus-1/2/3` entries from `magicItems.json` once generation went fully generic. That cleanup didn't happen then and still hasn't — those 34 entries still exist and are still what the loot tables reference for item-template variety (which weapon/armor shape drops), they just no longer supply the actual mechanical bonus. Revisit if that duplication becomes a maintenance problem.

### Property catalog — `data/itemProperties.json` (new)

Single source of truth for all magic properties. Each entry:

```json
{
  "id": "keen",
  "name": "Keen",
  "appliesTo": ["weapon"],
  "effect": { "type": "modifyWeapon", "property": "critRange", "value": [19, 20] },
  "droppable": true,
  "forgecraftEligible": true,
  "weight": 1.0,
  "description": "..."
}
```

- `droppable` — can appear on naturally dropped items
- `forgecraftEligible` — shows up in forgecraft menu
- `weight` — relative selection probability (default 1.0)
- Both flags independent

Seeded from the 9 existing forgecraft modifications (armor/shield/weapon).

### Forgecraft wipe behavior

When forgecraft modifies a magic item:
- All `properties[]` wiped
- `bonus` preserved
- 1 new forgecraft-eligible property applied (filtered by item type)
- `forgecraftModified: true` flag set on item

### Generation flow (procedural)

LootManager generates magic items on the fly:  
`baseItem (items.json) + bonus + properties[]`

Named/legendary items remain hand-authored in `magicItems.json`. Generic +1/+2/+3 items are removed from that file.

## File change map

| File | Change | What |
|------|--------|------|
| `data/itemProperties.json` | New | Canonical property catalog |
| `data/magicItems.json` | Trim | Remove generic +1/+2/+3; keep named/legendary |
| `data/practices.json` | Update | Forgecraft mods reference property IDs |
| `src/core/rulesEngine.js` | Add | `RULES.magicItems` block |
| `src/systems/LootManager.js` | Rework | `generateMagicItem()`, `computeQualityScore()`, weighted property selection |
| `src/systems/CombatManager.js` | Add | CR delta → encounter bonus → LootManager |
| `src/systems/QuestManager.js` | Add | Quest tier → quest bonus → LootManager |
