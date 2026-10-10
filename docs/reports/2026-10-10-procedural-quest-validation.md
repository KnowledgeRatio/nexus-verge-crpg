# Procedural quest first-slice validation — 2026-10-10

## Local implementation and functional evidence

The approved first family is implemented and enabled locally. New town offers use four data-authored incidents, actual named NPC/site bindings, fixed evidence, optional interpretation and guarded resolutions. Existing town boards are not regenerated. No commit, deployment or GitHub issue closure is implied.

**Sponsor follow-up:** These are four fixed incidents selected and bound procedurally, not a compositional generator of different causes, subjects and activities. Sponsor review found that insufficient for the desired replayability. The sponsor subsequently approved unified composition, now implemented locally; see the [new validation report](2026-10-10-unified-quest-validation.md). The measurements below remain historical first-slice evidence and do not demonstrate the broader outcome.

Game Designer and Architect selected finite recovered merchant stock as the first world effect. It adds three rations at ordinary prices; it neither removes normal stock nor claims a whole settlement was restored. Worldbuilder reviewed the incidents and corrected custody, theft and speaker assumptions. Evidence-specific resolutions improve actual personal trust without stacking an extra commission. Explicit culture standing replaces indirect contributions from the same resolution; unrelated trade still contributes normally.

Generated kill/retrieval objective schemas now match their consumers, and new targetless offers are withheld. Existing saved quests are not migrated. Faction serialization now preserves fractional object scores and accepts legacy Maps/entry arrays. Participant relations synchronize existing NPC persistence so reentry cannot restore a stale copy over earned trust.

Functional tests cover public generation and events, levels 1/5/10 fixtures, supported bindings, fixed task difficulty, basic observations, failed/paid retries, full/partial commission, wrong location/NPC/facts, unsupported effects, abandonment, disabled new generation, saved active quests, duplicate/reentrant resolution, finite stock, remote/invalid purchases and exhausted shipment receipts. Higher-level test fixtures are not evidence of earned gameplay progression.

The full suite passes **1,368 tests in 117 files** with `npm test -- --maxWorkers=1 --testTimeout=30000`. Initial default-timeout runs failed only in existing 3D asset tests at the five-second limit; bounded concurrency alone did not eliminate those timeouts. No test assertions or production asset code were changed to obtain the passing run.

Local desktop (1440×900) and mobile (390×844) browser fixtures construct an actual Knight, load the Nexus Verge campaign and generate actual NPCs/offers. The shipment flow exercises the real board acceptance method, visible journal recovery/resolution controls, actual trade UI purchase, save/load and replay rejection. Completion pays 80 XP/20 gold at level 1; purchase reduces shipment stock from three to two, reopening after load preserves two, and fractional culture standing survives. The browser fixtures set location/room state directly rather than walking or playing combat. They do not establish whole-run pacing or sponsor acceptance.

Additional independent browser scenarios cover all remaining bundles through the actual quest-log modal and bound NPC dialogues on both viewports. The kit dispute collects both accounts and allocates custody with a full commission. Theft-report and damaged-delivery scenarios take honest incomplete routes for 40 XP/10 gold. The bound giver's subsequent spoken reply matches the saved outcome in each case. These are isolated scenarios, not replenished boards. Final browser runs report zero page errors.

Independent review and browser checks found and repaired board giver binding, stale NPC trust restoration, merchant/blacksmith selection and missing-character HUD calls. No gameplay tuning was inferred from those integration defects.

Legal verification passes all 12 checks, and `npm run build:web` succeeds. Focused changed-system/new-test lint has no errors; repository-wide lint retains existing failures (`npm run lint`: 175 errors; `npm run lint:all`: 3,251 errors). New analytical scripts also have policy warnings about fixed scenario numbers and line length, documented below. Markdown/JSON/path/diff checks pass; 31 local documentation targets resolve. No new dependencies were installed.

## Quantitative evidence and scope

The publication census finds substantial availability of the new quest family, with preserved ordinary Investigation fallback. It does **not** establish the profitability, safety, pacing or completion frequency of played quests. Long target distances and a relatively narrow set of world effects remain concrete follow-up questions for Game Designer and Product Owner review.

Reproduce from the repository root:

```sh
node tools/balance-sim/procedural-quest-audit.js
node tools/balance-sim/procedural-quest-skills.js
```

The scripts use portable relative imports and read actual rules/content. Their repository outputs are [publication results](../../tools/balance-sim/procedural-quest-audit.results.json) and [exact skill results](../../tools/balance-sim/procedural-quest-skills.results.json). No production balance values were edited by this audit.

### Generated offers

Twenty independent seeded **small** `nexus-verge` worlds contain 760 settlements. The same seeds are evaluated at levels 1, 5 and 10: 2,280 publication visits, but only **20 independent worlds**, not 60 independent samples or 2,280 independent towns.

The audit invokes real WorldGenerator, NPCGenerator, QuestGenerator, QuestManager, RelationManager, MerchantManager and SettlementManager. Campaign-filtered NPC cultures and merchant pools are loaded from actual data. Visits occur in sorted coordinate order, using a synthetic position lookup instead of walking and streaming regions. Settlement entry performs actual NPC assignment, offer publication and pending retrieval binding. Every published offer remains available; quests are never accepted or completed. That history affects arrangement selection and excludes already occupied procedural destinations. This is a conservative, declared visit policy, not a model of typical player choices.

| Measure | Each level projection |
| --- | ---: |
| All offers published | 1,516 |
| Procedural offers | 540 |
| Ordinary Investigation fallback offers | 184 |
| Settlements with any Investigation offer | 724 / 760 |
| Procedural offers with a faction-effect option | 540 |
| Procedural offers with a merchant-stock world-effect option | 129 |
| Concurrent procedural quests sharing a destination | 0 |

Mean world-level procedural coverage is **71.05%**, with an approximate 95% confidence interval of **68.25–73.85%**. Combined procedural/ordinary Investigation coverage is **95.26%**, interval **93.37–97.16%**. These intervals use the variation between independent world fractions, `mean ± 1.96 × SD / sqrt(20)`; they do not pretend settlements within a world are independent binomial trials. All three level projections produced identical counts. This is a paired identity, not evidence that level has no effect on played travel or quest value.

The three arrangement counts are 275 practical failures, 133 competing claims and 132 concealed accounts. Practical failure includes two authored bundles; its larger count must not be confused with greater narrative depth. The four bundle counts are 129 abandoned consignments, 146 delivery-damage cases, 133 disputed kits and 132 handling mistakes. The 129 merchant-stock opportunities are **17.0% of all settlements** (world-based approximate 95% interval **14.98–18.97%**), or **23.9% of procedural offers**. Other quests offer personal/faction consequences, but this census does not label those as changes to merchant stock or other non-player world activity. An opportunity means a supported resolution option was generated, not that its prerequisites were met or its effects applied.

Procedural target distance is **22–297 tiles**, median **131**, 90th percentile **236**, 95th percentile **260**. These are direct geometric/metadata distances, not measured traversable routes, elapsed play time, encounters or fatigue. A 300-tile eligibility radius does not prove enjoyable travel. The same commission can accompany very different travel burdens.

All emitted bound targets exist in world metadata; procedural givers and participants belong to their generated town; publication consumes pending retrieval binds; boards remain within configured budgets. This proves publication integrity for this sampled policy, not completion correctness or save/load behavior.

A full same-seed repeat produced byte-identical publication results (SHA-256 `19c1767410b077f524540b6c8fb8bb91de210063da587715b1662398186ef54f`), including the stronger check that each published retrieval's site carries that quest's bind ID. This verifies reproducibility for this fixed visit policy; different player visit order may produce different offers.

Representative publication traces retained in the results were selected by outcome:

- Median-distance offered case: seed `procedural-quest-publication-6`, town `784,-560`, procedural site `759,-690`, practical failure, metadata distance 132. Kill/retrieval offers also point to that site; sharing a destination between different objective types is allowed. The duplicate-incidence assertion concerns simultaneous **procedural incidents** only.
- Unavailable case: seed `procedural-quest-publication-0`, town `-720,784`, no owned hook or nearby eligible candidate; no offers published.
- Longest-distance case: seed `procedural-quest-publication-19`, town `48,-560`, competing claims at `147,-280`, distance 297; no owned hook, with the nearby fallback supplying its target.

### Optional skill difficulty

The clean skill harness enumerates **2,640 live resolutions** across two legal Dedication builds, levels 1/5/10 and fatigue 0/75/90. Knight uses the actual preset. The comparison uses a custom standard-array Dedication character with the Sage background and legal class skill selections; it is **not** an implemented Curiosity class or expertise build. Upper levels are conditional skill-stat and ASI projections, not verified earned/UI progression.

Every possible single-d20 outcome is evaluated, or all 400 ordered d20 pairs where disadvantage applies. These are **exact optional-check probabilities**, so sampling-error confidence intervals are inapplicable. No combat win rates are claimed.

| Build / level | Rested | Fatigue 75 | Fatigue 90 |
| --- | ---: | ---: | ---: |
| Knight / 1, 5, 10 | 40% | 35% | 16% |
| Dedication Sage / 1 | 70% | 65% | 49% |
| Dedication Sage / 5 | 85% | 80% | 72.25% |
| Dedication Sage / 10 | 90% | 85% | 81% |

These values use the current configured Investigation DC of 12, the live resolver and no companions. Fatigue is specified **at roll time**. Repeated-attempt fatigue accumulation is not simulated here. Baseline observation and eligible recovery actions do not require this roll; failed optional corroboration is therefore not the same as a failed quest. No expected-reward or profit claims follow from this table.

Representative single-check traces, selected by success/failure/extreme margin, permit spot checks:

- Knight L1 rested: median successful outcome `17 − 1 = 16` vs DC 12; lowest/extreme loss `1 − 1 = 0`.
- Sage L1 rested: median success `14 + 5 = 19`; loss `1 + 5 = 6`; extreme success `20 + 5 = 25`.
- Knight L1 fatigue 90: median success `min(17,13) − 1 = 12`; lowest/extreme loss `min(1,1) − 1 = 0`.
- Sage L10 rested: median success `12 + 9 = 21`; loss `1 + 9 = 10`; extreme success `20 + 9 = 29`.

The earlier temporary 6,600-outcome DC12 artifact included additional unbuilt Calling profiles. Its Knight/Sage conditional results agree with the clean 2,640-outcome rerun. Its hypothetical full/half first-attempt payout means are **not** actual mixed recovery-path quest economics and are excluded from the verdict.

## Recommendation handoff

Retain the current values for this implementation pass; this audit supplies no evidence for production tuning. Game Designer owns any later decision. Product Owner should keep the following acceptance work explicit:

1. Measure complete played journeys: offers encountered, accepted, attempted, resolved, consequential; travel time, combat/resources and total rewards separately. Neither census availability nor a single optional-check probability closes skill-value review.
2. Test whether long targets justify the same commission and whether the family remains appealing beyond the initial authored bundles. Do not increase payment or reduce distances solely from this metadata census.
3. Confirm the supported merchant shipment effect, personal/faction consumers and remembered replies through actual completion, revisits, purchase/exhaustion and save/load. A generated option is weaker evidence than a delivered outcome.
4. Decide whether approximately one merchant-stock opportunity per six settlements is sufficient for the desired living-world feel. Additional effect types and renewed boards remain separate product/design decisions.

Focused lint of both new scripts passes with **zero errors and 35 existing-policy warnings** about fixed scenario numbers and long analysis lines. Full tests, broader lint and browser acceptance are recorded separately by the implementation owner; this section does not claim them.
