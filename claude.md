# Nexus Verge — Procedural D&D 5e Roguelike CRPG
**Branch:** `main-beta-quests` | **Phase:** 3 — Combat & Abilities

## Current State
- **Last session:** Backlog + decision register — plan statuses swept, epic #19 closed, open decisions now tracked as `decision`-labelled GitHub issues
- **In progress:** Quest system polish; cloud saves awaiting Azure storage account + playtest before flag flip
- **Next up:** 5 open decisions blocking work — see GitHub `decision` label (#35 run structure is the widest-reaching)

## Docs
- Architecture & ADR log: [`.claude/rules/architecture.md`](.claude/rules/architecture.md)
- Session history: [`docs/CHANGELOG.md`](docs/CHANGELOG.md)

## Agent Infrastructure
- Fourteen roles are mirrored across Claude subagents/skills and native Codex custom agents/skills, including `product-owner` and `creative-director`.
- Claude definitions live in `.claude/agents/` and `.claude/skills/`; Codex definitions live in `.codex/agents/` and `.agents/skills/`, with repo guidance in `AGENTS.md` and nesting limits in `.codex/config.toml`.
- The authoritative roster, routing, decision rights, and mirroring rules are maintained in `.claude/rules/workflow.md` and `AGENTS.md`.

@.claude/rules/workflow.md
@.claude/rules/architecture.md
@.claude/rules/code-style.md
@.claude/rules/data-integrity.md
@.claude/rules/d5e-compliance.md
