---
name: project-source-void-mechanics
description: Source/Void cosmology mechanical design — the no-bonus-damage rule, Hold/Slip, voidwoven rework, and the Curiosity information-cost constraint
metadata:
  type: project
---

Mechanical expression of `docs/world/COSMOLOGY.md`. Proposal at `docs/plans/2026-09-08-source-void-mechanics.md` (Status: Proposed, 2026-09-08).

**Why:** The cosmology's central claim is that neither the Source nor the Void is the good one. Players pattern-match Source=good / Void=evil within minutes, and prose cannot prevent it — only mechanics can. `CAMPAIGN_PLAN.md`'s original anti-Void set (Voidbane Dagger dealing *radiant*, Purification Amulet, Anti-Void Charm) encoded holy-vs-unholy directly into the rules.

**How to apply:** treat these as standing constraints on any future Source/Void content, not as one-off item decisions.

### The governing rule
**Source-derived items deal no bonus damage of any kind. Void-derived effects cost nothing.**
The inversion is the point — the "good-looking" force gives a strained costly tool, the "bad" one gives a free pleasant one. Stronger than "no radiant": *any* bonus-damage rider on a Source item re-imports holy-vs-unholy. A "separateness blast" is radiant with a new name.

### Enforced separateness → only one viable mechanical form
Suppression of change. `holdBoundary` effect handler, `category` field data-driven (`stackEscalation` / `hpFloor` / `conditionApplication`). Nothing offensive works. Anti-Void items key off the **shape of the `voidPresence` stacking condition**, not off a `voidborn` creature tag — that is what keeps them non-holy.

### Slip (the boundary-failure cost) — three red lines
Slip = `character.slip`, +1 per Hold, −1 per stack to **saving throws**, at 4 you lose your next Action, clears on short rest.
It is not a corruption meter *only* because of three structural properties, all load-bearing:
1. Clears on a short rest — no run-long trajectory.
2. **No cleansing interaction.** Add a shrine that clears Slip and it becomes a corruption meter that afternoon.
3. Attaches to the **Source** side, not the Void side.
Saves specifically, because `RULES.fatigue` already owns attack rolls and skill checks — two penalties on the same numbers would be illegible. Display as pips ("Held: 3"), never a bar; a filling bar *is* corruption grammar in visual form.

### Curiosity — no mechanical change, one recorded constraint
**Curiosity may not have a mechanic that grants information for free.** Its discipline is holding a thing apart to study it, which costs an action/resource/turn. A passive "you always know enemy HP" would be Source-knowledge and contradict the calling's own philosophy. Binding input to future NVSystem Curiosity design (Curiosity still has no NVSystem identity — see [[project_attribute_system_proposal]]).

### Disagreement recorded with the creative direction
`voidwoven` is a *procedural drop property* and cannot carry the "one desirable Void effect by L3–4" beat alone — you cannot schedule a random drop. Needs a guaranteed Episode 2 reward alongside the property fix.
