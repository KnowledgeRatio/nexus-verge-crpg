# Legal skill builds and selected outcome baseline

**Date:** 2026-10-10. **Status:** investigation evidence; no new gameplay tuning or quest design approved.

This continues the [skill-value investigation](2026-10-09-skill-balance-investigation.md) after the approved Investigation target, town-coverage and reward repairs. Its question is what characters can actually acquire, what selected existing checks cost or deliver, and which evidence is still needed before changing skills or adding quest consequences. “Legal” here means creation-valid choices, followed by skill-stat projections using current progression APIs; it is unrelated to licensing review. **The higher-level fixtures are not fully validated playable characters:** they exercise attribute choices without earned XP or every mandatory ability, spell, practice, trait and specialization choice required by the level-up UI.

GitHub remains the active roadmap: [#41](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/41) owns skill-value acceptance; [#57](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/57) is the bounded quest-consequence follow-up that must feed back into that assessment. This report is evidence, not a shadow roadmap or a claim that either issue is complete.

## What players can acquire

Current [creation UI](../../src/ui/CharacterCreation.js) allows custom Dedication, Curiosity and Audacity characters, including their background, standard-array attributes and skill selections. Curiosity and Audacity carry “COMING SOON” labels in [class data](../../data/classes.json), but creation does not disable them. That establishes selectable builds and skill arithmetic, not complete or accepted Calling gameplay. The only authored preset in [kit data](../../data/kits.json) is Knight.

| Calling | Class skill choices | Eligible class skills |
| --- | ---: | --- |
| Dedication | 2 | Athletics, Finesse, Survival, Perception, Empathy, Influence |
| Curiosity | 3 | Lore, Empathy, Investigation, Craft, Finesse |
| Audacity | 4 | Athletics, Finesse, Craft, Investigation, Perception, Empathy, Influence |

Background grants apply in addition: Soldier grants Athletics/Influence; Acolyte Empathy/Lore; Criminal Influence/Finesse; Sage Lore/Investigation; Folk Hero Empathy/Survival. Elf grants Perception. Creation excludes already granted background skills from class choices and requires exactly the class's choice count. All nine skills therefore have a creation route across supported builds. **Craft has no verified training route for Dedication**, because it is absent from Dedication's class pool and the current background/species grants.

Custom creation uses the standard array 15/14/13/12/10/8. Knight uses its authored preset, with Soldier plus Empathy/Perception and pre-species attributes 15/14/8/10/13/12 in Prowess/Resilience/Intellect/Intuition/Presence/Composure order. These fixtures describe possible builds, not the distribution of players' choices.

[Character](../../src/systems/Character.js) applies creation grants and preserves skill state; [SkillRegistry](../../src/systems/SkillRegistry.js) gives training one proficiency bonus and expertise another. Existing expertise can be read, migrated and saved, but no ordinary acquisition producer was verified. Audacity's authored `expertiseSkills` metadata is not handled by creation/progression. Likewise, no verified producer grants a new trained skill later in a run. Strong expert arithmetic must therefore remain a sensitivity scenario, not the baseline attainable solo build.

## Helpers are attainable, but conditional

The settlement Great Hall generates one to three candidates through [SettlementManager](../../src/systems/SettlementManager.js) and [CompanionManager](../../src/systems/CompanionManager.js). Candidates can have any of the three Callings and are generated one level below the player, with a minimum level of one. Their trained/assigned skills are sampled: two for standard types, three for Audacity. No skill-reassignment UI producer was verified, so a matching helper is an available recruitment possibility rather than an automatic benefit of entering a town.

[SettlementUI](../../src/ui/SettlementUI.js) enforces recruitment eligibility and payment. Current player-level-indexed recruitment prices are 50/200/600 gold at levels 1/5/10, and the party limit is three companions. Ordinary creation currently starts from 150 gold plus background equipment gold; Soldier therefore starts with 164. The level-one price is affordable before other spending. Later affordability cannot be inferred without measuring earnings and expenditure.

The live challenge context automatically includes non-downed companions assigned to the matching skill. Their proficiency bonuses add together up to the player's proficiency-bonus cap. A newly recruited level-five-player helper is level four and provides +2, versus the player's +3 cap; a newly recruited level-ten-player helper is level nine and provides +4. A legitimate `trueParty` synergy supplies another +1 when the party contains at least one member of each Calling. Same-level matching helpers and active synergy in earlier analytical tables must not be mistaken for an ordinary newly recruited party.

Companion skill state and metadata survive [SaveManager](../../src/systems/SaveManager.js) restoration; unrecruited candidates are transient. This trace establishes the recruitment and modifier paths, not observed recruitment frequency, survivability, or player assignment choices.

## Reproducible difficulty baseline

The [measurement harness](../../tools/balance-sim/legal-skill-baseline.js) and [saved results](../../tools/balance-sim/legal-skill-baseline.results.json) use actual Character creation/progression APIs, current [rules](../../src/core/rulesEngine.js), [SkillRegistry](../../src/systems/SkillRegistry.js) and [challenge context/consequences](../../src/systems/SkillChallengeManager.js). Reproduce from the repository root with `node tools/balance-sim/legal-skill-baseline.js`. The four declared profiles match the earlier investigation: Knight preset, Trail Guardian, Investigator and Envoy. They use human bonuses, creation-valid grants, and chosen capped attribute investments; none assumes expertise, companions, synergy, meals or practices. The harness calls `levelUp`/`applyLevelUpSelections` for attribute choices, but does not complete the full [LevelUpManager](../../src/systems/LevelUpManager.js) validation contract or earn the XP budget. Treat upper-level odds as conditional skill-stat projections, pending complete progression/build acceptance.

The harness covers 101 authored definitions plus live-generated Investigation checks, across four builds, levels 1/5/10 and fatigue 0/75/90: **3,672 cells**, including 396 deterministic passive cells and 3,276 active cells. It enumerates **480,480 active die-support resolutions**, including all ordered die pairs for disadvantage. These are exact conditional odds, not sampled encounter frequencies; confidence intervals and “win rates” would be misleading. Equal catalogue representation does not imply equal occurrence during play.

| Existing check / declared build | Level 1 | Level 5 | Level 10 |
| --- | ---: | ---: | ---: |
| River Athletics / Knight | 70% | 75% | 65% |
| Rune Craft / Investigator | 50% | 55% | 45% |
| Rune Lore / Investigator | 40% | 45% | 35% |
| Rune Investigation / Investigator | 60% | 65% | 55% |
| Door Composure-Finesse / Envoy | 35% | 30% | 20% |
| Rune Craft / untrained Knight | 20% | 10% | 0% |

These reproduce the previously inline October 9 figures. Generic reused challenges receive level DC additions of 0/2/5. Capped primary attributes and slower proficiency growth can therefore leave a trained character less reliable at level ten than at level five. This is a concrete routine-content concern, not evidence that all late-game checks need lower DCs. Fatigue compounds it: the level-ten Investigator's Rune Craft chance is 45% rested, 40% at fatigue 75, and 20.25% at fatigue 90 with disadvantage.

## Current generated Investigation is a different check

The harness creates an actual targeted quest through [QuestGenerator](../../src/systems/QuestGenerator.js); its authored objective DC is used directly, without adding generic challenge scaling again.

| Build, rested | Level 1: DC 12 | Level 5: DC 13 | Level 10: DC 15 |
| --- | ---: | ---: | ---: |
| Investigator, trained/high Intellect | 70% | 80% | 75% |
| Envoy, trained/moderate Intellect | 60% | 60% | 55% |
| Knight, untrained/low Intellect | 40% | 35% | 25% |
| Trail Guardian, untrained/low Intellect | 40% | 35% | 25% |

Initial search adds no automatic attempt fatigue; a deliberate retry adds two. Current completion rewards are 80 XP/20 gold at level one, 400/100 at level five and 800/200 at level ten. The baseline reads those real generated rewards; it does not play travel, retries until completion or turn-in. The separate prior repair has turn-in/save evidence recorded in the earlier report.

Near-universal town offers now improve availability, but low-Intellect untrained characters still have markedly worse search odds. A 75% specialist check is not a 75% quest-completion or expedition-success rate. Repeated attempts, travel attrition, fatigue thresholds, shared destinations and eventual reward collection remain separate transitions.

## Selected real consequences: rune approaches

The harness applies **1,440 consequence trials** to fresh real Characters using the live consequence handler. It enumerates every normal die face and both branches of Lore's 50% successful-loot trigger. The following are expected results per ordinary rested attempt for the declared Investigator, not earnings per adventure:

| Approach | Level 1 expected XP / authored gold | Level 5 | Level 10 | Additional consumed effect |
| --- | --- | --- | --- | --- |
| Craft | 55 / 11 | 60.5 / 12.1 | 49.5 / 9.9 | None verified in these trials |
| Investigation | 60 / 12 | 65 / 13 | 55 / 11 | None verified in these trials |
| Lore | 48 / 10 | 54 / 11.25 | 42 / 8.75 | Real loot trigger: 20% / 22.5% / 17.5% per attempt |

All three selected approaches produce zero HP loss and zero automatic fatigue in the trials. At equal trained Intellect, Craft is harder than Investigation and yields lower expected authored XP/gold, with no verified compensating consumed effect here. That is a specific alternative-choice problem; it is not proof Craft lacks value in other contexts.

Lore requires a separate comparison because its successful 50% loot branch calls the actual [LootManager](../../src/systems/LootManager.js) against an existing [loot table](../../data/lootTables.json). It would be wrong to rank Lore using authored currency alone. The controlled loot draw in this harness produces 24 gold when triggered; it proves the consumer works, but is not the distribution or expected value of the loot table. Do not use `fixtureMeanGoldIncludingFixedLootDraws` as whole-table loot value.

Source tracing also confirms ordinary `consequenceFlags` are produced but have no downstream property consumer in current `src/`. Ancient-text `questClue`/`revealInformation` payloads must not count as proven new knowledge, quest progress or alternate resolutions. Positive text and loot can be real feedback without demonstrating the promised qualitative information effect.

## Recommended next decision and remaining evidence

The evidence supports consultation on a **small, distinct consequential outcome**, rather than a blanket skill/DC/reward change. Have Game Designer propose the player decision and success/failure outcomes for the bounded #57 quest slice; have Architect confirm its generic state/consumer/save contract; then seek sponsor approval before implementation. Investigation's repaired target and reward paths provide a usable foundation, but a real clue must change something a player can observe or choose. Craft's rune alternative needs its own explicit design judgment: distinct useful payoff, different stakes, or intentional availability when another approach is unavailable. This report approves none of those options.

Keep current difficulty as a measured baseline until routine/endgame intent is decided. Retest the selected builds and levels after an approved outcome change; changes to new scenarios, skill training or DCs affect competing skills and must return to #41 review. Do not count expertise or ideal helpers as compensation for an ordinary solo build's weakness.

Still missing are complete higher-level build/UI confirmation, effects of omitted progression choices, connected played-route consequences, unique information acquisition, actual recruitment and expenditure, passive/service usage, combat/death, destination travel/payoff and marginal build comparisons. Record generated → reachable → offered → selected → succeeded → consequential counts under declared policies, keeping HP, fatigue, gold, access, intel and resolutions separate. The earlier route audit measured availability only; this baseline adds creation acquisition, conditional skill-stat capability and selected consequence application, not the missing full-run evidence.

## Validation and provenance limits

The acquisition reviewer ran the existing creation, SkillRegistry and skill-persistence suites: **30/30 passed**. That supports state/grant arithmetic, not browser acceptance of complete Curiosity/Audacity gameplay. The measurement harness asserts creation grants, standard arrays, attribute progression, expected check support and consequence application; targeted harness lint passes. Its saved JSON contains source SHA-256 provenance, all totals and selected outcome traces; rerun it when relevant code/data changes. No production code/data, GitHub state, commit or deployment changed in this research task. Existing broader implementation test totals from the prior repair belong to that repair, not a new test run for this report.

## Subsequent design consultation — 2026-10-10

The sponsor rejected a single medicine story as the procedural foundation and requested a reusable core with signature quests alongside it. The [procedural quest-core proposal](../plans/2026-10-10-procedural-quest-core.md) records the cross-discipline design, producer/consumer repair prerequisites and proposed first family. Variety across towns and new runs comes first; board renewal is deferred. This is design work awaiting implementation approval, not new gameplay or evidence that the skill-value acceptance gaps above are closed.
