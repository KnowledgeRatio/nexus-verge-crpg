---
name: project-oath-locked-spec-balance-pass
description: Pre-implementation balance read on Oath's locked Aura+Vow design (2026-08-06) vs live Exemplar — tank-lean dominance, a pre-existing Sworn-Strike-vs-tactic-die DPR asymmetry, and why Intervene's permadeath calculus differs from Unbreakable Oath's
metadata:
  type: project
---

Ran a Monte Carlo pass (N=500/cell) on Oath's locked-but-unimplemented design
(Auras: Wrath/Sanctuary/Mercy at L3; 5-Vow pool: Challenge/Reprisal/Intervene/
Zealous Smite/Bolster, pick 3 of 5 across L5/7/9) vs Exemplar's shipped kit.
Harness: `tools/balance-sim/oath-locked-spec-vs-exemplar-sim.js`.

**Note — this is a different Oath design than the two prior Oath sim files in
the same directory** (`oath-l3-9-proposal-vs-exemplar-live-sim.js`,
`dedication-exemplar-oath-l2-10-proposal-sim.js` model an EARLIER, now-
superseded proposal with Ward/Bulwark/damageVulnerabilities-swap content and
a Sworn Strike cap that scaled to 5 at L10 — this spec has neither). Don't
reuse those two files' Oath-side math for future passes on the current spec;
their player-build constants (STR/CON curve, AC 16, HP formula, MONSTERS
table) are still good and were reused verbatim here.

## Findings

1. **Tank lean (Sanctuary+Intervene+Reprisal) beats burst lean (Wrath+Zealous
   Smite+Challenge) by 20-30pp win rate in unfavorable fights, real not
   noise, at every level L5-L10.** Root cause: Sanctuary's +1 AC applies to
   the WHOLE PARTY every round unconditionally, while Wrath's +1 damage only
   applies on ally hits that land — a passive whole-party mitigation aura
   compounds much harder over a long unfavorable fight than a small
   conditional damage buff. Both leans are statistically indistinguishable in
   favorable fights (~96-100% either way — the difference only shows up
   under real pressure). Not "game-breaking" (never 100/0), but a real,
   non-trivial power asymmetry between the intended burst/tank matchup the
   design brief itself proposed testing.

2. **Pre-existing finding, not new-content-driven: Oath's baseline (Sworn
   Strike only, no aura/vow) already out-DPRs Exemplar's live kit by +1.4
   DPR at L3 growing to +4.6-4.7 DPR by L9/10 (all "real," CI margins
   don't overlap).** Mechanism: both specs draw from the identical Resolve
   pool (`con_mod + level`), but Exemplar's tactic-die spend rate is capped
   by attacks/round (1 pre-L5, 2 from L5), while Sworn Strike's spend cap is
   a flat 3/turn regardless of attack count. Once `resolveMax` exceeds
   `attacksPerRound × roundCount` (happens around L7-9 as CON/level grow),
   Exemplar structurally can't spend its whole resolve pool inside a fixed-
   round fight while Oath can. This is entirely a property of the ALREADY-
   SHIPPED Sworn Strike vs Exemplar's live tactic system — the new aura/vow
   content sits on top of an Oath-favorable DPR baseline, not a neutral one.
   Worth surfacing to game-designer even though "fix Sworn Strike's cap" is
   out of scope for this pass's new-content review.

3. **Solo vs Exemplar: Oath's floor-build is meaningfully narrower than
   Exemplar's.** Of Oath's L3 choice (aura) and 3 vow picks, only Sanctuary
   (self-AC, since the aura text reads "the Oath AND allies") and Challenge/
   Zealous Smite (self-triggered) do anything without a party. Wrath, Mercy,
   Reprisal, Intervene, Bolster are all dead weight solo — a full 4 of the 8
   locked-spec options. A player who picks Wrath at L3 (a fully legitimate,
   RAW-consistent choice) gets literally zero mechanical benefit from that
   choice in a solo run. Exemplar has no equivalent dead-choice trap — all 8
   tactics are self-contained. Simulated best-case-solo-picks Oath vs worst-
   case-solo-picks Oath vs Exemplar: win rates were NOT reliably
   distinguishable at N=500 (overlapping CIs most levels), meaning the raw
   win-rate cost of picking "wrong" for solo play is small in this
   punching-bag model — but the finding that matters isn't the number, it's
   that half the pool is a trap for solo-heavy runs, which the design brief
   flagged as a real risk (companions aren't guaranteed active) and this
   confirms it's not hypothetical.

4. **Intervene's permadeath calculus is NOT the same shape as Unbreakable
   Oath's, because the thing being saved has a different failure mode.**
   Per `ADR-012`/`CombatManager.handleDefeat()`: a companion dropped to 0 HP
   goes `isDowned = true` and is pulled from the turn order, but is NOT
   permanently dead yet — `party.outcomeMap` auto-stabilizes ALL downed
   companions to 1 HP for free on `victory`, and only converts to permanent
   death on `fled`/`tpk`. So a companion's permanent-death stakes are gated
   on the FIGHT'S OVERALL OUTCOME, not on the specific hit that dropped them
   — the same downed event is either free (party wins) or fatal (party
   loses/flees) regardless of how much overkill damage caused it. Contrast
   the player: `handleDefeat()` calls `endCombat('defeat')` immediately and
   unconditionally at 0 HP, no downed/grace state exists for the player at
   all (documented gap in `docs/callings/dedication.md`). A player-side save
   like Unbreakable Oath (from the earlier, superseded proposal) prevents an
   otherwise-UNCONDITIONAL loss condition every time it triggers. Intervene
   only has value in the much narrower band where (a) the reduction is
   enough to keep the ally's HP above 0 this hit specifically, AND (b) that
   ally staying active for the rest of the fight is what flips the fight's
   outcome from loss to win. Simulated: in a tank-lean party vs unfavorable
   pack, Intervene triggers were RARE (≈3% of trials at L5, ≈0 by L9/L10 —
   the party's other tank tools already keep allies out of danger before
   Intervene would ever fire) and its aggregate win-rate delta was small and
   statistically indistinguishable from noise at every level tested (N=500).
   Recommendation if this matters to design intent: Intervene is real and
   mechanically sound, but its permadeath-prevention value is structurally
   bounded below a player-self-save ability by this game's own downed/
   stabilize asymmetry — it's closer in kind to "extra action-economy
   insurance" than to "prevents a companion's death," and shouldn't be
   costed or narratively framed as equivalent to Unbreakable-Oath-tier
   stakes.

5. **Mercy aura (+1 flat save bonus to allies) could not be quantitatively
   tested at all.** No monster in the reused MONSTERS table (giantSpider/
   berserker/veteran/voidTitan) forces a save against ALLIES in a way
   reachable from a hand-rolled attackRoll/damageRoll loop — giant spider's
   poison-on-hit save is embedded in `CombatManager`'s damage pipeline, and
   the L7 pool's actual save-heavy casters (mage, medusa) weren't in the
   reused monster set. This is a genuine structural finding, not a shortcut:
   a flat-save-bonus aura is inherently hard to prove "real" against a
   monster kit built mostly from plain weapon attacks, and its value will
   only show up against save-or-suck casters — a narrower, more situational
   niche than Wrath (any fight with allies dealing damage) or Sanctuary
   (any fight at all, self included).

6. **Build-choice count / replayability: Exemplar reaches 56 distinct
   end-state kits (`C(8,5)`, any 5-of-8 tactics); Oath reaches 30
   (`3 auras × C(5,3)` vow sets = 3×10).** Same total raw option count (8
   each), but Oath's split into a mandatory 1-of-3 exclusive pick (aura,
   permanent, locks out the other two leans for the whole run) plus a
   3-of-5 pick (vows) is architecturally a different kind of choice than
   Exemplar's single continuous 8-option curation pool — fewer reachable
   final builds, and the aura axis specifically is an all-or-nothing
   permanent commitment with no equivalent in Exemplar's kit (any tactic
   choice is non-exclusive; picking one never structurally locks out a
   whole playstyle the way choosing Wrath locks out Sanctuary/Mercy).

## Method notes for future passes
- N=500/cell matches this project's established baseline (see MEMORY.md).
- voidTitan (L10 native pool monster) saturates every build/spec at 0% win
  rate regardless of build — same over-tuning finding as the prior Oath pass
  (`reference_monsters_abilities_nan_bug.md`-adjacent territory, though this
  is a raw stat-block issue, not the NaN-abilities bug). Substitute the L7/L9
  pool's veteran for any L10 read that needs to be informative — the harness
  does this automatically (`L10*` rows) and it's now the established pattern
  across three sim files in this directory.
- Companions modeled as player-equivalent power (same STR/CON/AC/HP) for
  isolating Oath-kit marginal effects — real companions run ~85% of player
  power per `RULES.party.companionActionEconomyFactor`. This makes absolute
  party-fight win rates in this file optimistic upper bounds; deltas between
  builds (which is what every finding above actually rests on) remain valid
  since the companion model is held constant across every comparison.
