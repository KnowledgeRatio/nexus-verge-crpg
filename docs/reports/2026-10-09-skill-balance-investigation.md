# Skill balance investigation — findings and remaining evidence

**Date:** 2026-10-09. **Status:** interim investigation, not full skill-balance acceptance.

The sponsor's question is whether each skill is worth investing in during ordinary play: how often it matters, whether realistic characters can use it, and whether its outcomes change decisions, resources or the story. Correct roll arithmetic alone cannot answer that question.

This report consolidates the October 7 evidence and October 9 read-only specialist review. The sponsor authorized recording the findings. Gameplay, data, measurement-tooling and roadmap changes proposed below remain subject to separate approval. Existing uncommitted runtime repairs predate this report.

GitHub remains the active roadmap: [#41 skill value and balance](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/41), [#57 quest consequences](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/57), and [#39 tracking/reputation](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/39). The remaining questions here are an evidence checklist, not a replacement backlog.

## Main findings

| ID | Finding | Evidence and practical implication |
| --- | --- | --- |
| F1 | Success odds do not establish usefulness. | A frequent reward-only check, a rare decisive clue and an unused template are different kinds of value. Count meaningful opportunities and consequences, not just rolls. |
| F2 | Some routine checks become harder for trained characters late in progression. | Legal solo builds lose success probability between levels 5 and 10 on reused templates as DC scaling overtakes capped attributes. This is a tuning concern, not proof that every high-level obstacle should be easier. |
| F3 | Craft's qualitative payoff is limited. | Rune puzzles and blacksmith assistance are reachable. Rewards and NPC relations work, but descriptions/flags do not establish improved equipment, production or later pricing. |
| F4 | Lore and discovery promises sometimes lack effects. | Ordinary `questClue`, `revealInformation`, `revealLocation`, `revealFeature` and `unlockPath` flags have no demonstrated target consumer. Text is not evidence of changed quest/world state. |
| F5 | Generated Investigation has limited resolution depth. | One room search advances completion and rewards. It produces no evidence object, interpretation or alternate resolution. Richer authored templates are not instantiated by the current settlement quest constructor. |
| F6 | First-visit passive NPC failure persists after improvement. | Fatigue can record a failed passive intel/approach check permanently. Later attributes or relations do not automatically reconsider it; another explicit intel-granting path may still help. |
| F7 | Earlier expertise/helper results overstate what is established for ordinary solo builds. | Expertise is authored/read/restored but has no verified acquisition producer. Matching companions require recruitment and assignments, and newly generated companions can be below player level. |
| F8 | Whole-game frequency and marginal skill value remain unmeasured. | The seeded dungeon diagnostic measures available alternatives under an artificial route, not selected checks or consequential uses across travel, settlements and quests. |
| F9 | Social attributes serve different approaches. | Prices use Presence-based Influence; active NPC intel uses Composure-based Influence. A high-Presence envoy can obtain better prices without excelling at intel. This is an authored design distinction to assess, not automatically a bug. |
| F10 | Some alternatives offer no compensating benefit for their harder roll. | Rune Craft has lower expected XP/gold than Investigation for the trained Investigator baseline, with the same attribute and no distinct consumed success effect. Door Lore likewise has easier DC, higher rewards and less risk than other approaches at equal modifiers; actual builds can change the preferred option. |
| F11 | Global cooldowns suppress opportunities at different sites. | Attempt identity is only challenge ID. One blacksmith's Craft assistance suppresses another blacksmith's assistance for one hour; one rune puzzle suppresses another for five minutes. Suppressed distinct opportunities must not be recorded as absent content. |
| F12 | Attempt costs vary by invoking surface. | Ordinary modal checks add no automatic attempt fatigue. Branching dialogue adds two before choices; deliberate quest retries add two after attempts. Applying two fatigue to every simulated check would misrepresent current costs. |
| F13 | Some apparent passage benefits are not passage control. | Ambient river challenges run after movement and do not grant or deny crossing. Real ocean/deep-water traversal is a separate pre-movement path. |
| F14 | The random door challenge is not a stable mandatory gate. | Every E interaction rolls a 60% challenge trigger. Cancellation leaves it eligible; a later nontrigger branch can enter normally, whereas failed attempts permanently lock the door. Access value depends on actual interaction/retry policy. |
| F15 | Generated quest-completion dialogue lacks its required local link. | Assignment omits nested quest-giver settlement ID, while local completed-quest dialogue filters on that field. Separate relation rewards have a fallback; this finding concerns visible local reaction. |
| F16 | Novel information is not distinguished from repeated information. | Dynamic NPC intel scans generated regions and chooses lines without a player-knowledge/novelty filter. Some information can be actionable, but repeated lines must not be counted as repeated discoveries. |
| F17 | Some generated Investigation quests have no reachable room target. | In the bounded 100-small-world sample, 43 starting towns had no linked dungeon hooks and produced targetless Investigation quests. A direct null-target/control comparison confirmed the targetless objective cannot match a dungeon room through the current consumer. This is a specific reachability defect, not proof every fallback quest is impossible. |

No finding establishes that a skill is useless throughout the game, that Craft needs a blanket buff, or that Finesse needs a blanket nerf.

## What has been investigated

| Investigation | Evidence obtained | Limit |
| --- | --- | --- |
| Runtime integration | Traced dialogue, settlements, quests, terrain, dungeon challenges, doors, traps, pricing, saves and actual outcome consumers. Prior repairs have regression/browser evidence. | Integration correctness is not campaign balance or player comprehension. |
| Exact resolver arithmetic | October 7: 218,600 resolutions across 101 authored definitions, analytical profiles, ranks and helper configurations. | Profiles are not complete legal characters; catalogue means are not frequency-weighted. |
| Generated dungeon availability | October 7: 1,500 real generated dungeons, 500 seeds at levels 1/5/10, real dispatch with declared synthetic policies. | Excludes travel, settlements, quests, interaction doors/passive trap tiles, combat and actual choices/outcomes. |
| Mixed-surface availability | October 9 continuation: 100 generated small worlds, starting-town NPC menus/quests, 200-step travel routes and a linked dungeon where present; 300 level-specific route scenarios. | Captures available alternatives, not selected attempts or consequences. Town menus precede attempts; actual transit, combat, water checks and passive/service benefits are excluded. |
| Legal-build difficulty | October 9: 24,240 exact outcomes using actual Character creation/progression, shared DC/context and SkillRegistry; a further 27,840 diagnostic outcomes included sensitivity and disadvantage. | Four declared builds, not observed player popularity; no playable-session or encounter win-rate claims. |
| Qualitative outcomes and acquisition | Mechanics Master and Game Designer traced reachable access, intel, relations, quest completion, practice separation and grant paths. | Mostly code tracing; the October 9 review did not rerun player-flow tests or perform new hands-on acceptance. |
| Product dependencies | Product Owner refreshed #41/#57/#39 and recommended ordered gates. | Consultation only; no roadmap changes made by that review. |

## Legal-build difficulty evidence

All four baselines use Varath/human species bonuses (+1 to each attribute). Knight uses its shipped point-buy preset; custom builds use the creation UI's standard array. Player progression increases one chosen attribute at each level, with the applicable cap. None assumes expertise, companions, practice bonuses or meals.

Attributes below are before species bonuses, ordered **Prowess / Resilience / Intellect / Intuition / Presence / Composure**.

| Build | Calling / background / selected class skills | Starting attributes | Level 2–5 / level 6–10 investment |
| --- | --- | --- | --- |
| Knight preset | Dedication / Soldier / Empathy, Perception | 15 / 14 / 8 / 10 / 13 / 12 | Prowess / Resilience |
| Trail Guardian | Dedication / Folk Hero / Athletics, Perception | 15 / 14 / 8 / 13 / 10 / 12 | Prowess / Resilience |
| Investigator | Curiosity / Sage / Craft, Finesse, Empathy | 8 / 12 / 15 / 13 / 10 / 14 | Intellect / Composure |
| Envoy | Audacity / Criminal / Craft, Investigation, Perception, Empathy | 14 / 10 / 12 / 13 / 15 / 8 | Presence / Prowess |

Background proficiency is also applied by actual Character initialization. These are plausible, deliberately different builds; they are not evidence of what players usually choose.

The engineer enumerated all 20 die faces per build, level and authored definition through the live resolver. Exact enumeration has no sampling uncertainty. Some passive definitions were rolled analytically for arithmetic comparison; their actual passive eligibility remains deterministic.

| Check and build | Level 1 | Level 5 | Level 10 | Experimental level-10 scaling cap +3 |
| --- | ---: | ---: | ---: | ---: |
| River Athletics / Knight | 70% | 75% | 65% | 75% |
| Rune Craft / Investigator | 50% | 55% | 45% | 55% |
| Rune Lore / Investigator | 40% | 45% | 35% | 45% |
| Rune Investigation / Investigator | 60% | 65% | 55% | 65% |
| Door Composure-Finesse / Envoy | 35% | 30% | 20% | 30% |
| Rune Craft / untrained Knight | 20% | 10% | 0% | 5% |

Current generic scaling is `round(baseDC + max(0, level - 1) * 0.5)`, adding **0 / 2 / 5** at levels 1/5/10 for integer base DCs. The candidate cap reduces level-10 DC by two; unclipped d20 examples improve by ten percentage points. The cap is a sensitivity result, **not an approved rule change**. Distinguish routine reused obstacles from deliberately harder endgame content before deciding.

Fatigue is consequential: the Investigator's level-10 Craft puzzle is 45% rested, 40% at fatigue 75 and 20.25% at fatigue 90/disadvantage. Expertise diagnostic results cannot be used to dismiss these currently attainable solo odds.

At neutral NPC relation, passive Empathy needs 12 before active Composure-based Influence against 14. Envoy passive scores are 11/12/13 at levels 1/5/10, and conditional active chances are 40/45/50%. Its Presence-based pricing modifiers are +5/+8/+9, giving 5/8/9% buy discounts before other pricing factors. Actual economic value depends on transaction volume and rounding, which were not measured.

The October 9 calculations ran inline during the approved read-only review; no standalone legal-build harness or result artifact was saved. Record these as consultation evidence. A subsequent authorized tooling stage should persist the exact setup and replicate the numbers before relying on them for shipping changes. The October 7 artifacts are already reproducible.

## Per-skill qualitative map

| Skill | Real current benefits | Important limits |
| --- | --- | --- |
| Athletics | Physical traversal; real door access; HP, exhaustion and equipment-loss differences. | Generic boulder/path flags do not alter world geometry. |
| Finesse | Doors, disarm, loot, ledges and alternatives with different harm/combat risks. | Ordinary success can avoid its own failure-spawn combat, not a separate random encounter or existing guard encounter. |
| Survival | Harsh-terrain approaches affecting harm/exhaustion and rewards. | Absent from the sampled random dungeon pools; Foraging practice benefits are not Survival proficiency benefits. |
| Craft | Puzzle approach, blacksmith assistance, rewards and relations. | No verified equipment-quality/production effect behind the named assistance flags; Forgecraft is a separate practice. |
| Lore | Text/puzzle alternatives, loot/rewards and some door access. | Some promised clues/information have no consumer. |
| Investigation | Room quest completion, loot, appraisal/rumor approaches and intel. | No evidence interpretation or alternate generated investigation resolution; appraisal flags do not establish downstream prices. |
| Perception | Real trap detection enabling disarm; preparation reducing the next DC; NPC approaches. | Some location-reveal flags lack targets. |
| Empathy | Intel, NPC relations and branching bandit dialogue options/resolution. | First-visit passive persistence; detect-lie currently uses fixed DC despite opposed-skill declarations. |
| Influence | Trading prices, NPC relations/intel and peaceful social quest completion. | Haggling challenge rewards do not themselves modify later prices; generic reputation payloads remain unsupported. |

Generated investigation completion records `cleansed`; MapRenderer displays a marker, but ConsequenceManager queues no gameplay event for this positive tag. Negative `powerVacuum` and `disturbed` tags have event consumers. Visible feedback, completed objectives and durable gameplay change should be reported separately.

## What the frequency sample establishes

The existing diagnostic visits every generated room with 24 eligible movement checks at 200 ms per move, suppresses combat and intercepts resolution. One policy records offered-challenge cooldowns; it does not actually choose or resolve the offered approaches.

At level 5, mean offers containing a skill under that policy are Finesse 3.54, Lore 2.03, Perception 1.89, Investigation 1.75, Craft 0.75 and Influence 0.65. Craft occurs in 75.4% of sampled dungeons (95% interval 71.6–79.2%). Multiple skills can belong to the same offer; do not sum their counts as unique opportunities.

Athletics, Survival and Empathy are absent from these random dungeon pools. That excludes Athletics interaction doors, travel Survival and social Empathy; it is not whole-game absence. Small catalogue counts did not imply Craft was absent from dungeons. Offered availability does not prove a player selects an approach, succeeds or gets a worthwhile payoff.

## Remaining forms of investigation

| Next evidence | Question | Required output |
| --- | --- | --- |
| Mixed-route exposure | How often does each skill matter across realistic travel, settlements, dungeons and quests? | Declared seeds, route/session budgets and policies; generated → reachable → offered → attempted → succeeded → consequential counts, zero-opportunity rates and distributions. |
| Marginal build value | What changes when a player invests in this skill rather than another? | Matched builds/routes; separate HP, fatigue, gold, time, access, intel, relations and resolutions. No opaque combined gold-equivalent score. |
| Alternatives and retry economy | Is one approach dominant, is one skill mandatory, or can free retries erase the decision? | Unique opportunities distinguished from repeat rolls; viable alternatives and cumulative costs/failure consequences. |
| Information usefulness | Does knowledge change a later choice, or merely repeat what the player knows? | Consumed clues, actionable destinations, alternative resolutions and redundant-information counts. |
| Acquisition and party sensitivity | Which training/expertise/helper states can actually be reached and at what cost? | Verified grant/recruitment paths, levels, assignments and budgets; separate attainable states from hypothetical diagnostics. |
| Experiential review | Does the player recognise the benefit without inspecting developer tooling? | Representative play traces and sponsor feedback on clarity, identity, tension, payoff and memorable differences. |
| Before/after validation | Do approved changes improve these outcomes without making one skill mandatory? | Repeat the same baselines and review persistence, rewards once, alternatives and player feedback. |

Do not force equal frequencies. A rare skill can justify itself through a distinctive, consequential benefit. A rare skill offering only small fungible rewards may not. Frequency and qualitative judgment must be assessed together.

## Follow-up: marginal outcomes, costs and opportunity identity

The continued read-only trace separates benefits that are actually consumed from benefits suggested by prose. Findings F10–F16 are additional evidence; they do not supersede the earlier probability calculations.

### Rune alternatives

For the trained Investigator baseline, Craft and Investigation use the same Intellect and both are proficient. Craft's normal success pays 110 XP / 22 gold at base DC16; Investigation pays 100 XP / 20 gold at base DC14. Failure pays neither and causes no harm. Both share the same challenge cooldown. Ordinary attempts add no automatic fatigue.

| Approach | Expected XP at levels 1 / 5 / 10 | Expected gold at levels 1 / 5 / 10 |
| --- | --- | --- |
| Craft | 55 / 60.5 / 49.5 | 11 / 12.1 / 9.9 |
| Investigation | 60 / 65 / 55 | 12 / 13 / 11 |

These are normal-outcome expectations using the exact chances above, not long-run observed rewards or a combined usefulness score. Craft's slightly greater reward per success does not compensate for the lower probability in this fixture. Different proficiency/attribute allocations can favor Craft, but a character trained in both receives no demonstrated distinct benefit from choosing it. A real Craft-specific outcome is preferable to an unexamined gold-reward escalation.

Lore is different: its puzzle success also has a 50% loot chance. With a +5 modifier against base DC18, 40% success yields a 20% unconditional loot chance. XP/gold comparison alone cannot establish Lore is dominated without valuing that actual extra loot.

### Harm, access and repeat policies

For an illustrative level-1 +5 modifier, the river alternatives have different normal-outcome stakes:

| Approach | Success | Expected XP / gold | Expected failure harm |
| --- | ---: | --- | ---: |
| Athletics DC12 | 70% | 70 / 14 | 2.10 HP (2d6 on failure) |
| Finesse DC13 | 65% | 65 / 13 | 1.225 HP (1d6 on failure) |
| Investigation DC14 | 60% | 60 / 12 | 1.40 HP (1d6 on failure) |

This is an equal-modifier illustration, not a legal-build ranking. It shows a genuine reward/harm tradeoff. However, the ambient challenge is checked after successful movement: it does not decide whether the player crosses the river. Do not count its success as newly opened passage.

Door alternatives all produce the same passage when their challenge succeeds: Lore DC14 rewards 100 XP / 20 gold with no failure harm, Finesse DC15 rewards 75 / 15 with no failure harm, Athletics DC18 rewards 50 / 10 with 1d4 failure harm. Lore conditionally dominates at equal modifiers, but different trained attributes can change actual preference. The 60% per-interaction trigger/cancellation behavior also means door access is not invariably purchased by a successful skill roll.

Cooldown scope changes exposure: `flags.skillChallengeAttempts[challengeId]` is global, while completed NPC work is tracked per NPC. The route evaluation must record both the number of contextual sites and the number currently eligible under prior attempts. Raising content frequency alone could fail to help if cooldown suppresses the added sites.

### Information and recognition

`DialogueManager.getDynamicLines` scans currently generated regions and randomly chooses nearby destination/terrain lines. It does not distinguish already-known destinations or previously shown lines. This does not make intel useless, but novelty and actionability require explicit assessment rather than counting every line as a benefit.

`SettlementManager.assignQuestsToNPCs` sets the quest giver's NPC/name/role/building without `settlementId`; `DialogueManager` filters local completed quests by `quest.questGiver.settlementId === npc.settlementId`. Generated completed quests therefore miss that local-reaction route. Completion relation logic has a separate NPC-ID fallback, so this is not proof relation rewards fail.

Sources for this follow-up: `Player` movement and door interaction; `SkillChallengeManager` cooldown recording; `SettlementUI` contextual callers; `QuestManager.retryRoomInvestigations`; `DialogueManager.getDynamicLines`; `SettlementManager.assignQuestsToNPCs`; actual rune/river/door outcomes in `data/skillChallenges.json`. Findings are code-traced and arithmetic-derived; no new player-flow tests or gameplay fixes were performed.

## Recommendations awaiting approval

**Priority update from the continued investigation:** validate and repair targetless generated Investigation before expanding its narrative depth or using its advertised opportunities as balance evidence. #39's tracking/reputation scope is distinct. A proposal to change gameplay or roadmap scope still needs sponsor approval.

1. Persist and extend measurement tooling for the mixed-route/attainable-build baseline, then replicate the inline arithmetic above. Balance Engineer owns measurement; Mechanics Master verifies consumers; Game Designer defines representative choices.
2. Repair failed passive NPC eligibility so relevant character/relationship/fatigue improvement can be reconsidered while successful discovery remains durable. Keep active social rejection distinct. Game Designer specifies the policy before backend/frontend implementation.
3. Design one bounded quest-consequence slice. Provisional scenario: a missing relief shipment whose evidence explains diversion to stranded residents. Investigation reconstructs events, Lore interprets convoy marks and Craft recovers damaged records/mechanisms. Evidence affects final dialogue and two resolutions, with real rewards/targeted NPC relations and a viable paid-guide or longer-search alternative. Scenario, costs, targets and implementation are unapproved; Worldbuilder/Architect must establish canon and generic state contracts.
4. Consider the +3 scaling-cap experiment after measured value and content intent are understood; no blanket buff/nerf is justified now. Expertise acquisition is a separate design decision, not a prerequisite for testing current trained builds.

Product Owner's proposed order remains #41 baseline → select/design #57 slice → feasibility/implementation approval → repeat #41 evaluation and sponsor play review. #39 runs in parallel and blocks only selected tracking/reputation-dependent effects. No implication that #41 must close before quest work begins.

## Evidence references and update discipline

- [Whole-game runtime audit](2026-10-07-whole-game-skill-audit.md).
- [Designer review](2026-10-07-skill-challenge-design-review.md).
- [Dungeon exposure and value scope](2026-10-07-skill-value-balance-scope.md).
- [Exact analytical resolver report](../../tools/balance-sim/skill-party-exact.md).
- [Dungeon exposure harness](../../tools/balance-sim/skill-exposure-audit.js) and [saved results](../../tools/balance-sim/skill-exposure-audit.results.json).
- Primary consumers: `Character.initializeSkills/applyLevelUpSelections`, `SkillChallengeManager.calculateAdjustedDC/applyConsequences`, `Player` dispatch/interaction, `SettlementUI` passive/active checks, `QuestGenerator._generateInvestigateChain`, `QuestManager`, `ConsequenceManager` and `MapRenderer`.

Snapshot: HEAD `1ed869f` plus existing uncommitted repairs. SHA-256 of `data/skillChallenges.json`: `3a1ddbcae9b5f2efe430d25b2cbbe72f9ebc6f87e299c89e7f04ebabcd046af2`; `src/systems/Character.js`: `39da47924b6ced9885091328659e6d9e7cab470bb8f5e10d0d5d2cbf6d951f9b`; `src/systems/SkillChallengeManager.js`: `bf1d854e765e974b7b2fda237a26ff0de990a04b4a91750ab088833d73eeec46`; `src/ui/SettlementUI.js`: `e5aeb1b595b613eafe5ff553f2407f591ebcfb1d4a5642aa71d4112823368aef`.

Build on this report by dating new evidence, naming the changed source snapshot and recording method, scope, sample, results, limitations and finding IDs affected. Preserve earlier results as historical evidence; explicitly supersede conclusions when warranted. Mark proposals implemented only after their actual player-facing consumers and validation are demonstrated. Keep implementation approval and acceptance status distinct.

## Follow-up: mixed-surface availability and quest targets

This continuation adds bounded evidence to F8 and a newly verified reachability defect, F17. It does not complete the whole-game frequency/payoff investigation. No gameplay, data, roadmap or measurement-tool files were changed; the analysis ran inline and this report was extended.

### Method and sample

Seeds were `approved-skill-route-0` through `approved-skill-route-99`. Each world used explicit `{mapSize: 'small', campaignId: 'core'}` with effective normal difficulty, full `WorldGenerator.generateWorldMetadata` and generated spawn-region terrain. The actual starting town was at 16,16. Actual NPCGenerator, SettlementUI contextual menu selection, QuestGenerator, DungeonGenerator and Player travel/dungeon dispatch supplied availability.

Each route took 200 contiguous traversable moves in the spawn region, choosing the least-visited adjacent tile with east/south/west/north tie order. If the town had an existing linked dungeon hook, the closest was generated and visited under the earlier 24-checks-per-room diagnostic budget. Each world's route was reused at levels 1/5/10 with separately seeded dispatch. Clock advanced by 200 ms per movement check; captured ambient offers recorded the normal global cooldown.

Town menus were inventoried separately before any attempts/cooldowns. The sample contains 100 worlds/towns, 300 route scenarios, 60,000 travel checks, 1,815 dungeon rooms, 1,295 NPCs, 290 intel-bearing NPCs and 300 quests. Fifty-seven worlds had a starting-town-linked dungeon; the other 43 remain in the sample with no linked-dungeon room checks.

No approach selection, skill roll, consequence, fatigue, combat, swim resolution, actual transit to the dungeon, companion recruitment or quest completion was simulated. Skill counts include alternatives/conditional stages within captured challenges. Do not add them to infer unique offer totals. Legal-build capability remains the separate exact analysis above, not a played-through component of this route diagnostic.

### Level-5 ambient availability

Values are mean offers containing a skill per declared route. Intervals are `p ± 1.96 sqrt(p(1-p)/100)`, clamped to [0,1], for worlds with at least one containing offer. They are sampling summaries of the declared diagnostic, not player encounter probabilities or combat win rates.

| Skill | Travel mean | Linked-dungeon mean | Combined mean | At least one combined offer | 95% interval |
| --- | ---: | ---: | ---: | ---: | --- |
| Athletics | 0.38 | 0 | 0.38 | 33% | 23.8–42.2% |
| Finesse | 0.53 | 2.05 | 2.58 | 74% | 65.4–82.6% |
| Survival | 0.23 | 0 | 0.23 | 20% | 12.2–27.8% |
| Craft | 0 | 0.38 | 0.38 | 38% | 28.5–47.5% |
| Lore | 0.01 | 1.15 | 1.16 | 54% | 44.2–63.8% |
| Investigation | 0.19 | 0.95 | 1.14 | 64% | 54.6–73.4% |
| Perception | 0.28 | 1.09 | 1.37 | 68% | 58.9–77.1% |
| Empathy | 0.07 | 0 | 0.07 | 7% | 2.0–12.0% |
| Influence | 0.53 | 0.39 | 0.92 | 66% | 56.7–75.3% |

Thus 93% of these level-5 routes had no ambient Empathy-containing offer and 80% had none for Survival. These figures exclude town menus/passive/service value; they do not establish whole-game skill absence. No level difference is asserted: the observed level-specific presence differences did not exceed the sum of the specified sampling margins at this sample size.

Selected level-5 availability traces, chosen by offer-count outcome:

- Minimum, seed 6: 200 moves/200 unique tiles, thirteen encountered terrain IDs, no linked dungeon, zero ambient offers.
- Median, seed 54: 200 moves/200 unique tiles and six dungeon rooms; travel haggling, then dungeon ledge, ancient text, hidden treasure and trap: five offers.
- Maximum, seed 3: 200 moves/196 unique tiles and thirteen dungeon rooms; five travel offers and seven dungeon offers, including a rune puzzle: twelve offers.

There are no actual selected actions, combat rounds or wins/losses in these traces.

### Town menu availability

| Skill | Mean NPC/challenge contexts | p10 / median / p90 | Sampled towns with at least one |
| --- | ---: | --- | ---: |
| Craft | 2 | 2 / 2 / 2 | 100/100 |
| Investigation | 2 | 2 / 2 / 2 | 100/100 |
| Empathy | 2.59 | 2 / 3 / 3 | 100/100 |
| Influence | 8.18 | 7 / 9 / 9 | 100/100 |

The other five skills had no contextual menu entries in this inventory; their passive or non-menu benefits were not sampled. Every town contained an intel-bearing NPC, with mean 2.9 such NPCs. These results make it inappropriate to call Craft or Empathy globally rare from ambient offers alone. Their opportunities' actual usefulness remains a separate question.

These menus are potential contexts, not a queue of simultaneously completable checks. No NPC completion flags or menu-attempt cooldowns were recorded. For example, eight Influence contexts can share one challenge ID and be suppressed by an earlier attempt. Sampled 100% presence is not universal certainty; the Wald boundary interval degenerates. At n=100, a zero-observed event has an approximate rule-of-three upper bound of 3%.

### Quest target validity

The 300 generated quests were 100 kill, 85 retrieve, 100 investigate and 15 social. Fifty-seven of the 100 starting towns had at least one existing linked dungeon hook (57%; 95% interval 47.3–66.7%). All three quests in those towns referenced existing world features: 171 quests. The other 43 towns generated 43 unbound kill, 43 unbound retrieve and 43 unbound investigate quests: 129 fallback/unbound quests. These observations cluster by world; do not treat them as 300 independent trials for a confidence interval.

Direct controls used actual `QuestManager._getRoomInvestigations`:

- Seed 0: world hooks enabled, correct live metadata, town ID 16,16, zero linked hooks. Generated Investigation had no target and matched zero room-zero checks across all generated dungeon features.
- Seed 1: two linked hooks; Investigation targeted -37,149, matched that dungeon's room zero exactly once and room one zero times.

The consumer requires `(objective.targetLocation || quest.dungeonHookId) === dungeonCoordinates`. A null target cannot match any real room. No later assignment to these target fields was found in the traced source. This establishes that the unbound Investigation objective has no completion route through this room-search consumer. An earlier tentative possibility that it might complete in any dungeon was tested and rejected.

It does **not** prove all 129 fallback quests are impossible: kill objectives may complete elsewhere. Unbound retrieval creates a unique item ID without a pending dungeon binding; its item-production/recovery path still requires a separate audit. The 43% result belongs to this explicit small-world starting-town sample, not every map size or the shipping default.

### Interpretation and next evidence

The increased coverage changes the diagnosis: town opportunities can compensate for ambient scarcity, but their actual consumed payoff and global cooldown eligibility matter. Generated quest offers can also be misleading if they have no reachable target. Target-backed quest completion is a prerequisite for assessing Investigation's value and extending its resolutions.

Remaining evidence includes selected attempts and actual outcomes/resources/deaths, longer connected routes at other map sizes, passive trap tiles/doors, information novelty, recruitment, faction/reputation effects and sponsor play review. Before calling the baseline complete, persist a reproducible route harness under approved tooling scope, repeat the sample and measure those missing transitions. No global DC, reward or frequency change is justified by availability alone.

Product Owner's consultation recommends a bounded target-validity gate before #57 narrative depth: every offered Investigation must reference a reachable authoritative hook; absent-hook behavior (withhold or truthfully replace the offer) must be chosen by Game Designer and approved by the sponsor. Architect should confirm world-first binding and persistence before implementation. Repeat the same seeds and verify acceptance/progress/save-load, then reevaluate #41 and select the consequence slice. Keep #39 unchanged. Retrieval's missing item-binding case requires its own producer trace before a repair is proposed. This is a recommendation only; no new gameplay or roadmap scope has been approved or changed.

**Subsequent sponsor ruling, 2026-10-09:** the coordinated execution structure and policy of withholding targetless Investigation offers are approved. The [bounded repair specification](../plans/2026-10-09-investigation-target-repair.md) is prepared for review; implementation/validation remain awaiting approval. It prevents new offers only and leaves recovery of existing targetless saved quests for a separate decision. Other recommendations above remain proposals.

## Approved target-prevention repair — 2026-10-10

The sponsor subsequently authorized continuing the bounded repair. `QuestGenerator._generateInvestigateChain` now returns null before RNG use when eligible hooks are absent. Existing filtering withholds the offer; it does not replace it or recover old saved quests. Twenty integration tests cover actual producer/consumer matching, preserved valid payloads at levels 1/5/10, excluded hooks, budgets, settlement assignment, save/load and revisit.

The [reproducible target audit](../../tools/balance-sim/investigation-target-audit.js) and [complete results](../../tools/balance-sim/investigation-target-audit.results.json) validate 120 real worlds at levels 1/5/10: zero newly targetless Investigations across 360 paired evaluations. Each level in the original small/core/normal sample has 57 valid Investigation offers, 43 withheld and 257 total offers. The 20 actual-entry medium/defeatLichKing/normal worlds have 18 valid Investigation offers, two withheld and 58 total offers per level. Withholding is not increased skill exposure. Reused worlds are not independent trials. Every offered target matches its actual first-room consumer and rejects another room/coordinate. No travel or outcome value is inferred.

The actual entry selects defeatLichKing despite the data default naming nexus-verge and marking the selected campaign disabled. This existing setup discrepancy is outside the repair; it limits generalization to the intended campaign.

**F18 — Existing quest reward method mismatch blocks turn-in.** Desktop and mobile browser fixtures confirmed correct reduced offer presentation, valid acceptance, initial failed room search and successful deliberate retry by a legal nonspecialist Knight. Clicking the real completion button then throws `character.addXP is not a function`: `QuestManager.awardRewards` calls `addXP`, while `Character` provides `gainXP`. The quest remains active; no XP or gold is awarded. The fixtures do not establish physical travel, and full quest completion acceptance remains blocked. Reward application, including restored plain-character handling, needs a separately approved repair; no reward code was changed here.

All 1,296 tests in 112 files pass. Standard lint retains 190 errors/1,062 warnings; broader lint retains 3,266 errors/1,862 warnings, including seven warnings in the new audit harness and no new errors. Target prevention is implemented locally, with full quest acceptance pending the reward blocker. #41/#57 remain open; no GitHub mutation, commit or deployment occurred.

## Approved town coverage and reward continuation — 2026-10-10

The sponsor requested Investigation offers in almost all towns, including towns visited after the starting town, then authorized continuation. This supersedes the owned-hook-only offer policy and resolves F18. Existing Investigation offers with owned hooks keep their exact seeded payloads. If owned hooks are absent, an Investigation can use the nearest real unbound standalone dungeon or dungeon-resolved POI within a separate `RULES.quests.investigationFallbackDistanceTiles` radius of 300. Equal-distance candidates use coordinate tie-breaking. A copied candidate carries distance from the issuing settlement without changing metadata ownership. Kill/retrieval/social candidates, world generation, quest caps, DCs and rewards are unchanged. Sanctuaries and retrieval-bound sites remain excluded; no target means no offer.

**F19 — Near-universal town offer coverage is achieved in the tested configurations.** The [all-town audit](../../tools/balance-sim/investigation-town-coverage.js) records [baseline](../../tools/balance-sim/investigation-town-coverage.baseline.results.json), [final producer](../../tools/balance-sim/investigation-town-coverage.after.results.json) and [late-visit binding](../../tools/balance-sim/investigation-town-coverage.late-visit.results.json) evidence. The same 120 real worlds contain 6,800 settlements; real quest generation and room-consumer matching were checked at levels 1/5/10, totaling 20,400 paired settlement-level evaluations. Every generated Investigation referenced an eligible real feature, matched its first room and rejected another room/coordinate. The counts below are identical at all three levels.

| Sample | Starting towns | Other towns | All towns | All settlements, including villages/cities |
| --- | --- | --- | --- | --- |
| 100 small/core/normal worlds | 99/100 (99%) | 975/1,000 (97.5%) | 1,074/1,100 (97.64%) | 3,704/3,800 (97.47%) |
| 20 actual-entry medium/defeatLichKing/normal worlds | 20/20 (100%) | 876/880 (99.55%) | 896/900 (99.56%) | 2,965/3,000 (98.83%) |

Before expansion, owned-hook coverage was 57.18% of small-world towns and 67.11% of medium-world towns. Reusing only the original 150-tile distance would reach 66.73% of small-world towns and would not meet the sponsor's intent. The selected 300 limit reaches almost all towns without adding dungeons or changing global hook ownership. Across-world 95% intervals for town coverage are 96.70–98.57% small and 99.16–99.96% medium; towns and levels are correlated within each world, not independent trials. These are opportunity rates, not success or win rates.

Travel remains a cost: median/90th/95th percentile actual target distances across settlements are approximately 125/223/252 tiles small and 114/192/219 medium. The farthest offered small-world example is about 300 tiles. No physical travel, terrain, attrition, quest selection or adequate payoff was simulated. The nearest eligible site for one correctly withheld example was 594 tiles away. Raising availability does not prove a character will reach or benefit from the offer.

Destinations can be shared. At level five, up to six settlements in a small world or five in a medium world target one site; restricted to towns, the maximum is three in either sample. On average 1.82 of 11 small-world towns and 5.15 of 45 medium-world towns share a destination with another town. Actual consumers check each quest separately and charge retries separately; one expedition can nevertheless progress several quests. No uniqueness rule or reward tuning was added. This concentration and generic repeated mystery content remain inputs to #41/#57, not claims of improved narrative depth.

The late-visit probe uses 76 settlements across two sampled worlds after the closest candidate is actually retrieval-bound: at each level, 69 select another eligible site and seven correctly withhold. Saved prior Investigation targets remain valid for their room consumers. This supports handling changed metadata at later quest generation, not a complete connected playthrough. Already generated settlements and legacy targetless quests remain unchanged on load; newly visited settlements use the expanded policy.

**F18 resolved — Quest turn-in and saved earned progression work.** Quest rewards now use `gainXP`, support plain-character XP/gold updates, and publish character state. Instance and plain serializers preserve pending level-up choices. Twenty reward tests cover real, SaveManager-restored and explicit plain characters at levels 1/5/10, threshold crossing, confirmation and exactly-once rewards after saving completed quests. Twenty-nine target tests cover the extended lookup, radius boundaries, existing payload preservation, lower caps, excluded sites and later binding/persistence.

Desktop 1440×900 and mobile 390×844 browser fixtures exercise a fallback offer on the real board, acceptance, failed initial search, deliberate successful retry and completion: one completed quest, 80 XP, 20 gold, fatigue two and no browser exceptions. The previous reward error no longer occurs. These use controlled metadata/display containers, not world navigation. Full tests pass: 1,325 in 113 files. Standard lint still fails with 190 existing errors/1,062 warnings; broader lint retains 3,266 errors/1,898 warnings at the validation snapshot, with no new errors. Diff check passes. Nothing committed, deployed or changed in GitHub. Full skill-value, travel/payoff and richer quest-resolution review remain open under #41/#57.

## Legal-build and selected-consequence continuation — 2026-10-10

The [legal skill baseline report](2026-10-10-legal-skill-baseline.md), [reproducible harness](../../tools/balance-sim/legal-skill-baseline.js) and [saved results](../../tools/balance-sim/legal-skill-baseline.results.json) extend the evidence after the approved repair. They verify creation training/acquisition limits, conditional companion help, exact odds for four creation-valid profiles projected to levels 1/5/10 and fatigue 0/75/90, actual generated Investigation DCs, and live rune XP/gold/loot consequences. Higher-level fixtures exercise attribute progression APIs without earned XP or every mandatory progression choice; they are not full playable-build validation. The prior inline legal-build odds reproduce. Expertise still has no verified ordinary acquisition producer; Craft still has no Dedication training route. The broader skill baseline remains incomplete: this continuation does not measure connected route choices, travel attrition, novel knowledge, encounter wins or whole-run marginal skill value. Proposed quest consequences or numerical tuning remain subject to sponsor consultation and approval; #41/#57 are not marked accepted by this evidence.
