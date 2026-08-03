---
name: project-attribute-system-proposal
description: Status of the proposed 6-attribute replacement (Prowess/Insight/Vitality/Intellect/Composure/Presence) for STR/DEX/CON/INT/WIS/CHA — Proposed status, design decisions locked via multi-agent review, saving-throw gap has a pending game-designer recommendation awaiting sign-off
metadata:
  type: project
---

Doc: `docs/plans/2026-07-30-attribute-system-remap.md`. Status **Proposed** (design decisions locked via multi-agent review — architect, mechanics-master, data-agent, balance-engineer — plus direct design-lead conversation; no implementation started). This supersedes the earlier 2026-07-29 review captured in this memory's prior version — several open questions from that pass are now resolved in the doc itself:

- **Concentration formula**: locked as `floor(Vitality mod / 2) + floor(Composure mod / 2)`, using a new engine-wide rule (sum raw fractional modifiers, floor once on the total — not floor-each-then-sum). This is now a **standing rule** in `.claude/rules/d5e-compliance.md`, applies to any future multi-attribute blend (e.g. split AC evasion+soak), not just concentration.
- **Composure over-consolidation (WIS-save+CHA-save merge)**: locked as legitimate, not a dominance bug (decision #2). Blocking case: 3 dragon stat blocks in `monsters.json` have separately-scaling WIS/CHA saves — migration rule is **average the two, not keep-higher**.
- **Skill distribution**: locked table (decision #1), validated against real skill-check frequency in `skillChallenges.json`, not just headcount. Creativity→Composure flagged as the most arbitrary call, most worth relitigating if anyone objects.
- **Flee check's `max(dex,wis)` pattern**: flagged as needing the same fix as concentration (both use the dump-unsafe `max()` pattern) but NOT auto-converted — flee has a documented deliberate rationale (disjunctive universal-access, not convergent scaling) that may survive as an approved exception. Still open, assigned to game-designer.
- **Wanderlust MAD concern from the 2026-07-29 pass is now moot** — doc explicitly scopes Scholar/Wanderlust out; only Dedication (Prowess+Vitality, no split) is live. Don't resurrect the Prowess+Presence defining-pair recommendation until Wanderlust is actually built.

**Saving throw mapping — reviewed 2026-07-30, recommendation given, plan NOT edited (explicit instruction, design lead reviews before write):**

Gap: WIS-save + CHA-save both collapse into Composure, leaving Presence with zero saves — the only one of six attributes without one.

**Recommended: option (b)** — accept and formally document the asymmetry as principled, not a bug, paired with solving Presence's inertness through a non-save mechanical hook (DC-setter role, not a save-table entry) — do NOT invent a "Presence save."

Reasoning given to design lead:
1. The doc's own spine (p.1: outward=project, inward=defend/resist/perceive/endure) means saves — which are inherently a "resist" action — are conceptually an inward-only mechanic. Under strict reading, Prowess (STR-save) and Intellect (INT-save) are the anomaly, not Presence's absence — they only carry saves because 5e bolts STR-save/INT-save onto ability scores that are otherwise "outward" for other purposes, a legacy quirk of D&D's ability system (which was never built on an outward/inward axis), not a pattern the new model needs to replicate for Presence.
2. There is no RAW CHA-outward save concept to move — every CHA-save trigger in 5e (banishment, possession, compulsion) is passive-resist, none are "project force and also personally save," so there's no principled subset of CHA-save content to carve out for Presence.
3. Not a RAW deviation in substance: all 6 of 5e's actual save types still map onto the new attributes (5-into-6 via the already-locked Composure merge); nothing invented, nothing dropped.

**Rejected alternatives:**
- (a) Move CHA-save to Presence — breaks the CHA-split's own internal logic (Deception, a CHA skill, stays in Composure per decision #1's locked skill table; moving CHA-save to Presence while Deception stays put contradicts the split's stated fiction). Also **breaks decision #2's locked dragon-save migration rule outright** — "average WIS+CHA into one Composure value" stops being a coherent operation if CHA-save moves to a different attribute than WIS-save; would require reopening and rewriting a decision already locked in the same document.
- (c) Blend as Insight+Composure (mirroring the AC evasion/soak split) — **directly contradicts decision #2's verdict in the same document**, which already considered and rejected this exact split ("not warranted right now," cited low live content: 1 WIS-saveType ability, 0 CHA-saveType in `abilities.json`). Also doesn't fix Presence's gap even if adopted (doc admits this itself), and would still require rewriting decision #2's averaging migration into a 3-attribute blend.
- Considered and discarded before presenting: sub-splitting CHA-save by individual effect (some effects to Presence, some to Composure) — no principled split exists; every CHA-save effect in 5e RAW is passive-resist, none carry an "outward" flavor to hang on Presence.

**What this leaves open** (not resolved by the saves call, still owned by decision #1's separate "Presence inertness" ask): Presence still needs a real mechanical hook — recommended direction is a Presence-as-DC-setter role for future Composure-resisted effects (e.g. a Prowess+Presence "show of force" check where the target resists with a Composure save), mirroring how 5e's own spellcasting-ability→save-DC pattern already works, rather than giving Presence a save of its own. Also flagged: dump-risk on Presence is deferred, not eliminated — doesn't bite today since Dedication (the only live calling) never keys anything off Presence, but must be revisited once Scholar/Wanderlust are built and might key kit features off it.

**No change recommended to STR→Prowess/DEX→Insight(saves)/CON→Vitality/INT→Intellect mappings** — Physical and Mental domains each cleanly divide their two legacy save types across their two attributes (STR-save/CON-save; INT-save/DEX-save-as-Insight), and DEX-save resolving wholly to Insight (not split with Prowess) is consistent with the existing attack-vs-reflex split used elsewhere (Prowess=output, Insight=reactive/defensive DEX use) — no partial Prowess contribution needed for saves specifically.

See [[feedback_data_drives_code]] for the standing ADR-010 constraint this migration must still respect.
