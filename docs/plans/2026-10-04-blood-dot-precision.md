**Status:** Implemented (2026-10-07). Compensated blood damage is enabled locally at the user's request for hands-on playtesting. The original uncompensated 80/20 recommendation is superseded by the independently configurable 120% total, 80%-base immediate / 40%-base deferred recommendation. This is not a published release or completed gameplay acceptance; setting the fork switch back to `false` restores the rollback path.

# Blood damage over time and fractional health

This local implementation adds guaranteed partial bleeding to eligible landed blood-weapon hits while keeping each weapon's existing single damage type. It uses 1,000 integer units per HP internally and keeps public health fields in HP points, preserving the existing save shape.

## Compensated prototype

`RULES.combat.damageOverTime.enabled` is the single fork switch. It is `true` for the user-authorized local playtest; set it to `false` to roll back. The existing damage-reduction switch remains independent and disabled by default. Enabling the prototype enables fractional arithmetic and the blood split together.

- `totalMultiplier: 1.2` amplifies the eligible landed weapon-base budget to 120 percent before defenses.
- `immediateFraction: 2 / 3` partitions that amplified budget: 80 percent of the original base is immediate blood damage, and 40 percent is bleeding over the next three starts of the target's turn.
- Total damage and timing are independent controls. The tested 140-percent alternative at a 50/50 split delivers 70 percent of base immediately plus 70 percent deferred; it is not the default recommendation.
- Each hit adds an independent schedule. Reapplication never refreshes or postpones an earlier schedule.
- Bleeding appears as one status containing serializable schedules and source information.
- Crits and existing pre-application reductions happen before partitioning. Ticks do not roll crits or trigger weapon riders again.
- Misses, spell attacks, unarmed attacks, and hits with no positive eligible weapon damage do not acquire automatic weapon bleeding. A separate positive instant rider does not turn a zero weapon base into an eligible bleed. Elemental timing remains authored per effect.
- Condition-only bleed immunity suppresses the delayed share. It does not convert that share into immediate or neutral damage. Blood damage immunity also prevents application when the resistance system is enabled.
- Cleansing removes remaining bleeding; source death does not remove ordinary bleeding. Target defeat and encounter completion cancel pending damage.

This adds a 20-percent potential damage premium to compensate for delayed kills and damage lost to cleansing, target defeat, or encounter completion. It is a Nexus Verge house rule, not an SRD weapon rule. Explicit bonus riders remain immediate and unboosted. After a reaction reduces a combined packet, the eligible base is capped at the remaining packet; any residual immediate rider is reduced first. Riders are not copied into the bleed schedule. Parry and Intervene prevent the original damage budget before amplification. Intervene's lethal-hit prompt considers only projected immediate HP damage after defenses and temporary HP, not pending bleeding; redirected damage is immediate and unboosted rather than a new weapon hit.

## Precision and resistance

For a 2 HP base hit, 1.6 HP is immediate and 0.8 HP is deferred. The 800 deferred units become 267, 267, and 266 units, delivering 0.267, 0.267, and 0.266 HP. The integer remainder goes to earlier ticks, so the amplified 2.4 HP pre-mitigation budget is conserved exactly. A 10 HP base hit delivers 8 HP immediately plus 4 HP over three target turns.

Current defenses are checked when each damage component occurs. Immunity takes precedence, followed by vulnerability and then resistance. Injury and resonant remain neutral. Components are mitigated separately, then simultaneous turn-start components are delivered as one health event and one concentration check.

Mitigation rounds to the nearest 0.001 HP per component, with at most 0.0005 HP quantization error per component. Post-mitigation totals are therefore approximate: a resistant 1 HP base hit at the default 120-percent budget can deliver 0.601 HP rather than exactly 0.600 HP. No minimum-one tick rule is used. Current positive integer weapon budgets of 1 HP and above have a representable delayed share; zero or negative weapon budgets do not qualify, and arbitrary subunit budgets below the configured precision cannot support an unlimited fractional guarantee. No new minimum player-weapon damage rule is introduced.

Public `hp`, `currentHP`, `maxHP`, and temporary HP remain point values. Arithmetic converts to integer units and writes normalized point values back. There is no separately writable duplicate health ledger. Direct damage, healing, temporary HP absorption, clamping, and defeat checks use the same precision when enabled. Old saves need no migration and combat restoration is not added.

## Player presentation

Health and resolved damage display up to three decimals with trailing zeros removed. Positive health and positive damage do not display as zero. Bleeding details show the next scheduled tick, total pending damage before defenses, remaining target turns, contributing sources, and cleanse behavior. Temporary HP and accessible health values retain the same precision.

## Balance evidence and activation

The compensated harness imports the actual implementation, including its real turn scheduler. It compares independent total budgets and timing splits against fractional instant controls, with blood/bone, player-only, resistance, low-health and concentration diagnostics. See [the compensated report](../../tools/balance-sim/results-compensated/report.md) for trial counts, confidence intervals, lost deferred damage, source provenance, and scope limits. The original [100-percent-budget report](2026-10-04-blood-dot-simulation.md) remains historical evidence only; it did not test a damage premium.

The Game Designer selected 120-percent total at 80/40 of base as the conservative compensated default. The 140-percent 70/70 candidate provides a larger durable-target weapon-family advantage. Both deliver approximately 93.33 percent of base by the first target-turn start, but 140 percent doubles the eventual premium. Symmetric player/enemy win rates can hide blood-versus-bone differences, so the matched-weapon diagnostics are part of acceptance. Recurring damage deliberately keeps ordinary concentration checks, aggregated once per target-turn event; the measured anti-concentration benefit is substantial and is not proof of full spellcaster encounter balance.

Broad activation requires hands-on gameplay acceptance and a rollback window under ADR-015. Outstanding scope includes actual Calling kits and tactical builds, blood-versus-bone burst/control choices, Challenge under blood attacks, complete companion gameplay, Void Presence interactions, mobile layout acceptance, and separately authored elemental burn content. Shared weapon/armor chassis in the simulation are sensitivity probes, not representative full Calling builds. This revision does not enable global resistance or change authored elemental, poison, necrotic or Void effects.
