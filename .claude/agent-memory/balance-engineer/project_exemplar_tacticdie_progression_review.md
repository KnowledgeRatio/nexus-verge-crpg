---
name: project-exemplar-tacticdie-progression-review
description: Corrected a stale premise (tactic die scaling is ALREADY live, not stuck at 1d6) then quantified which level-breakpoint table best closes the pre-existing Sworn-Strike-vs-Exemplar DPR gap without reversing it — final recommendation TOP_HEAVY (1d6@1, 1d8@7, 1d10@9, 1d12@10)
metadata:
  type: project
---

## Premise correction (check this before trusting any future "tactic die is frozen" claim)

As of commit `4692fc7` ("Implement attribute remap, ADR-010 & combat updates"),
already on `main-beta-quests` when this review ran (2026-08-07), the tactic
die level-scaling table is **already wired**, on two independent live code
paths that both match `data/levelProgression.json`'s
`specializationFeatures.exemplar.tacticDie` (1d6@1, 1d8@7, 1d10@10) exactly:
- `src/systems/EffectDispatcher.js:441` `resolveTacticDieSides(character)` —
  called by every tactic-die-consuming handler (onHitSaveOrCondition,
  onHitCondition, onHitPush, selfTempHP, allyTempHP, precisionAttackBonus,
  reactionAttack, reactionDamageReduction).
- `src/systems/Character.js:299` `getTacticDie()` — called directly by
  `src/systems/CombatManager.js:1119` for Precision Strike's beforeAttack
  bonus.

**A second correction, more consequential:** the prior Oath balance pass
([[project-oath-locked-spec-balance-pass]], `tools/balance-sim/oath-locked-
spec-vs-exemplar-sim.js`) that found Sworn-Strike-out-DPRs-Exemplar-by-
+1.4-growing-to-+4.6/4.7 was **already modeling the scaled 1d6/1d8/1d10
table** in its `maneuverDieSides(level)` helper (line 119 of that file), not
a frozen 1d6. That finding already reflects the "fixed" state. Don't re-cite
it as a pre-fix baseline in future passes — it's the LIVE-progression number.

**Lesson for future requests:** when a request states a system is "never
wired" or "frozen," verify against the actual code before building the sim
around that premise — grep for the function name (here `getTacticDie`/
`resolveTacticDieSides`) and diff its behavior against the claim. This one
would have produced a materially wrong comparison (re-discovering an
already-closed gap and mis-attributing prior findings to the wrong state) if
taken at face value.

## Method

`tools/balance-sim/exemplar-tacticdie-progression-sim.js`. Reused player
build/monster table/Sworn-Strike math verbatim from the prior Oath sim file
for continuity (added an L1 row, goblin, hand-adjusted in the same
approximate style as the reused rows). N=2000/cell for DPR-only numeric
means (cheap, tighter CI than the project's win-rate baseline), N=500/cell
for win-rate/survival (project's established baseline). Precision Strike's
accuracy check used exact enumeration (20 x dieSides outcomes), not Monte
Carlo — small enough to be exact.

Tested 8 die-size-by-level progressions: FROZEN (1d6 flat, the counterfactual
the request actually wanted), LIVE (current data/code), EARLY_STEP,
THREE_STEP, AGGRESSIVE, LIVE_PLUS, EARLY_PLUS, and the winning candidate
TOP_HEAVY.

## Findings

1. **LIVE (current 1d6/1d8/1d10) only partially closes the pre-existing gap,
   and closes it least at exactly the levels the prior memory flagged as
   worst.** DPR delta (Exemplar − Oath, N=2000): FROZEN gives L7 −4.1, L9
   −6.5, L10 −6.9; LIVE improves this to L7 −2.8, L9 −5.1, L10 −4.1. Real
   improvement, but L9/L10 remain the widest gaps under LIVE, same as under
   FROZEN — die-size scaling alone helps but doesn't fix the shape of the
   problem, because (per finding #2 of the prior Oath memory) the gap is
   structurally driven by Exemplar's resolve-spend rate being capped by
   attacksPerRound while Sworn Strike's cap is a flat 3/turn independent of
   attack count — a bigger die increases DPR-per-use, not use-frequency.

2. **A naive "add one more step" (THREE_STEP: 1d6@1, 1d8@5, 1d10@7, 1d12@10)
   overcorrects at L7 specifically in win-rate space, even though its DPR
   delta stayed negative.** L7 2x-unfavorable win rate flipped to a real,
   statistically distinguishable Exemplar lead over Oath (+7 to +8.6pp,
   margins didn't overlap) in two separate runs — a genuine reversal at that
   cell despite DPR alone still showing Oath ahead (−1.4 DPR). Win-rate is
   the more decision-relevant metric here than DPR alone. Root cause: L7 was
   already the smallest pre-existing gap (only ~+2 DPR advantage to Oath per
   the prior memory), so moving the die-growth step *earlier* to L7 pushed
   that specific cell past parity. Lesson: concentrate any added step where
   the gap is actually worst (L9-10), not evenly across the level range.

3. **Final recommendation — TOP_HEAVY: keep the current L1/L7 breakpoints
   unchanged, add an intermediate step at L9, raise the L10 cap to 1d12.**
   Table: `1d6` @1 (unchanged), `1d8` @7 (unchanged), `1d10` @9 (new,
   pulled forward from L10), `1d12` @10 (new, replaces the old 1d10 cap).
   Across 3 reruns (N=500 each), win-rate deltas at every tested cell
   (L7/L9/L10 x favorable/unfavorable) were either exactly 0 (both saturated
   at 100%) or **not statistically distinguishable from noise, and never
   real-and-positive** — i.e. competitive without reversal, matching the
   stated design goal exactly. DPR delta at L10 narrows from LIVE's −4.1 to
   TOP_HEAVY's −2.5 to −2.8 (real, consistent across reruns), while L9 win
   rate lands within a few points of Oath (76-78% vs 82-84%, always "noise"
   at N=500) instead of LIVE's wider real-leaning gap. This is a partial
   close, not a full one — the remaining gap is the resolve-spend-cap
   structural issue from finding #1, out of scope for a die-size-only
   change (as the prior memory already flagged to game-designer separately).

4. **Precision Strike accuracy sanity check: no dangerous spike, confirmed
   by exact enumeration.** Hit-chance increase from adding the tactic die to
   the attack roll is large in absolute terms (+17 to +30pp depending on die
   size and target AC) but every tested cell for every progression actually
   recommended stays under a 95% hit-chance ceiling — the highest reading
   anywhere in the safe-progression set is d12 vs AC 17 (L9/L10, TOP_HEAVY)
   at 91.3%. The only progression that crossed 95% in this pass was
   AGGRESSIVE (d10 vs AC 13 at L5 hit 95.0%, d12 vs AC13 hit 95.8%) — a
   candidate already rejected on DPR-overcorrection grounds (positive DPR
   delta at L1 and L5, i.e. Exemplar out-damaging Oath at low levels, which
   violates the "not a full reversal" design goal on its own). Precision
   Strike is also resolve-gated and declared pre-roll (mutually exclusive
   with per-attack on-hit tactics that same turn), which caps how often the
   accuracy swing is even in play — not modeled quantitatively here (a
   frequency/uptime question, not an accuracy-ceiling one) but relevant
   context for why even a high single-hit-chance number isn't automatically
   "trivializing."

## Handoff

Recommend to `data-agent`: update `data/levelProgression.json`'s
`specializationFeatures.exemplar.tacticDie` from `{"1":"1d6","7":"1d8",
"10":"1d10"}` to `{"1":"1d6","7":"1d8","9":"1d10","10":"1d12"}`.
Recommend to `backend-dev`: update the two hardcoded mirrors —
`src/systems/EffectDispatcher.js:441-446` `resolveTacticDieSides()` and
`src/systems/Character.js:299-307` `getTacticDie()` — to match (both are
currently a third hardcoded copy of the level table rather than reading
`data/levelProgression.json` directly; out of this review's scope to flag as
an ADR-010 "data drives code" violation, but worth a mention to
`architect`/`refactor-engineer` next time either file is touched — three
independent hardcoded copies of the same table is exactly the kind of thing
that silently drifts).
