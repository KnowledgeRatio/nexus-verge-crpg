# Interface symbols: emoji audit and redesign proposal

**Status: Visual direction approved; implemented locally — 2026-10-24.** The sponsor requested eliminating emojis throughout the game and approved [Study 01 v2](iconography/study-01/README.md) and its intended location, object and service usage. The [shared vector library](iconography/README.md), DOM/canvas rendering and semantic icon migration are implemented locally. Tests, build and scoped browser validation are complete; see the [evidence and limitations](../reports/2026-10-24-iconography.md). No deployment, sponsor approval of every expanded glyph or full 3D gameplay acceptance is claimed. The audit and exploratory motifs below retain their original context.

This artifact supports creative review and implementation scoping. It is not a replacement roadmap; GitHub remains the active product backlog. [Visual direction](visual-direction.md) remains the authority for approved painted portraits, item art, illustrated interiors and field-atlas terrain. The original audit changed no production behavior; the linked library records subsequent implementation separately.

## Evidence and coverage

A source scan of `src/`, `data/`, `index.html` and `styles.css` found **921 lines matching Unicode Extended_Pictographic across 40 files**, followed by targeted inspection of renderers and consumers. This is a candidate-line count, not an emoji count or a count of visible controls. It includes console output, comments, example data, copyright marks and ordinary text symbols. Several glyphs can occur on one line, and a single source can populate many screens. The CSS inspection found arrow pseudo-content, with no emoji identified there.

The inventory below records representative source locations as of the audit date. Line numbers will drift. Static source inspection establishes authored uses and rendering paths; it does not establish that every branch was reached in a browser. Escaped Unicode, CSS-generated content, imported content and baked image text require an additional implementation-time sweep. Ordinary punctuation, mathematical operators and legal copyright text must not be removed by a blanket character-range replacement.

| Surface | Source evidence | Proposed treatment |
| --- | --- | --- |
| Dialogue choices | `src/ui/SettlementUI.js:649`, `:669`, `:680`, `:689`, `:700`, `:710`, `:724` prepend pictographs to Chat, work, trade, rest, skills, dangers and Goodbye | Remove decorative prefixes. Let dialogue text, spacing, focus and hover states carry the choice. Reserve a symbol for a real mechanical annotation. |
| Quest acceptance and turn-in | `src/ui/SettlementUI.js:1180`, `:1285`, `:1288`; objective checkbox at `:1036` | Text buttons; drawn completion indicator beside explicit objective state. |
| Quick menu and headings | `index.html:1229` through `:1270`; sections at `:174`, `:308`, `:340`, `:820`, `:1079` | Remove pictographs from headings. Use a small shared symbol family where recurring navigation benefits from recognition, with visible labels. |
| HUD and resources | `index.html:97`, `:103`, `:112`; rest supplies and exhaustion at `src/systems/RestManager.js:483`, `:488` | Draw Resolve/supply symbols only where useful; retain resource name, value, warning and consequence in text. |
| Combat condition displays | `src/main.js:1531`, `:1594`; `src/rendering/CombatScene.js:447`, `:461` | Shared condition symbols with readable names, values and duration where available; cover both combat presentations. |
| Condition producers | `data/abilities.json:99`, `:145`, `:259`, `:350`; `data/monsters.json:4085`; `src/core/rulesEngine.js:123`; `src/systems/EffectDispatcher.js:662`, `:739`, `:1065` | Semantic symbol references resolved through a shared presentation catalogue; preserve generic effect definitions and rules. |
| Floating feedback and combat log | `src/systems/EffectDispatcher.js:835`, `:887`, `:944`; `src/systems/CombatManager.js:369`, `:904`, `:956`, `:1284` | Remove emoji from sentence strings. Prefer concise words and numbers; optional category symbols belong in the renderer, outside prose. |
| Exploration and event log | `src/systems/Player.js:397`, `:415`, `:684`, `:1502`; `src/systems/DungeonManager.js:174`, `:177`, `:546` | Plain event prose, with restrained severity treatment and explicit result words. |
| Settlement trouble and difficulty | `src/ui/SettlementUI.js:1401`, `:1431`, `:1439` | Explicit difficulty labels instead of repeated stars; drawn trouble symbols paired with names and consequences. |
| Inventory and trade | `index.html:628`, `:644`; item-type fallbacks at `src/ui/SettlementUI.js:2240`; weight at `:1730` | Approved oil-painted item art where available; neutral drawn category fallback plus item name when absent. Weight becomes a value and unit. |
| Character traits | `data/traits.json:24`, `:52`, `:216`; `src/ui/CharacterCreation.js:645` | Reuse semantic equipment/action symbols where meaningful. Avoid creating an unrelated decorative badge for every trait. |
| Overworld and terrain fallback | `data/terrains.json:191`, `:287`, `:417`; `src/rendering/MapRenderer.js:870`, `:899`; canvas `fillText` at `:442` | Draw map marks compatible with the field atlas. Retain existing terrain paintings; provide deliberate low-detail marks when image rendering is unavailable. |
| Dungeon furnishings and minimap | `src/ui/DungeonUI.js:293` through `:305`, `:491`, `:504` | Simple plan-view symbols with a matching legend; preserve object distinctions and boss/entrance information. |
| Save, backup and outcomes | `src/main.js:7945`, `:7981`, `:7999`, `:9241`, `:9306`; `index.html:992`, `:1012` | Label destructive actions explicitly; restrained success/failure symbols if needed, plain Victory/Game Over titles. |
| Manual, settings and legal UI | `index.html:827`, `:1085`, `:1113`, `:1292`, `:1312`, `:1391`, `:1561` | Remove decoration while preserving controls, warnings, attribution wording and legal marks. |
| Developer output and authoring examples | `src/utils/helpers.js:351`; `src/systems/SaveManager.js:60`; `data/spells.json.example:50`, `data/traits.json.example:26` | Plain severity/context text in logs; update example schema values so future content does not reintroduce emoji. These are distinct from visible-game acceptance. |

## Proposed visual language

Use a restrained family of drawn ink or engraved symbols: clear silhouettes, open negative space, consistent optical weight and a limited number of interior strokes. They should resemble practical marks in a traveller's field atlas and sit quietly beside the approved painted artwork. Test a clean silhouette first; texture is optional at larger sizes and must not destroy recognition at small sizes.

Start with monochrome marks using the surrounding text colour. Use a second colour only for an established state distinction, always reinforced by shape or words. Avoid miniature ornamental runes, glowing fantasy filigree, multicolour sticker styling and a different illustration style for each button. Merely forcing emoji into monochrome text presentation would not satisfy this direction.

Use scalable SVG artwork for interface marks, with authored geometry suitable for the smallest actual display size. Proposed reference sizes are 16, 20, 24 and 32 CSS pixels; validate against actual layouts before treating those as a production specification. Symbols may need optical simplification at the smallest size. The interaction target should remain comfortably larger than the drawing.

Three treatments are sufficient:

1. **Remove:** dialogue prefixes, decorative section headings, celebratory punctuation, log sentence ornaments and redundant button embellishment.
2. **Draw:** conditions, navigation, resource indicators, map landmarks, objective states and compact mechanical annotations that provide useful information.
3. **Use painted art:** actual items, characters and creatures follow the approved oil-painted direction. Symbols serve compact mechanics or missing-art fallbacks; they do not replace the portrait/item-art programme. Approved coverage intent is not proof that those assets exist.

## First motifs to compare

These are proposed visual metaphors, not new condition definitions. Existing names and mechanics remain authoritative. The designer should compare potentially confusable marks together before selecting final drawings.

| Meaning | Proposed motif | Distinction to preserve |
| --- | --- | --- |
| Prone | A simplified horizontal figure above a ground line | Different from a sleeping or dead character; keep the Prone label. |
| Frightened | An open eye beneath three outward alarm strokes | Distinct from ordinary perception and from the settlement suspicion mark. |
| Taunted | A profile facing an inward-pointing challenge notch | Do not use the same angry-face metaphor for every debuff. |
| Bleeding | One tapered drop with a short cut mark | Represents ongoing blood damage; show pending damage information separately. |
| Dodging | A bent arrow passing around a small figure | No suggestion of grid distance or a movement resource. |
| Temporary HP | A shield outline with a separate outer rim | Distinct from armour class; include the value and Temporary HP wording. |
| Sapped | A lowered weapon with a short broken force line | Distinct from disarmed; no implication that equipment has been removed. |
| Inspired | A small upward flame above an open arc | Distinct from fire damage and Resolve; revise if small-size comparison fails. |
| Pushed | A body silhouette offset by one broad directional stroke | Represents the existing non-grid effect, not a new distance mechanic. |
| Exhaustion | A bowed shoulder beneath a descending bar | Keep severity/level readable as text or a number. |
| Map settlement | A roofline above a short enclosing wall | Hostile and rebuilding states need separate state markers and legend text. |
| Supplies | A tied provision bundle in silhouette | Distinct from the inventory/navigation container. |
| Journal | A folded sheet with one ruled line | Distinct from an individual quest-state marker. |

Injury is excluded from condition-symbol designs. The `injury` damage type is distinct from the unused `injured` exploration consequence marker; neither establishes an Injury condition with defined gameplay behaviour.

A useful implementation review set is dialogue, four condition chips, a compact navigation row, one resource warning and a map legend. Review them against existing game backgrounds, alongside painted item/portrait samples, and at their actual display sizes. [Study 01 v2](iconography/study-01/README.md) provides two raster samples per family across ten families with sponsor-approved visual direction; these are not production symbols or browser mockups.

## Dialogue before and after

Before: the authored choice list prefixes Chat with a speech balloon, Ask about work with an exclamation mark, Trade with a money bag, Rest with a bed, and Goodbye with a waving hand. Each option carries a separate decorative cue even when its wording is already clear.

After: show Chat, Ask about work, Trade, Rest and Goodbye as a consistent text choice list, with a strong focus indicator and quiet separators where useful. Preserve existing availability, ordering and action handlers. Mechanical risk or cost can appear as a short adjacent annotation when the game supplies that information. Do not invent a skill check, price or consequence for a dialogue choice merely to decorate it.

Before: combat feedback mixes a weapon pictograph, a condition name and a frightened-face pictograph into an attack-disadvantage sentence. After: write the same result plainly, such as “Frightened: attack roll has disadvantage.” A condition chip elsewhere uses the drawn symbol and explicit label; the log remains readable when copied or read aloud.

## Original integration and migration constraints

Follow [ADR-000 and ADR-010](../../.claude/rules/architecture.md): data expresses presentation identity; shared renderers supply the drawing. The architect owns the final contract. The semantic catalogue proposed here is now implemented in `src/ui/iconCatalogue.js`, with rendering in `src/ui/Iconography.js`; see the [current contract](iconography/README.md). Identifiers describe meaning, not SVG filenames or raw glyphs. Do not add per-ability branches for artwork. The following bullets record pre-migration hazards and remain validation cases; their original line references are historical.

- **DOM and canvas:** both must resolve the same semantic identity. `MapRenderer.js:442` currently draws text into canvas, so replacing DOM spans alone leaves map symbols untouched. A shared catalogue can provide an SVG source and a cached canvas-compatible image or path. Avoid per-frame asset parsing/loading. Keep legends and missing-image paths in scope.
- **Condition visibility:** `src/rendering/CombatScene.js:447` filters on `condition.icon`. Replacing that field must preserve intended visibility. `src/systems/CombatManager.js:2430` explicitly uses `icon: null` for an internal condition; an unconditional generic fallback would expose it. Separate hidden/internal state from missing artwork during migration.
- **Saved conditions:** `src/systems/SaveManager.js:428` serializes `character.conditions`. Legacy objects can retain raw icon strings. Normalize presentation at an appropriate load/render boundary without assuming class methods survive restoration; preserve durations, damage tranches, sources and other mechanical payloads. Unknown visible conditions need a text label and neutral fallback. Unknown hidden records must remain hidden.
- **Descriptions and accessibility:** `src/utils/combatNumberFormat.js:27` embeds `condition.icon` into condition descriptions, and combat consumers use descriptions in titles/accessibility text. Descriptions should contain meaning and numbers, not SVG markup or a semantic identifier. Inspect both fractional and other display paths in `src/main.js:1531` and `:1594`.
- **Text history:** existing condition-derived messages can embed stored glyphs (`src/systems/CombatManager.js:369`). Remove decorative icons at message producers and inspect any retained, imported or persisted text histories before claiming old saves are clean. This audit does not establish a persisted-log schema. Any migration should target known presentation fields, not strip arbitrary user names, narrative or legal text globally.
- **Click targets:** `src/ui/SettlementUI.js:638` reads `e.target.dataset.action`. A nested SVG/path can become the event target. Any symbol-bearing control must resolve its owning button reliably and retain keyboard activation; clicking the drawing and the label must perform the same action.
- **Fallbacks:** no emoji fallback when a symbol or painting fails to load. Use a neutral drawn mark and visible name for a known visible object, or text alone. Respect intentional absence of an icon. Keep plain-text logs plain.
- **Data and templates:** migrate runtime sources, authoring examples and campaign override paths together. Validate identifiers and references; distinguish actual content from examples when reporting coverage. Reuse generic presentation fields rather than duplicating glyph maps inside each screen.

## Accessibility and information requirements

Visible labels remain the default for menus and condition details. Symbols must not be the only explanation of an unfamiliar mechanic. Decorative SVGs should be hidden from assistive technology when adjacent text already names the action. Any genuinely icon-only control needs an accessible name and a discoverable text explanation. Tooltip content must be reachable without mouse hover, including keyboard and touch flows.

Use explicit text for success, failure, severity and disabled reasons. Preserve numeric values, units, duration and source information already exposed. Colour alone must never distinguish a beneficial condition from a harmful one. Focus, selected, disabled and pressed states must be distinguishable without modifying the symbol's meaning. Map legends must describe the same shapes shown on the map.

## Original implementation sequence and acceptance checklist

1. **Approve representative designs.** Compare the small review set above; settle line weight, silhouette and relationship to painted art. Creative Director owns visual coherence; Game Designer reviews mechanical interpretation; sponsor acceptance remains final.
2. **Establish the shared symbol contract.** Architect and implementers settle catalogue, DOM/canvas consumption, visibility, unknown symbols, image failure and legacy saves. Add focused integration coverage for those contracts.
3. **Migrate dialogue and common chrome.** Remove redundant decoration, then replace useful menu/resource symbols. Verify labels, focus, nested clicks, touch and narrow screens.
4. **Migrate combat and all condition producers.** Cover ordinary and restored characters, both combat presentations, floating text, logs, data-authored effects and internal hidden conditions. Check representative level 1, 5 and 10 flows without changing mechanics.
5. **Migrate map, dungeon, item fallbacks and remaining utility screens.** Exercise normal and fallback rendering, legends, trade, rest, quests, save/load, settings, manual and legal UI. Preserve approved paintings and legal text.
6. **Close reintroduction paths.** Update examples, inspect CSS/generated/escaped content and add a narrowly scoped source/content check with documented legitimate text exceptions. Plain developer logs can be cleaned separately from player-flow acceptance.

Acceptance requires no game-authored emoji in the tested player-visible DOM, canvas, tooltips, accessible labels, logs, missing-art paths or supported legacy saves. It also requires preserved meaning: useful state is still distinguishable; labels and warnings remain understandable; drawing/label clicks agree; keyboard and touch work; and no extra hidden conditions appear. A clean Unicode scan alone is insufficient, and an indiscriminate zero-match rule would damage legitimate text.

Implementation validation should include the relevant JavaScript tests/lint and data-reference checks, plus actual desktop and narrow/touch player flows with missing assets and older saved condition payloads. Document which flows and browsers were exercised and what remains unverified. The [library status](iconography/README.md) records current evidence; the original audit alone establishes neither runtime acceptance nor completed emoji removal.
