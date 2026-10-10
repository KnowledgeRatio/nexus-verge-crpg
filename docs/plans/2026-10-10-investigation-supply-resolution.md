**Status:** Superseded — 2026-10-10. The sponsor rejected a single specific story as the procedural quest foundation and authorized designing a reusable quest core, with signature stories alongside it. This medicine scenario remains an unapproved possible content example; its implementation is not authorized.

# An Investigation that changes a decision

## What the player experiences

Start with one reusable, authored story, **Trace the Missing Medicine**, placed in a procedurally generated town and an existing eligible dungeon. A merchant wants medicine recovered. At the destination, the player finds that the town's innkeeper took it to treat a wound. Returning the reserve and helping the innkeeper are both defensible choices. Investigation supplies evidence about the claim; it does not decide the player's answer.

This is a proposal, not an implemented quest or new setting canon. Names, dialogue and schema below are draft content. The innkeeper's wound and the town's reserve are narrative circumstances, not new injury, inventory, population or economic simulations.

**Example offer:** “{giverName}’s missing medicine was set aside for {townName}. Its trail ends at {dungeonName}. Find the stores and learn why they were taken.”

**What everyone finds:** an unopened medicine crate carrying the merchant's mark, and a signed note: “I took it. The wound won’t close. I couldn’t carry it back.” Visiting the correct room reveals this baseline information even when the Investigation check fails. That keeps the story playable for current Dedication characters without requiring unfinished Curiosity or Audacity features.

**What successful Investigation adds:** blood-stiffened dressings, patched and used repeatedly, corroborate the plea. The medicine is untouched. The claim is credible, but the town still has a claim on its reserve. The journal distinguishes the innkeeper's statement from corroborated evidence.

The player returns to the issuing town and chooses:

| Choice | Lasting outcome | Example response |
| --- | --- | --- |
| Return the town's reserve | Merchant relation +10; innkeeper relation −5. | Merchant: “Those stores were promised to {townName}. Thanks to you, I can keep that promise.” |
| Give the medicine to the innkeeper | Innkeeper relation +10. Merchant relation −5 without corroboration, or +5 with it. | With corroboration, merchant: “You brought evidence, not excuses. The reserve is still gone.” |

Both choices remain available after the first site search. Both give the same ordinary Investigation reward: currently 80 × player level XP and 20 × player level gold, presented as the commission for finding the stores rather than payment for choosing the merchant's preferred outcome. No new payer, purse or escrow simulation is proposed. Branch-specific relations replace this scenario's ordinary quest-giver and settlement completion bonuses; they do not stack with them. No automatic `cleansed` world tag should imply that either allocation resolved the whole area's problems.

On revisiting, the named NPCs remember the allocation through a saved response, and the completed journal records it. For example, the innkeeper after a return says: “I asked for help. You returned what I took. I remember both.” These are required visible consumers of the decision, not unused flags.

Relation changes also feed existing trading and conversation rules. A trading benefit depends on the actual NPC crossing a relation tier; the proposal does **not** promise a fixed discount everywhere. Under the present −5 starting-relation configuration, corroborated support can move the merchant from wary to neutral. That example is conditional, not a universal campaign result. No guaranteed new intelligence reward is proposed.

The numeric table above is for sponsor review and balance validation. In the game, show the likely response in plain language and an actual relation-tier change when applicable; do not turn the allocation screen into a comparison of numeric relation bonuses.

## How it fits procedural generation

Use **one authored instance per world** for the pilot, replacing an ordinary Investigation slot rather than adding a fourth offer. The first eligible town visited claims it, normally the starting town. Other towns retain their ordinary Investigation offers. Near-universal Investigation availability must not become near-universal repetition of this wounded-innkeeper story.

Keep the approved owned-hook and nearest-eligible-dungeon fallback policies. The scenario cannot invent a destination or actor. If a visited town cannot bind both distinct NPC roles and a real target, retain its ordinary Investigation; a later eligible town can claim the authored scenario. Local participant/target selection uses the world seed, while the town receiving the pilot also depends on visit order and saved claim state. Interactive checks retain current live roll behavior.

The placement audit must distinguish metadata eligibility from first-visit instantiation. For the same seed, visit order and state, selection is reproducible; seed alone does not select a world-wide winning town. Claim only when the bound offer actually survives the quest budget and is saved into the town's offers, retaining that claim after decline, abandonment, completion and save/load. Missing participants, failed binding and caps that exclude the slot must not create a ghost claim. A different visit order can place the story elsewhere but must never create a second instance or silently replace an existing saved offer. This uses current on-entry NPC generation rather than adding a world-wide NPC pre-generation requirement.

This is a small authored content sample for [quest consequences #57](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/57), not a general procedural story generator. It must feed back into [skill value #41](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/41). No local roadmap, GitHub mutation or completion claim is created by this document.

## Skill checks and failure

Keep the current generated Investigation DC formula for the pilot: DC 12/13/15 at levels 1/5/10. Keep the free initial search and the existing deliberate retry cost of two fatigue. A failed search grants the baseline crate and note, but no corroboration. Before finalizing, the player can retry the search to improve evidence or proceed with either allocation. Resolution locks further evidence acquisition and rewards.

That changes Investigation's contribution from “roll until the quest completes” to “learn something that affects another person's response.” It does not prove overall skill balance, full-run usefulness or upper-level Dedication viability. Do not adjust Craft, Lore, training acquisition, Expertise or global difficulty in this slice.

The new failure route also makes this scenario's reward achievable without winning the check, unlike the ordinary Investigation objective. That is an intentional proposed change requiring balance evaluation of effort, travel, retries and evidence value; existing repair tests do not validate its balance.

## Proposed generic integration

The existing code supports valid room targets, Investigation attempts/retries, ordinary rewards, relations and quest/NPC save state. It does **not** currently provide this evidence-to-choice flow. The following is an illustrative contract for Architect refinement, not an accepted schema:

```json
{
  "type": "investigate",
  "templateId": "proposed-medicine-template",
  "uniquePerWorld": true,
  "participants": { "questGiver": "bound-merchant-id", "recipient": "bound-innkeeper-id" },
  "evidence": [],
  "resolution": {
    "prompt": "Who receives the medicine?",
    "choiceId": null,
    "choices": [
      { "id": "return", "label": "Return the town's reserve", "effects": [], "replies": {} },
      { "id": "support", "label": "Give the medicine to the innkeeper", "effects": [], "replies": {} }
    ]
  }
}
```

Author prose, evidence definitions, choices, relation effects and saved reply content in quest data. Generic handlers dispatch by objective/effect type, never by this quest's ID or name. Evidence prerequisites can select a response/effect without hiding either final choice. Put tunable selection and balance values in the rules engine or established relation configuration.

QuestManager must validate the objective, evidence and participant bindings; distinguish “site searched” from “corroboration found”; and prevent completion until the optional resolution is chosen. Existing objectives without this contract retain their behavior. Authored discovery completion must not accidentally disable permitted evidence retries.

The journal and NPC turn-in must share the manager's readiness and resolution checks, so a separate Complete button cannot bypass the decision. The resolution applies relation changes, recorded reply content and rewards once, then moves the quest from active to completed. Finalize with the bound merchant quest giver in the issuing town; the remote journal shows progress and directs the return rather than resolving allocation. The innkeeper shows the saved response on revisit, without a second completion entry point. Enforce the actual world location, settlement and bound quest-giver context in QuestManager, not only through UI visibility.

Persist evidence, participant IDs, selected choice, result and instantiated reply text on the quest. SettlementUI reads the latest matching completed resolution for the actual NPC and overlays its saved reply; the journal reads that same choice/result. Use completion time with deterministic quest-ID tie-breaking when multiple replies apply. Do not add a parallel NPC reply store or make old chosen replies change when the author later edits a template. NPC relation changes must reach both the persistent NPC Map and settlement record, not only a temporary dialogue object. Existing `SettlementUI._persistNPC` behavior is a candidate for a shared utility; old saves lacking new optional fields follow the existing quest path.

For `uniquePerWorld`, derive the claim from matching `templateId` records across available, active, completed and failed quests, which are already saved. Declined offers remain available; abandoned quests remain failed. No separate claim ledger is proposed. Recheck uniqueness when appending the actual bound offer, not merely when generating a candidate; if an overlapping generation already claimed it, retain an ordinary Investigation. The existing third-slot budget means budgets below three do not claim this pilot. Do not regenerate saved offers or migrate old broken quests.

Likely integration targets, subject to the final contract: [quest data](../../data/quests.json), [QuestGenerator](../../src/systems/QuestGenerator.js), [QuestManager](../../src/systems/QuestManager.js), [SettlementManager](../../src/systems/SettlementManager.js), [SettlementUI](../../src/ui/SettlementUI.js), [journal/UI wiring](../../src/main.js), [rules](../../src/core/rulesEngine.js) and [relation configuration](../../data/relations.json). Inspect [SaveManager](../../src/systems/SaveManager.js) rather than assuming optional state survives every producer and restore path. No new broad ConsequenceManager system is necessary for this pilot.

## Execution and acceptance gates

1. **Sponsor decision:** approve or amend the experience, one-instance placement policy, evidence/failure route and branch consequences. This document authorizes no gameplay edits.
2. **Integration contract:** Architect finalizes generic evidence, resolution, reply and persistence contracts, including first-eligible-visited-town placement and real settlement-context validation. Product Owner confirms boundaries with #41/#57; [#39](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/39) retains tracking/reputation ownership. Existing personal relations can be consumed without rebuilding that programme.
3. **Implementation after approval:** Backend Dev owns generic state/lifecycle and placement; data/content work follows Game Designer and Worldbuilder intent; Frontend Dev owns the real choice, journal and revisit flows. Coordinate files rather than concurrently editing the same manager or UI module.
4. **Evaluate the played result:** Balance Engineer measures success, retries, travel costs, relation thresholds and actual downstream value. Use current Dedication builds; unfinished Calling fixtures are explicitly provisional. Documentation Agent updates affected living references after the code settles.

Acceptance requires a real generated offer → acceptance → correct-room visit → evidence result → return → allocation → reward → saved revisit flow on desktop and mobile. Cover success, failure without retry, success after paid retry, both choices, abandonment, duplicate input and saves before/after resolution. Verify re-entry cannot turn the initial free attempt into repeated free rolls. Validate levels 1/5/10 with both the current Knight and a creation-valid Dedication/Sage character investing in Intellect. Complete earned-XP and mandatory level-up choices before claiming a played upper-level build; conditional skill-stat projections are identified separately.

Confirm exactly one eligible authored instance, no invalid sites/participants, preserved ordinary offer coverage and budgets 0/1/2/3, reproducible placement for the declared visit order and unchanged legacy quest behavior. Verify that saved replies are displayed for the actual bound NPCs; relation history and any claimed trading change are consumed. Report XP, gold, fatigue, travel and knowledge separately. Passing arithmetic or unit tests alone does not establish a meaningful player outcome.

No commit, deployment, new dependencies, global tuning, Calling implementation, new injury mechanics or save migration is included.

## Evidence and setting references

- [Skill-value baseline](../reports/2026-10-10-legal-skill-baseline.md): conditional difficulty, attainable training and limits of current information outcomes.
- [Approved target and reward repair](2026-10-09-investigation-target-repair.md): existing local foundation and saved-offer boundaries.
- [Architecture constraints](../../.claude/rules/architecture.md): data-driven handlers, seeded generation, shared state and save compatibility.
- [Quest integration rules](../../.claude/rules/systems/quests.md): existing lifecycle and NPC assignment contracts.
- [World tone and economy](../world/WORLD.md) and [civic variation](../world/CIVICS.md): desperate wonder, local obligations, valuable trust and knowledge. Proposed shortages concern local access and delivery, not a claim that material scarcity is universal across dimensions.

**Validation for this proposal:** source and specialist review plus local-link checks; no production behavior was changed or gameplay tests rerun for this document. Sponsor approval and runtime acceptance remain outstanding.
