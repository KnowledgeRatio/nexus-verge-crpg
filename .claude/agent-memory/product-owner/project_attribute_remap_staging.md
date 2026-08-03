---
name: project-attribute-remap-staging
description: PO staging/rollout recommendation for the six-attribute system remap (docs/plans/2026-07-30-attribute-system-remap.md) — not yet accepted or implemented
metadata:
  type: project
---

On 2026-07-31, delivered a staging recommendation for `docs/plans/2026-07-30-attribute-system-remap.md` (STR/DEX/CON/INT/WIS/CHA → Prowess/Insight/Vitality/Intellect/Composure/Presence). Design decisions in the doc are locked; nothing implemented yet. Task was report-only — did not edit the plan doc, the design lead wants to review first.

**Recommendation given (not yet accepted by user):**
- Feature-flag + long soak (`RULES.attributes.system = 'legacy'|'sixAttribute'`), not a big-bang cutover — justified by zero test coverage on flee (live, every combat turn) and concentration, plus this touching shipped attack/AC/initiative/save math with real save files under ADR-011.
- Added a step not in the doc's 8-step order: write regression tests locking in current legacy combat/flee behavior *before* refactor-engineer's resolver pass — the doc names "zero test coverage" as a real risk twice but the recommended order never adds a test-authoring step.
- Reordered into milestones instead of one linear 8-step chain: M0 = safety net + behavior-preserving plumbing (zero player-visible change, ships anytime) → M1 = Dedication-only formula changes behind flag, off by default, shim-based monster conversion, devils-advocate + balance-engineer sign-off before default flip → M2 = batch-convert 46 monster blocks, worldbuilder prose pass, shim retirement, flag removal.
- Pulled devils-advocate stress-testing earlier (paired with implementation of the risky flee/Composure-consolidation pieces in M1) rather than leaving it as the literal last step after data-agent's full batch convert — cheaper to catch integration issues before the expensive monster-data conversion than after.
- Explicit cuts: backgrounds Acolyte/Sage pick-list stays deferred to the already-flagged standalone backgrounds rework, not spot-fixed here; Composure-funding-for-future-caster and spell-attack/DC mapping stay Not Planned until Scholar/Wanderlust are actually scheduled (doc already scopes this correctly — didn't need cutting, just confirmed as Not Planned rather than a "later" IOU).
- Clarified for the design lead: "skill remap" isn't separable from "attribute rename" (skills.json can't reference attributes that don't exist yet) — the real separable slice is the resolver/plumbing pass vs. the actual formula-value flip.

**Why this matters going forward:** if/when this plan moves from Proposed to Approved, check whether the user accepted this milestone structure or specified a different one before assuming M0/M1/M2 staging is the agreed plan. This memory records what was *proposed*, not a decision.
