# Injury damage advisory — 2026-10-07

**Injury is an affinity-neutral damage type, not an armor bypass.** Its distinctive numerical value appears when damage affinities are enabled; that system is currently disabled. Under current affinity-off rules, a 10-base instant injury packet and bone packet both deal 10 damage. There are 26 authored blood weapons, 9 bone weapons, and no injury weapons.

This study runs 135 deterministic fixtures and 5 concentration event-count checks through the actual weapon budget, component resolver, combatant HP/temp-HP handling and target-start scheduler. No encounters or win rates were simulated: the structural tradeoffs follow directly from these packet-level results. No production code/data changed.

The mixed candidate is **an analysis-only producer**, not an implemented weapon feature: reserve 25% or 50% of the original base for immediate injury; apply the real 120% blood budget only to the remaining blood base. Both immediate components are delivered together through `resolveDamageComponents`, preserving one concentration check per impact. Deferred tranches use the real scheduler. This never adds a neutral floor on top of an unchanged full blood packet.

For example, a 50/50 split of 10 base produces 5 injury now, 4 blood now, and 2 blood over three target starts: 11 total before affinities, rather than 5 injury plus the full 12-damage blood packet. The 25/75 version produces 2.5 injury +6 blood now +3 blood later: 11.5 total.

## Same 10-base hit

Each cell shows **impact / total after all three target starts**, with affinities enabled. Resistance, immunity and vulnerability below apply to blood only; bone is the unaffected control. Display is rounded to two decimals. Event quantization can change totals by approximately 0.001 HP.

| Candidate | No affinity | Blood resistant | Blood immune | Blood vulnerable | Bleeding immune or cleansed immediately |
|---|---:|---:|---:|---:|---:|
| Instant bone | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 10 |
| Instant injury | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 10 |
| Blood 120% | 8 / 12 | 4 / 6 | 0 / 0 | 16 / 24 | 8 / 8 |
| 25% injury +75% blood base | 8.5 / 11.5 | 5.5 / 7 | 2.5 / 2.5 | 14.5 / 20.5 | 8.5 / 8.5 |
| 50% injury +50% blood base | 9 / 11 | 7 / 8 | 5 / 5 | 13 / 17 | 9 / 9 |

With affinities disabled, **every resistance/immunity/vulnerability column becomes the no-affinity column**. Bleeding immunity and cleansing still cancel scheduled bleeding when that separate feature is enabled. Blood immunity and vulnerability are hypothetical stress cases: no current authored monster has either. Blood resistance is authored.

## Actual authored affinity combinations

Same 10-base packet, affinities enabled, all scheduled ticks allowed to run. Monster HP and attack behavior are not simulated; only the actual authored affinity arrays are applied.

| Target | Instant bone | Instant injury | Blood 120% | 25% injury mix | 50% injury mix |
|---|---:|---:|---:|---:|---:|
| Skeleton: blood resistance, bone vulnerability | 20 | 10 | 6 | 7 | 8 |
| Shadow: blood and bone resistance | 5 | 10 | 6 | 7 | 8 |
| Void Titan: bone immunity | 0 | 10 | 12 | 11.5 | 11 |

Shadow, specter and wraith resist blood/bone; they are not authored as immune to those types. A neutral portion gives reliable damage through their resistance. Pure injury also completely bypasses the Void Titan's authored bone immunity when affinities are enabled. It would therefore create a powerful universal fallback unless access, cost or content exceptions constrain it.

## Edge cases and costs

- **Temporary HP works normally.** Against 9 temp HP, all three blood/mixed impacts deal zero HP damage. After three ticks, blood deals 3 HP, the 25% mix 2.5, the 50% mix 2, and instant injury/bone 1. Neutral damage does not penetrate temp HP.
- **AC is upstream of damage delivery.** These are fixtures for already-landed packets. The production weapon attack hit gate still governs weapon attacks; no injury branch bypasses it. This study does not claim its analysis-only mixed producer has passed a player attack flow.
- **Neutral is currently unconditional affinity bypass.** Even an authored `damageImmunities: ['injury']` entry is ignored by the resolver because injury is in the neutral list. It remains subject to HP/temp-HP handling and defeat lifecycle. If a future monster must be immune to mundane trauma, that intent would require a separate rule or a different type, not an injury immunity entry under current rules.
- **Recurring concentration utility survives dilution.** The real concentration choke point sees one joint impact and three positive ticks for blood and both mixtures: four checks, versus one for instant bone/injury. Event-count fixtures force successful rolls so all four checks can be observed. This is deterministic verification, not a concentration success-rate estimate.
- **Critical/base scaling stays proportional.** A constructed 20-base packet gives blood 16 immediate +8 deferred, the 25% mix 17 +6, and the 50% mix 18 +4. These test already-rolled larger packets, not a separate critical-hit dice simulation. Tiny 1-base packets retain their fractional schedules.
- **Riders must be specified separately.** A 10 eligible base +6 immediate, unamplified blood rider gives blood 14 now +4 later; the 25% mix 14.5 +3; the 50% mix 15 +2. The neutral fraction consumes original eligible base, not the rider. Current attacks carry same-type rider damage inside the weapon packet; a future mixed producer would need explicit component/rider semantics rather than assuming this prototype is already wired in.
- **Magic interacts with typed defenses only.** Against hypothetical nonmagical blood/bone immunity, magical typed components resume normal damage; the neutral share was already unaffected. Neutral mundane weapons would otherwise erase some value of magical access.

## Recommendation to Game Designer

The data supports **keeping injury out of every ordinary weapon by default**. A universal neutral fraction makes all weapons more forgiving, but weakens resistance information, vulnerability payoffs, weapon swapping and the blood/bone distinction. It is an intentional redesign of the affinity system, not a free numerical repair. The 50% mixture is particularly smoothing: it halves the original typed exposure and turns hypothetical complete typed immunity into half-damage fallback.

Dedicated injury weapons would be a clearer authored option than an invisible universal split, but currently offer no damage advantage over bone while affinities are off. Once enabled, a full injury weapon becomes a broadly reliable resistance/immunity bypass. It needs a meaningful opportunity cost or restricted delivery and a fiction that explains neutral harm; an ordinary blunt weapon should not gain that property merely to populate the category.

The least disruptive use is **explicit neutral trauma on effects whose intent is independent of weapon affinity**, such as a deliberately authored hazard or costly special attack. That is a proposal, not current content. Affinity-sensitive weapon damage can remain blood/bone/elemental. Decide the intended player choice first, then test its actual producer and encounters; these fixtures do not justify an equipment overhaul or elemental balance values.

## Reproduction and provenance

```sh
node tools/balance-sim/injury-neutral-study.js
```

Full generated fixtures, traces, authored affinity inventory and production source hashes are written to `/tmp/nexus-injury-study/injury-neutral-study.json`; set `INJURY_OUTPUT` to choose another output directory. The large raw result is excluded from tracked artifacts. No win-rate confidence intervals apply to deterministic packet fixtures.
