# Expedition balance review — 13 October 2026

Status: diagnostic review complete for the bounded sample below. No production values changed. Full journey balance and sponsor acceptance remain open.

## Findings

**The new Survival provisioning benefit was never encountered on these destination routes.** Fifteen generated small worlds contained 45 provisioning sites in total (0–6 per world), but none of the 360 overland trials revealed a provision clue. Local inspections of visible ambiguous points of interest were allowed; the harness did not search hidden provisioning metadata. Therefore all 180 matched trained/untrained pairs behaved identically. This demonstrates an exposure problem in this sample, not that Survival has no value everywhere or that its check modifier should increase.

The independent-world observation was 0/15 worlds with any observed clue. Its Wilson 95% interval is 0–20.4%; the requested Wald interval degenerates to 0–0%. Repeated trial RNG and levels do not create 360 independent world-layout samples. The existing exact-check provisioning audit remains the evidence for success conditional on finding an opportunity.

**Runtime defects precede balance tuning.** Live short and long rests restore HP and other rest state without resetting ability-use counters or Resolve. Advanced progression's level-three specialization validator blocks otherwise data-eligible Exemplar choices. Actual engine confirmation can construct the diagnostic level-five/ten characters, but these are not verified playable UI progression. Dungeon door checks are directional: the reverse passage can independently become locked after successfully entering a room. The mechanics trace independently reproduced the reverse-door problem with actual interaction. None of these were repaired or masked in this review.

## Method and sample

- 15 independently seeded Nexus Verge small worlds, Normal difficulty; four repeatable trial RNG streams per world, levels 1/5/10, two matched Dedication Soldier Knight profiles: **360 actual overland executions**.
- Skill choices differ only in Empathy versus Survival; both retain Perception. Human standard-array Knight, dueling, chain mail, longsword, shield and selected masteries. Actual starting gold: 114. Every-level ASIs, Exemplar tactics and legal practice selections applied through `LevelUpManager.confirmLevelUp`; upper levels remain engine snapshots owing to the UI blocker. No active practice benefits, companions, enchanted gear or invented healing.
- Actual `Player.spawn`, awaited `Player.move`, terrain fatigue, visibility, encounter accumulator, public encounter construction, complete `CombatManager` resolution, actual ability dispatch, consumption, XP and loot. Steady Nerve below half HP; Surge for multiple enemies; Trip Attack and Parry when available. No forced victory. Earned pending level-ups were not confirmed inside the fixed-level cells.
- Spawn → nearest functioning town → nearest published quest destination entrance → return. Quest publication has loaded NPC, dungeon, merchant, loot and relation consumers. Main cells stop outside dungeons and award no quest commissions.
- Four-way A* uses actual traversable terrain and the published target. This gives navigation foresight and is **not a measured distribution of natural player routes**. It excludes risky impassable crossings; its bounded search can fail to find a path without proving the destination unreachable.
- Local policy may inspect an already visible ambiguous point of interest within three tiles if the round trip adds at most eight moves. It never chooses candidates from hidden provisioning flags or resolved type. Optional road skill events are declined; this is a route-first expedition policy, not a whole-game skill comparison.
- Camp at fatigue 75 with more than one supply; reserve the last until fatigue 90. Short rest below 55% HP if available. At return, actual merchant purchases refill supplies if affordable, then actual safe-town long rest consumes one supply and advances the clock. No synthetic resource recharge. Harness RNG and loot timestamp fixed only for reproducibility.

## Travel, combat and supply results

The table counts one member of each identical pair, avoiding doubled denominators. The paired build produces the same results. Intervals are descriptive: worlds, sequential combat states and terrain are shared; they are not independent population estimates.

| Diagnostic level | Trials | Returned | Actual deaths | Planner stops while alive | Individual fights won; requested Wald 95% CI |
|---|---:|---:|---:|---:|---|
| 1 | 60 | 46 | 2 | 12 | 148/150 = 98.7%; 96.8–100% |
| 5 | 60 | 36 | 12 | 12 | 142/154 = 92.2%; 88.0–96.4% |
| 10 | 60 | 35 | 13 | 12 | 125/138 = 90.6%; 85.7–95.5% |

Wilson fight intervals, which behave better at boundary rates, are respectively 95.3–99.6%, 86.9–95.5%, and 84.5–94.4%. Return proportions over all attempted cells are 76.7% (Wald 66.0–87.4%), 60.0% (47.6–72.4%) and 58.3% (45.9–70.8%). These include planner stops; do not call them quest completion rates. Across both builds, **884 real fight executions** represent 442 matched outcomes. Levels have different encounter pools, so this is not a same-enemy class-power comparison. The L5/L10 fight-rate difference is smaller than the sum of their margins and is not statistically distinguishable at this trial count.

Median walked distance including interrupted cells: 343 / 275 / 291 tiles; 95th percentile 573 at each level. Median camps: 3 / 3 / 1. Median supply expenditure among returners: **102 / 99 / 62 gold**, with median remaining gold 40 / 179 / 494 after real combat loot but before any quest commission. These are fresh-start gear/budget diagnostics, not measurements of a normal earned level-ten economy. Shops' actual prices varied with character pricing modifiers. No inn gold charge is implemented in the exercised rest API. Successful town rests left two supplies after refilling to three.

Among one member of each pair there were 58 actual short rests and 117 town long rests. Every short-rest call left Resolve and ability-use counters unchanged. This is observed runtime behavior, not permission to silently substitute unused `Character.shortRest/longRest` helpers. Actual trap rewards and commissions belong to the separate dungeon pilots below.

## Dungeon and trap pilot

The companion harness ran **27 trials** over three worlds, levels 1/5/10 and three trial RNG streams. It continued the real overland route into generated dungeons, crossed room tiles and doors using actual player APIs, attempted detected traps, resolved real fights, returned and attempted real quest turn-in. It knew room geometry and connection graph, did not seek hidden traps and did not rest inside dungeons. Nine cells stopped at the overland planner boundary before dungeon exposure; they are not deaths or failed played quests.

- 16 actual dungeon entries, five physical trap crossings and 34 total trap damage (3 / 15 / 16 by level).
- Two detected disarm checks: roll **5 + 0 versus DC14 failed**; roll **20 − 1 versus DC14 succeeded**. No tool kit was invented and no universal skill-fatigue cost was assumed.
- 10 returned to town; **two actual Investigation quests completed and paid**, at levels 1 and 10 in world 1. No quest objectives or rewards were injected.
- No boss was reached or defeated; no boss balance recommendation is supported.
- 26 outbound door passages blocked. Reverse passages could demand another check and become permanently locked, preventing a return through a connection already traversed successfully.

This small pilot proves exercised outcomes and exposes failures; it cannot establish trap frequency, relative build value or reliable quest completion rates. Outcome-selected combat traces and descriptive intervals are retained in the companion summary.

## Recommendation handoff

1. Game Designer and Architect should review runtime repairs for rest recharge, valid specialization selection and shared door state before interpreting longer-journey difficulty. These need sponsor approval before gameplay changes.
2. Define a target for **provision clues encountered per normal expedition**, rather than increasing Survival's success chance in isolation. Current sample shows zero exposure despite 45 generated sites. Investigate placement relative to travelled routes and shelter revelation, preserving finite attempts and no cash/XP farming.
3. Re-run identical seeds after approved runtime repairs; extend to later towns, earned progression/equipment, nearby revealed refuges and cautious retreat/rest policies. The existing sampler cannot settle full economy, deadlines or typical campaign route exposure.
4. Keep Craft shelter improvements and skill-based fleeing as separate decisions. Additional features would change expedition costs before current effects are understood.

No numerical production tuning is justified yet. Final mechanic intent belongs to Game Designer; prioritization belongs to Product Owner and sponsor.

## Reproduction and verification

- `EXPEDITION_SEEDS=15 EXPEDITION_TRIALS=4 node tools/balance-sim/expedition-review.js`
- `tools/balance-sim/expedition-review.results.json`: source hashes, all cell distributions, outcome-selected median win/loss/extreme traces and route/resource events.
- `tools/balance-sim/expedition-review-dungeon.js`, `.results.json` and `expedition-review-dungeon-summary.md`: actual dungeon pilot and printed round-by-round spot checks.
- Syntax, generated JSON parsing and diff checks pass. Scoped ESLint reports **zero errors, 71 warnings** (principally long analysis lines and diagnostic constants). Three outcome-matched replay cells, one per level, with provisioning declined reproduced all measured route, HP, XP, camp and purchase fields; receipts are in `expedition-review.verification.json`. Because no clue was encountered, this sensitivity check does not measure provisioning's benefit when available.
- No production code, rules or data were edited by this review. No gameplay regression suite was needed for analysis-only harnesses; these checks do not replace the game's existing validation or browser acceptance.
