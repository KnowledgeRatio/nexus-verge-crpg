# Resource System Redesign: Focus & Mana

**Date:** 2026-02-25
**Status:** Design Draft — Pending Implementation
**Participants:** Game Designer (Crawford persona) + Project Lead

---

## Summary

Redesign of the three calling resource systems to replace spell slots with a mana pool and rename Stamina to Focus, solving multiple ability dependency (MAD) problems and creating clean parallel power curves across all three callings.

---

## Key Decisions

### 1. Stamina → Focus (CON-based)

**Problem:** Stamina was WIS-based, but Dedication has no other use for WIS. This created a MAD tax — STR/DEX Dedication builds had to invest in a third stat (WIS) just for their resource pool, while Scholar only needed INT.

**Solution:** Rename Stamina to Focus. Change ability dependency from WIS to CON.

**Rationale:**
- Every Dedication build already wants CON (d10 hit die, frontline role)
- CON is the most underloaded ability score in 5e (only HP + CON saves)
- Thematic fit: physical endurance/resilience fueling martial techniques
- Eliminates the three-stat problem for Dedication

**Scaling:** `Focus = CON mod + (level - 2)` starting at level 2. Linear, every level feels like a gain.

### 2. Spell Slots → Mana

**Problem:** Spell slots are designed for tabletop session pacing. In a roguelike where the player controls encounter frequency, slots create binary "full power / completely empty" states with no granularity.

**Solution:** Replace spell slots with a mana pool based on D&D 5e Spell Points variant (DMG p.288).

**Mana Costs:**
| Spell Level | Mana Cost |
|-------------|-----------|
| Cantrip     | 0 (free)  |
| 1st         | 2         |
| 2nd         | 3         |
| 3rd         | 5         |

**Rationale:**
- Pool-based casting gives granular resource decisions (cast 1×3rd or 2×1st?)
- Better roguelike fit — every mana point spent is a meaningful choice
- Precedent in official D&D 5e (DMG Spell Points variant)
- Cleaner UI than tracking individual slot levels

### 3. CON-based Focus Makes All Callings Clean Two-Stat Builds

| Calling     | Primary (offense)   | Secondary (defense + resource) |
|-------------|---------------------|-------------------------------|
| Dedication  | STR or DEX          | CON (HP + Focus pool)         |
| Scholar     | INT (mana + spells) | CON (HP)                      |
| Wanderlust  | DEX (attacks + SA)  | CHA (mana + inspiration)      |

No calling requires more than two ability scores to function. This is the cleanest balance state and lets players focus on build identity rather than stat tax.

---

## Resource Recharge Economy

| Resource | Recharge | Character |
|----------|----------|-----------|
| Focus    | **Full on short rest** | Dedication |
| Mana (Scholar) | **Full on long rest**, partial on SR via Arcane Recovery | Scholar |
| Mana (Wanderlust) | **Full on long rest**, no SR recovery (Bardic Inspiration is separate SR resource) | Wanderlust |

**Core tension:** Focus is per-encounter renewable (high floor, low ceiling). Mana is per-adventure-day finite (high ceiling, decaying floor). Dedication always has gas. Scholar is a battery that drains.

---

## Level 5 Power Budget Comparison

| Metric | Dedication | Scholar | Wanderlust |
|--------|-----------|---------|-----------|
| Free DPR | 2× weapon (~17) | Cantrip (~8-10) | Weapon + 3d6 SA (~17.5) |
| Resource DPR | Flurry +2d6 (~7, 1 Focus) | 3rd-level spell (~24, 5 mana) | 2nd-level spell (~14, 3 mana) |
| Nova Round | Action Surge (~34) | Big spell (~28) | Hold Person + crit SA (~28) |
| Encounters before dry | Never | ~4-5 | Never (SA free) |

---

## Focus Scaling Table (Dedication)

| Level | Focus Points | Key Unlocks |
|-------|-------------|-------------|
| 1     | —           | Steady Nerve (1/SR, free) |
| 2     | CON mod     | Flurry of Blows (1), Patient Defense (1), Step of the Wind (1) |
| 3     | CON mod + 1 | Deflect Missiles (1 to throw back) |
| 4     | CON mod + 2 | ASI |
| 5     | CON mod + 3 | Stunning Strike (1), Extra Attack |
| 6–10  | CON mod + (lvl-2) | Specialization features, capstone |

Typical CON 14 (+2) at start, 16 (+3) after ASI. Pool ranges ~2 at level 2 to ~11 at level 10.

## Mana Scaling Table (Scholar)

| Level | Max Mana | Arcane Recovery (1/day on SR) | Spells Prepared |
|-------|----------|-------------------------------|----------------|
| 1     | 4        | +2 mana                       | INT mod + 1    |
| 2     | 6        | +3 mana                       | INT mod + 2    |
| 3     | 10       | +4 mana                       | INT mod + 3    |
| 4     | 13       | +5 mana                       | INT mod + 4    |
| 5     | 17       | +6 mana                       | INT mod + 5    |
| 6–10  | 20–35    | +7 to +11 mana                | INT mod + lvl  |

## Mana Scaling Table (Wanderlust)

| Level | Max Mana | Sneak Attack | Bardic Insp. (CHA mod/SR) |
|-------|----------|-------------|---------------------------|
| 1     | —        | 1d6         | d6, CHA mod/SR            |
| 2     | 4        | 1d6         | d6                        |
| 3     | 6        | 2d6         | d6                        |
| 4     | 6        | 2d6         | d6                        |
| 5     | 10       | 3d6         | d8                        |
| 6–10  | 12–19    | 3d6–5d6     | d8–d10                    |

---

## Open Questions

1. **3rd-level spell cap?** Should Scholar be limited to N casts of 3rd-level per long rest to prevent front-loading all mana into big spells?
2. **Wanderlust SR mana recovery?** Should Song of Rest grant ~2 mana on short rest as a unique mechanic?
3. **Infusions:** Keep as separate resource track (pre-combat prep) or convert to mana cost?
4. **Focus rename in data:** `classes.json` currently uses `"type": "stamina"` — needs update to `"type": "focus"`.

---

## Implementation Impact

**Files requiring changes:**
- `data/classes.json` — Resource system fields (stamina → focus, spell slots → mana pools)
- `data/abilities.json` — All `resourceType: "stamina"` → `"focus"`, cost references
- `src/core/rulesEngine.js` — Add focus/mana configuration, remove spell slot tables
- `src/systems/Character.js` — Resource pool calculations, CON-based Focus
- `src/systems/CombatManager.js` — Ability cost deduction, mana spending on cast
- `src/main.js` — HUD resource display, casting UI

**Does NOT affect:** Save/load (resource values serialize the same), combat flow (actions still cost resources), rest system (recharge logic stays, just different pools).
