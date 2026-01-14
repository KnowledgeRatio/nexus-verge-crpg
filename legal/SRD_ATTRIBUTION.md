# System Reference Document (SRD) Attribution

## D&D 5e System Reference Document 5.2.1

This work includes material taken from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/attachments/39j2li89/SRD_CC_v5.2.pdf. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

**Wizards of the Coast, Dungeons & Dragons, D&D, and their respective logos are trademarks of Wizards of the Coast LLC in the USA and other countries. © Wizards of the Coast LLC.**

---

## Creative Commons Attribution 4.0 International (CC BY 4.0)

This license allows you to:
- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material for any purpose, even commercially

Under the following terms:
- **Attribution** — You must give appropriate credit to Wizards of the Coast LLC, provide a link to the license, and indicate if changes were made

The full legal code is available at: https://creativecommons.org/licenses/by/4.0/legalcode

---

## What Content is Covered?

The following game content is derived from SRD 5.2.1:

### Core Rules
- Character creation (ability scores, races, classes, backgrounds)
- Combat mechanics (initiative, attack rolls, damage, saving throws)
- Skill system (18 skills, proficiency, advantage/disadvantage)
- Spellcasting rules and spell descriptions
- Equipment (weapons, armor, adventuring gear)
- Monster stat blocks and creature abilities
- Magic items and treasure

### Specific SRD Content Used
- **Races:** Human, Elf (High Elf), Dwarf (Hill Dwarf), Halfling (Lightfoot Halfling), Dragonborn
- **Classes:** Fighter, Wizard, Cleric, Rogue, Ranger (base class mechanics)
- **Monsters:** All creature stat blocks in `data/monsters.json`
- **Spells:** All spell descriptions in `data/spells.json`
- **Items:** Weapons, armor, and equipment in `data/items.json` and `data/magicItems.json`
- **Game Mechanics:** D&D 5e 2024 rules as defined in SRD 5.2.1

### Original Content (Not from SRD)
The following content is original and not derived from the SRD:
- **7 Fusion Callings** (Dedication, Scholar, Pact, Wanderlust, Bond, Oath, Instinct) - original class combinations
- **Streamlined 13-skill system** - derived from but modified from SRD's 18 skills
- **8 Weapon Masteries** - implementation from D&D 2024 rules (derived from SRD 5.2.1)
- **Procedural world generation** - entirely original algorithm
- **Quest system** - original quest templates and generation
- **Trading economy** - original CHA-based pricing system
- All code, UI, and implementation details

---

## Modifications Made

This project modifies SRD content in the following ways:
1. **Streamlined Skills:** Merged 18 D&D skills into 13 skills (e.g., History + Nature + Religion → Academia)
2. **Fusion Callings:** Combined traditional classes into 7 new "Calling" archetypes
3. **Game Balance:** Adjusted some values for roguelike gameplay (e.g., encounter rates, XP curves)
4. **Procedural Generation:** Applied SRD creatures/items to procedurally generated content

All modifications maintain compatibility with D&D 5e core mechanics and are clearly identified as homebrew content.

---

## References

- **SRD 5.2.1 Official Document:** https://www.dndbeyond.com/attachments/39j2li89/SRD_CC_v5.2.pdf
- **Creative Commons BY 4.0 License:** https://creativecommons.org/licenses/by/4.0/legalcode
- **Wizards of the Coast Official Site:** https://www.wizards.com/
- **D&D Beyond:** https://www.dndbeyond.com/

---

## Open Game License (OGL) Note

Prior versions of the D&D System Reference Document were released under the Open Game License v1.0a. SRD 5.2.1 supersedes those releases and is available under the Creative Commons Attribution 4.0 International License. This project uses SRD 5.2.1 exclusively and complies with CC BY 4.0 terms.

---

**Last Updated:** 2026-01-14
