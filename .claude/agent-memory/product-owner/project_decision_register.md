---
name: project-decision-register
description: PO owns the open-decision register (GitHub `decision` label) and the docs/plans lifecycle — established 2026-09-08/09, rules in .claude/rules/workflow.md
metadata:
  type: project
---

Two standing responsibilities added to the Product Owner role. Both are rules in `.claude/rules/workflow.md` ("Decision Register", "Plan Ownership"), mirrored into all four PO definitions (`.claude/agents/`, `.claude/skills/`, `.agents/skills/`, `.codex/agents/product-owner.toml`).

**Open-decision register (2026-09-08).** Open decisions live as GitHub issues with the `decision` label and nowhere else. Closed ones live as ADRs in `architecture.md` or in the relevant `.claude/rules/*.md`. Closing a decision **amends whatever document stated the losing position, in the same change** — that clause exists because ADR-015 and ADR-016 stood in direct contradiction for five weeks over whether `5EClassic` retires, and nothing surfaced it.

**Plan lifecycle ownership (2026-09-09).** PO owns status accuracy, inventory, pruning and cross-links for `docs/plans/`. PO does **not** own plan content — the design belongs to `game-designer`/`architect`/`worldbuilder`. Restatusing records what happened to a plan; it never revises what the plan says.

**Two traps this cost real time to learn:**
- **Never leave a hedge status.** A 2026-07-17 sweep marked eleven plans `Approved (unverified — flagged...)` and never resolved any of them; they sat wrong for seven weeks. Every one turned out to be `Implemented`. A hedge status is worse than no sweep, because it looks like it was checked.
- **Verify against the player-facing entry point, and search all of `src/`.** Party-system status nearly got called wrong twice: `CompanionManager.js` existing proved nothing, and grepping only `main.js` for recruitment UI found zero hits — the recruitment flow is in `src/ui/SettlementUI.js` (`recruit-btn`, `RULES.party.recruitmentCostByLevel`).

**Label state as of 2026-09-09:** repo now also has `spike` (timeboxed investigation) and `decision` (open ruling) alongside the GitHub defaults. Supersedes the older note in this file's Integration Status section saying no such labels exist.

**Open register at time of writing:** #34 (5EClassic retirement / dual-field tax), #35 (does the game have runs — blocks #32, #33), #36 (Source & Void mechanics), #37 (generic ability effect schema), #16 (necrotic classification).
