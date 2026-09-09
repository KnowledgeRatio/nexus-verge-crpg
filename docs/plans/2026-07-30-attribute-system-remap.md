# Attribute System Remap — STR/DEX/CON/INT/WIS/CHA → Six-Attribute System
**Date:** 2026-07-30
**Status:** Implemented (status set 2026-09-08) — M0 through M2 shipped. Default flag flipped to `'NVSystem'` on 2026-08-03 (M1.5). Balance validation signed off ("safe to ship") on 2026-08-01.

**One step of this plan did not happen, and will not happen as written:** step 13, "shim retirement, flag removal." The 2026-08-01 decision recorded below — that `5EClassic` is "disposable scaffolding" to be "fully retired" — was **superseded** by ADR-016 and `.claude/rules/d5e-compliance.md`, which now hold that the two attribute systems "exist side by side... not a one-time migration" and that `5EClassic` is "deliberately kept live as a rollback path, not dead code to delete." Where this plan and those rules files disagree, the rules files are authoritative. Read step 13 below as history, not as outstanding work.
**Branch:** main-beta-quests

**Terminology note (2026-08-03):** the flag values documented throughout this plan as `'legacy'` and `'sixAttribute'` were renamed to `'5EClassic'` and `'NVSystem'` respectively, and the M2-era `XSixAttribute` data-field suffix convention was renamed to `XNVSystem` — a pure rename, no behavior change. This doc has been updated to use the current names throughout.

**Default flip note (2026-08-03):** `RULES.attributes.system`'s default value flipped to `'NVSystem'` on this date, by the Chief Designer's explicit decision, ahead of the M1.5 human-playtest gate originally specified below. This was a deliberate call to move the flip earlier, not a skip — the multi-session level 1-10 Dedication playtest described under M1.5 is still expected to run, just after the flip rather than gating it.

---

## The new system

Six attributes on a three-domain x inward/outward grid. Outward stats project (attack, act, express); inward stats gate (defend, resist, perceive, endure). Offence/defence distribution falls out of this spine rather than being enforced per-stat.

| Domain | Outward | Inward |
|---|---|---|
| Physical | **Prowess** | **Vitality** |
| Mental | **Intellect** | **Insight** |
| Social | **Presence** | **Composure** |

### Design principles (priority order, from design lead's brief)
1. **No dumps, no dominance** — must emerge from architecture, not patches. If chargen has to force standard array, the system has failed.
2. **Parsimony** — six is the floor.
3. **Elegance over realism** — narrate the gap; a label licenses its mechanical reach.
4. **Convergence, applied purposefully** — high-value/high-frequency systems key off two stats. Not everything (damage stays single-stat Prowess).

### Two measuring instruments
- **Combat/non-combat = the balance test** — exposes dumps/dominance, the split players actually optimise around.
- **Three-pillar coverage (combat/exploration/social) = the design checklist** — a floor, not a balance measure. "Coverage without weight certifies corpses as healthy."

### MAD is intentional
Convergence *is* MAD by design, healthy only if: (1) MAD is universal — no calling may key its kit off a single stat, or it becomes a SAD outlier that dominates; (2) the point economy funds it — chargen must fund the ~3-stat "natural build width" builds actually need, and the modifier scale must be widened (5e's −1..+5 makes dumping costless).

### Non-negotiable checks
- No balance-critical derived system (attack, evasion, armour, HP, initiative, spell attack) may key off a single attribute.
- No class may escape MAD by keying its kit off one stat.
- Test every candidate build: max one stat, dump the rest. If it both hits hard and survives, there's a dominance bug.
- AC is split: evasion (Insight) vs soak (Vitality). No single AC stat.

## Scope note
**Scholar and Wanderlust callings are explicitly out of scope.** Neither is implemented in the game (no live spellcasting, no live Wanderlust-specific mechanics beyond a fatigue-resistance branch). We do not rework what doesn't exist. Only **Dedication** (STR+CON → Prowess+Vitality) is a real, implemented calling today. All MAD/build-width analysis below is scoped to Dedication only.

**Skills rework is explicitly out of scope beyond simple mapping.** The skill table below (decision #1) exists only to keep the game functional and non-breaking under the new attribute system — assign each of our existing 13 skills to one of the six new attributes, nothing more. It is **not** a redesign of the skill system itself: whether 13 is the right count, whether Cunning/Creativity/Empathy are the right categories, how skills should be trained/gated, etc. are all explicitly out of scope here. A full skills overhaul is planned as a separate future effort — this mapping is a stopgap to avoid breaking anything in the interim, not a final design. Don't over-invest in perfecting it; that scrutiny belongs to the overhaul.

---

## Ability score mapping

| 5e | New | Split? |
|---|---|---|
| STR | Prowess | No — clean 1:1 |
| CON | Vitality | No — clean 1:1 |
| INT | Intellect | No — clean 1:1 |
| DEX | Prowess (agility/finesse) + Insight (reflex/initiative) | Yes — context-dependent |
| WIS | Insight (perception) + Composure (will) | Yes — context-dependent |
| CHA | Presence (force/command) + Composure (poise) | Yes — context-dependent |

Prowess merges strength + agility as an accepted cost of the model — weapon specialisation (heavy vs. finesse) moves to the feat layer. Feats must force that trade-off or Prowess owns every weapon at once.

## Derived stats

| System | New attribute |
|---|---|
| Melee attack | Prowess |
| Ranged/finesse attack | Prowess |
| Damage | Prowess (single-stat, deliberately not converged) |
| AC (evasion) | Insight |
| AC (soak/armour) | Vitality |
| HP | Vitality |
| Initiative | Insight |
| Passive Perception | Insight |
| Spell attack/save DC | By caster (Scholar/Wanderlust — out of scope for now) |
| Concentration | Vitality + Composure, blended — see formula below |

## Saving throws — LOCKED (2026-07-30)

**Decision: saves live only on the three Inward attributes — Vitality, Insight, Composure. Full stop, no exceptions.** Prowess-save and Intellect-save are retired entirely.

| Legacy save | New save |
|---|---|
| STR | Vitality (retargeted — see below) |
| DEX | Insight |
| CON | Vitality |
| INT | *(retired — no live content used it)* |
| WIS | Composure |
| CHA | Composure |

**Why this over the earlier "5-of-6, Presence excluded" framing:** that version justified Presence's missing save by arguing saves are structurally an Inward/resist mechanic — but then kept Prowess-save and Intellect-save (both Outward) unchanged, which is the same principle being invoked only where convenient. Checked against live code: Prowess-save (STR) had real justification to keep as an *exception* — 3 live abilities depend on it (Trip Attack, Pushing Attack, Disarming Attack, `data/abilities.json`). Intellect-save (INT) had zero live usage, identical to CHA-save's exposure before it was folded into Composure — no principled reason to treat them differently. Resolving this consistently means either attribute keeps its save only if the model says so architecturally (Inward-only) or if there's a practical content reason — Prowess had the latter, so it got reassigned rather than kept as `Prowess-save`; Intellect had neither, so it's retired outright.

**Reassignment: Trip Attack / Pushing Attack / Disarming Attack move from `saveType: "str"` to `"vitality"`.** Confirmed mechanically clean (`balance-engineer`, 2026-07-30) — `EffectDispatcher.js`'s defender resist-stat lookup and the attacker's DC formula (`maneuverSaveDC`) are independently sourced; nothing assumes the defender's resist stat mirrors the attacker's own Prowess. Thematically it's a better fit anyway — resisting being physically manhandled is an Inward/Vitality concern, not an Outward/Prowess one.

**Presence still has no saving throw — this is now the deliberate, consistent outcome, not an unresolved asymmetry.** Under the pure Inward-only model, no Outward attribute (Prowess, Intellect, or Presence) ever carries a save. Presence's lack of one is no longer a special case needing a fix — it matches Prowess and Intellect exactly. The remaining Presence gaps (thin skill weight, no combat/spell-DC hook — see decision #1) are unaffected by this and still need their own design hook; not a saves problem.

**Balance check (real Monte Carlo, 6000 trials, `balance-engineer`, 2026-07-30):** no dump/dominance bug. A build dumping Prowess entirely and stacking Vitality/Insight loses to a balanced build by 10–51 win-rate points across every non-boss matchup tested against live combat code. Point-buy's chargen cap (max 15 pre-ASI) also structurally blocks extreme mono-stacking before level 4. The "Insight is the free third stat" concern (decision #1) is compounded somewhat by Insight also carrying DEX-save now, but remains bounded — even under the future evasion/soak AC split (unbuilt, stress-tested hypothetically), the dump build's margin shrinks but never inverts to a win. Worth re ­verifying once evasion/soak is actually built whether it stays armor-weight-gated (5e-style) — that changes how "free" Insight really is for armored builds.

**Save proficiency count: one per calling, not two.** 5e's 2-of-6 proficiencies represent 33% coverage; with the save pool now at 3, one proficiency preserves that same selectivity (33%) rather than ballooning to 66%.

**Dedication's proficiency: Vitality-save.** Its legacy `savingThrowProficiencies: ["str","con"]` (`data/classes.json`) both collapse onto Vitality under this mapping — a redundant double-proficiency in the same save, not a real 2-save spread. Resolved by consolidating to the single-proficiency rule above: Dedication is proficient in Vitality-save only. This also reinforces Dedication's existing Prowess+Vitality build identity rather than requiring a third stat just to be good at resisting things.

**Forward-looking note, not locked (Scholar/Wanderlust out of scope):** if Scholar ends up Intellect-primary, its natural in-domain partner Insight would be a clean fit for its save proficiency; if Wanderlust ends up Social-domain (Presence+Composure), Composure fits the same way — a possible clean 1:1:1 pattern (each future calling's proficiency = the Inward half of its own domain), worth keeping in mind whenever those callings are actually designed, not something to build now.

---

## Engine rule: fractional attribute rounding (applies to any multi-attribute derived stat)

**Rule:** ability modifiers are internally exact fractional values, `(score − 10) / 2` — not pre-floored integers. Round down (floor) exactly once, on the TOTAL, never on each attribute's individual contribution. For a single-attribute check this changes nothing (floor-of-one-term is the same either way). For any stat that sums contributions from two or more attributes, sum the raw fractional values first, floor once at the very end.

Worked example (Vitality 15 → 2.5, Composure 13 → 1.5, both "odd" scores):
- Wrong (floor each, then sum): floor(2.5) + floor(1.5) = 2 + 1 = **3**
- Correct (sum raw, floor total): floor(2.5 + 1.5) = floor(4.0) = **4**

**Confirmed code gap:** `getAbilityModifier()` in `src/utils/dice.js:268-270` floors immediately at the source (`Math.floor((abilityScore - 10) / 2)`). Every attribute modifier in the codebase today is a pre-floored integer with no fractional value surviving downstream, and there's no raw/unfloored variant today. Implementing this rule requires either a separate raw-modifier getter used only by blend formulas, or deriving straight from the raw score inside each blend formula, never touching the floored per-attribute value.

**Applies to:** concentration (decision #3 below), flee (decision #4), Menacing Attack (decision #5), and the future split-AC design (evasion + soak — both currently unbuilt; total AC would be two separately-computed components summed, same shape of problem). Applies to any future multi-attribute check, not just these — don't re-derive this per-mechanic.

**Second worked example, half-point case (the actual case this rule exists for):** Prowess mod +1.5, Presence mod +0.5 — neither alone crosses a whole number, but summed they do. Floor-each-then-sum: floor(1.5) + floor(0.5) = 1 + 0 = **1**. Correct (sum raw, floor total): floor(1.5 + 0.5) = floor(2.0) = **2**. Under the wrong order, that half-point in Presence is silently worthless. Under the correct order, it's the difference between a DC of, say, 13 and 14 on Menacing Attack — a real, felt benefit from a partial investment that floor-each-then-sum would throw away.

**Not the same as the standard score→modifier conversion** used everywhere else in the game (that one's fine as-is, single term, no rounding-order question). This is a second, additional rounding step, specific to combining two or more attributes into one total.

**Locked rule, not pending design** — added to `.claude/rules/d5e-compliance.md` under Core Formulas (2026-07-30) as a standing engine rule, independent of whether the six-attribute system ships. Applies to any multi-attribute blend, present or future.

---

## Locked decisions

### 1. Skill table (our 13 skills, not 5e's 18)

**Functional stopgap only — see Scope note above.** This table maps existing skills to new attributes so the game doesn't break; it is not a skills redesign. Overhaul is a separate future effort.

| Skill | New attribute |
|---|---|
| Athletics, Acrobatics, Sleight of Hand | Prowess |
| Academia, Arcana, Investigation | Intellect |
| Perception, Empathy, Cunning | Insight |
| Endurance | Vitality |
| Creativity, Deception | Composure |
| Influence | Presence |

Validated against real skill-check frequency in `data/skillChallenges.json` (77 checks total), not just headcount:

| Attribute | Weighted uses | Share |
|---|---|---|
| Insight | 22 | 28.6% |
| Prowess | 19 | 24.7% |
| Intellect | 17 | 22.1% |
| Presence | 8 | 10.4% |
| Composure | 7 | 9.1% |
| Vitality | 4 | 5.2% |

**No table change needed.** Vitality's thin skill share is fine — HP already runs off it in code (`Character.js:218`), so its real weight lives in the combat pillar. Composure's thin share is fine contingent on decision #2 below landing. Creativity→Composure is the single most arbitrary call in the table (our skill list wasn't built with this split in mind) and is the one most worth re-litigating if anyone objects.

**Resolved (2026-07-31): Presence combat hook.** Was inert (no compensating hook, only payoff being Scholar/Wanderlust spell DC, out of scope) — fixed via a Menacing Attack convergence retrofit, see decision #5.

**Forward-looking marker (not urgent, no fix needed now):** Insight is simultaneously the highest-weighted skill attribute (28.6%) and slated to carry evasion-AC, the most balance-critical system on the non-negotiable list. That makes it the mathematically obvious "free third stat" for every Dedication build (Prowess+Vitality+Insight) regardless of build fantasy. Only one calling is live today so this can't be tested for real yet — revisit once a second calling exists.

### 2. Composure consolidation on saves

Old WIS-saves (fear, confusion) and CHA-saves (charm, compulsion, possession) both collapse into one Composure save.

**Verdict: legitimate simplification, not a dominance bug.** Composure is a pure Inward/defend stat with no damage hook — single-keying an entire defense category is the intended pattern for Inward stats (same as Vitality gating all physical defense, Insight gating evasion+perception). An AC-style Insight+Composure split is **not warranted right now** — would add mechanical weight to a subsystem with almost no live content (`abilities.json` has 1 WIS-saveType ability, 0 CHA-saveType). Revisit only if a mind-control-heavy kit ships.

**Blocking migration case, confirmed non-arbitrary:** three dragon stat blocks in `data/monsters.json` have separate, differently-scaling WIS/CHA save bonuses (youngWhiteDragon Δ1 CR6, youngGreenDragon Δ1 CR8, youngRedDragon Δ4 CR10 — CHA climbs faster than WIS as dragons age, a real intentional divergence, not noise).

**Decision: average the two values when merging, not keep-higher.** Keep-higher silently discards the WIS side entirely and turns "Composure save" into a pure CHA rebrand, under-representing monsters tuned to be weak to compulsion but strong against fear.

### 3. Concentration formula

**Decision: `floor((Vitality_mod + Composure_mod) / 2)`** — sum the raw modifiers first, floor once on the total (per the "Engine rule" section). Corrected 2026-07-31: an earlier version of this doc wrote it as `floor(Vit/2) + floor(Comp/2)` (double-floor) despite citing the sum-raw-floor-once rule right next to it — self-contradictory, and the exact bug the engine rule exists to prevent. Caught when `balance-engineer` found the same error live in a Menacing Attack formula (decision #5) and it was traced back here.

Rejected alternatives and why:
- **`max(Vitality, Composure)`** (mirrors the existing flee-check pattern) — fails the "max one stat, dump the rest" test outright. A build with Vitality +8/Composure −3 scores +8, beating a balanced Vitality +5/Composure +4 build (+5). Only defensible when the design intent is disjunctive access ("can you do the thing at all," as with flee's universal-access goal), never for convergent power scaling like concentration.
- **Roll-twice-take-better** — even more dump-safe than `max()`, same failure mode.
- **Sum full modifiers, no halving** — dump-safe, but roughly doubles the modifier's effective magnitude vs. the old single-CON-modifier scale, forcing every concentration DC in the game to be re-baselined.

Reaching the old CON-18-equivalent bonus (+4) now requires *both* Vitality and Composure near +4/18, not one maxed stat — the MAD punishment is real, and the ceiling still lands in the same numeric neighborhood as the old single-stat system, so no DC rewrite is needed.

**Note:** concentration has zero live implementation in the codebase today (`RULES.spellcasting.concentrationCheckDC` exists as a constant but nothing consumes it) — this is a "get the pattern right before anything is built on it" decision, not a live-risk fix.

**Forward-looking risk, not a current blocker:** ceiling parity with the old CON-only baseline only holds if a build actually invests in *both* Vitality and Composure. Composure sits in the Social-inward slot of the domain grid; a Mental-domain caster's natural build width (Intellect + Insight, its own domain pair) doesn't include Composure at all — nothing currently pulls a caster toward funding it. If whichever future calling owns spellcasting (Scholar/Wanderlust, both out of scope today) doesn't explicitly fund Composure into its build width, average concentration will land measurably below the old CON-only baseline even though the ceiling is unchanged. Not a fix to make now — flag for whoever designs that calling's stat funding later, so it isn't silently dropped.

**Compounding factor, same risk, worth naming explicitly:** the window where this bites hardest is early game, before the party system (ADR-012) is filling out — a solo caster with no companions to draw enemy attention takes proportionally more hits, which means proportionally more concentration checks triggered, at exactly the point where an underfunded Composure produces the most failures. This isn't a separate problem from the funding gap above, it's the specific scenario that makes the funding gap actually hurt (rather than being a theoretical average-case dip). Whoever designs the caster calling's stat funding and whoever tunes early-game encounter pacing against party-system rollout should coordinate on this, not treat them as independent.

### 4. Flee check — LOCKED (2026-07-30)

**Decision: flee converges to the same blended pattern as concentration — Prowess + Insight: `floor((Prowess_mod + Insight_mod) / 2)`**, sum raw, floor once on the total (see "Engine rule" section). This replaces `rulesEngine.js:1160`'s `flee.modifier: ['dex','wis']` `max()` pattern entirely, not a data-key rename.

**Why Prowess+Insight and not a WIS/Composure component:** DEX splits into Prowess (agility/finesse) and Insight (reflex) — both faces of the original DEX are physical-mobility concepts, and both now feed flee, matching the same split logic already applied to AC (evasion draws from Insight, DEX's reflex face). WIS/Composure is dropped from the formula entirely, not redistributed.

**Explicit consequence, not an oversight:** the original flee redesign (`docs/plans/2026-03-04-flee-mechanic-redesign.md:27`) built `max(DEX,WIS)` specifically so a WIS-based build (i.e. a caster) could flee effectively "without needing to be fast" — disjunctive universal access, not convergent power scaling. That rationale does not survive this decision. Post-migration, fleeing effectively requires investment in Prowess and/or Insight specifically; a build with neither (e.g. a hypothetical future Intellect/Composure-focused caster) loses the "always viable escape" guarantee the original design intentionally provided. Scholar/Wanderlust are out of scope today so this has no live impact yet, but whoever designs a future non-physical calling should know flee no longer has a built-in accommodation for them — same category of forward-looking note as the concentration/Composure-funding risk in decision #3.

**Reasons this was worth fixing now, not deferring (context for why this was flagged urgent originally):** `.dex`/`.wis` lookups in `rulesEngine.js:1160` don't survive the migration (DEX fully absorbs into Prowess, WIS splits Insight/Composure) — post-migration they'd resolve to `undefined ?? 0`, silently zeroing everyone's flee modifier. Also fully live today (combat button every turn, `main.js:1659`; full resolution logic, `CombatManager.js:1760-1830`; zero test coverage) — unlike concentration, this isn't a "get the pattern right before anything's built" situation, it's an active system that needs a real migration, not just a formula choice on paper.

Implementation needs a **fresh formula**, not a mechanical `dex→Prowess`/`wis→split` port — `backend-dev`'s task once this is picked up.

### 5. Presence combat hook — LOCKED (2026-07-31)

**Decision: retrofit Menacing Attack's DC to a genuine Prowess/Presence convergence blend: `DC = 8 + proficiency + floor((Prowess_mod + Presence_mod) / 2)`**, replacing today's `8 + proficiency + Prowess_mod` entirely. Resisted by Composure save (unaffected — already where this ability's legacy WIS-save migrates under decision #2). Solves the problem identified in decision #1: Presence has zero functional payoff for Dedication, the only live calling, beyond one skill (Influence, ~10% of checks) — this gives it real teeth.

**Rejected an earlier asymmetric-kicker version** (`8 + prof + Prowess_mod + floor(Presence_mod/2)`) — too weak to actually encourage convergence (±1-2 DC swing) and, unclamped, punished the default pure-Prowess build with a DC *worse* than today at Presence's point-buy floor (score 8, mod −1, `floor(-1/2) = -1` in JS). Full 50/50 convergence was chosen deliberately over patching that kicker: the design brief's own principle #4 ("high-value/high-frequency systems key off two stats") licenses genuine convergence for a signature ability, not just a bonus-only nudge — this makes Menacing Attack the "invest in both" specialization option within Dedication's kit, while Trip/Pushing/Disarming Attack stay pure-Prowess and unaffected, so a pure-Prowess build isn't crippled, just steered toward the other three maneuvers.

**Balance-checked, real trade-off confirmed (`balance-engineer`, 2026-07-31, 16,000 combat trials):**

| Level | Pure-Prowess DC delta vs. today | Balanced (Prowess+Presence) delta |
|---|---|---|
| 3 | −2 | −1 |
| 5 | −3 | −1 |
| 7 | −3 | 0 |
| 10 | −3 | −1 |

Each DC point ≈ 5% swing in target's resist chance, so −3 DC ≈ 15 percentage points — matches the simulated frighten-uptime drop (−5.7 to −15.6pts for pure-Prowess). Win-rate barely moves (0 to −1.6pts, these fights were already near-auto-win on raw damage) — the cost lands specifically on frighten uptime, not survival. Pure-Prowess becomes the *worst* of the four maneuvers by L7+, not unusable — a build will rationally favor Trip/Push/Disarm instead. **Explicitly approved as the intended bite of convergence, not a default** — this is a materially bigger cost than the rejected kicker and was signed off deliberately.

**Correction — Balanced column of the table above was stale, caught on re-verification against the real shipped code (`balance-engineer`, 2026-08-01, M1 step 7 fix-verification pass).** The Balanced Δ column (−1/−1/0/−1) was carried over from Q1's pre-fix, double-floor formula (`floor(Prowess_mod/2) + floor(Presence_mod/2)`) — the PureProwess column was correctly updated to the post-fix sum-raw-floor-once formula (per Q4 of `project_menacing_attack_full_convergence.md`) but the Balanced column never was. Re-run against the actual shipped `getBlendedAttributeModifier` (now dividing by attribute count correctly) with this same Balanced build (Prowess==Presence at L3/L5/L7 by construction): the correct, mathematically forced result is **Δ0/0/0/−1**, not −1/−1/0/−1 — whenever a build's two blended stats are exactly equal, averaging them changes nothing, so a true 0-cost result at L3/L5/L7 isn't a bug, it's what the locked formula must produce for a 1:1-balanced build. Balanced pays *less* DC tax than this document previously claimed, not more — no player-facing regression, just a documentation staleness fix. PureProwess's −2/−3/−3/−3 column is unaffected and re-confirmed exactly as written. See `tools/balance-sim/attribute-remap-post-fix-verification-sim.js`, Section C.

**Implementation (ADR-010 compliant):** one field on the existing generic `onHitSaveOrCondition` handler (`EffectDispatcher.js:458`), `maneuverSaveDC()` (line 427) generalized to read it if present, no-op if absent — Trip/Push/Disarm are untouched, no new effect-handler type, no `ability.id` branching.

**Decided (2026-07-31): Trip/Pushing/Disarming Attack stay pure-Prowess, no convergence treatment.** MAD is a class/calling-level property (funded build width), not a per-ability requirement — every ability doesn't need to force two-stat convergence just because one does. Menacing Attack converging is fine as one piece of Dedication's kit; the other three don't need to match it for consistency.

**Not yet decided / deferred:**
- Player/companion ASI asymmetry (discovered during this review, unrelated to this decision): player characters get an ASI every level (`Character.js`/`LevelUpManager.js`, confirmed — no `asiLevels` gating on that path), companions use a gated table (`CompanionManager.js:711`, `[4,8,12,16,19]`). A companion-piloted Dedication Exemplar can never reach "Balanced" investment as fast as the player can. Not fixed here, just noted since it fed the numbers above.
- **Sworn Strike (the actual name of Dedication's Oath-specialization smite-equivalent, `data/abilities.json`) — DECIDED (2026-07-31): keys off Presence.** Attribute choice is locked, not deferred. What's still open is the specific mechanic — it currently keys off nothing ability-wise at all (flat `1d8 radiant per Resolve spent`, no save/DC, no scaling stat), so there's no existing formula to retrofit like Menacing Attack's DC; a new formula needs designing from scratch. That implementation work is deferred to the later pass over Dedication's other abilities — the attribute assignment itself is not.

## Damage type overhaul — LOCKED (2026-07-31)

Surfaced while resolving Sworn Strike's damage type (its flavor text said "radiant," which was never a real type in this game). Folded into this plan at the design lead's instruction, even though it's a separate system from ability scores — same cleanup pass.

**Locked taxonomy — 6 types, 2 trios (physical / non-physical), matching `rulesEngine.js:101-108`'s existing `RULES.combat.damageTypes` structure exactly:**

| Physical | Non-physical | Trait |
|---|---|---|
| blood | elemental | DOT-capable (bleed/poison ↔ burn/similar) |
| bone | psychic | plain, no special resist/vuln behavior |
| injury | resonant | neutral — never resisted or exploited |

**`rulesEngine.js`'s taxonomy structure was correct all along — the data hasn't caught up to it, not the other way around** (corrected from an earlier wrong read in this conversation that called the file "stale").

**Deprecated, to be migrated off entirely: lightning, cold, fire, piercing, necrotic, bludgeoning, weapon, environmental** (environmental was briefly considered as a keeper, then cut). Sword Strike's existing `damageType: "resonant"` is already correct — just its description text needs to stop saying "radiant."

**Migration rule: use judgment per entry, not a blanket find-replace.** Worked example given by the design lead: fall/narrative environmental damage → `bone` (blunt trauma fits). Same judgment call applies to every deprecated-type entry — each needs a sensible target among the 6, not a mechanical rename.

**Scope (grepped 2026-07-31):**

| Deprecated type | Files |
|---|---|
| fire | `spells.json`, `skillChallenges.json`, `monsters.json` |
| lightning, weapon, cold | `spells.json` |
| piercing, bludgeoning, environmental | `skillChallenges.json` |
| necrotic | `monsters.json` |

Handoff: `data-agent` for the actual per-entry remap.

**Migration completed 2026-07-31** — zero deprecated `damageType` values remain across all data files (verified by grep, including a second nested `damage.type` schema in `monsters.json` found mid-migration). Full mapping log in `data-agent`'s memory (`project_damage_type_taxonomy.md`).

**Deferred, not settled: `necrotic → elemental` classification.** Data-agent's reasoning ("life-drain mechanics") was flagged by the design lead as not quite right — the data has already been migrated to `elemental` (functional, not broken), but the classification itself needs a proper revisit later, not right now. Don't treat this specific mapping as validated just because it shipped.

**Also flagged, not yet fixed:** 4 code-side fallback-default literals still hardcode deprecated/invalid strings (`CombatManager.js:265` → `'necrotic'`, `:789` → `'fire'`, `:1277` → `'radiant'` — never valid even pre-overhaul, `SkillChallengeManager.js:859` → `'environmental'`). Will silently reintroduce bad values whenever data omits a damageType. `backend-dev` task, not yet scheduled.

---

## Confirmed (2026-07-30)

**DEX-for-AC → Insight.** Not actually ambiguous — the original mapping sheet already states "AC (evasion): DEX → Insight" explicitly. Applies uniformly across `Character.js:231-266` (`calculateAC`), items' `addDexModifier`/`maxDexBonus`, and `merchantInventory.json`'s `dexModifier` string enum — all three are the same concept in different data shapes.

## Open ambiguous cases (not yet resolved, need game-designer sign-off)

| Case | Where | Issue |
|---|---|---|
| ~~2 backgrounds' ability pick-lists (Acolyte, Sage)~~ — **stale, corrected 2026-08-01 (`data-agent`, M2 batch-convert)** | `backgrounds.json` | This entry predates the later-locked "Legacy split-attribute conversion" section below (CHA→Presence, not CHA→Composure). Under the actual shipped bijection (`RULES.attributes.legacyToNew`), `wis`→`composure` and `cha`→`presence` are different targets — Acolyte/Sage's `["int","wis","cha"]` converts cleanly to `["intellect","composure","presence"]`, no duplicate, no dedup needed. Converted mechanically as part of M2 with no special-casing. |
| Doc/data drift (pre-existing, surfaced by this work, unrelated to the remap itself) | `d5e-compliance.md` claims Scholar saves are INT+CON; actual data (`classes.json`) is INT+WIS | Deferred with the rest of Scholar — out of scope until that calling is actually built |
| Presence inertness (no combat/spell-DC hook) | See decision #1 above | Skill weight is fine (real, if thin), saving-throw absence is now the deliberate, consistent outcome (see Saving Throws) — the one thing still genuinely open is a combat/DC hook so Presence isn't a pure future-content IOU |

## Backgrounds — flagged for a full rework, not a spot-fix (2026-07-30)

Backgrounds have already been through significant churn independent of this migration. Don't patch the Acolyte/Sage pick-list collision (or anything else ability-score-related in `backgrounds.json`) as an isolated fix — revisit backgrounds as a whole before or alongside applying any attribute-remap changes to them, given how much disruption they've already had. Owner TBD when that work is scheduled.

## Legacy split-attribute conversion (DEX/WIS/CHA → single base score) — DECIDED (2026-07-31)

**Decision:** for save-file/monster upconversion only, each split legacy attribute's base score copies onto exactly one new attribute, chosen so the full six-way mapping is a clean bijection — no new attribute receives two legacy sources, none are left permanently empty:

| Legacy | Converts to | Other face of the pair |
|---|---|---|
| DEX | **Insight** | Prowess — not fed by DEX; already populated by STR |
| WIS | **Composure** | Insight — not fed by WIS; already populated by DEX |
| CHA | **Presence** | Composure — not fed by CHA; already populated by WIS |

Combined with the already-clean STR→Prowess, CON→Vitality, INT→Intellect, every new attribute now inherits exactly one legacy source — nothing collides, nothing is left at default.

**Reasoning:**
- **Forced by the bijection itself, not three independent picks.** DEX's options are {Prowess, Insight}; Prowess is already claimed by STR, so DEX takes Insight. WIS's options are {Insight, Composure}; Insight is now claimed by DEX, so WIS takes Composure. CHA's options are {Presence, Composure}; Composure is now claimed by WIS, so CHA takes Presence — the only assignment with zero collisions and zero gaps.
- **Also independently justified per pair, not just a mechanical leftover.** DEX→Insight: the Ability score mapping section already flags Insight's face (AC evasion, initiative, DEX-save, Passive Perception) as "very frequently relevant" against Prowess's face (attack/skills); evasion AC is on the non-negotiable balance-critical list, so it's the one face of DEX a converted character cannot afford to leave unfed. WIS→Composure: WIS-save already migrates to Composure (Saving throws, locked), and the Composure-consolidation averaging (decision #2) already blends legacy WIS+CHA save bonuses for monsters — routing the WIS base score there too keeps fear/charm-resistant legacy content (undead, aberrations) landing where its old identity already pointed. CHA→Presence: Presence was flagged inert until decision #5's Menacing Attack retrofit gave it real combat teeth; CHA is also the source of Influence, Presence's highest-weighted skill — routing legacy CHA there means every converted charismatic character/monster exercises that new hook immediately instead of leaving Presence a dead stat until manually revisited.
- **Consistent with the Trip/Push/Disarm precedent:** that reassignment established that a stat's defensive/resisting face routes to an Inward attribute even when its offensive face stays Outward. DEX→Insight follows the same logic — DEX's defensive/reactive identity (AC, initiative, save) is what's preserved on conversion; its offensive identity (finesse attack/damage) is not, and continues to run off whatever Prowess the character already has from STR.

**Known cost, accepted as part of the stopgap:** a legacy DEX-primary/STR-dumped build (the default finesse archetype) converts with a weak Prowess score, since Prowess is fed only by its old STR after this conversion — attack bonus and damage will read lower than the character actually played. This is the direct, foreseeable price of a straight one-to-one conversion instead of a weighted split, accepted deliberately per the design lead's instruction not to attempt partial/weighted splits.

**Explicitly a stopgap, not a permanent design.** This is a mechanical rule to unblock save-file upconversion (`RULES.attributes.legacyToNew`) and the 46-monster ability-score batch-convert (`data-agent`, M2) — not a considered rebalance of any individual character or monster. Flagged for full manual rework once the split-attribute system is actually built out and existing content can be revisited by hand instead of mechanically converted.

---

## Departing from 5e's "even numbers" requirement — DECIDED (2026-07-31)

**Decision: every ASI +1 adds 0.5 to the ability modifier directly.** This is exactly the "Engine rule" section above, not a separate question — modifiers are fractional at the source, and multi-attribute stats sum the raw fractional values so two half-points can combine into a whole number. Single-attribute checks are unaffected by design (a lone half-point can't cross an integer DC threshold alone — see Engine rule section for why), and that was never the point of this decision; the point was specifically enabling multi-attribute blends to combine cleanly, which the Engine rule already does. No further decision needed here.

---

## Architecture approach — updated 2026-07-31 (architect + backend-dev review)

- **Not a flat rename.** ~70+ call sites across 11 files read `.str`/`.dex`/`.con`/`.int`/`.wis`/`.cha` as inline literals (AC, initiative, attack resolution, saves) rather than through the generic dispatch pattern already used correctly for skills (`SkillChallengeManager.getSkillModifier()`) and spellcasting (`abilityModifiers[class.spellcastingAbility]`).

- **Resolver is 3 functions, not 1 — fixes a real bug found in the original 1-function design.** A single `getAttributeModifierFor()` would return pre-floored integers (matching how `getAbilityModifier()` already works today, `dice.js:268-270`), which silently reproduces the double-floor bug on every blend built on it (concentration, flee, Menacing Attack). Fix:
  - `getRawAttributeModifier(character, attrKey)` — new, unfloored, `(score − 10) / 2` straight from the base score.
  - `getAttributeModifierFor(character, contextKey)` — single-attribute contexts (AC evasion, initiative, individual saves); internally `Math.floor(getRawAttributeModifier(...))`.
  - `getBlendedAttributeModifier(character, contextKey)` — 2+ attributes from `derivedStatMap`, sums raw values, floors once. Backs concentration, flee, Menacing Attack DC.
  - `derivedStatMap` needs an explicit shape distinguishing single vs. blend (e.g. `{attributes: [...]}` array consumed the same way in both cases) — without one, each formula reinvents its own blend logic.
  - Compute one `rawAttributeModifiers` cache alongside the existing floored cache — blends read from it, don't re-derive raw arithmetic independently per formula.

- **New `data/attributes.json`** as source of truth for the attribute set (name/label/abbr), replacing hardcoded `['str','dex','con','int','wis','cha']` literals in `formulaEvaluator.js:46` and `Character.js:462`. `Character.initializeSavingThrows()` (`Character.js:460-469`) needs the same literal-list treatment, and shrinks from 6 keys to 3 (Vitality/Insight/Composure only) once the Inward-only saves decision is implemented — not just a renamed loop.

- **`RULES.attributes` block in `rulesEngine.js`**: feature flag (`5EClassic` / `NVSystem`), `derivedStatMap`, and `legacyToNew` conversion table for save-file upconversion.

- **ADR-011 waived for this migration — DECIDED (2026-08-01, broadened same day).** Design lead explicitly accepts that old save games (persisted player-progress files) will not load correctly after this migration. No `Character.fromJSON()` upconversion step is being built. Broader principle stated by the design lead, not scoped to just this migration: **ADR-011's "never hard-break saves" rule is not absolute — for a major release, breaking save compatibility is sometimes the right call, not always avoidable.** This specific migration is the first invocation of that principle, not a one-off exception to a rule that otherwise still binds unconditionally; future major releases may invoke it again on their own merits. Don't build upconversion logic here, don't treat its absence as a gap. (Unrelated terminology note: this is about save-*game* files, not saving-*throws* — the saving-throw formula gap elsewhere in this doc is a separate, unrelated problem.)

- **Chargen remap — scope confirmed, not yet built (2026-08-01).** `CharacterCreation.js`'s point-buy/standard-array UI still allocates points into STR/DEX/CON/INT/WIS/CHA — untouched by this plan so far. Discovered via the "is the legacy→new conversion function temporary?" question: the monster-side conversion genuinely retires once M2 batch-converts `monsters.json`, but the character-side conversion is a **permanent bridge, not a temporary shim**, unless chargen itself is rewritten to natively collect Prowess/Insight/Vitality/Intellect/Composure/Presence instead of the old six. Design lead confirmed this rework is needed. Not yet scheduled against M1.5/M2 — sequencing (does it gate the flip, or follow it) still to be decided.

  The base-score conversion mapping for split attributes (DEX/WIS/CHA → single new attribute) is still useful and stays locked regardless — see "Legacy split-attribute conversion" section (DEX→Insight, WIS→Composure, CHA→Presence) — it's just no longer wired to a save-file upconversion step, since there isn't one.

- **Monster data staging — two independent tracks, not one blocked unit:**
  - **Saves subset (5 monsters: zombie, mage, and originally the 3 dragons)** — decision #2's averaging formula doesn't depend on the split ratio at all, pure arithmetic on values that already exist. **Note (2026-07-31): the 3 dragons aren't Nexus Verge canon content — flagged for a content update/replacement rather than engineered around.** That leaves zombie + mage as the real saves-migration surface; batch-convert whenever convenient, no blocker.
  - **Ability-score subset (46 monsters)** — unblocked as of 2026-07-31 (see "Legacy split-attribute conversion" section). Shim first, batch-convert once the shim's proven.
  - **Shim landmine:** if the shim independently re-implements WIS/CHA save-averaging instead of calling the same shared function the eventual batch-convert script uses, the two can drift out of sync. One shared averaging function, called by both.

- **Sequencing fix — real dependency inversion found in the original order:** "refactor-engineer swaps calls to use the resolver" can't happen before the resolver exists. Correct order: `backend-dev` builds the resolver skeleton in pass-through 5EClassic mode (zero behavior change) → `refactor-engineer` swaps call sites to use it, still 5EClassic mode, test-verified → `backend-dev` wires the real blended formulas. See Execution order below.

## Scope of the migration (data-agent's count)

| Surface | Size |
|---|---|
| `monsters.json` full ability blocks | 46 monsters |
| `monsters.json` structured saves | 5 monsters (zombie, mage, + 3 dragons — dragons flagged 2026-07-31 as non-canon content, not engineered around; see Architecture approach) |
| Code call sites (11 files, `src/`) | ~70+ literal ability-key accesses |
| `skills.json` | 13 core + 4 campaign-specific |
| Items/magic items (`addDexModifier` etc.) | 25+ entries across 2 files |
| Races, kits, backgrounds, practices | ~12 entries total |
| `weaponMasteries.json` | 2 (clean values, but pre-existing uppercase-casing drift vs. everywhere else) |

Cross-file rename risk: old 2-3 letter ability codes (`str`, `dex`, `con`, `int`, `cha`) are common substrings inside unrelated field names (`conditionImmunities`, `hitPoints`, `strengthRequirement`, `construct`). Any rename tooling must be JSON-path-scoped to exact keys/values, never a bare string substitution. The six new attribute names have zero existing collisions in `data/` today (verified) and don't collide with each other as `*Mod`-suffixed formula variables.

## Recommended execution order — revised 2026-08-01 (product-owner + backend-dev + architect review, 5EClassic-fidelity requirement relaxed by design lead)

Status: **complete** — kicked off 2026-07-31, M1.5 flag flip landed 2026-08-03, M2 content conversion and balance validation closed out 2026-08-01. Milestone-staged (`RULES.attributes.system = '5EClassic' | 'NVSystem'`). Step 13 superseded — see the Status block at the top of this file.

**5EClassic-mode fidelity is not required step-by-step — DECIDED (2026-08-01).** The original soak-tested-rollout framing (below, for history) assumed legacy behavior needed to stay byte-identical at every intermediate stage, with 5EClassic kept live as a long-term rollback path. Design lead's call: 5EClassic mode is disposable scaffolding on the way to full replacement, not something to preserve indefinitely — it's fine for 5EClassic-mode behavior to be imperfect mid-migration (e.g. saving throws not perfectly matching today's 6-save system while M1 is in progress) as long as the plan ends with 5EClassic fully retired (M2's shim/flag removal already covers this). Verification happens once, at the end of the full plan — not gated at every step. Agents should still keep the test suite passing for basic hygiene (no crashes, no regressions in what's actually being built), just not treat "matches old 5EClassic output precisely" as a hard gate on unrelated-in-progress work.

Original framing, kept for context: flag-gated, default `'5EClassic'` until soak-tested, not a big-bang cutover — this touches live combat math (attack, AC, initiative, saves, flee) with no existing test coverage on several affected systems (since addressed — see M0 step 1).

**M0 — plumbing, zero behavior change:**
1. **Regression/characterization tests** for current 5EClassic behavior (attack, AC, initiative, saves, flee) — the doc flags "zero test coverage" as a risk twice but never scheduled the fix until now; this is the actual safety net the feature flag needs to be worth anything.
2. **`game-designer`** — resolve remaining open ambiguous cases; rule on flee's `max()` exception; **and resolve the legacy split-attribute conversion** (which single new attribute each of DEX/WIS/CHA's base score becomes) — **done 2026-07-31**, see "Legacy split-attribute conversion" section (DEX→Insight, WIS→Composure, CHA→Presence).
3. **`backend-dev`** — build the 3-function resolver (`getRawAttributeModifier`, `getAttributeModifierFor`, `getBlendedAttributeModifier`) in pass-through 5EClassic mode. Zero behavior change, nothing new is live yet.
4. **`architect`** — finalize `data/attributes.json` + `RULES.attributes.derivedStatMap` (with the single-vs-blend shape) against locked decisions and the now-built resolver.

**M1 — real implementation, flagged off by default:**
5. **`refactor-engineer`** — swap call sites to use the resolver, split by mechanic (skills → saves → AC → attack → initiative → flee) rather than one sweep, each independently revertable, still 5EClassic mode, test-verified against M0's new tests. Note: some sites (e.g. Trip/Push/Disarm's `saveType` field) are coupled code+data changes, not pure refactors — land those with step 6, not here.
6. **`backend-dev`** — wire the real blended formulas (concentration, flee, Menacing Attack DC), the monster-loader shim (must call the same averaging function as step 8's eventual batch-convert, not reimplement it). ~~`Character.fromJSON` upconversion~~ — not needed, ADR-011 waived 2026-08-01, old save games are not required to keep working.
7. **`balance-engineer`** — lightweight pass right after formulas land, before the expensive data/prose work below (not saved for the end). **Found 2 critical bugs** (blend formula missing division, no code path populated six-attribute-keyed abilities — game-breaking) — both fixed 2026-08-01, re-verification in progress.

**M2-readiness sweep, 2026-08-01 (`backend-dev`) — 2 more gaps found and fixed, 1 scoped:**
- **`Character.calculateAbilityModifiers()` hardcoded to the 6 legacy keys** — rewritten generically (`Object.fromEntries` over `this.abilities`'s actual keys). Real impact: `SkillChallengeManager.getSkillModifier()`'s NVSystem-mode fix (next bullet) is the first live consumer of `character.abilityModifiers[newKey]` (e.g. `.composure`); without this fix that lookup silently degraded to 0. Same hardcoded pattern also found and fixed at the two monster-enemy-construction call sites building `abilityModifiers` (`EncounterBuilder.js`'s `createEnemyFromMonster`, `Player.js`'s `generateDungeonEnemy`) — the latter was *also* missing the six-attribute `abilities` merge entirely (the Bug 2 shim from step 7 had only been applied to `Character.js` and `EncounterBuilder.js`, not this third dungeon-enemy-spawn path), fixed to match.
- **`data/skills.json`'s `ability` field cannot be mechanically derived from `RULES.attributes.legacyToNew`** (that bijection is for base *scores*, not skills — see decision #1's table). Added an explicit `attributeNVSystem` field per skill (dual-field convention, matches `kits.json`'s `abilitiesNVSystem`), populated from decision #1's locked table for all 13 core skills. The 4 campaign-specific skills (`sailing`, `navigation`, `defiling`, `psionics`) aren't in that table; judgment calls made the same way decision #1 made its Creativity call: `navigation`/`defiling`/`psionics` (all legacy `int`, unsplit) → `intellect`, straightforward; `sailing` (legacy `wis`) → `insight` by analogy to Perception/Cunning/Empathy (situational/reactive reading), not Composure (Creativity's improvisational flavor) — flagged here for review same as Creativity was.
- **`SkillChallengeManager.getSkillModifier()` had 2 pre-existing bugs unrelated to the remap**, surfaced only because closing Bug B properly required a real skill-check test (not a resolver-in-isolation test, per the Bug 2 postmortem's own lesson): it read `character.skills.find(s => s.id === skillId)`, but `character.skills` is a dictionary keyed by skill id (`Character.js`'s `initializeSkills()` shape), not an array — `.find` doesn't exist on it. It also read `character.skillProficiencies.includes(...)`, a field nothing in the codebase ever populates. Both were live, uncaught-throw bugs in production (any conversational skill challenge's passive or active check), not six-attribute-specific. Fixed alongside the ability-field change: proficiency now reads `character.skills[skillId]?.proficient`; the skill->ability lookup now reads a new `this.skillsData` (loaded via a new `loadSkillsData()` method, wired into `main.js`'s existing `skillChallengeManager` init `Promise.all`) instead of the character object.
- **`SettlementUI.js`'s `_skillToAbility()`** — fixed 2026-08-01 (`backend-dev`). Now delegates first to `window.skillChallengeManager.skillsData` (reading `attributeNVSystem`/`ability` per `RULES.attributes.system`, same as `SkillChallengeManager.getSkillModifier()`); only falls back to a static dual-mode (5EClassic + NVSystem) map on the rare path where `skillChallengeManager` itself isn't available yet. Regression tests: `tests/ui/SettlementUI.skillToAbility.test.js` (new file).
- **`Character.js`'s `updateSkillBonuses()`** — fixed 2026-08-01 (`backend-dev`). `skillAbilities` is now a dual-mode map (5EClassic vs. NVSystem, selected by `RULES.attributes.system`), same pattern as the other two sites. Character construction is fully synchronous (no `init()` step), so unlike `SkillChallengeManager`/`SettlementUI` it can't `fetch()` `skills.json` at runtime — the map stays a hand-maintained mirror of `skills.json`'s `ability`/`attributeNVSystem` fields rather than a live read, documented inline as such. Regression tests added to `tests/systems/character.characterization.test.js`'s NVSystem block (Perception/Athletics discriminating-skill cases).
- **Scope-checked, not fixed:** `specializations.json`'s `primaryAttributes` field — grepped, zero code consumers anywhere in `src/`, confirmed purely descriptive/flavor metadata. `practices.json`'s Hearthcraft `scoreChoices` — not a simple kits.json-shaped fix; it's a live interactive UI feature (`main.js`'s Hearthcraft meal-buff modal) whose consumption path (`practiceUtils.js`'s `getBuffedAbility()`) already has zero production call sites today (only exercised by its own unit tests), so the ability-score portion of Hearthcraft is already inert regardless of the remap — fixing it properly means wiring a dead feature end-to-end, not adding a parallel data field. Scoped and reported, not touched.
- 411/411 passing after this pass (up from 404), 7 new regression tests (`tests/systems/character.characterization.test.js`'s NVSystem block, new file `tests/systems/skillChallengeManager.sixAttribute.test.js`).
8. **`devils-advocate`** — stress-test now, before the data conversion, not after: Composure consolidation, flee's `max()`-exception call. Found the save-averaging shim's output was never consulted (fixed alongside step 7's bugs) — flee itself confirmed low-risk.
9. **Chargen remap — added to M1 scope 2026-08-01, sequencing owned by Claude per Chief Designer's delegation.** `CharacterCreation.js`'s point-buy/standard-array UI still allocates points into the legacy six abilities — never touched by this plan. Chief Designer confirmed this needs a full rework to natively collect Prowess/Insight/Vitality/Intellect/Composure/Presence, and that it belongs in M1 (before the flip), sequencing left to Claude's judgment. Scheduled to run after step 7's re-verification confirms the formula fixes are solid — no point designing UI against math that isn't yet confirmed correct. Owner: `frontend-dev`, likely with `backend-dev` support for the underlying chargen data flow.
10. **Named sign-off checkpoint** before flipping the default flag — no longer a save-file one-way-door concern (ADR-011 waived), but still worth an explicit "who confirms before flip" rather than an implicit flip.

**M1.5 — flip:** default flag flipped to `'NVSystem'`. This is the actual release. Multi-session playtest of a level 1-10 Dedication run with the flag on; keep the 5EClassic path live as rollback for one release cycle.

**M2 — content volume, doesn't block the flip:**
10. **`data-agent`** — batch-convert the 46 ability-score monster blocks (now unblocked by step 2's ratio decision) + races/classes/backgrounds **+ `kits.json`** (gap found 2026-08-01 — preset ability blocks still legacy-keyed, currently relying on runtime bijection conversion rather than native data, same category as monsters pre-batch-convert); zombie/mage saves convert independently, no blocker. The 3 dragons are flagged for a content update, not migrated as-is.

    **Partial completion, 2026-08-01 (`data-agent`) — monsters/races/classes/backgrounds done, `kits.json` already done in an earlier pass, blocked on the ability-block half for 19 monsters:** batch-convert discovered `monsters.json` has a pre-existing, pre-migration data bug — **19 of 46 monsters have `"abilities": []` (empty array) instead of a real `{str,dex,con,int,wis,cha}` block** (shadow, ghoul, specter, ghast, gargoyle, minotaur, wight, owlbear, flameskull, ettin, troll, wraith, hillGiant, the 3 dragons, manticore, mage, medusa — present since the initial public-release commit, `git log -p` confirms, not a regression from this migration). These monsters currently have **no functioning ability scores in 5EClassic mode either** — this is a standalone content gap, not created by or blocking on the attribute remap itself. `abilitiesNVSystem` was added only to the 27 monsters with real data; the 19 broken ones were left untouched rather than fabricating scores (out of `data-agent` scope — CR-appropriate stat blocks are a `game-designer`/`balance-engineer` call, not a bijection). zombie + mage's `savingThrowsNVSystem` converted fine independently (saves are a separate field, unaffected by mage's broken `abilities`). Races (5/5), backgrounds (5/5) fully converted. Classes: `primaryAbilityNVSystem` added to all 3; `savingThrowProficienciesNVSystem` added only to Dedication (`["vitality"]`, per the locked single-proficiency decision) — Scholar/Wanderlust's legacy save pairs (`int`+`wis`, `dex`+`int`) both include `int`, which has no valid target under the pure Inward-only save model (Intellect-save is retired), so no NVSystem save-proficiency value was invented for either; flagged for whoever eventually designs those callings' save proficiency (see the plan's own "not locked" forward note above). Full findings in `data-agent` agent memory.
11. **`worldbuilder`** — parallel text pass so skill/ability prose doesn't contradict the new data (`skills.json` descriptions currently say "Your Wisdom (Empathy) check...", etc.) — can run earlier in parallel, low risk.
12. **`balance-engineer`** — full validation pass (CR math/DPR across the converted bestiary; re-test the "free third stat" Insight concern once a second calling exists) once M2's conversion lands.
13. Shim retirement, flag removal.
