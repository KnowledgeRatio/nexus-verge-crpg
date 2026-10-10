**Status:** Implemented — 2026-10-10. Sponsor approved the bounded proposal and it is enabled locally for new town offers. Nothing committed or deployed. Whole-journey balance and sponsor play acceptance remain open; the [validation report](../reports/2026-10-10-unified-quest-validation.md) distinguishes implementation checks, generation distributions and conditional combat evidence.

**Delivery note:** Shared objective prerequisites, captured boss-role proof, protected source-bound goods/handover, actual stock quantities and persistent boss-slot clearing are implemented. Six compatible component dimensions yield seven activity structures. Actual dungeon type is read through the same seeded first selection as dungeon generation; no dungeon preview or level freeze is needed. The actual boss is fixed when the dungeon generates and captured at combat construction. Game Designer approved Craft salvage (2 usable units plus 1, total 3), unchanged commission and explicit Deadly labels for boss contracts. The sections below retain design intent; statements about implementation awaiting approval describe the earlier proposal stage.

# Unified quests with meaningful procedural variation

## Player outcome and scope

Across towns and new runs, players should encounter work with different activities, decisions and aftermath. A quest may involve observation, conversation, combat and recovery together. Straightforward bounties remain useful; authored signature quests retain their scenes and pacing. Boards remain finite; renewal is deferred.

The [first slice](2026-10-10-procedural-quest-core.md) supplies useful evidence, resolution, reputation, stock and persistence machinery. Selecting four complete fixed incidents and changing their participants/sites falls short of the requested variety. Keep that machinery and reform how incidents are assembled before adding more fixed quest stories.

Prove the reform first through disrupted supplies and occupied sites. This is a bounded content proof of shared capabilities, not a rewrite of every campaign quest or a world simulation. Existing saved boards keep their instantiated content.

## Pre-implementation baseline and approved repairs

All quests share QuestManager and the saved available/active/completed/failed lifecycle. Richer actions and resolutions currently depend on `quest.procedural`; kill/recovery quests do not inherit them automatically.

| Boundary | Behavior before this delivery | Approved repair |
| --- | --- | --- |
| Generation | Fixed kill, social-or-recovery, investigation slots; four complete procedural bundles | Compose compatible activities within one incident; make richer capabilities independent of a type label |
| Observation | Baseline observation completes `objectives[0]` | Complete the explicitly bound objective, without completing a combat/recovery objective by array position |
| Resolution | Prerequisites check facts and actions | Also require completed objectives and actual custody where appropriate |
| Combat credit | Victory reports creature species/type and world coordinates | Capture the actual encounter/site/room/target identity and grant only matching objective credit |
| Recovery | Acquisition matches item ID; feature stores one retrieval binding | Actual quest/source-bound goods, quantity, possession and handover semantics |
| Recovery placement | Injection can run on boss-room entry as well as victory | Combat-required goods cannot be acquired merely by entering the room; one authoritative acquisition route |
| Signature negotiation | Authored bandit challenge exists; generated `social_challenge` and completion handler `skill` do not align | Verify and repair the real signature flow before claiming shared negotiation support |
| Consequences | Personal trust, culture standing and finite merchant stock have real consumers | Reuse these; implement a target-scoped encounter consumer before claiming an occupation is removed |

Sources: [generator](../../src/systems/QuestGenerator.js), [manager](../../src/systems/QuestManager.js), [resolution helper](../../src/systems/ProceduralQuest.js), [combat](../../src/systems/CombatManager.js), [dungeon acquisition](../../src/systems/DungeonManager.js), and [first-slice validation](../reports/2026-10-10-procedural-quest-validation.md). The table records historical integration gaps that this delivery repaired; see the delivery note and follow-up validation for current behavior.

## Generate a consistent incident from reusable components

Select a real eligible site and participants, then assemble compatible components:

| Component | Examples of its responsibility |
| --- | --- |
| Goal | Deliver missing supplies; remove a bound occupation; establish responsibility |
| Subject | Goods appropriate to an actual merchant or supported recipient; no universal survey kit |
| Cause | Abandonment/handling failure; hostile occupation; disputed custody |
| Material state | Intact; partly recoverable; unavailable |
| Activities | Observe; hear a bound account; interpret; defeat a bound encounter; acquire; hand over |
| Resolutions | Fulfilled work; supported partial delivery; evidenced allocation; honest inconclusive report |
| Consequences | Bound stock addition; personal trust; culture standing; removal of the specific occupation |

Compatibility is explicit data, not independent random rolls. A subject requires a suitable recipient/consumer. A hostile cause requires actual eligible occupants. A claim requires real claimants and credible custody evidence. Goods advertised as recoverable require a producer. Every published resolution needs a reachable path and supported effect handler.

Fix the incident's truth at generation. Select evidence and prose from that truth; rolls change what the player learns or can accomplish, not what secretly happened. Save component IDs, bindings and instantiated content. Loading or revisiting must not reroll the incident.

Components must cross combinations: occupation can obstruct access or recovery; partial salvage can follow abandonment or occupation. Merely authoring three more complete incident bundles fails this proposal. Names, item nouns and prose changes are recorded separately from structural variety.

## Concrete contrasting examples

These examples describe proposed behavior, not additional quests currently playable.

| Incident assembled | Player activities and decision | Observable aftermath |
| --- | --- | --- |
| Abandoned, intact consignment; recovery goal | Locate and deliver usable goods. Optional interpretation establishes why they were abandoned. | Delivered goods add finite appropriate stock; the evidenced explanation can change personal trust. No compulsory combat victory or skill roll. |
| Hostile occupation; site goal; no recoverable goods | Establish the target and defeat its specifically bound encounter. | The bound occupation remains removed on revisit/save-load; unrelated encounters are untouched. No invented delivery objective. |
| Hostile occupation; damaged consignment; recovery goal | Defeat the bound occupants, recover usable goods and optionally salvage more before handing them over. | Base recovery is worthwhile; extra actual goods change the finite stock received. One commission, with combat loot and salvage accounted for separately. |

The same salvage component must also instantiate under abandonment, and the occupation component under both access and recovery goals. Evidence-led custody resolution uses the same prerequisites/resolution capability, with actual participants and truth-consistent facts. Every adventure need not branch or contain every activity.

Optional skills should change a supported action, recoverable quantity, allocation or useful certainty. Use canonical SkillRegistry skills and credible authored approaches; choose and review the first salvage approach before implementation. No skill-number menu, new Calling, Expertise assumption or mandatory repeat-until-success toll is required.

## One shared contract, bounded integration

Keep quest identity, giver, settlement, bound site, saved lifecycle and `objectives`. Give objectives stable IDs. Extend existing prerequisite evaluation with `requiresObjectives` alongside facts/actions. Use existing actions/resolutions wherever content declares them, with legacy objectives-only completion retained for content without richer fields. `procedural` remains generation provenance and compatibility metadata, not the permanent gate for decisions or consequences.

Illustrative responsibilities, not a locked JSON schema:

```text
quest: identity + actual bindings + fixed incident + objectives + actions + resolutions
objective: stable ID + supported type + target/source requirement + saved progress
resolution: required facts/actions/objectives + custody requirements + effects + commission
receipt: originating incident + objective/event identity + applied result
```

Combat captures source context at encounter construction, including actual site/room/target. Resolution consumes proof from that context; it does not inspect mutable player position after victory. Fleeing, visiting, damaging an opponent or defeating an unrelated same-species creature cannot clear the occupation.

First combat content must bind an actual existing encounter, initially the real dungeon boss where suitable. It must not select an enemy the site never spawns. Game Designer reviews that encounter's level/risk suitability; if no appropriate encounter exists, withhold that combination or use a truthful supported fallback. Short low-level jobs cannot be promised merely by attaching a routine label to a difficult boss.

Recovery uses one authoritative acquisition route, source-bound goods and actual possession/quantity checks. Handover transfers/consumes the goods once. Entering a room, acquiring an ordinary same-ID item or repeating a loot notification is insufficient. Prior recovery behavior is characterized and preserved for existing saves; stronger semantics apply to newly instantiated content.

Consequences stay with their owning systems: NPC relations, faction scores, settlement stock and dungeon encounter state. The quest stores causation and application receipts. The occupation consumer must suppress only the resolved bound encounter after revisiting/regeneration; a `safer` tag cannot establish this. Scope is removal of that occupation, not globally safer roads, rebuilt sites or a simulated economy.

Signatures use shared objective proofs, rewards and consequence handlers while retaining authored conversations and sequencing. They need not use the procedural composition grammar. Verify the bandit signature end to end; hostile negotiation becomes a general ingredient only after its success/failure/combat pathways have actual producers and consumers.

## Rewards, difficulty and acceptance evidence

Pay one commission for the agreed job. Audit total combat XP/loot, commission, recoverable goods, personal trust, culture standing and world effects together. Do not pay a full commission for each activity in one incident. An incomplete resolution is terminal and cannot farm repeated partial rewards. No new numerical tuning is approved by this design.

Use currently playable legal Dedication builds at levels 1, 5 and 10. Keep routine task DCs tied to task difficulty; higher-stakes work must be explicitly different. Review encounter composition and attrition at level 1, Extra Attack/resource interactions at level 5, and actual current progression at level 10. Conditional upper-level profiles must be labelled projections when earned progression has not been exercised.

Separate three evidence layers: authored compatible combinations, actually generated offers, and actually played journeys. A multiplied component count is not a replayability result. Strip names/prose from structural signatures and measure activity order, objective dependencies, decisions, combat role and consequence type. Report which reusable components cross different causes/goals, rejected combinations, concentration and repetition across towns and seeds.

Follow generated → reachable → offered → accepted → attempted → resolved → consequential counts under stated visit/play policies. Measure skill opportunities and meaningful outcomes, not just check percentages. Compare basic completion, optional investigation/salvage and withdrawal policies where supported. Record travel time, first meaningful progress, encounters, HP/resources/fatigue and total rewards. The existing median 131-tile geometric target distance is a pacing question, not measured play time or permission to tune rewards blindly.

Hard correctness gates: no unsupported published paths, unrelated-event credit, duplicate acquisition/reward/effect, rerolled truth or legacy/signature regression in the tested scope. Play and save/load all advertised routes, including failed optional checks, incomplete completion and abandonment. Desktop/mobile journal and actual giver flows must agree. Before/after/revisit evidence must show the actual affected stock or encounter behavior; a reply alone is insufficient.

Game Designer and Balance Engineer establish the experimental matrix and sponsor-facing variety/pacing targets before acceptance. Sponsor play checks whether the player can explain what happened, what they chose and what persisted, recognise different adventures without relying on renamed nouns, and want another quest. No balance or experiential pass is claimed yet.

## Ownership and dependency sequence

1. Sponsor reviews this combined design. Product Owner coordinates scope; Game Designer owns activities/risk/reward intent; Worldbuilder owns causal compatibility and prose; Architect owns contracts.
2. Backend establishes objective IDs, shared predicates and resolution compatibility; Frontend keeps journal/NPC views consistent. Characterize legacy and signature paths before extending them.
3. Backend wires actual combat provenance, guarded recovery and the encounter-state consumer. Data Agent validates bindings/content; no combat content publishes ahead of its producers.
4. Backend and Worldbuilder implement compatible composition using existing generation/content boundaries, campaign filtering and rules-engine configuration. Demonstrate component reuse across contrasting activity structures.
5. Balance Engineer audits generated distribution and played journeys; domain reviewers and sponsor assess consequences and replayability. Documentation records actual behavior separately from remaining proposals.

Product Owner refreshed GitHub: [#57](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/57), [#39](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/39) and [#41](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/41) remain open. After approval, amend #57's bounded scope before delivery; #39 retains shared reputation/tracking ownership and #41 receives new opportunity/value evidence. This document is a review artifact, not a substitute roadmap or decision register. No GitHub mutation occurred.

## Specialist follow-up

Worldbuilder recommends composing subject, cause, custody, hazard, condition and claim. Initial goods can use real rations, rope and torch IDs where campaign merchant-pool eligibility is verified. Contrast accidentally dropped provisions, seized rope and abandoned rope subsequently occupied by enemies. Occupation must not automatically imply theft. These are narrative component examples; the access-only example above is a deliberate framework proof beyond delivery, not a promise of infrastructure restoration.

Balance Engineer proposes an initial diagnostic matrix: the existing 20 world seeds across settlement publication and levels 1/5/10, with two declared visit orders; 50 independent route seeds per build/level for Knight and Dedication Sage, 300 journeys per declared policy; and 12 observed play sessions covering two builds, three levels and contrasting journeys. This is a proposed evaluation budget, not completed evidence or guaranteed statistical power. Compare the same seeds/policies to the current fixed-bundle baseline. Report largest/top-three structural shares, consecutive repeats and distinct structures among each route's first five quests, accounting for routes with fewer offers.

Report uncertainty at the independent world/route level, preserve paired seeds in build comparisons, and expand uncertain consequential comparisons. Do not treat settlements within one world as independent samples or attribute all whole-build differences to one skill. Combat conclusions that drive tuning need actual-engine batches for decisive encounter/resource conditions, representative win/loss traces and an explicit sample-size rationale. Avoid treating exact check odds as journey completion rates. Qualitative sessions diagnose choices and pacing; they are not a population win-rate estimate.

Consultation completed: Product Owner, Game Designer, Architect, Worldbuilder and Balance Engineer. Sponsor subsequently approved implementation. Backend/Frontend delivery and independent review are recorded in the linked validation report. Product Owner amended #57 after approval; #39/#41/#57 remain open for their outstanding scope and acceptance.
