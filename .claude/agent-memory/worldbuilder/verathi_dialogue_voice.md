---
name: verathi-dialogue-voice
description: Tone rulings and precedent from writing the full Verathi greetingsByCulture/flavorDialogueByCulture block
metadata:
  type: project
---

Drafted full Verathi dialogue matrix (20 role/personality pairs x 7 tones x 2 lines = 280 greeting lines, + 8 flavor lines) to `.claude/agent-memory/worldbuilder/dialogue_draft_verathi.json`, part of the parallel multi-agent culture-voicing effort tracked in [[canon_docs_audit_2026-06]].

## Voice technique used

- Every line routes through a "longer timeline" frame rather than direct present-tense statement — Verathi describe the room/forge/gate/post itself as the thing with memory, and position themselves as long-standing witnesses to it, not as people reacting in the moment. ("This house has stood through three convergences," not "I like you.")
- Allusiveness as the core hostile/cold marker: hostile Verathi lines never threaten directly — they reference accumulated memory as the threat ("I remember every face that's darkened this door. Yours I'd rather forget.") This keeps hostile-tone Verathi recognizably Verathi rather than just generically mean.
- Devoted tone does NOT become warm/effusive in word choice (unlike the generic pool's "drinks on me tonight!" register) — it opens up *more deep-past reference*, not more modern chattiness, per task instruction. Devoted lines reference specific spans of time ("three convergences," "longer than your settlement's stood," "generations of travelers") as the vehicle for warmth, not exclamation points.
- "Mysterious" personality leans into fate/fortune-sensing and the room/object "remembering" or "watching" — this is deliberately Verathi-flavored mysticism (long-memory-as-omen), distinct from a generic fortune-teller trope. Cross-checked against [[kethara_dialogue_voice]], which explicitly steered its own mysterious-adjacent lines away from this territory to avoid overlap — confirms this is correctly Verathi-exclusive ground.
- Avoided forcing "Aevorn" into every line — used it twice (once in a leader line, once densely in the flavor pool) since PEOPLES.md specifies Old Blood "say Aevorn or nothing," meaning silence/omission is itself in-voice, not just the word itself. Never used "Nexus Verge" or "the Verge" anywhere in Verathi's own mouth.
- Avoided inventing new named historical events — leaned on vague, uncapitalized atmospheric phrasing ("the last convergence," "three convergences," "a convergence before this one") rather than coining new proper-noun lore the way the doc's illustrative "Ashfield convergence" example does. Kept that example itself out of the file entirely since it's flavor-illustration, not a citable canon event.
- Citizen role only has one personality (friendly) per the task's exact-20 list — same constraint the generic pool and presumably all six culture drafts share.

## Self-check against hard constraints

No "kingdom/king/queen/throne/realm" usage (false-positive grep hits were all on "looking"/"talking" containing "king" as a substring — verified by content read, not just absence of word match). No "Nexus Verge" in any Verathi line. No Voidborn references at all (none of the 20 role/personality pairs needed one). No newly invented proper-noun historical events.

**Why:** these decisions keep Verathi maximally distinct from Vethri's minimalism, Kethara's bluntness, and Vaethori's formal duty-language, per the cross-culture differentiation goal implicit in writing six parallel voice blocks for the same mechanical system.

**How to apply:** if asked to write Vaethori or Sirathi next (or revise any block in a merge pass), contrast directly against this file's technique notes — especially the "long-memory-as-vehicle-for-warmth" device and the "room/object remembers" mysterious-personality device, both of which should stay Verathi-exclusive.
