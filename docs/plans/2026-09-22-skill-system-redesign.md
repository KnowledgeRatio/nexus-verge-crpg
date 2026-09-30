# Nine-Skill System Redesign

**Status:** Implemented and quantitatively validated; player-facing playtest remains (2026-09-22).

## Decision

Skills represent experience or excellence; attributes represent the underlying approach and capability applied to that skill. The core list is Athletics, Finesse, Survival, Craft, Lore, Investigation, Perception, Empathy, and Influence. Each has one primary and one secondary attribute, as locked in `.claude/rules/systems/skills.md`.

Players choose authored approaches. An approach can change the attribute, DC, consequences, and narrative outcome, but content cannot freely pair a skill with a third attribute. Arcana is folded into Lore, Deception into Influence, and Acrobatics/Sleight of Hand/Cunning into Finesse.

## Implementation

- `SkillRegistry` is the shared resolver and old-save migration boundary.
- Character creation, companions, saves, dialogue, settlements, quests, traps, terrain, and dungeon challenges use the canonical catalogue.
- Existing challenge content was migrated in place; no new scenarios were required for the first pass.
- Quest challenge IDs and per-stage skill objective progress now use the actual completed stage.

## Balance gate

`tools/balance-sim/skill-challenge-balance.js` exercises the live resolver across levels 1, 5, and 10 and reports content coverage, primary/secondary use, and success ranges. The initial pass found Craft underrepresented, so three existing blacksmith approaches were remapped, bringing Craft to four checks including one Prowess approach.

The 10,000-roll-per-cell validation found no invalid mappings. Across the three deliberately specialised build profiles, trained aggregate success was 51.4–56.9% at level 5 and 49.9–55.4% at level 10; expertise was 66.3–71.8% and 69.9–75.1% respectively. Per-skill level-5 trained ranges were 33.4–67.6%, with the extremes belonging to intentionally mismatched Athletics builds and low-DC Perception content. This is acceptable for build identity. Secondary-attribute coverage for Lore, Investigation, Perception, and Empathy remains a content-polish watch item, not a reason to expand the core list.
