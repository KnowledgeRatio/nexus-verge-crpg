# Level-adjusted quest iteration: balance evidence

Status: bounded production integration and quantitative design review completed locally. Whole-journey/full-policy combat acceptance remains open. No production balance values edited by the Balance Engineer.

## Verdict

The implemented DC12/14/16 level bands keep an Intellect-focused, trained character viable while making optional Investigation/Craft substantially harder for an off-stat Knight. These checks must remain optional to commission fulfilment. Bounded production compilation, urgency quotas, expiry receipts and safety consumers passed the audit below; this report does not clear whole-quest or full-policy combat balance.

## Method and scope

Run `node tools/balance-sim/quest-iteration-audit.js`. The harness calls the actual Character constructor, levelUp/applyLevelUpSelections and SkillChallengeManager. Four creation-selectable profiles cover Dedication Knight, Dedication Sage, Curiosity investigator and Audacity envoy, levels1/5/10, Investigation/Craft, DC12/14/16 and fatigue0/75/90: **216 cells,31,680 exact die resolutions**. It enumerates every d20 face or every ordered d20 pair when advantage/disadvantage applies. These are exact conditional probabilities, so a sampling confidence interval is inapplicable. Results and selected win/loss/extreme-margin roll traces are stored in `tools/balance-sim/quest-iteration-audit.results.json`; verdict-driving Knight/Sage traces also print to stdout.

Upper levels are conditional legal stat/ASI projections through the live API, not earned full builds or complete journey samples. Curiosity/Audacity combat completeness is not certified. No expertise, companion assistance, travel or dungeon attrition is included.

## Skill findings

Proposed bands are level1–3 DC12,4–7 DC14,8–10 DC16.

| Profile/check | L1 rested | L5 rested | L10 rested | L10 fatigue90 |
|---|---:|---:|---:|---:|
| Knight Investigation or Craft |40%|30%|20%|4%|
| Dedication Sage Investigation |70%|75%|70%|49%|
| Dedication Sage Craft (untrained) |60%|60%|50%|25%|
| Curiosity investigator, either trained check |70%|75%|70%|49%|
| Audacity envoy, either trained check |60%|55%|50%|25%|

Compared with flat DC12 at level10, Knight loses20 percentage points; Dedication Sage Investigation loses20 points too but retains70% because stat/proficiency investment supplies the offset. Increasing DC represents harder authored problems, not a general difficulty modifier to every skill use in the game. A Knight can fulfil ordinary recovery through actual custody without winning these optional checks; retain that distinction in generated prerequisites.

Retries currently charge the configured skill-challenge fatigue after the first attempt. They do not advance the long-rest quest clock. Consequently deadlines constrain rests, not repeated attempts or elapsed real time. The extra salvage unit is bounded by source custody and grants no additional commission, so a successful retry does not create unlimited XP/gold; runtime receipt tests must verify that bound after new outcomes are attached.

## Reward budget recommendation handoff

Designer proposal: existing80XP/20gold per offered level, multiplied by routine1/demanding1.5/perilous2; generated boss quests remain explicitly Deadly. Proposed reward-only budget:

| Level | Routine XP/gold | Demanding XP/gold | Perilous XP/gold | Routine XP as share of next-level gap |
|---|---:|---:|---:|---:|
|1|80/20|120/30|160/40|26.7%|
|5|400/100|600/150|800/200|5.3%|
|10|800/200|1200/300|1600/400|3.8%|

Gap calculation uses actual RULES.progression.xpTable (300,7500,21000 respectively). Level10 is the product cap; its next-table entry is an arithmetic diagnostic only, not a promise of playable level11. Enemy XP, loot, supply value, rest costs and travel costs are excluded. These budgets therefore do not establish comparable total quest profitability or prove that perilous commissions adequately compensate risk.

Recommended functional boundaries: freeze offered level/DC/rewards/encounter requirement after publication; cap stock and regional safety changes; save effect receipts; terminal success/failure/expiry must pay/apply once; no simultaneous success and expiry; unaccepted ordinary offers carry no penalty. Final implementation assigns success standing10/15/20 by routine/demanding/perilous risk, not level tier. Failure is faction−5 and personal−10 with additional culture spillover explicitly disabled.

## Bounded production integration audit

Run `node tools/balance-sim/quest-iteration-production.js`. It attempted **2,640 compositions**:22 compatible component assignments×40 reproducible seeds×levels1/5/10. After the designer-approved boss XP eligibility floor, it compiled **1,440 offers** and correctly withheld1,200 combat compositions at the deliberately weak Goblin fixture at levels5/10. All noncombat combinations remained supported. These are constrained town/site fixtures through the real QuestGenerator, not2,640 independent worlds or completed quests. MerchantManager, RelationManager, LootManager, ConsequenceManager and Character consumers are actual implementations; dungeon capability discovery is fixture-supplied.

Every offered level, optional-check DC and commission matched live rules. Existing saved quest objects remained unchanged when the current character level changed. Urgency never exceeded25% at any prefix of the generated history. Observed urgent counts were217/880 at level1,58/280 at level5 and63/280 at level10:338/1,440 overall. These deterministic census fractions need no sampling CI and are not estimates of urgency exposure in naturally played runs.

### Harder-boss eligibility and content coverage

The final compiler requires every actual eligible boss candidate to meet at least75% of the offered-level solo Deadly XP threshold after the existing boss XP multiplier. It does not increase monster stats, change selected boss identity or preview a dungeon to fabricate a suitable target. Live getXPForCR is the numeric source. The minimum proxy is75XP at level1,825 at level5 and2,100 at level10.

An exhaustive150-cell eligibility census (15 actual dungeon types×all levels1–10) matched the live compiler helper. Eligible unvisited dungeon types: **14/15 at level1,15/15 at level5,8/15 at level10**. At level10, existing Bandit Hideout, Undead Crypt, Goblin Warren, Orc Stronghold, Sunken Ruins, Beast Den and Thieves Guild pools are below the floor; composed combat offers are withheld there while noncombat/investigation opportunities can remain.

This makes advertised upper-level boss work harder in the defined XP proxy, at a cost to combat quest coverage. It does not certify actual win rates or fix low-level danger: existing boss buffs remain unchanged, and XP is not a substitute for full combat policies. For example, the prior underpowered-at-level10 Veteran target is no longer advertised as an appropriate composed boss commission; the same dungeon remains part of the world.

Run `node tools/balance-sim/quest-iteration-world.js` for a bounded **three independent seeded worlds,342 synthetic settlement visits** census through actual public settlement entry and loaded consumers. Each level projection visited114 towns in ascending-coordinate order, retaining published boards. Results:

| Level | Composed offers | Combat composed | Specialist offers | Urgent | Towns with composed or ordinary Investigation |
|---|---:|---:|---:|---:|---:|
|1|74|53|9|14|108/114|
|5|74|53|9|14|108/114|
|10|73|30|6|13|108/114|

Every published composed combat offer passed the live boss-floor validator. Combined opportunity coverage stayed94.74% at all three projected levels in these seeds; six boards were empty per level. Upper-level combat variety fell while noncombat/ordinary Investigation fallback largely preserved opportunity coverage. Three worlds are a bounded integration sample, not proof of universal coverage, representative replayability or played journey value. No natural journeys or combat victories were measured. The independent20-world historical report remains separate; it is not replaced by this smaller post-change sample.

Thirty sampled urgent quests per level (**90 expiry trials**) stayed active one clock unit before expiry, failed exactly once at the boundary, awarded zero commission gold and did not duplicate typed-effect receipts on repeated clock checking. Clock units are long rests. This audit does not certify player travel pressure, all handover interruption cases or completed-objective deadline suspension; functional integration tests own those paths.

One hundred same-area safety successes retained a0.75 encounter multiplier, rather than compounding toward zero. Ordinary commission budgets and safety caps therefore have bounded consumers in this tested path. No claim of complete economy-exploit coverage follows from that result.

### Finite enchanted-offer affordability

Actual Knight starting-equipment flow yields **114gold**, not500. An ordinary Sword uses merchant base value150; premiums1350/3000/6000 generate fine/great/heroic values1500/3150/6150. The live core RelationManager pricing for this specific Knight/NPC fixture yields:

| Offered level | Rarity | Shop price | Routine commissions from zero gold | After initial114gold |
|---|---|---:|---:|---:|
|1|Fine|1440|72|67|
|5|Great|3024|31|30|
|10|Heroic|5904|30|29|

These are commission-only affordability bounds for a particular default relationship/Influence state, not expected playtime. Combat loot, other quests, ordinary expenses, trading ranks and later faction/relationship benefits are excluded. The fine Sword generated value matches the canonical fine Sword template1500; this checks internal price consistency, not desirable economy pacing. Access is a lasting discretionary purchase opportunity, not a readily affordable item reward. Game Designer should retain that distinction; broader full-run wealth and purchasing evidence is needed before clearing affordability.

Harness lint has zero errors. Remaining warnings concern analysis constants and line length. No dependencies or production values were changed by this analysis.

## Combat limitation and next acceptance gate

The prior3000-fight single-thievesGuild study used only ordinary attacks, not a complete legal ability policy. Its level5 Knight result17/500=3.4% has requested Wald95% CI1.81–4.99% (Wilson2.13–5.38%). It is a warning about that fixed encounter, not a general Knight or quest win rate. The harness and outcome-selected round traces remain in `tools/balance-sim/unified-quest-combat.js` and `.results.json`.

Do not retune monsters or claim that increased commission repairs this evidence gap. Next balance acceptance requires full legal combat actions/resources across multiple actual dungeon types, followed by played or faithfully automated acceptance→travel→dungeon→check→turn-in journeys. Every sampled win rate must include a binomial confidence interval and selected round traces; differences smaller than the sum of margins remain unresolved at that sample size.
