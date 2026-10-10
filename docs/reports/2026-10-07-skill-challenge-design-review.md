# Whole-game skill challenge design review

**Status:** Approved bounded content changes applied by root; arithmetic revalidated against updated data. Runtime integration and browser acceptance tracked separately.

## Scope and rules

Review every skill-check entry point: terrain travel, dungeon features/traps, quest-room investigation, settlement approaches and services, NPC challenge choices, and branching bandit dialogue. The nine-skill catalogue and authored primary/secondary attribute model are approved Nexus Verge house rules. This review makes no claim that those substitutions are unmodified SRD rules.

Keep nine skills. Preserve proficiency, expertise, and capped companion help for this repair pass. Combat currently has no actual skill-roll consumer: weapon finesse is a property, and flee is an attribute/proficiency check. Do not add skill checks merely to give every skill combat coverage.

## Quantitative diagnosis

The balance engineer enumerated the live resolver across 101 authored checks and three deliberately specialised analytical profiles at levels 1, 5, and 10. This is exact d20 enumeration, not encounter simulation or an observed playtest distribution. The profiles do not assert that every Calling is playable or that every expertise allocation is obtainable at those levels.

| Level | Trained, solo | Trained, matching helper | Trained, helper and trueParty |
|---|---|---|---|
| 1 | 49.1–54.7% | 59.1–64.7% | 64.1–69.7% |
| 5 | 51.5–57.0% | 66.5–72.0% | 71.5–77.0% |
| 10 | 50.0–55.6% | 70.0–75.3% | 75.0–79.9% |

These are means over authored checks, with ranges across profiles; they are not encounter win rates. A same-level helper already fills the player's proficiency cap, so another matching helper adds no further modifier. trueParty adds a separate +1. With attribute modifiers +3/+4/+5, maximum expert plus matching help plus synergy is +10/+14/+18 at levels 1/5/10.

At level 10, expert plus helper averages 88.5–91.1%; adding trueParty averages 92.0–94.1%. Between 39 and 55 of 101 checks become guaranteed and all catalogued passive checks pass. Skilled parties reliably overcoming routine obstacles is acceptable. Do not inflate every DC to defeat that achievement. Progression should change which approach the party can trust; hard obstacles can retain different costs, consequences, and opportunities.

These are the post-authoring-change numbers, replacing the initial audit's L10 trained-helper 69.9–75.1%, expert-helper 88.4–91.0%, and 39–54 guaranteed checks. The rerun again performed 218,600 exact resolutions; source hashes and all nine rank/level rows are in `tools/balance-sim/skill-party-exact.md`. The small aggregate change supports a repair of specific dominated approaches rather than a global difficulty retune.

Critical decoration does not itself make natural 1 an automatic failure: ordinary success compares total against DC. Check configured critical interpretation separately from pass/fail and consequence selection.

## Retry and reward integrity

Repeated independent 50% checks reach 87.5% eventual success after three attempts and 96.875% after five. Retry exploitation is a larger immediate concern than the helper cap.

Six definitions omit a cooldown: guard_patrol, market_haggle, pickpocket_attempt, warehouse_sneak, crop_trampling, and forge_accident. The seventh formerly unrestricted definition, locked_door, **explicitly authors zero**, which the approved repair preserves. Use the configurable five-minute default only for omitted cooldowns and record only actual attempts. This pacing gate must survive saves and apply to NPC entry points. It does not restrict locked_door. NPC successes that set a completion flag must block equivalent repeated rewards. Finite dungeon objects need persistent instance completion wherever a real object identity exists; do not invent a door identity for a random generic obstacle. Quest investigation currently rerolls after leaving and re-entering the same payoff room; do not allow harmless movement to become unlimited fresh searches.

Do not soft-lock a quest by silently allowing only one failed roll. Make failure consume a real existing cost or provide a defined retry/failure route. Permanent per-object resolution is appropriate only when that object's failure outcome is complete and the player understands it. A generic cooldown is pacing protection, not a replacement for these stakes.

## Authored coverage

The initial recursive inventory includes templates and potentially unreachable content; counts measure authoring, not actual frequency in a run. It omits the contested playerSkill field, which needs explicit handling in catalogue validators.

| Skill | Checks | Explicit secondary checks |
|---|---|---|
| Athletics | 10 | 0 |
| Finesse | 12 | 7 |
| Survival | 8 | 4 |
| Craft | 4 | 1 |
| Lore | 8 | 0 |
| Investigation | 10 | 0 |
| Perception | 14 | 0 |
| Empathy | 11 | 0 |
| Influence | 24 | 6 |

Craft is least represented; use its existing rune-mechanism and smith assistance paths rather than expanding the catalogue. Secondary attributes should express a real authored approach, not an arbitrary stat swap or an obligation to make counts equal. Specific eligible remaps are listed below; actual encounter exposure still needs play evidence.

## Approved existing-content changes applied

1. **river_crossing:** Athletics wading DC12, retain 2d6 failure; Finesse stepping stones DC13, retain 1d6 failure; Investigation safe-ford search DC14, retain 1d6 failure. All retain the current reward. The direct route is easier to attempt but harsher if it fails. Originally Athletics was strictly worse than Finesse at equal training with the same attribute.
2. **arcane_puzzle:** Lore DC18, retaining high reward and loot; Investigation DC14, retaining low reward; Craft DC16, retaining middle reward. Originally Lore used the same attribute with both lower DC and better rewards than either alternative at equal training. Preserve distinct descriptions: decipher magical principles, deduce the pattern, or reconfigure the mechanism.
3. **cliff_climb_advanced.peak_climb:** Athletics/Resilience with description "Sustain the long climb to the peak". The basic cliff and forceful climb paths keep Prowess. This is enduring repeated exertion, not reassigning all climbing to endurance.
4. **track_creature.follow:** Investigation/Intuition with description "Piece together the trail from fleeting signs". Its current success prose already describes rapid synthesis of reeds, stones, and blood marks. Keep methodical search elsewhere on Intellect.
5. **narrow_ledge.assess:** Perception/Composure, description "Study the ledge patiently before committing". Preserve the passive-score mechanism; author patient observation rather than pretending this is an immediate danger reflex.
6. **bandit_negotiation.options[2]:** Empathy/Presence, description "Reassure the bandits and appeal to their better nature". Active connection is distinct from the Composure empathy checks that read motives. This is the simplified choice template, not the separate branching tree.
7. **locked_door:** Remove alertEnemies:true until an actual contextual alert consequence is supported. Replace the lockpick-failure claim with "The mechanism catches. You withdraw before damaging your tools; the lock remains shut." Describe forceful success as opening the door without promising an unimplemented alarm. Do not add a new noise subsystem within this repair.

Lore/Intuition remains a content watch item. Merely remapping votive_record would create a paper count: its terrain modifiers are all zero, and contextualTrigger metadata is not proof of a consumer. Establish a real invoking context before claiming exposure.

## Consequence support and unresolved promises

The initial data inventory contains avoidCombat (8), initiateCombat (8), unlockPath (2), revealInformation (2), questClue (1), revealLocation (1), and revealFeature (1). Root's integration repair covers combat payload aliases, negative gold/costs, preparatory next-stage DC modifiers, exhaustion mapping, and branching dialogue end aliases. These are reported separately from the arithmetic rerun and require their integration checks. Returning the other noncombat strings from applyConsequences does not establish world effects. Contextual route/location/clue effects remain deferred: match each flag to an actual target before either wiring it or revising its narrative promise. Do not fabricate a target location, quest clue, blocked path, or merchant alarm from a generic string.

Settlement revealIntel, npcFlag, and relationChange have separate contextual consumers and must persist the actual NPC. Several definitions also author negative gold, costGold, triggerCombat, reputation, conditions, and preparatory climbDCModifier. Verify each payload through the real invoking surface. A success stage that promises an easier next check must actually modify the next check; preparation is one of the strongest existing information benefits.

Root has supplied an existing-system mapping for the two exhaustion_1 outcomes. Critical reward/damage settings likewise require an actual outcome selection consumer, not just the critical banner.

## Next quest-investigation decision

Do not use permanent failure gating for the current single-room investigate objective: without another clue route, that would soft-lock an accepted quest. Re-entering the room is not a changed situation. The smallest coherent next design is an explicit "Search again" action that consumes the existing skill-challenge fatigue cost, uses shared help/fatigue resolution, and remains available after failure. Persist an objective attempt marker so room entry produces only the initial check; subsequent checks require that deliberate action. Show the fatigue stake before attempting. This needs a small quest/room interaction surface rather than pretending an automatic movement callback is a deliberate choice.

An alternative is one initial roll followed by a guaranteed thorough search for a larger explicit existing fatigue cost, preserving the value of early success while preventing repeated die fishing. Choose that only with an approved cost and visible action; no such cost is tuned by this arithmetic audit. Do not demand new quest archetypes to repair the current route. Existing failed investigations may retain their old retry behavior until this deliberate-action handoff is implemented and accepted, with the remaining gap stated explicitly.

## Player experience and completion gate

Lead with what the character does and what is at stake. Numeric DCs and exact odds may remain available under the approved current UI, but should not substitute for information about harm, consumed resources, discovery, relation change, or a route that will remain closed. Avoid rewarding a player for cycling buttons until a die cooperates.

Implementation acceptance requires reachable checks, correct skill and allowed attribute, shared math including actual help/fatigue, authored outcome effects once, sensible cancellation and retries, quest notification of the completed stage, and save/load continuity. Validate levels 1/5/10 and at least one actual browser flow for each distinct surface. Passing resolver tests alone does not establish whole-game challenge completion.

Ready for backend/frontend implementation under existing architecture. Creative direction should review whether failure feels like a frontier consequence and whether the challenge text makes distinct approaches legible without reading a probability table.

## Quest investigation implementation handoff

The deliberate retry route is now implemented in QuestManager: an objective's first automatic room check persists `investigationAttempted` on both success and failure. Room re-entry after failure offers the “Press E to search again” hint without rerolling. `retryRoomInvestigations` offers a cancelable shared Investigation check and adds exactly the existing `RULES.fatigue.skillChallengeFatigue` cost after an actual attempt, including failed attempts. Cancellation costs nothing, and subsequent deliberate attempts remain available until evidence is found. Initial checks use shared party/fatigue resolution whenever the running game's challenge manager is available. No new quest rewards or permanent failure gate were added.

Automated coverage verifies failed initial attempts across real save serialization/restoration, re-entry without rerolling, cancellation without fatigue, repeated attempt costs, eventual completion, and dungeon/room matching on plain character data. Player's E interaction invokes the retry hook using `DungeonManager.currentDungeon.x/y` and `dungeon.currentRoomIndex`; browser acceptance remains a separate validation step.
