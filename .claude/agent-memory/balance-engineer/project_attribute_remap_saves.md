---
name: project-attribute-remap-saves
description: Findings from the 2026-07-30 review of collapsing all saves onto Vitality/Insight/Composure (retiring Prowess-save/Intellect-save) in the six-attribute remap proposal
metadata:
  type: project
---

`docs/plans/2026-07-30-attribute-system-remap.md` proposes a six-attribute system (Prowess/Insight/Vitality/Intellect/Composure/Presence). Status stayed Proposed as of this review — a follow-up question asked whether collapsing ALL saving throws onto only the 3 Inward attributes (retiring Prowess-save and Intellect-save entirely) creates a dump/dominance problem. Only Dedication (STR+CON -> Prowess+Vitality, 1:1) is live; Scholar/Wanderlust are out of scope.

**Verdict delivered:** Safe to lock as proposed, with one concrete migration gap flagged (Dedication's `classes.json savingThrowProficiencies: ["str","con"]` orphans the "str" line once Prowess-save is retired — same shape as the already-flagged flee `.dex`/`.wis` breakage in decision #4 of the plan, needs a `game-designer` call on where that proficiency slot goes, not a silent drop).

**Key quantified result:** Point-buy caps every stat at 15 at chargen (`RULES.core.pointBuyCosts`, no entry above 15/cost 9) — a build cannot exceed 15 in any stat pre-ASI regardless of how hard it dumps elsewhere. The "max one stat to 20, dump the rest" degenerate case the design brief worries about is structurally bounded by the point-buy table itself; real divergence only opens up via the two ASI events at levels 4 and 8 (`RULES.progression.asiLevels` <=10). Simulated 500-trial Monte Carlo (real STR/CON/DEX-mapped mechanics, since those map 1:1 to Prowess/Vitality/Insight) of a "max Vitality+Insight via every ASI, never invest in Prowess" build vs a balanced build at Dedication levels 1/5/10 against real monsters.json opponents: Balanced won by +10 to +51 win-rate points in every non-boss matchup. Damage-stays-single-stat-Prowess (plan's non-negotiable #4) punishes the dump decisively — no dominance bug found for the live calling.

**Compounding risk, quantified not just flagged:** the plan's own "Insight is the free third stat" marker (skill-weight + evasion-AC) was tested by additionally modeling a hypothetical where evasion-AC stacks on top of armor regardless of weight (today's live chainMail formula is DEX-independent, `addDexModifier:false` in `data/items.json`, so this doesn't apply yet). Under that hypothetical, the dump build's win-rate gap against favorable matchups shrank 60-70% (e.g. L5 bugbear: 10pts -> 3.6pts). Doesn't flip to dominance, but is real evidence the eventual evasion/soak AC split formula (unbuilt) needs to preserve some heavy-armor-gates-evasion rule or re-verify this at that time — see [[reference-monsters-abilities-nan-bug]].

Harness: `tools/balance-sim/attribute-remap-dump-dominance-sim.js` (500 trials/cell, `EVASION_AC_MODE=1` env var toggles the hypothetical evasion-stacks-on-armor mode). Reusable for the next attribute-remap pass once Scholar/Wanderlust are in scope.
