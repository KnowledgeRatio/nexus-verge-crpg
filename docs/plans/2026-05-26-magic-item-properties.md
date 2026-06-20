# Magic Item Properties System

**Date:** 2026-05-26  
**Status:** Approved — implementing

## Problem

- Magic item properties today are static strings with no mechanical weight
- Rarity is implicit (which loot table you land on), not computed
- Quest difficulty multiplies XP/gold but has zero effect on item quality
- Forgecraft modifications are defined inline in `practices.json` — no shared property catalog

## Design

### Rarity → item shape (deterministic)

| Rarity | +n Bonus | Properties | Note |
|--------|----------|-----------|------|
| common | +1 **or** 1 property | exclusive | coin flip at generation |
| uncommon | +1 | 1 | |
| rare | +2 | 2 | |
| veryRare | +3 | 3 | |
| legendary | +3 | 3 + legendary ability | hand-authored |

### Quality score → rarity

```
qualityScore = d6 + levelBonus + encounterBonus + questBonus
```

**Level bonus:** 1–3 → +0, 4–6 → +1, 7–9 → +2, 10 → +3  
**Encounter bonus:** easy -1, normal 0, hard +1, deadly +2, boss in encounter +1  
**Encounter difficulty** computed from avgCR − playerLevel delta (thresholds in RULES)  
**Quest bonus:** tier 1 → 0, tier 2 → +1, tier 3 → +2

Score → rarity: 1–2 common, 3–4 uncommon, 5–6 rare, 7–8 veryRare, 9+ legendary

All thresholds live in `RULES.magicItems` in `rulesEngine.js`.

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
