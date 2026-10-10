# Skill value: generated exposure evidence and next balance scope

The previous exact review establishes probability arithmetic, not campaign skill value. A new bounded diagnostic shows that the runtime dungeon selector gives skills substantially different availability, and that raw repeated offers greatly exaggerate their frequency once cooldown is considered. No production balance values were changed.

## Reproducible diagnostic

Run `node tools/balance-sim/skill-exposure-audit.js > /tmp/skill-exposure-audit.json`. The saved working artifact is `tools/balance-sim/skill-exposure-audit.results.json`.

The harness uses the real `DungeonGenerator.generateDungeon`, weighted type selection, authored room pools, real `Player.checkForDungeonSkillChallenge`, and `SkillChallengeManager.canAttemptChallenge`/`recordChallengeAttempt`. It generates 500 seeded dungeons at each of levels 1, 5 and 10: 1,500 generated dungeons, each evaluated under two policies. Generation coordinates are x=seed and y=level, world seed `skill-exposure-2026-10-07`. Dispatch RNG is explicitly seeded independently, making the diagnostic replayable; this does not change live unseeded challenge dispatch.

The synthetic route visits every room and gives it 24 eligible movement checks at 200 ms each. Combat is suppressed. `fresh-opportunities` never records attempts, approximating repeat offers after cancellation. `attempt-every-offer` records each offered challenge's cooldown, approximating accepting every offer, but intercepts resolution. **Neither policy actually rolls skills, chooses an alternative, follows conditional stages, applies fatigue, measures rewards or models a playable route.** Availability can overestimate actual attempts. Multiple skills can appear in a single offer, so skill counts must not be added to infer total offers.

Scope excludes overworld travel, settlement visits/services, generated quests, interaction doors and passive trap tiles. These are essential to the subsequent whole-run review. The report measures generated dungeon availability under stated budgets, not observed gameplay occurrence.

## Results

Mean offers containing a skill, with the cooldown-recording policy:

| Skill | Level 1 | Level 5 | Level 10 | Level-5 p10 / median / p90 |
| --- | ---: | ---: | ---: | --- |
| Athletics | 0 | 0 | 0 | 0 / 0 / 0 |
| Finesse | 3.57 | 3.54 | 3.55 | 3 / 4 / 4 |
| Survival | 0 | 0 | 0 | 0 / 0 / 0 |
| Craft | 0.69 | 0.75 | 0.72 | 0 / 1 / 1 |
| Lore | 2.01 | 2.03 | 1.97 | 1 / 2 / 3 |
| Investigation | 1.68 | 1.75 | 1.72 | 1 / 2 / 2 |
| Perception | 1.90 | 1.89 | 1.85 | 1 / 2 / 2 |
| Empathy | 0 | 0 | 0 | 0 / 0 / 0 |
| Influence | 0.67 | 0.65 | 0.70 | 0 / 1 / 1 |

At level 5, the probability that a generated dungeon offers at least one relevant challenge under this budget was:

| Skill | Probability | 95% binomial interval |
| --- | ---: | --- |
| Craft | 75.4% | 71.6–79.2% |
| Influence | 64.8% | 60.6–69.0% |
| Lore | 98.4% | 97.3–99.5% |
| Investigation | 99.6% | 99.0–100% |
| Finesse / Perception | 100% | Wald interval 100–100%; finite sample does not prove certainty |
| Athletics / Survival / Empathy | 0% | Wald interval 0–0%; zero-event rule-of-three upper bound 0.6% |

Intervals use the requested `p ± 1.96 sqrt(p(1-p)/500)`, clamped to [0,1]. The Wald interval degenerates at boundaries, so zero results also report the conservative rule-of-three upper bound. These are generated-availability proportions, **not combat win rates**. No level difference is asserted as real: for example Craft level-1 to level-5 difference is smaller than the sum of the two binomial margins. Full cell intervals are in the JSON artifact.

Without recording cooldown, level-5 mean offers containing Finesse were 50.12, Craft 16.44, Lore 24.58, Investigation 30.63, Perception 33.73 and Influence 2.20. This is not a claim that players receive those rewards: the artificial unattempted policy retains repeat eligibility. It demonstrates why per-step trigger rates, accepted attempts, elapsed time and cooldown must be recorded separately.

Interpretation:

- The dungeon random-challenge dispatch structurally omits Athletics, Survival and Empathy from its available pools. This is a surface coverage finding, **not proof that these skills lack value elsewhere**.
- Finesse has multiple available routes; its containing-offer count includes optional or conditional use. It cannot be called the most valuable skill from this result alone.
- Craft appears in roughly three quarters of these level-5 dungeons, typically once after cooldown. Its small catalogue count did not imply dungeon absence. Its alternative's achieved payoff and player choice share still need measurement.
- Global challenge-ID cooldown, player pace and repeated-room moves strongly affect apparent frequency. A world template count is not an exposure measure.

### Representative dispatcher traces

Trials selected by offer-count outcome, not randomly; level 5, cooldown-recording policy:

- Minimum: seed 9, spiderNest, four rooms, three offers: supply-cache trap → supply-cache hidden treasure → ambush-point guards. No Craft alternative.
- Median: seed 92, sunkenRuins, fourteen rooms, six offers: ruined-gateway hidden treasure → spider-lair trap → spider-lair guards → artifact-pedestal arcane puzzle → flooded-corridor ledge → flooded-corridor ancient text. Craft occurs as one puzzle alternative, not a demonstrated successful Craft attempt.
- Maximum: seed 499, banditHideout, ten rooms, seven offers: collapsed-tunnel ledge → winding-passage ancient text → winding-passage hidden treasure → arena guards → arena trap → heart-of-darkness votive record → musical-stones arcane puzzle.

Full event sequences for minimum/median/maximum at all three levels are in the artifact. There are no combat rounds or wins/losses in this diagnostic.

## Legal-build baseline is still required

The earlier `skill-party-exact.js` declares its attribute profiles analytical, not legal characters. Legal follow-up must instantiate actual Character creation/progression instead of independently adding two points to every attribute.

Current shipped kits contain one noncustom preset: Dedication's Knight. Its six native attributes spend 27 point-buy points, its two chosen skills (Empathy/Perception) are permitted by the Calling, and Soldier adds Athletics/Influence. Curiosity and Audacity offer custom creation only. Knight is an authored legal starting baseline, **not evidence of player popularity**. Custom representative builds need designer approval and usage assumptions.

Actual player progression applies one chosen attribute increase at every level; companion advancement follows separate rules. The follow-up must preserve attribute caps, species bonuses, class skill pools, backgrounds, actual ability choices and companions obtainable by that stage. Expertise is authored in `data/classes.json` through `expertiseSkills` declarations, and is read/restored/migrated by Character/SkillRegistry (`Character.js:358`, `SkillRegistry.js:125,183`). This audit found no verified new-character or progression consumer granting those authored expertise selections in `src`. Until an acquisition path is demonstrated, expert cells are saved-state/hypothetical diagnostics, not expected legal build achievement.

## Value and quest dependencies

Per-skill reporting should distinguish **generated → reachable → offered → attempted → succeeded → consequential**. Skill-specific alternatives on one obstacle share one opportunity. Record frequency per route/time budget and at least one-offer probability, conditional stage access, retries, failure cost and rewards. Compare matched legal builds and seeds, using scalar deltas for HP/gold/XP/time separately from discrete outcomes. Report distributions and intervals, not a combined opaque utility score.

Qualitative value requires a concrete consumed consequence: an alternative quest resolution, combat avoided, evidence enabling a decision, access to a target, durable relationship/intel affecting later decisions, or a later-world consequence. Flavour text and flags with no gameplay consumer must be labelled separately. Current review evidence: generated Investigation generally completes a room objective for rewards, without an evidence object/interpretation/choice; richer authored investigation templates are not established generated routes. Bandit combat avoidance and NPC intel/relations are real; reputation placeholders and unconstrained reveal/unlock effects need targets/consumers. `cleansed` has map tint presentation, not demonstrated later gameplay impact; `safer` positive outcomes lack a queued consequence, while negative `powerVacuum`/`disturbed` tags have event consumers.

Recommended dependency order for Product Owner / Game Designer:

1. Now: approve representative legal-build/route baselines and define intended per-skill outcomes. Complete joint skill/quest reachability and consumed-consequence audit.
2. Now: specify generic target/evidence/reputation/world-consequence contracts only where an approved quest/skill outcome needs them. Trace persistence and later consumers before calling these outcomes implemented.
3. Next: author quest routes and systemic opportunities against those contracts, including rare but consequential skill payoffs. Avoid equalising raw check counts or making one mandatory skill gate a quest.
4. Joint acceptance: rerun seeded route exposure and exact legal-build chances against the implemented content; compare semantic route results qualitatively and economic deltas quantitatively. A skill passes on meaningful attainable usefulness, not success probability alone.

No numerical retune is recommended from this limited dungeon diagnostic. Final balance intent and opportunity/reward thresholds belong to Game Designer; priorities/dependency tracking belong to Product Owner. New harness ESLint has zero errors. Two independent runs produced identical result artifacts.
