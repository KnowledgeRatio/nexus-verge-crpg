# Supply lifecycle and physical trap choices

Date: 2026-10-11. Status: implemented and enabled locally after sponsor approval of the first repair tranche. No commit or deployment. Survival provisioning, skill-based escape and equipment maintenance remain separate proposals.

## Player behavior

Eligible ordinary merchants stock Expedition Supplies within their existing inventory budget. Purchasing restores the expedition counter directly, never an inventory reserve. The existing three-supply cap applies; overflow, unavailable stock, insufficient gold and malformed quantities fail before charging. One supply supports either one camp action or one long rest. Refill does not heal, rest, clear exhaustion, reset hunger history or advance/reset quest deadlines. The shop shows available supply space and disables excess purchases.

The Game Designer selected provisional base value 35 gp using seven current merchant day-rations at 5 gp as a reference; normal merchant relationship/Influence pricing applies. This is not a balanced scarcity claim. Canonical/day-ration price inconsistencies remain untouched. Existing merchant stock regeneration is unchanged; this does not add persistent renewed shops or quest boards.

Physical dungeon traps retain passive Perception detection and Finesse + Composure disarming. Avoidance leaves the trap known and armed, visibly marked. A sponsor follow-up changes crossing: stepping onto that armed tile again inflicts its generated damage once and spends it, without another detection or disarm prompt. While still on the initially avoided tile, press E or Interact to disarm before leaving. Disarm success applies the authored reward once and makes the tile safe; failure applies the shared prompt's authored damage once and spends it. Undetected traps also inflict their generated damage once and become spent. The cancel choice explicitly reads "Avoid trap".

The authored template is marked `physicalTrapOnly` and excluded from random dungeon-room challenges while the feature is enabled; it still supplies physical disarm outcomes. It is not converted into a general trap/scouting/container system.

## Architecture and compatibility

- `purchaseEffect:{type:"restoreSupplies",amount:1}` dispatches through MerchantManager/FatigueManager. `guaranteedStock` reserves a slot in the campaign-filtered eligible merchant pool. The shop-only offer is not a loot item.
- `RULES.fatigue.enabled` gates refill availability; `RULES.dungeon.trapChoicesEnabled` gates distinct trap choices, receipt replay and random-room filtering.
- Canonical dungeon features save sparse `trapStates` receipts keyed room index and tile coordinates, including room identity/dimensions, original DC/damage and armed/detected flags. Active rooms are not serialized; loading still places the character outside the dungeon.
- Automatically selected dungeon types record `dungeonTypeSeedDraw` so regeneration consumes the original type-selection draw. Explicit first-generation types retain their existing random stream. Boss fallback consumes a draw consistently while enabled; boss selection continues to use the current/shared encounter level rather than freezing ordinary combat progression.
- Receipts replay only on compatible room/floor coordinates. Old saves carry no historical trap receipts or automatic-type marker; the change cannot reconstruct previously resolved hazards. Rare incompatible regenerated layouts are guarded rather than overwriting unrelated doors/walls/interactions.

## Validation

Follow-up crossing validation: 19 focused trap tests pass, including actual Player movement away/back at levels 1/5/10, one damage application, saved spent receipts and safe disarmed re-entry. Desktop/mobile browser fixtures in `/private/tmp/avoided-trap-browser-results.json` verify avoidance followed by scripted Player movement triggers the generated damage once without another prompt; repeated crossing is safe. These use synthetic positions and fixed one-point trap damage, not naturally played routes. Build passes; scoped lint retains the five existing DungeonManager errors.

The final gameplay-system suite passed 1,474 tests in 130 files after the generation correction. Final focused trap/generation checks also passed 41 tests across three files. Supply tests include level 1/5/10 real SaveManager round trips, plain characters, cap/quantity/payment guards, disabled fatigue, normal trades and seeded guaranteed stock. Trap tests include avoidance, deferred E disarming, single damage application, overlapping prompts, legacy rollback, sparse persistence and real seeded regeneration from level 1 to level 10 with current-level boss selection preserved. The subsequent small touch-control/stylesheet additions are verified by browser checks.

Build and legal verification pass; JSON syntax, scoped merchant ID/effect validation and diff whitespace checks pass. Repository lint retains 175 existing errors; new regression tests and Player/generation edits have no new lint errors. These are functional checks, not natural quest journeys, combat win rates or whole-run economic acceptance.

Desktop 1440×900 and mobile 390×844 browser fixtures exercise generated merchant stock, capacity/quantity controls and purchases with real shop UI. Buying two supplies restored the counter from 1 to 3, charged 68 gold at a relation-modified 34 per unit and added no inventory item. Trap avoidance retained known/armed state; later interaction reopened the real skill prompt and a forced ordinary failed check inflicted authored 1d6 damage once, then spent the tile. No page errors occurred. Synthetic characters/positions and controlled failed rolls mean these are interaction fixtures, not naturally played journeys. Artifacts are `/private/tmp/supply-trap-browser.mjs`, its results JSON and desktop/mobile screenshots.

Visual inspection identified an existing mobile shop grid defect; a one-column layout now keeps supply space and the 312×44 purchase button within the 390-pixel viewport. The quick menu includes Interact to expose the existing E interaction on touch devices. The final mobile retest uses touch throughout: Avoid, quick-menu Interact, Attempt and Continue, then Interact again to verify no repeated damage. Desktop retains keyboard E coverage. Both final viewport fixtures pass with zero page errors and no horizontal overflow.
