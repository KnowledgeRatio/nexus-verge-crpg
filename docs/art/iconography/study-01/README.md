# Iconography study 01

**Status: Approved visual direction — 2026-10-24.** The sponsor approved revised Study 01 v2 and its intended location, object and service usage. Twenty raster samples across ten families establish direction; they remain concept artifacts. A [separate vector library and runtime integration](../README.md) are implemented locally with tests, build and scoped browser validation complete; this does not extend sponsor approval to every expanded glyph.

[Approved revision 2](contact-sheet-v2.png) · [Original sheet](contact-sheet.png) · [Original prompt](prompt.txt) · [Symbol direction and migration proposal](../../interface-symbol-direction.md)

Generated on 2026-10-24 with the built-in `image_gen` tool. The sheet explores ivory ink silhouettes on charcoal, with consistent weight and open negative space alongside the [approved visual direction](../../visual-direction.md). Equipment samples are category marks; they do not replace painted item art. Service symbols do not imply decorative prefixes should return to dialogue choices.

## Proposed semantic catalogue

These identifiers describe the study's intended meanings and are represented in the shared runtime catalogue.

| Family | First sample | Second sample |
| --- | --- | --- |
| Navigation | Journal — `navigation.journal` | Inventory — `navigation.inventory` |
| Conditions | Bleeding — `condition.bleeding` | Prone — `condition.prone` |
| Combat actions | Attack — `action.attack` | Dodge — `action.dodge` |
| Resources | Supplies — `resource.supplies` | Gold — `resource.gold` |
| Equipment | Weapons — `equipment.weapons` | Armour — `equipment.armour` |
| Map markers | Settlement — `map.settlement` | Dungeon — `map.dungeon` |
| Dungeon objects | Chest — `object.chest` | Altar — `object.altar` |
| Services | Trade — `service.trade` | Rest — `service.rest` |
| Outcomes | Success — `outcome.success` | Warning — `outcome.warning` |
| System | Save — `system.save` | Settings — `system.settings` |

## Review evidence and implementation validation

The generating agent's visual review found all twenty labelled samples present. Small repeats are illustrative, not actual pixel-size tests. Before production:

- Weapons is diagonal despite the prompt requesting horizontal; distinguish it more clearly from Attack.
- The original Save could read as Download; revision 2 replaces this motif.
- Dodge could imply movement; preserve the game's non-grid meaning.
- Supplies resembles a coin bag; distinguish provisions from Gold and Inventory.

Individual vector assets now derive from the approved direction with semantic IDs. Validate at actual display sizes, on game backgrounds, with visible labels, accessible names, keyboard/touch interaction and colour-independent state recognition. Direction approval does not establish small-size, accessibility, browser-flow or production asset validation.

## Revision 2 — 2026-10-24

The sponsor likes the overall direction but identified Save, Settings, Success and Warning as off-theme. [Revision 2 sheet](contact-sheet-v2.png) ([exact edit prompt](prompt-v2.txt)) was generated with built-in `image_gen`; the original is retained. Save now uses an open book and quill; Settings uses a crossed mallet and wrench; Success uses an impressed seal with ribbon tails; Warning uses a fractured marker stone with alarm rays.

The generating agent reports the other sixteen motifs visually retained, without claiming pixel identity. The sponsor approved this revision on 2026-10-24. Implementation validation must still check whether the tools suggest crafting, the warning suggests damaged stone, or the seal's intended success meaning is unclear in context. These sheets remain raster concepts; the separate library records vector and integration status.

Approved usage: Settlement and Dungeon identify locations on the overworld/world overview and matching legends, with optional location-type indicators. Chest and Altar identify objects; Trade and Rest identify services. This records intended usage, not completed map or UI integration.
