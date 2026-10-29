# Iconography library

**Implemented locally — 2026-10-24.** The shared vector library follows the sponsor-approved [Study 01 v2 direction](study-01/README.md). Tests, build and scoped browser checks are complete; approval of the concept does not imply sponsor acceptance of every vector drawing. Nothing is committed or deployed by this work.

[Browse the size gallery](library.html) · [Export catalogue](../../../data/icons/catalogue.json) · [Audit and acceptance requirements](../interface-symbol-direction.md)

## Authoring and exports

[`src/ui/iconCatalogue.js`](../../../src/ui/iconCatalogue.js) owns declarative path geometry, labels and aliases. Masters use a 32-unit square. Add or revise shared semantic entries here, not separate SVG strings in individual screens. IDs describe meaning, such as `condition.prone`, `navigation.journal` and `map.settlement`; they do not introduce mechanics. Injury is excluded from the condition family.

Run `node scripts/generate-icons.mjs` from the repository root after catalogue changes. It exports 119 individual SVGs, including alias entries, plus `data/icons/catalogue.json` and the gallery. The count includes aliases, not 119 distinct drawings. Each catalogue entry supplies `label`, `file` and `master`. Generated files should not be edited independently. The web build includes `data/icons` SVG and JSON files.

The gallery displays actual CSS sizes of 16, 24, 32 and 48 pixels. Its existence provides a review surface, not proof that every icon is readable or accessible in the game.

## Runtime contract

[`src/ui/Iconography.js`](../../../src/ui/Iconography.js) resolves catalogue IDs and aliases, generates DOM SVG with `currentColor`, and draws cached `Path2D` geometry on canvas. `iconMarkup(id, { label })` supplies an accessible image name when a label is provided; otherwise the SVG is decorative and hidden from assistive technology. The surrounding control must retain its name and interaction semantics. `hydrateIcons` renders elements carrying `data-icon`.

`conditionIconId` requires a truthy stored `icon` before resolving artwork: null, empty, undefined and false remain hidden even for known types. For visible conditions, a known condition type resolves before the stored icon, with aliases canonicalized. Unknown types with an unrecognized icon receive the generic beneficial/harmful condition mark. The legacy code-point lookup is a read boundary: it renders supported saved glyphs without rewriting saved conditions or their mechanical payloads. Logs and descriptions remain prose, not SVG or raw semantic IDs. The settlement study also hydrates copied static icon slots.

Settlement and Dungeon marks identify locations on overworld/world views and legends; Chest and Altar identify objects; Trade and Rest identify services. Equipment symbols are category/fallback marks alongside painted item art. Decorative dialogue prefixes and headings do not need replacement symbols.

## Validation status

All 1,735 tests across 159 files pass; the web build passes. Browser checks cover all 119 symbols on canvas, desktop/mobile creation, inventory, map and save surfaces, controlled level 1/5/10 restored conditions, keyboard and touch interactions. Repository-wide lint remains failing on baseline findings; scoped iconography lint passes. See the [validation report](../../reports/2026-10-24-iconography.md) for commands, evidence and limits.

Sponsor review of every expanded glyph and full 3D gameplay acceptance remain separate. Contextual visual checks should continue to distinguish Attack/Weapons, Supplies/Gold/Inventory, Dodge from movement, and revised Save/Settings/Success/Warning meanings. A source scan alone does not establish every player flow or arbitrary imported text is emoji-free.
