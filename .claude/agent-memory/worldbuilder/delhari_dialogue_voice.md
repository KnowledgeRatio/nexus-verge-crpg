---
name: delhari-dialogue-voice
description: Tone rulings and precedent from writing the full Delhari greetingsByCulture/flavorDialogueByCulture block
metadata:
  type: project
---

Drafted full Delhari dialogue matrix (20 role/personality pairs x 7 tones x 2 lines = 280 greeting lines, + 8 flavor lines) to `.claude/agent-memory/worldbuilder/dialogue_draft_delhari.json`, part of the parallel multi-agent culture-voicing effort tracked in [[canon_docs_audit_2026-06]].

## Voice technique used

- Core device: framework-from-elsewhere-that-hasn't-cracked-yet, expressed as data/academic/mercantile vocabulary applied to social situations — "variable," "data point," "model," "projection," "margin of error," "amortized," "convergence coefficient," "entropic signature." Delhari NPCs narrate you and the settlement through whatever analytical lens they brought with them (theorist, merchant-accountant, soldier-of-fortune logic), not through local idiom.
- Hostile/cold tone is dismissive-as-intellectually-superior, never crude — they don't insult, they *classify* you unfavorably and act on the classification ("I've reviewed the matter exhaustively," "the data on you is still inconclusive," "your standing is compromised"). This was the explicit task instruction and is the main differentiator from a generic "rude NPC."
- Devoted tone keeps the analytical vocabulary (still over-explains, still says "variable," "projection," "calculation") but the *content* turns warm — the player stops being a data point to be assessed and becomes the best finding of the whole expedition. This is different from Kethara (devotion as flat verdict) and Verathi (devotion as deeper time-reference) — Delhari devotion is "I came here for an answer and you turned out to be the better one," i.e. the mismatched framework finally bending around a person instead of a theory.
- "Nexus Verge" used naturally and often (their defining tell per task) — never "the Verge" or "Aevorn" anywhere in a Delhari line.
- Invented small in-voice jargon for Void/local phenomena without building new lore-as-fact: "entropic boundary event," "the boundary," "convergence coefficient," "dimensional transit," "local stratum," "unmodeled variable." These read as a theorist's working terms, not as new canon — kept deliberately vague/uncapitalized, no new proper nouns or named historical events.
- Leader/honorable and guard/honorable still use duty language but route it through "assessment by deed," "by my own accounting," "formal courtesy to visitors of unverified provenance" — bureaucratic/evaluative rather than Vaethori's procedural-soldier register or Kethara's blunt oath-talk. Differentiates from both per the Kethara memory's own flag about honor-vocabulary overlap risk.
- citizen/friendly/neutral trimmed to exactly 2 lines (the generic template's own citizen/friendly/neutral has 3 — an irregularity in the source pool not to replicate, since the task spec requires exactly 2 per tone for all culture blocks).

## Self-check against hard constraints

No "kingdom/king/queen/throne/realm" usage. "Nexus Verge" present in multiple lines (citizen, leader, flavor pool) and never replaced with "the Verge"/"Aevorn." No Voidborn references (none of the 20 pairs needed one — innkeeper/merchant/guard/citizen roles don't naturally surface them). Flavor pool (`flavorDialogueByCulture.delhari`) is fully placeholder-free, matching the real `toneDialogue`/`fillerDialogue` pools' convention.

**Why:** keeps Delhari maximally distinct from Kethara's bluntness-as-verdict, Verathi's deep-time-as-warmth, and Vaethori's procedural-soldier formality — the analytical/mismatched-framework lens is Delhari-exclusive territory among the cultures drafted so far.

**How to apply:** if asked to write Vaethori or Sirathi next (or revise any block in a merge pass), contrast against this file — especially the "classification-as-hostility" and "framework-bends-around-a-person" devoted-tone device, which should stay Delhari-exclusive. Vaethori's formal duty-language and Delhari's academic-jargon both risk reading similarly if not deliberately separated; Delhari's marker is mismatched-terminology-and-self-correction, Vaethori's is procedure-and-understatement.

Related: [[kethara_dialogue_voice]], [[verathi_dialogue_voice]]
