# Provisioning exposure and starter-town catchments

Date: 2026-10-13. Status: diagnostic experiment completed; no production gameplay, data or configuration changes. Roadside sources independent of safe shelters are a proposed design direction, not approved or delivered. Nothing committed or deployed.

**Sponsor clarification, 2026-10-18:** provisioning is intended to extend travel far from functioning settlement resupply. Near-town relocation and increased starter-route exposure are withdrawn as recommendations/acceptance criteria. These measurements describe the narrow starter policy; they do not establish failure of remote provisioning or prove its geography wrong. Existing remote sources may serve the intended purpose. No relocation experiment, new resource host or numerical tuning is approved by this clarification.

## Result

Increasing allocation chance from 25% to 100% at existing eligible shelters increased generated sources from **45 to 89 across 15 worlds**, but produced **zero encountered clues or attempts** under every tested starter-route policy. Allocation chance alone did not increase exposure in this sample; this does not evaluate the intended remote-travel benefit.

The catchment census found no existing eligible shelter within 32 or 64 geometric tiles of any sampled departure town. Only one of 15 worlds has one within 96 tiles, and four within 128. Selected sources are 171–920 geometric tiles away where present; one world has none. These distances describe the starter areas; they do not show that players need closer sources.

The earlier inference that this requires near-town relocation or a new roadside resource host is withdrawn following the sponsor's 2026-10-18 clarification. Town leads, roadside sources, placement changes and numerical tuning are not approved. The catchment distances remain descriptive measurements, not acceptance radii.

## Next validation under confirmed intent

Use existing generated sites first on actual long journeys at levels 1/5/10, declaring functioning settlement resupply access and route information. Compare matched trained/untrained builds and gathering-enabled/declined journeys where appropriate, using real movement, combat, rests and supply spending. Record where/how supplies deplete, opportunities actually reached, net extra onward distance or objectives, prevented turnbacks, safe return and costs. No numerical target is set. Remoteness depends on real access to resupply, not an arbitrary radius or a prohibition on near-town sources. See the governing purpose in [world-generation rules](../../.claude/rules/systems/world-gen.md).

## Experiment and denominators

The reusable [exposure runner](../../tools/balance-sim/provisioning-exposure.js) executes the actual existing expedition engine, movement, encounters, rests and purchases. It records visible original POI tiles, inspected/revealed sites, eligible sanctuary reveals, selected sources, usable opportunities, attempts and supply gains separately. Hidden eligibility is classified after route choices; navigation does not seek hidden source flags.

Primary comparison: 15 seeded small worlds × levels 1/5/10 × four trial streams × two skill builds = 360 executions per allocation variant. The `allCandidates` variant changes `RULES.provisioning.generation.candidateFraction` to one only inside its own process. Existing map caps 6/24/54 and 96-tile source spacing remain unchanged. The default eight-step detour budget remains unchanged for existing runner callers.

Each primary row below counts one member of each matched skill pair: 180 routes per variant. The underlying independent world denominator is 15; repeated routes, fights and matched pairs are correlated.

| Measure | Baseline 25% | All candidates 100% |
|---|---:|---:|
| Generated sources, counted once/world | 45 | 89 |
| Visible original POI tiles, summed across routes | 157 | 157 |
| Inspected / revealed original POIs | 145 / 145 | 145 / 145 |
| Eligible sanctuary reveals / visible source tiles | 0 / 0 | 0 / 0 |
| Clues / attempts / earned supplies | 0 / 0 / 0 | 0 / 0 / 0 |
| Town returns / deaths / alive planner stops | 120 / 24 / 36 | 120 / 24 / 36 |

Sensitivity comparisons use zero- and sixteen-step budgets, one trial stream, the same 15 worlds and three levels, and both skill builds: 90 executions per variant/budget, 360 additional executions. All **1,080 executions** encounter zero clues. Per 45 representative sensitivity routes, both budgets expose 41 original POI tiles. The zero budget records no deliberate inspections and 35 reveals from passage; the sixteen budget records 38 inspections/reveals. Neither reveals an eligible provisioning sanctuary. A larger local inspection allowance therefore does not repair exposure in this bounded sample.

Zero of 15 worlds yields a descriptive Wilson 95% interval of 0–20.4% for world-level exposure under this policy. Do not use 1,080 as an independent-layout denominator or infer universal zero exposure.

## Catchment evidence and limits

The [catchment census](../../tools/balance-sim/provisioning-catchment.js) regenerates actual metadata and asserts baseline source counts. Distances are Euclidean lower bounds, not traversable paths, detour costs or accepted intel radii.

| Geometric radius | Worlds with selected source | Worlds with eligible shelter |
|---|---:|---:|
| 32 | 0/15 | 0/15 |
| 64 | 0/15 | 0/15 |
| 96 | 0/15 | 1/15 |
| 128 | 0/15 | 4/15 |

All sampled departures use the starter town at (16, 16) in their respective worlds. This does not measure later-town catchments or natural player routes. The existing full-terrain A* navigation knowledge, fixed-level snapshots, declined optional road events, controlled reaction policy and lack of full quest completion remain limitations. The route experiment cannot prove natural reaction-UI balance, whole-game Survival value or earned campaign economy.

## Reproduction and validation

Run from the repository root, using separate Node processes for each variant/budget:

```sh
for variant in baseline allCandidates; do
  PROVISION_VARIANT="$variant" PROVISION_DETOUR_BUDGET=8 PROVISION_SEEDS=15 PROVISION_TRIALS=4 node tools/balance-sim/provisioning-exposure.js
  for budget in 0 16; do
    PROVISION_VARIANT="$variant" PROVISION_DETOUR_BUDGET="$budget" PROVISION_SEEDS=15 PROVISION_TRIALS=1 node tools/balance-sim/provisioning-exposure.js
  done
done
node tools/balance-sim/provisioning-catchment.js
```

Artifacts: baseline budgets [0](../../tools/balance-sim/provisioning-exposure.baseline-0.results.json), [8](../../tools/balance-sim/provisioning-exposure.baseline-8.results.json), [16](../../tools/balance-sim/provisioning-exposure.baseline-16.results.json); all-candidate budgets [0](../../tools/balance-sim/provisioning-exposure.allCandidates-0.results.json), [8](../../tools/balance-sim/provisioning-exposure.allCandidates-8.results.json), [16](../../tools/balance-sim/provisioning-exposure.allCandidates-16.results.json); [catchment results](../../tools/balance-sim/provisioning-catchment.results.json). Earlier expedition artifacts remain historical.

All seven artifacts parse and all recorded source hashes match current files, including the catchment census. Harness syntax and diff-whitespace checks pass. Scoped new-tool lint reports zero errors and 12 warnings. Final `npm run lint:all` retains 3,251 existing errors and reports 2,272 warnings; the error count is unchanged. No unit-suite rerun was required for these harness-only additions; the experiment supplies 1,080 actual-engine executions instead. Production provisioning rules, text, supply price, DC and rewards are unchanged.
