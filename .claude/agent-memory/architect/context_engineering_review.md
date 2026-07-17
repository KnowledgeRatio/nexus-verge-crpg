---
name: context-engineering-review
description: Findings from 2026-07-17 context-engineering audit — what's cruft vs live, rules-loading mechanism, god-module status
metadata:
  type: project
---

## Rules-loading mechanism (discovered, not obvious without cross-referencing)
`.claude/rules/*.md` files use TWO tiers:
- **Always-loaded**: `architecture.md`, `workflow.md`, `code-style.md`, `data-integrity.md`, `d5e-compliance.md` — @-imported directly in `CLAUDE.md`, no frontmatter.
- **Path-scoped, on-demand**: `ui.md` and `systems/{combat,quests,world-gen}.md` — carry YAML frontmatter `paths: <glob list>` and auto-attach only when matching files are touched. NOT imported by CLAUDE.md.

This is a deliberate, working mechanism — not a gap. When a new domain needs scoped rules, use the `paths:` frontmatter pattern, don't force it into an always-loaded file.

**Coverage gap**: only 3 of ~27 `src/systems/*.js` files have a scoped rules file. `data-integrity.md` (always-loaded) is itself drifting into a junk-drawer — it already mixes 7 unrelated one-off facts, each really only relevant to one data file/manager. Candidate to split via the same `paths:` mechanism once it grows further (e.g. `paths: data/monsters.json` for the CR-field-name fact).

Narrative/art-prompt conventions do NOT live nowhere — `docs/world/*.md` and `tools/image-gen/style-guide.md` are already referenced directly in `.claude/agents/worldbuilder.md` + `.claude/skills/worldbuilder/SKILL.md` and `.claude/agents/creative-prompt-engineer.md` + its skill. Persona-referenced docs, not `.claude/rules/` — correct mechanism for a role-scoped (not file-glob-scoped) concern. Don't migrate these into rules/.

## main.js god-module (confirmed, not yet acted on)
8,646 lines, single class, ~90 setup/render/show/handle/update/create/open/close-prefixed methods, spans UI glue for every system in the game. 4x the next-largest file (`CombatManager.js`, 3,072 lines). This is the documented "UI in main.js" pattern taken to an extreme, not a violation of it. Splitting it (mirroring `SettlementUI.js`/`DungeonUI.js`/`CharacterCreation.js` which already sit alongside it in `src/ui/`) would be a real change to a stated pattern — needs project-owner sign-off, not a mechanical refactor-engineer job.

## data/ file sizes (as of 2026-07-17, will drift)
`data/dialogueTemplates.json` is the largest data file (230KB) and carries **zero** `campaignIds` fields (grep-confirmed) — structured along tone/role/personality/culture/quest-phase (13 top-level keys) instead. Concrete, bounded split candidate into `data/dialogue/*.json` by category — independent of the campaign-sharding question. `skillChallenges.json` (73KB) and `dungeonRooms.json` (63KB) are next largest, not yet investigated in depth.

Domain-splitting of `data/` (one file per content type) is already correct. Campaign-based sharding is **not yet warranted**: only `core` + `nexus-verge` are real; `defeatLichKing`/`uniteKingdoms` in `data/campaigns.json` are `disabled: true` stubs with no bespoke content. Revisit when a second real campaign gets built out — file-per-campaign would then genuinely help both runtime load and agent-context scoping.

`data/graphics/` is 179MB of the 181MB `data/` total — all binary PNGs, irrelevant to LLM context loading despite dominating byte count. Don't let raw `du -sh` numbers misdirect effort here.

## Root/docs cruft (verified via git log — all frozen since single bulk-import commit 2026-06-20 10:12:35, content dated 2025-12-09 to 2026-01-14)
Frozen point-in-time snapshots masquerading as live docs at repo root: `IMPLEMENTATION_SUMMARY.md`, `SBOM_CI_CD_SUMMARY.md`, `VALIDATION_REPORT.md`, `LEGAL_LINK_DEBUG.md`, `LINTING_RESULTS.md`. None touched since import; none procedural; all risk being read as current status by an orienting agent. `docs/PROJECT_PLAN.md` and `docs/PRD.md` are the same story (v1.0 "Draft for Review," 2025-12-09) — superseded by `.claude/rules/architecture.md` ADR log + `CLAUDE.md` Current State + `docs/CHANGELOG.md`, but not marked as historical. `docs/ARCHITECTURE.md` itself is correctly retired to a 7-line stub — that boundary is clean, not at risk.

`docs/CAMPAIGN_PLAN.md` (73KB, largest doc in repo) already self-flags staleness in a line-1 banner (predates `docs/world/` canon, contradicts Voidborn characterization rules) — good practice, but the file is still sitting at full size under `docs/` rather than archived.
