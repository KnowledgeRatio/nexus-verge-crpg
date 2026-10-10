**Status:** Implemented — 2026-10-10; the bounded first slice is enabled in local code/data, not committed or deployed. Whole-run skill value and sponsor play acceptance remain open. Finite variety across towns and new runs is confirmed; board renewal is deferred.

**Follow-up:** Sponsor review identified that selecting four fixed incidents does not deliver the intended procedural variety. The sponsor subsequently approved the [unified composition delivery](2026-10-10-unified-quest-composition.md), now implemented locally with reusable incident components and shared investigation/combat/recovery capabilities. The delivery record below remains the historical first slice; saved bundles and fallback content remain supported.

**Local delivery:** Four causal bundles now feed the actual Investigation slot: abandoned shipment, kit dispute, theft report and damaged delivery. Basic observations require no roll; optional Investigation is DC12 with paid retries. Full commission remains 80 XP/20 gold per level; honest incomplete work pays half. Corroboration can improve personal trust or support a fuller resolution without stacking a second commission. Actual culture standing, saved named replies and finite recovered merchant stock are implemented. The first world effect adds three rations to the bound merchant at normal prices; it does not simulate an expedition or repair the whole town. Board renewal, additional quest families and legacy generic reputation declarations remain outside this delivery. See the [validation report](../reports/2026-10-10-procedural-quest-validation.md) for measurements and limits.

# A repeatable procedural quest core

## The player experience

Offer understandable work worth doing → travel with a purpose → make concrete progress using the character's strengths → resolve → receive a clear payoff → see what changed for people and places → choose the next opportunity.

The goal is a satisfying repeatable adventure loop: competence, discovery, occasional surprise and earned relief. Straightforward contracts remain valuable. Every quest does not need a moral dilemma, long conversation or surprise villain. A successful roll must reveal or accomplish something, rather than merely display arithmetic.

This replaces the [medicine-only proposal](2026-10-10-investigation-supply-resolution.md) as the proposed foundation. Medicine can be one compatible content ingredient; it is not the generation method. Signature quests, including authored bandit conversations, remain alongside the repeatable core.

## Baseline that motivated the change

The findings below record the pre-implementation baseline. Repairs and delivered behavior are summarized above and verified in the linked report; the remaining sections preserve the approved design and acceptance intent.

The live [settlement generator](../../src/systems/QuestGenerator.js) fills three fixed slots: kill; bandit negotiation or recovery; Investigation. Loaded `sideQuestTemplates` do not feed this path, and `generateFromTemplate()` has no callers. More quest JSON alone would therefore not improve town offers.

Investigation has verified targets, attempts/retries, rewards and saved lifecycle. It does not yet offer interpreted evidence, a player resolution or remembered decision replies. Its subject is selected independently of the site's facts; completing a search currently assigns `cleansed`, although finding evidence does not remove a threat.

There is also a foundation defect: generated kill objectives emit `targetType/count`, but [QuestManager](../../src/systems/QuestManager.js) reads `requirement.creatureTypes/anyCreature` and `required`. Generated recovery emits `targetItemId`, whereas acquisition reads `requirement.itemId`. These producer/consumer mismatches need a bounded contract repair, with actual kill/acquisition events, before claiming the general quest core is reliable. This document identifies that prerequisite; it does not silently authorize repairs.

Existing personal relations affect conversation and trade. [RelationManager](../../src/systems/RelationManager.js) also propagates personal relation changes into culture-keyed faction scores and uses those scores in NPC relations. However, QuestManager's explicit reputation reward currently only logs the proposed reward. This is incomplete integration, not an absent reputation system; the proposal must reuse and clarify that model rather than create a competing score.

`safer` and `cleansed` do not establish the promised world changes. [ConsequenceManager](../../src/systems/ConsequenceManager.js) has settlement flags and some actual effects, including merchant closure/restoration, but these are not proof of a generated quest's causal outcome. Quest rewards support XP/gold and existing fixed item IDs; a newly generated recovery cache still requires its own generic placement/acquisition producer. A message or tag is not sufficient evidence of a consequence.

## Generate coherent situations, not interchangeable nouns

Build a small library of **authored compatible causal bundles**. Each bundle specifies the incident, eligible roles/sites, baseline observations, optional interpretation, activity arrangement, resolutions and supported effects together. Select compatible bundles and bind their real participants; do not independently roll a motive, clue and ending that might contradict each other.

Generation steps:

1. Find eligible existing destinations and persistent participants.
2. Select an arrangement compatible with their capabilities and the campaign.
3. Bind its causal bundle, evidence and activities using stable IDs and seeded selection.
4. Validate every required actor, objective, target and outcome handler.
5. Publish only a complete offer that survives the town's existing budget.

The incident's truth is fixed when generated and saved. A failed check changes the player's certainty, not whether an NPC was lying. Names, goods and cultural details enrich variation; they do not count as different gameplay.

Four reusable families provide a design vocabulary: **Trace a disruption**, **Resolve a disputed claim**, **Verify a threat**, and **Recover or secure an asset**. Only the first is proposed for the initial playable delivery. The others are future expansion candidates, not four systems to build now.

## First delivery: Trace a disruption

Prove three arrangements: accidental loss/practical failure; competing legitimate claims; concealed or falsified account. They must differ in activity, information, risk or resolution—not just their explanation after an identical roll.

| Draft generated example | Activity and meaningful variation | Player-visible outcome and implementation boundary |
| --- | --- | --- |
| An expedition's tools never returned | Reach the bound site and locate the abandoned cache. Recover it directly, or pursue optional evidence deeper in the same site to explain the loss. | Commission and recovery acknowledge practical success; further evidence changes the giver's saved explanation. Depth-bound recovery and optional search are new generic contracts, not existing guarantees. |
| Two townspeople claim a deposited survey kit | Hear two bound accounts, compare them with the site's dated custody marks, then decide who receives it. Basic observations allow a choice; interpretation corroborates a claim. | Personal relations and saved replies differ by allocation and evidence. Actual trade changes depend on relation tiers. No new ownership/economy simulation is implied. |
| A reported theft conceals a handling mistake | Inspect the site; an initial discrepancy allows an honest inconclusive report. Pursue additional corroboration at a known cost, then report uncertainty or establish responsibility. | Partial/full commissions need explicit balance approval; established evidence changes the response and personal relation. Do not label the incident solved after an inconclusive report. |
| Repeated delivery damage has conflicting explanations | Combine a witness account with physical signs to distinguish poor packing from interference. The main payoff is a useful diagnosis, rather than collecting a stolen object or allocating property. | XP/gold, evidence-informed personal response and journal record. The proposal does not promise repaired equipment, changed caravans or safer roads without a real consumer. Witness/diagnosis stages are new scoped contracts. |

These are four proposed examples within three arrangements, not four independent families or claims of implemented quests. Worldbuilder's reviewed causal patterns inform them; final rendered prose and local details need its content approval. The content proof should instantiate all four across towns/seeds and show their differing activity graphs. If the fourth cannot fit the same bounded handlers, revise its bundle rather than expanding the engine to accommodate it.

Ordinary completion can be concise. Return to a bound NPC only where the activity requires testimony, allocation or a response; do not impose a town return on every quest. For those resolutions, both journal and NPC interfaces must obey the same location/readiness rules.

## Skills, risk and rewards

Design for current Dedication characters, including the Knight and a creation-valid Dedication/Sage character investing in Investigation. Curiosity/Audacity and Expertise are not assumed compensation for weak current builds. Higher-level skill projections remain distinct from fully earned and validated progression.

Baseline observations and an honest incomplete/retreat route keep failure understandable. Investigation can improve certainty, reveal optional recovery or change a supported resolution. It should not become a compulsory roll-until-success toll. Show what was observed, what remains an allegation and what has been corroborated.

Task difficulty should follow the task and stakes. Do not automatically make unchanged routine work harder just because the player levels up. Explicit advanced contracts can offer greater risk and payoff. Proposed DCs, fatigue, partial commissions and bonus recovery values require balance review before implementation; this design does not change global DCs or training.

Pay for fulfilled work, and reward additional exposure/recovery separately where authored. The base commission should be understandable before acceptance; optional work should offer a credible additional payoff. Faction approval and world consequences follow what happened, rather than automatically serving as extra rewards for completing any quest. Avoid presenting relations as a numerical optimisation menu. Audit commission, loot, skill and social rewards together so one action does not accidentally pay several times. Travel, dungeon exposure and retry fatigue are distinct costs; a distant entrance check is not a short errand merely because it has one objective.

## Consequences for people, factions and places

The core must support three distinct consequences: an individual's trust, a faction's standing toward the player, and a change to the affected place or people. Improving a reputation score alone does not demonstrate that the world changed. Straightforward errands can remain modest; not every contract needs all three consequences or a branching ending.

Faction involvement belongs in the causal bundle: bind an actual supported faction, why it cares, which evidenced actions affect standing, and what existing or approved consumer makes that standing matter. Completion need not please every interested party. Recovering supplies may earn approval; exposing misconduct may upset the implicated group while helping those harmed. Show the understandable reason and observed response without turning choices into a table of numerical bonuses.

The first delivery must demonstrate a faction consequence with a real downstream consumer and **at least one reusable, persistent outcome beyond the player**. Choose the bounded world effect during domain review before implementation; the following are candidates, not four additional systems authorized for this slice:

| Outcome pattern | What the player should observe | Required integration |
| --- | --- | --- |
| Remove a verified local threat | The bound site's relevant encounters change after the threat is actually resolved. | Target-scoped victory and an encounter consumer; investigation alone cannot clear danger. |
| Recover essential supplies | An affected service or availability is restored for the people who needed them. | A real, cause-bound disruption and service/inventory consumer; a recovery tag alone cannot restore anything. |
| Establish wrongdoing or settle a claim | The affected people change cooperation, access or a supported follow-up opportunity. | Saved evidence and resolution consumed by actual NPC/access/content flows, beyond a different line of dialogue. |
| Support a faction's local effort | A specific local opportunity or access condition changes alongside standing. | Valid faction identity and a bounded local consumer; no implied territorial or faction-war simulation. |

For example, recovering an expedition's missing tools can pay the player, affect the commissioning faction's trust and restore the expedition's supported activity. Reporting a handling mistake as theft may earn an ordinary commission without resolving the underlying disruption; corroborating the mistake can enable its practical resolution and change who cooperates. These are proposed bundle extensions: the corresponding world consumers must exist before those promises appear in an offer.

World effects must follow demonstrated actions and established facts. Observation, diagnosis and reporting are not interchangeable with recovery, repair or defeating a threat. An inconclusive resolution can pay for honest work while leaving the underlying problem unresolved. Where the consequence is uncertain, communicate that uncertainty instead of claiming an unsupported improvement.

Keep this to a small library of targeted changes, not a world-economy simulation. Bind effects to actual entities and their originating incident; prevent one quest from clearing an unrelated disruption or overwriting a later outcome. Generation must reject unsupported combinations and fall back to a truthful simpler offer. Signature quests use these same effect contracts while retaining their authored presentation.

## General quests and signatures share a contract

Signature content keeps its authored pacing, conversations and rarity. Use the same objective, resolution and save contracts, with content availability/instance limits; a separate runtime quest category is unnecessary.

The existing bandit interaction is reachable from the overworld. Its caller supplies `bandit_negotiation` and `opportunists`; other authored motivations are not currently selected there. Peace/bribe can complete the social objective, but failed negotiation's combat lacks a verified target-scoped victory contract. Preserve the conversation experience and characterize its gaps; do not count it as a fully solved general negotiation system or casually promise “fight instead” for new variants.

## Integration and persistence proposal

Keep `gameState.quests` and the existing available → active → completed/failed lifecycle. Introduce optional `templateId`, `variantId`, bound `participants`, `evidence` (`siteSearched`, acquired facts), `resolution` (selected choice/result) and declared consequence bindings on new quest records. Consequence bindings identify the affected entity, originating incident, required evidence/action and supported effect type. Record applied effects so completion, save/load and repeat interaction cannot apply them twice. The exact schemas follow the contract review gate; these fields describe proposed responsibilities, not implemented APIs.

Wire the campaign-filtered family into the actual Investigation slot. Content describes stages, facts, conditions, prose and effects; generic handlers dispatch by objective/effect type, never individual quest IDs. Configurable selection and balance values remain in [rulesEngine](../../src/core/rulesEngine.js).

QuestManager owns readiness, permitted retries and resolution validation. UI cannot bypass a decision or claim evidence that was never earned. Validate the actual bound settlement/NPC context where required, apply effects/rewards once, and lock resolved state against duplicate input.

Persist bound facts, choice, result and instantiated reply text on the quest. The journal and actual bound NPC read the same completed result; use deterministic tie-breaking for competing applicable memories. Reuse NPC/settlement persistence rather than introducing a second memory store. Verify evidence fields, relations and pending rewards through save/load and NPC regeneration.

Faction effects must use the shared reputation path. Define how explicit quest changes interact with the existing indirect contribution from personal relations so the same event is not credited twice. Validate supported faction keys and distinguish existing culture-based standing from any proposed local organisation before adding new identities. Persist actual world state through its existing owner; the quest records causation and application, rather than becoming a second settlement or encounter state store.

Preserve three-slot budgets and finite existing boards. Prefer unused arrangements when compatible alternatives exist; prevent simultaneous duplicate incidents at one destination. Instance and repetition limits use saved quest records, including failed/abandoned records. Claim an offer only after it is actually published. Stable candidate ordering and world/town-seeded RNG must reproduce the same results for the same seed, visit order and saved state; seed alone does not determine on-entry participant generation.

Sparse worlds retain supported ordinary offers rather than inventing participants or destinations. The current 300-tile fallback is geometric eligibility, not proof of safe routes or good pacing. Audit actual travel and destination reuse. Do not regenerate old boards or repair legacy broken quests in this slice. New fields are optional for existing saves. Disabling the feature stops new family offers while preserving interpretation of already saved family quests; rollback must not strand active quests.

## Dependencies, delivery gates and acceptance

GitHub remains the active roadmap. Product Owner proposes extending [#57](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/57) to own this bounded core reform, rather than creating a new umbrella. No issue/project mutation is performed by this document.

| Gate | Owner and dependency | Required evidence |
| --- | --- | --- |
| Approve the bounded core | Sponsor; Product Owner coordinates domain decisions | Confirm first family, failure routes, consequence limits and repair boundaries. |
| Agree and repair objective contracts | Architect, then Backend Dev after approval | Real generated kill/recovery/search events match their consumers; invalid targets cannot publish. Legacy behavior is characterized, not migrated silently. |
| Agree reputation and world consequences | Product Owner coordinates #39/#57; Game Designer intent; Architect integration; Worldbuilder faction meaning | Select the first world effect and actual consumer, supported faction identities, attribution and double-counting rules. Shared contracts precede dependent content. |
| Build the family and visible consumers | Game Designer mechanics; Worldbuilder content; Architect contracts; Backend/Frontend implement | Four compatible examples, differing activity graphs, evidence/resolution/reply flows, a faction consequence and at least one functioning world effect; no unsupported promises. |
| Evaluate integrated play | Balance Engineer and Creative Director | Multi-town/multi-seed routes, levels 1/5/10, actual progression where claimed, desktop/mobile and saved aftermath. |
| Reassess skill value | Product Owner returns evidence to [#41](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/41) | Opportunities and meaningful outcomes under declared play policies; additional families require another decision. |

[#41](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/41) supplies the baseline; #57 builds the first consequential family; new evidence then reassesses #41. This is not circular closure: neither issue is declared complete because the other exists. [#39](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/39) is now an explicit dependency for the faction-aware delivery. Agree the shared reputation contract first; evidence/activity work can proceed independently once its boundaries are stable, but faction outcomes cannot pass acceptance before their application and consumers work. Product Owner coordinates this ordering and carries any proposed scope changes to the sponsor rather than allowing separate incompatible implementations.

Acceptance must follow generated → reachable → offered → accepted → attempted → resolved → consequential counts under stated routes/policies. Report destination distance and travel-to-first-progress time, arrangement/activity/outcome frequencies, repeated destinations, HP, fatigue, XP, gold, loot and information separately. Exact check probabilities are not run-completion rates. Agree thresholds before declaring success; current availability percentages alone cannot prove enjoyable pacing.

Play all arrangements through success, failure, retreat/inconclusive resolution, paid retry and abandonment. Verify missing bindings, budgets 0–3, duplicate actions/rewards, simultaneous destination collisions, no renewal on revisit, seed/visit-order reproducibility and saves before/after evidence/resolution. Test actual relation-tier consumers when claiming a trading change. Players should explain what happened, what they did, why the result followed and what persisted, and recognise different activities across towns rather than renamed objects. Record whether they want another contract alongside completion and economic metrics.

Consequence acceptance requires before/after evidence at the actual bound place or NPC: the selected service, encounter, cooperation or access behavior changes; unrelated places and incidents remain intact; leaving, revisiting and saving/loading preserve it. Check faction application, downstream behavior and personal-relation overlap separately. A completed journal entry, changed reply or reputation number alone cannot satisfy the world-effect requirement.

Balance review must assess opportunity frequency, achievable outcomes for current builds and whole-journey value, including faction/access benefits and avoided future costs where those are real. Separate proposed benefits from measured consumers. Qualitative review must establish whether players notice the aftermath and care about it; more consequence fields do not by themselves make a better quest.

Sponsor approval authorizes the bounded implementation described here, including objective repairs and reputation persistence. New dependencies, global tuning, Calling implementation, board renewal, world-economy simulation, commits and deployment remain outside this delivery. Documentation Agent updates affected living references after implementation settles.

## Evidence and review

Design intent: Game Designer; experiential pacing: Creative Director; contract feasibility and implementation trace: Architect; scope/dependencies: Product Owner; prose/canon: Worldbuilder. Domain decisions remain subject to sponsor approval.

Sources: [skill baseline](../reports/2026-10-10-legal-skill-baseline.md), [target/reward repair](2026-10-09-investigation-target-repair.md), [quest rules](../../.claude/rules/systems/quests.md), [architecture](../../.claude/rules/architecture.md), [world](../world/WORLD.md), [civics](../world/CIVICS.md), [quest data](../../data/quests.json), [generator](../../src/systems/QuestGenerator.js), [manager](../../src/systems/QuestManager.js), [settlement persistence](../../src/systems/SettlementManager.js) and [save handling](../../src/systems/SaveManager.js).

Original validation was specialist/source review and local Markdown/path/diff checks. The approved local implementation adds gameplay tests, browser checks and generation/skill audits recorded in the linked validation report. Those checks do not establish whole-run profitability, actual travel safety or sponsor play acceptance.
