# Iconography implementation and validation

**Implemented locally — 2026-10-24.** The sponsor-approved Study 01 v2 direction now has a shared semantic vector catalogue, DOM SVG/canvas rendering, legacy-condition read compatibility and generated exports. No commit or deployment is implied, and sponsor approval of the twenty-sample direction does not approve every expanded glyph.

## Delivered scope

- [Library and authoring contract](../art/iconography/README.md): 119 exported SVG entries including aliases, generated catalogue and actual-size gallery.
- Semantic presentation references replace glyphs in authored data and condition producers; dialogue, headings and log prose lose decorative emoji. Terrain uses `symbol`; other supported content uses `icon`.
- Shared DOM and canvas geometry serves menus, character creation, settlement UI, maps, dungeon objects, item fallbacks and condition displays. The settlement study hydrates copied static slots.
- A truthy condition icon is required before type/alias resolution. Hidden null/empty/undefined/false records stay hidden. Supported legacy glyphs resolve without rewriting saved mechanical payloads. Injury is not added as a condition.

## Validation evidence

| Check | Result |
| --- | --- |
| `npm test -- --maxWorkers=2 --testTimeout=180000` | 1,735 tests passed across 159 files. |
| `npm run build:web` | Passed: 357 app files, 107 media files, approximately 151.86 MiB. |
| `npm run lint` | Fails on reported baseline: 170 errors, 1,256 warnings. |
| `npm run lint:all` | Fails on reported baseline: 3,246 errors, 2,501 warnings. |
| Focused lint | Final `eslint --quiet` over shared icon modules, icon test, generator and CombatScene passed; altered existing main/system files were compared against HEAD with no new lint errors reported. |
| Source and whitespace checks | Runtime/content pictographic scan retained only legal copyright marks; whitespace check passed. |
| Agent guidance | All 15 skill-parity tests passed; backend skill mirrors are byte-identical. Skill metadata validator could not run because Python `yaml` is unavailable; metadata was unchanged. |

The initial suite run with a 60-second timeout failed four animation cases and obsolete emoji assertions. The assertions were updated for the new presentation, and the final run above passed with the larger timeout. This does not represent a gameplay mechanic change. The final test log was retained at `/tmp/nv-icon-tests-final.log` during the task; it is not a durable repository artifact.

[Browser results](../art/iconography/validation/results.json) and [interaction results](../art/iconography/validation/interaction-results.json), with screenshots in the same directory, record desktop 1440×1000 and mobile 390×844 checks. Coverage includes real preset character creation, inventory/world-map/save surfaces and nonblank canvas rendering for all 119 entries. Controlled Character/Combatant fixtures at levels 1, 5 and 10 verify serialized/restored legacy glyphs remain unchanged, hidden conditions stay absent, and visible condition names and turns remain readable. No browser errors were recorded.

The settlement study exposed Chat, Rest and Goodbye without emoji, with real touch context and keyboard Goodbye activation. A controlled DOM fixture exercised production `CombatScene.updateActorState` and condition-detail expansion through touch and Enter. Browser runner scripts were ephemeral; the checked-in results are evidence, not a claim of a repository replay command.

## Limits and follow-up review

These checks do not establish full 3D combat gameplay acceptance, played balance at levels 1/5/10, every missing-art/legacy-save permutation, or exhaustive screen-reader coverage. Source scans do not sanitize arbitrary player/imported text. Review the expanded drawings in context, particularly Attack/Weapons, Supplies/Gold/Inventory, Dodge versus movement, and the revised Save/Settings/Success/Warning meanings. Existing repository lint failures remain outstanding.
