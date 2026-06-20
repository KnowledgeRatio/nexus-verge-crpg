---
name: kethara-dialogue-voice
description: Tone rulings and precedent from writing the full Kethara greetingsByCulture/flavorDialogueByCulture block
metadata:
  type: project
---

Drafted full Kethara dialogue matrix (20 role/personality pairs x 7 tones x 2 lines = 280 greeting lines, + 8 flavor lines) to `.claude/agent-memory/worldbuilder/dialogue_draft_kethara.json`, mirroring the parallel multi-agent culture-voicing effort tracked in [[canon_docs_audit_2026-06]].

## Voice technique used

- Cut all ceremony words the generic pool uses by default: "Welcome", "Greetings", "How may I assist you", "I trust", full titles on first reference. Kethara opens with the need, not the pleasantry ("What'll it be?" not "Welcome, traveler!").
- Sentence fragments and dropped subjects are the primary Kethara marker ("Make it quick if you're buying." / "Talk fast." / "State your business.") — this reads as brisk without reading as rude *unless* tone is hostile/cold.
- Devoted tone never goes warm/soft in word choice — it stays blunt and just states loyalty as settled fact ("That's not up for discussion," "That's settled," "Not said lightly"). This is the load-bearing distinction from the generic pool's devoted tier, which goes effusive/reverent ("The hero returns!"). Kethara devotion reads as a verdict, not a celebration.
- Leader/guard "honorable" personality still uses duty-language ("sworn," "serve," "oath") but kept shorter and without the generic pool's formal cadence — Kethara honor talk is plain-spoken duty, not chivalric register.
- Used "the Verge" once in patron/jovial affable tier; avoided forcing it into every line per task instructions — only where natural.
- Avoided "kingdom/king/queen/throne/realm" entirely; leader role uses "run things here" / "run {settlement}" instead of any sovereignty language.
- Flavor lines (placeholder-free pool) lean on the PEOPLES.md sample line almost verbatim ("It's coming. So what are you going to do about it?") since that's the canonical reference voice-mark for this culture — reused deliberately as the clearest possible anchor.

## Open flag for downstream review

No hard-constraint violations found on self-check, but two lines worth a second look by `/devils-advocate` or the architect doing final assembly across all six cultures:
- Innkeeper/mysterious tier leans toward fortune-teller flavor ("I know what you are," "I had a feeling about you") — this is normally a Verathi/mysterious-personality trait, not a Kethara trait. Kept it grounded as street-smarts/読み ("I notice things") rather than mysticism to stay in-culture, but flag if it reads as bleeding into Verathi territory once all six blocks are merged.
- Guard/honorable and leader/honorable both lean on "duty/serve/oath" vocabulary that overlaps with the Vaethori voice description in PEOPLES.md (formal duty-bound soldiers). Kept Kethara's version shorter/blunter to differentiate, but worth a side-by-side read once the Vaethori agent's block lands.

**Why:** these are the two places where holding "personality" (mysterious/honorable) and "culture" (Kethara) in tension pulled hardest toward another culture's territory — recorded so the merge pass can specifically diff these against Verathi and Vaethori output.

**How to apply:** if asked to write Verathi or Vaethori dialogue next, contrast directly against these Kethara lines rather than starting fresh, to keep the six voices maximally distinct rather than convergent.
