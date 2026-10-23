# Finite wilderness provisioning

Date: 2026-10-13. Status: implemented and enabled locally with sponsor approval. No commit or deployment. This delivers the proposed Survival supply opportunity; encampment construction and equipment maintenance remain separate ideas.

**Purpose confirmed, 2026-10-18:** provisioning extends travel far from functioning settlement resupply. Near-town relocation and increased starter exposure are withdrawn as recommendations/acceptance criteria; existing distant sites may suit the purpose. The next validation uses existing generated sites on real long journeys at levels 1/5/10, measuring onward benefit, turnbacks, costs and safe return against actual resupply access. Remote usefulness is unverified; no new resource host, relocation or tuning is approved. See [governing intent and validation](../../.claude/rules/systems/world-gen.md).

**Earlier exposure experiment (2026-10-13):** the [starter-route report](2026-10-13-provisioning-exposure.md) records 1,080 executions with zero clues, including runtime-only 100% candidate allocation and different detour budgets. Existing eligible shelters are absent within 64 geometric tiles of sampled starter towns. These results do not test remote usefulness; the later purpose clarification above supersedes the earlier near-town recommendation. Production provisioning is unchanged.

## Player flow

New worlds attach occasional animal tracks, edible plants or abandoned food caches to suitable existing wilderness shelters. Initial POIs retain their existing ambiguity: the source does not disclose that an unrevealed location is safe. Revealing a sanctuary exposes its cue in the rest/camp menu and a secondary green `+` map badge while visible and unspent. E or the touch Interact menu reopens an already revealed sanctuary.

Choose Follow tracks, Gather plants or Search cache. The shared prompt identifies Survival + Intuition, DC 12, a possible one-supply reward and the existing two-fatigue attempt cost. Leave for later cancels freely. Full supplies disable the action and preserve it. Confirmation consumes the site's one saved attempt before resolving the shared skill check; success restores one supply up to the existing cap of three, and failure finds nothing. No XP, gold, items, HP, class-resource recovery or quest-clock change is awarded. The normal fatigue cost is charged before the roll; the prompt defers bonus/probability display rather than showing misleading pre-charge odds at threshold boundaries.

Both success and failure remain spent after leaving, camping, resting or loading. A resolver error also preserves the spent receipt and cannot fall back to a second roll. Pending-save reservations cannot be reopened. Source confirmation revalidates current location, world identity, combat/dungeon state, campaign eligibility and supply capacity.

## Generation and persistence

`data/provisioning.json` declares campaign-filtered cue text, action labels, eligible POI types/biomes and shared challenge outcomes. `RULES.provisioning` owns the feature flag, DC, one-supply reward and generation limits: 25% candidate chance, 96-tile minimum spacing and small/medium/large whole-world caps of 6/24/54. These are conservative development values, not completed journey-balance acceptance.

The WorldGenerator postpass uses a separate coordinate-derived seeded stream. It attaches `feature.provisioning:{id,cueId,attempt:null}` to eligible existing sanctuary-resolving POIs; it does not create extra POIs or change existing town/dungeon/quest placement. Saved attempts hold status, resolved check and actual supply gain on canonical metadata features. Tile-copy reveals synchronize with canonical state, and saves use the existing metadata serialization contract. Old saved worlds receive no backfilled sites; restoring or reopening a region does not run placement again.

## Quantitative evidence

The reproducible [audit](../../tools/balance-sim/provisioning-audit.js) and [results](../../tools/balance-sim/provisioning-audit.results.json) cover five seeds per map size plus one repeated seed per size, 18 world generations total. Placement is deterministic, within caps, biome/feature compatible and at least 96 tiles apart.

| Map | Sources per world | Mean | Ceiling |
|---|---:|---:|---:|
| Small | 1–3 | 1.8 | 6 |
| Medium | 12–14 | 13.2 | 24 |
| Large | 18–30 | 24.6 | 54 |

The audit exhausts 7,200 live skill resolutions across five creation-valid profiles, levels 1/5/10 and fatigue 0/48/73/88/98, applying real provision, rest and JSON-reloaded receipt consumers. Rested Knight success is 45% without Survival training and 55/60/65% with training at levels 1/5/10. An Intuition-invested trained profile yields 70/85/90%. Upper levels are conditional skill-stat projections, not fully earned/specialized progression or completed Calling playthroughs. Exhaustive dice support has no sampling confidence interval.

The current fatigue system can reset fatigue at 100 while adding exhaustion. Thus an attempt starting at 98 can improve immediate odds relative to 88 while incurring lasting exhaustion; this inherited interaction is recorded, not tuned here.

Finite farming protection passes; meaningful natural-route exposure remains unproved. The small-map mean gives a rested trained level-1 Knight approximately 0.99 expected extra supplies across the entire map versus 0.81 untrained, before discovery and detour costs. This is not evidence that Survival now strongly changes a normal run. Broader skill-value and journey/economy acceptance remain open under the existing review.

## Validation

Generation and lifecycle tests cover seeded behavior, filtering, caps/spacing, preservation of old saves and receipts, full-meter preview/cancellation, duplicates, success/failure, disabled modes, natural critical rolls, plain characters, fatigue and companion help, pending saves and resolver errors. Integration tests cover canonical tile-copy reveals, stale-world confirmations, free cancellation and hidden map markers.

Twenty-seven focused generation/lifecycle/integration tests pass. Desktop 1440×900 and mobile 390×844 browser fixtures pass with no page errors or horizontal overflow. They verify reveal-only cues, hidden pre-charge odds, full-meter cancellation, successful/failed attempts, actual fatigue/supply effects without other rewards, stale-world guards, resolver-error handling, read-only markers and persisted depletion after camping/save/re-entry. Mobile uses touch Interact and skill buttons. Artifacts are `/private/tmp/provisioning-browser.mjs`, its results JSON and viewport screenshots. The fixtures use real seeded source generation and player/rest/prompt/save flows, but synthetic character placement and forced check results; they are not natural journeys.

The final broad suite passes **1,537 tests in 138 files**, including concurrent hostile-settlement/rendering work present in the workspace. Build and legal checks pass; the web build includes `data/provisioning.json`. Scoped new-file lint has zero errors. Repository lint retains 175 errors and broader lint 3,251; report links, cue/skill/POI/biome references and diff whitespace validate. None of these checks proves natural journey exposure or economy acceptance.
