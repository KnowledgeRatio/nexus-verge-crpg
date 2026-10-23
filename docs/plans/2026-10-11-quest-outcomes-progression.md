**Status:** Implemented — 2026-10-11. Enabled locally; the sponsor authorised agents to plan and implement lasting quest outcomes, reusable reward/outcome matrices, advertised failure/deadline consequences and harder level-adjusted new offers. See [functional validation](../reports/2026-10-11-quest-iteration-validation.md) and [bounded balance evidence](../reports/2026-10-11-quest-iteration-balance.md). Whole-journey balance and sponsor experience acceptance remain open; nothing committed or deployed.

# Quest outcomes and progression

## Player outcome

As the player advances, newly offered work presents harder challenges, larger rewards and more consequential situations. Completing a quest changes an actual place, merchant or relationship. An advertised urgent commitment can have a bounded negative aftermath if abandoned or expired. The player can understand the stakes before accepting and see the change afterward.

Retain the [implemented unified composition core](2026-10-10-unified-quest-composition.md), its reusable activities, protected recovery and source-bound combat proof. Outcome families are shared across activities rather than mapped one-to-one to investigation, combat or recovery. Authored signatures remain supported. Boards stay finite; renewal is deferred.

Live delivery and acceptance belong to [KnowledgeRatio/nexus-verge-crpg #57](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/57). This document records the approved iteration and domain handoffs; it is not a substitute roadmap or open-decision register.

## Approved outcome scope

| Outcome family | Required actual consumer | Success or improved resolution | Accepted advertised failure/expiry |
| --- | --- | --- | --- |
| Local safety | Overworld encounter selection around a real bound site | Reduce local danger in a defined area, alongside existing exact boss-slot clearance where earned | Bounded local danger increase for an incident that advertises it |
| Supply availability | Actual settlement merchant inventory and purchase depletion | Deliver finite appropriate stock; optional salvage changes delivered quantity | Bounded stock disruption where the offer advertises it |
| Specialist merchandise | Existing eligible merchant, canonical item and actual purchase flow | Finite level-appropriate specialist or enchanted merchandise, where valid content exists | Merchandise remains unavailable; no invented service capability |
| Personal/faction standing | Existing RelationManager and faction state | Standing changes for the actual beneficiaries | Declared standing loss without duplicate lifecycle penalties |
| Information | Actual map/journal discovery of a real eligible site | Useful site knowledge through supported evidence and discovery | No fabricated fact or automatic loss of already-earned knowledge |

People and specialist services may remain authored effects where they already have working consumers. This iteration does not promise a new rescue/NPC simulation, crafting service, production economy or recurring supply chain. A registration, world tag or dialogue line alone cannot satisfy any outcome above.

## Rewards, challenges and progression

The sponsor clarified that levelled means **level adjusted**: later new offers must be materially harder, not merely pay more. Keep some lower-risk opportunities so advancement still feels valuable. Instantiate and save the offered level, challenge/risk profile, reward values, consequence magnitude and deadlines. Existing offered/accepted quests do not dynamically grow stronger when the player levels, loads or revisits.

Game Designer's ruling uses the following provisional configurable values. These are implementation intent, not completed balance acceptance:

| Offered level | Optional harder-task DC | Specialist merchandise rarity ceiling | Urgent acceptance countdown |
| --- | --- | --- | --- |
| 1–3 | 12 | Fine | 3 long rests |
| 4–7 | 14 | Great | 4 long rests |
| 8–10 | 16 | Heroic | 5 long rests |

| Risk | One full commission | Successful faction standing |
| --- | --- | --- |
| Routine | 80 XP / 20 gold × offered level | +10 |
| Demanding | Base commission × 1.5 | +15 |
| Perilous | Base commission × 2 | +20 |

Boss contracts are Perilous and labelled Deadly. Honest partial settlement pays half the commission; optional salvage adds actual stock without another commission. Accepted failure/abandonment adds −5 faction standing alongside the existing −10 personal penalty, accounting for existing spillover to avoid double punishment. Skill progression describes more complex new tasks; legacy/signature checks keep their authored values.

Architect requires the offered encounter level to feed actual DungeonManager generation and both ordinary dungeon and boss EncounterBuilder construction. A saved number unconsumed by the actual factory does not freeze difficulty. Preserve actual generated boss identity/source checks. Audit commission separately from combat XP/loot, goods, merchandise and relationships. Higher rewards must not conceal an unreasonable encounter without measuring that problem.

## Persistent consequence contracts

Extend existing resolution `effects` and accepted `failureEffects`; do not introduce a parallel quest lifecycle. ConsequenceManager owns validated generic `local_safety` and `merchant_availability` effects and idempotent receipts. Player's real overworld encounter check consumes local safety; MerchantManager consumes bounded scarcity and finite specialist merchandise. SettlementManager restores the plain-object ledger fields through existing metadata serialization.

Safety targets a radius of 12 tiles around a bound real site: success multiplies actual encounter chance by 0.75; urgent expiry by 1.25. Use the strongest scoped modifier rather than multiplicatively stacking rewards; enforce configurable 0.5–1.5 limits. A later resolved incident can replace the negative modifier for the same area. Exact boss clearance remains a separate proven encounter effect.

Supply success uses real custody and finite delivered stock. Advertised urgent expiry may reduce the affected ordinary SKU's availability by at most 50%, never all shop goods. Specialist recovery creates one finite saved paid enchanted offer through the existing weapon/armour/shield magic pipeline and eligible merchant. Generic salvage does not create magical equipment automatically. Outcome publication requires actual site/participants, campaign-loaded canonical items and working consumer APIs; unsupported combinations are withheld.

## Failure and time commitments

- An unaccepted ordinary offer has no automatic punishment.
- Acceptance begins an advertised deadline where the incident is urgent; use the existing world clock, not browser wall time.
- Display the deadline's unit and the specific failure consequence before acceptance, with remaining time while active.
- At most 25% of eligible offers are urgent. Acceptance starts the saved 3/4/5-long-rest countdown; existing fiction treats a long rest as a week, and UI states the actual gameplay unit.
- Expiry is checked when the world clock advances and before actions/resolution/turn-in. Completed required physical/observation objectives suspend expiry while awaiting turn-in; completed, settled or interrupted pending handovers do not expire. Work still unfinished at the deadline cannot claim a late commission.
- Urgent expiry applies one advertised bounded physical negative consequence and the standing penalty. Abandonment applies standing penalties and leaves the physical problem unsolved; it does not trigger an additional physical deterioration effect.
- Completion, abandonment and expiry are mutually exclusive terminal routes with persistent once-only receipts. A pending interrupted handover must recover coherently without replaying effects or payouts.
- Negative consequences are bounded. Failing one commitment must not globally shut down trade or irreversibly ruin the run. The player may continue adventuring; exact recovery routes are included only when implemented.

## Dependency order and ownership

| Gate | Owner | Required result before the next gate |
| --- | --- | --- |
| 1. Mechanics and consumer contracts | Game Designer / Architect | Concrete matrices, clock semantics, real state owners, snapshot and stacking limits |
| 2. Persistent generic consequences | Backend | Validated owner APIs and idempotent success/failure receipts; actual encounter/merchant/relation consumers |
| 3. Level-adjusted generation | Backend / Data | Deterministic eligible content, saved offered profile and compatible outcome selection; unsupported offers withheld |
| 4. Player clarity | Frontend / Worldbuilder | Offer, journal and resolution match actual challenges, rewards, deadlines and aftermath on desktop/mobile |
| 5. Quantitative and integration evidence | Balance Engineer / independent reviewers | Levels 1/5/10, full resource-policy limits, actual before/after consumers and lifecycle/save/load tests |
| 6. Documentation and product acceptance | Documentation Agent / Product Owner / sponsor | Accurate current behavior and limitations, reviewed diff, sponsor experience acceptance; #57 remains open until its gates pass |

Do not publish a consequence before its owner consumes it. Reputation correctness coordinated with #39 remains narrow; this iteration does not close that broader issue. Skill difficulty/exposure/value evidence feeds #41, which remains open. Broader full-policy boss and whole-journey balance from the prior report remains outstanding.

## Acceptance matrix

| Dimension | Functional evidence | Player outcome evidence |
| --- | --- | --- |
| Reusable outcomes | At least one consequence family crosses multiple supported activity structures; data selects generic handlers | Two different adventures can produce recognisable lasting aftermath without repeating a fixed story |
| Safety | Same location, RNG and encounter policy before/after demonstrates changed actual encounter incidence; unrelated sites unaffected | The player can identify the area helped and understand the limited protection |
| Stock/merchandise | Actual shop lists changed finite goods; purchase, depletion and reload preserve them; no duplicate grants | The promised supplies/specialist goods are visible and useful at the advertised level |
| Level adjustment | Compare real new offers at levels 1/5/10, including DC, encounter construction, rewards and consequence values; old offers remain unchanged | Later work is recognisably harder and more valuable while earlier accomplishments stay easier |
| Failure/deadlines | Advertised accepted expiry and abandonment apply intended effects once; ignored ordinary offers do not; exact boundary and load/late-resolution checked | Stakes and remaining time are understandable before commitment and afterward |
| Total value | Record commission plus combat XP/loot, travel, HP/resources/fatigue, optional outcomes and merchandise access separately | Relevant legal builds have worthwhile work; optional skills improve results without mandatory roll grinding |
| Compatibility | Characterised signatures, old boards/plain restored characters, campaign inheritance, interrupted resolution and seeded generation remain valid | Existing players retain their quests and distinctive scenes |

Test counts prove regression coverage, not whole-run balance or compelling play. Report actual played journeys separately from synthetic UI fixtures, generated offer distributions and conditional combat policies. Numerical changes need attributable before/after evidence; restricted weapon-only outcomes must not be reported as normal-player win rates.

## Decision-register contact

The sponsor ruled on this iteration and explicitly clarified level adjustment; those are accepted directions rather than open decision issues. Live decision search on 2026-10-11 returned #16, #34–#37, #46 and #50; none is a prerequisite for this bounded implementation. Scope-relevant October quest plans are already Implemented, and no new unresolved scope decision was found. Domain agents should surface any genuinely conflicting mechanic/architecture ruling before delivery.
