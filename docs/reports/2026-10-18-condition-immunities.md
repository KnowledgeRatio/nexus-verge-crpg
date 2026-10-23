# Condition immunity repair

Date: 2026-10-18. Status: implemented locally for [#49](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/49), with mechanic and feedback checks passing. A separate mobile overflow limitation remains. No issue closure, commit or deployment.

## Behavior and contract

Monster immunity data already reaches encounters through EncounterBuilder. Combatant now reads and writes the authoritative `character.conditionImmunities` array instead of relying on a separate runtime field. `toJSON()` explicitly copies that array. The shared `conditionApplication.js` query also accepts plain restored actor data.

`addCondition()` keeps its boolean return and rejects immune types before any stack, refresh or value change. Generic control effects report whether the condition really applied, with outcomes `applied`, `immune`, `alreadyAffected` or `saved`. Rejection messages say immune or already affected rather than claiming a successful condition.

Immunity blocks control only: valid attack/ability damage, costs and unrelated effects remain. Rejected control does not show success floating text, start concentration or consume Exposed. Topple checks prone immunity before its condition save and reaction, leaving actual attack damage intact. This is a generic repair, with no monster-ID branches, content changes or numerical tuning.

The live `Game.dodge()` entry point also uses the shared rejection message, distinguishing immunity from an existing Dodge condition. Rejected Dodge retains its existing action policy and does not emit false success feedback or end the turn.

## Validation

Twenty-three new regressions cover canonical generated enemies and controls at levels 1/5/10, immunity alias/serialization, rejected stacking, truthful effect outcomes/costs and the live Dodge entry point. All **23 new tests in two files** pass; the earlier broader focused suite passed 117 tests in seven files. The final full suite passes **1,627 tests in 145 files**, using `npm test -- --testTimeout=30000` (87.83 seconds). New helper/test lint is clean. Repository lint retains 175 errors/1,115 warnings; broader lint retains 3,251 errors/2,360 warnings. The final web build after frozen CSS passes with 183 app files and 107 media files.

Real Game combat UI fixtures use canonical generated level-five Shadow and Ogre encounters, with progression checked through LevelUpManager. Actual Menacing Attack and quarterstaff Topple card flows run at desktop 1440-wide and mobile 390-wide sizes. Shadow retains no frightened/prone conditions, reports both immunities and emits no false condition-success floats. Ogre receives frightened/prone with visible badges. Both targets take actual hit damage, and each tactic spends one Resolve. No page errors were reported. These controlled encounters are functional browser evidence, not broad natural play or balance acceptance.

The first mobile screenshot exposed existing clipping of combat logs/cards. A scoped `styles.css` repair now keeps panels/logs scrollable, prevents sidebar sections from shrinking, hides the footer during combat and stacks panels below 768 pixels without the old 350-pixel sidebar minimum. Desktop/mobile checks confirm readable immunity feedback and reachable logs/actions. The scope is combat readability, not a wider presentation rollout.

The [four-case browser artifact](../../tools/balance-sim/condition-immunity-browser.results.json) records no page errors and reachable logs/actions in every Shadow/Ogre desktop/mobile case. Desktop card width is 356 pixels, log height 400 pixels and action size 229×52 pixels; mobile values are 326, 100 and 164×52 pixels. Desktop document overflow is zero; mobile still reports **nine pixels of horizontal overflow**. This existing broader layout limit remains under #6/#7. These checks do not claim full mobile no-overflow acceptance.

Living references: [combat rules](../../.claude/rules/systems/combat.md), [monster data contract](../DATA_SCHEMA.md), [Dedication mechanics](../callings/dedication.md).
