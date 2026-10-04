# Blood damage over time and fractional health

This local implementation adds guaranteed partial bleeding to eligible landed blood-weapon hits while keeping each weapon's existing single damage type. It uses 1,000 integer units per HP internally and keeps public health fields in HP points, preserving the existing save shape.

## Selected prototype

`RULES.combat.damageOverTime.enabled` is the single fork switch. It defaults to `false`, as required by ADR-015. The existing damage-reduction switch remains independent and disabled by default. Enabling the prototype enables fractional arithmetic and the blood split together.

- 80 percent of the eligible landed hit budget is immediate blood damage.
- 20 percent is blood damage over the next three starts of the target's turn.
- Each hit adds an independent schedule. Reapplication never refreshes or postpones an earlier schedule.
- Bleeding appears as one status containing serializable schedules and source information.
- Crits and existing pre-application reductions happen before partitioning. Ticks do not roll crits or trigger weapon riders again.
- Misses, spell attacks, unarmed attacks, and hits with no positive eligible weapon damage do not acquire automatic weapon bleeding. A separate positive instant rider does not turn a zero weapon base into an eligible bleed. Elemental timing remains authored per effect.
- Condition-only bleed immunity suppresses the delayed share. It does not convert that share into immediate or neutral damage. Blood damage immunity also prevents application when the resistance system is enabled.
- Cleansing removes remaining bleeding; source death does not remove ordinary bleeding. Target defeat and encounter completion cancel pending damage.

This redistributes the existing damage budget; it does not add a damage premium. Explicit bonus riders retain their existing delivery unless separately authored for DoT. After a reaction reduces a combined packet, the eligible base is capped at the remaining packet; any residual immediate rider is reduced first. Riders are not copied into the bleed schedule.

## Precision and resistance

For a 2 HP hit, 1.6 HP is immediate and 0.4 HP is deferred. The 400 deferred units become 134, 133, and 133 units, delivering 0.134, 0.133, and 0.133 HP. The integer remainder goes to earlier ticks, so the pre-mitigation budget is conserved exactly.

Current defenses are checked when each damage component occurs. Immunity takes precedence, followed by vulnerability and then resistance. Injury and resonant remain neutral. Components are mitigated separately, then simultaneous turn-start components are delivered as one health event and one concentration check.

Mitigation rounds to the nearest 0.001 HP per component, with at most 0.0005 HP quantization error per component. Post-mitigation totals are therefore approximate: a resistant 1 HP hit split 80/20 can deliver 0.501 HP rather than the instant control's 0.500 HP. No minimum-one tick rule is used. Current positive integer weapon budgets of 1 HP and above have a representable delayed share; zero or negative weapon budgets do not qualify, and arbitrary subunit budgets below the configured precision cannot support an unlimited fractional guarantee. No new minimum player-weapon damage rule is introduced.

Public `hp`, `currentHP`, `maxHP`, and temporary HP remain point values. Arithmetic converts to integer units and writes normalized point values back. There is no separately writable duplicate health ledger. Direct damage, healing, temporary HP absorption, clamping, and defeat checks use the same precision when enabled. Old saves need no migration and combat restoration is not added.

## Player presentation

Health and resolved damage display up to three decimals with trailing zeros removed. Positive health and positive damage do not display as zero. Bleeding details show the next scheduled tick, total pending damage before defenses, remaining target turns, contributing sources, and cleanse behavior. Temporary HP and accessible health values retain the same precision.

## Balance evidence and activation

The new harness imports the actual implementation, including its real turn scheduler. It compares each split against the fractional 100/0 control, with separate flag-off legacy checks and resistance sensitivities. See the accompanying simulation report and machine-readable results for trial counts, confidence intervals, lost deferred damage, and scope limits.

80/20 remains a conservative prototype because it retains more finishing damage than larger delayed shares. Equal pre-mitigation damage does not imply equal encounter power: ticks can be canceled and delayed kills permit additional enemy turns. Conversely, positive ticks can force additional concentration saves over three turns. Do not compensate with a damage premium before testing that utility against actual concentration builds.

Broad activation requires hands-on gameplay acceptance and a rollback window under ADR-015. Outstanding scope includes full Calling kits and tactical builds, concentration pressure, complete companion gameplay, mobile layout acceptance, and separately authored elemental burn content. This patch does not enable global resistance or resolve the existing poison and necrotic classification questions.
