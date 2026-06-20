---
name: vethri-dialogue-voice
description: Concrete patterns used when writing the full Vethri greetingsByCulture/flavorDialogueByCulture matrix — solves the "no greeting" mechanical paradox
metadata:
  type: project
---

Drafted 2026-06-16 for the parallel six-culture dialogue-voice task (5 other agents wrote the other cultures). Full draft lives at `.claude/agent-memory/worldbuilder/dialogue_draft_vethri.json`, ready for `/backend-dev` to merge into `data/dialogueTemplates.json` under `greetingsByCulture.vethri` / `flavorDialogueByCulture.vethri`.

## The "no greeting" paradox — solution used

Vethri canonically never greet or farewell, but the greeting slot is mechanically required. Resolved by writing every greeting line as one of: a direct functional statement ("One bed left."), an observation about the player ("Felt you coming."), or a clipped answer to an implied question ("What do you need."). Never "hello," "welcome," or ceremonial openers of any kind. This pattern should be reused for any future Vethri text in a greeting-shaped slot.

## Tone-ladder shape for a minimal-voice culture

- **hostile/cold**: get *shorter*, not angrier. One-to-three words ("Out.", "What.", "Door's that way."). No insults, no threats beyond functional refusal.
- **guarded/neutral**: functional exchange only, no warmth signal either way.
- **warm**: this is where `{name}` starts appearing — using the player's name at all is the Vethri warmth signal, not tone of voice.
- **affable**: NPC volunteers one *unprompted but still practical* detail (saved a spot, set an item aside, noticed something). Still no exclamation points, still short.
- **devoted**: the culture's one rule — they volunteer exactly one piece of information the player didn't ask for. Used the void-boundary/rift as the recurring content of that devoted-tier disclosure ("The rift's held longer since you came," "the boundary moved less this season") since Vethri are the void-boundary-anthropology culture per PEOPLES.md — this ties their maximum-intimacy gesture back to their defining trait rather than generic gratitude.

## Mechanical/lore guardrails respected

- Every NPC mouth-reference to the setting uses "here" — never "the Verge," "Aevorn," "Nexus Verge." Also avoided "kingdom/realm" per project-wide rule.
- Did not use "Null-touched" (the slur) anywhere.
- Referenced the Void/rift/boundary in plain, non-emotional terms only ("the boundary moved," "the rift's been quiet") — no hunger/intent language, consistent with [[established-canon-nexus-verge-world]].
- `flavorDialogueByCulture` pool has zero placeholders (per spec — that pool is never filled at runtime) and is the most sparse text in the file by design — single-clause lines, several under 6 words.

## Open flag for downstream review

Two devoted-tier "leader" lines reference "the boundary moved less this season" / "the rift's held longer since you came" as if the player's actions causally affect Void advancement. This is a narrative implication (player-as-cause) that other cultures' devoted-tier lines for guards/leaders may also imply (the generic "devoted" leader block already does this — "If I could name you co-ruler..."). Flagging only because Vethri are the one culture positioned as actually understanding void-state behavior, so their NPCs noticing/crediting the player on this specific axis carries more lore weight than a generic culture doing the same. Not a contradiction, just worth a second read before merge.

Related: [[established-canon-nexus-verge-world]]
