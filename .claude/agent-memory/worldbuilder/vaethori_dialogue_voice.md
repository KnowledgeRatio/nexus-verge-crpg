---
name: vaethori-dialogue-voice
description: Tone rulings and precedent from writing the full Vaethori greetingsByCulture/flavorDialogueByCulture block
metadata:
  type: project
---

Drafted full Vaethori dialogue matrix (20 role/personality pairs x 7 tones x 2 lines = 280 greeting lines, + 8 flavor lines) to `.claude/agent-memory/worldbuilder/dialogue_draft_vaethori.json`, part of the parallel multi-agent culture-voicing effort tracked in [[canon_docs_audit_2026-06]]. Confirmed no pre-existing `greetingsByCulture.vaethori` key in `data/dialogueTemplates.json` at time of writing — this is a fresh addition, not a revision.

## Voice technique used

- Procedure/administration is the load-bearing device across all tones, not just hostile/cold. Hostile Vaethori revoke access formally ("no longer welcome," "recorded as such") rather than getting personal or emotional — anger is expressed as a procedural action (logging, reassigning, escorting), never as raised voice.
- Devoted tone stays understated per PEOPLES.md's explicit instruction — no gushing. The highest honor a devoted Vaethori NPC extends is doing something *outside the normal bounds of duty* while narrating it in still-formal language ("I extend you the full courtesy of the house," "Name the price you consider fair. I'll honor it without complaint"). Emotion shows as increased willingness to bend procedure, not as warmer word choice.
- `{name}` and `{title}` placeholders used noticeably more often than the generic pool baseline, and skewed toward neutral/warm+ tones specifically — formal full-name introduction is a Vaethori marker, so it shows up at the point in the tone ladder where the NPC has decided you're worth the formality.
- Avoided literal Stoic-philosophy vocabulary ("concern yourself with what is in your capacity") as a quoted maxim — that felt like it would read as the NPC quoting a textbook rather than living the philosophy. Instead embedded the Stoic posture structurally: acceptance of loss stated flatly and procedurally (flavor pool's "if it falls, that's recorded too" line) rather than philosophically.
- Avoided "kingdom/king/queen/throne/realm-as-political-term" throughout. Used "the Compact," "Pax Vaethora," "the empire," "the Colonial Administration," "under the Compact" as the load-bearing legitimacy vocabulary instead.
- One invented place-color reference ("the eastern stretch," generic) and reused only the canon-confirmed places (Caestum) rather than inventing new -um/-ium/-eum toponyms, since the task didn't require new named locations and invented ones risk contradicting a later canon decision.
- Caught and corrected one constraint violation in self-review: an early draft of a `leader/wise/affable` line used `{familyName}` to gesture at the House-naming convention, but that placeholder isn't supported anywhere in `src/` (confirmed via grep — only `{name}`, `{settlement}`, `{title}`, `{tavernName}`, `{shopName}` are real). Rewrote to convey "full name formality" without inventing a placeholder.

## Cross-culture differentiation (resolves flags from sibling drafts)

- [[kethara_dialogue_voice]] flagged that its own guard/leader "honorable" lines lean on duty/serve/oath vocabulary that overlaps with Vaethori's actual assigned register in PEOPLES.md. This is expected and correct — Vaethori legitimately owns that vocabulary; Kethara's mitigation (shorter, blunter, no formal cadence) is the right differentiator on their end. No change needed to the Vaethori file as a result; recording the resolution here so a merge pass doesn't re-flag it as unresolved.
- [[verathi_dialogue_voice]] confirmed "long-memory-as-warmth" and "room/object remembers" as Verathi-exclusive devices. Vaethori's devoted tone uses institutional/legacy permanence instead (the census, the archive, "what's recorded will outlast us") — related territory (both cultures care about permanence) but expressed as administrative record-keeping rather than personal lived memory. Kept deliberately distinct on this axis.

## Self-check against hard constraints

No "kingdom/king/queen/throne" usage. "Realm" not used as a political term anywhere (not used at all, in fact). No Voidborn entity references with emotion/intent language — Void itself is referenced twice in the flavor pool only, both procedurally/factually, consistent with the PEOPLES.md Tertian Province example. All invented names stay within the established Latin-phoneme/-um/-ium pattern; no contradiction of the six canon-confirmed places.

**Why:** these decisions keep Vaethori's formality from reading as cold/villainous (the empire's pitch is genuine, per PEOPLES.md) while still being legible as a colonial administrative power — the tension is supposed to be felt, not resolved, in the dialogue.

**How to apply:** if asked to revise this block or write Delhari/Sirathi next, contrast against this file's "procedure-as-emotional-container" device, which should stay Vaethori-exclusive the way "long-memory" is Verathi-exclusive and "verdict-not-celebration devotion" is Kethara-exclusive.
