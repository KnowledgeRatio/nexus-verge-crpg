# Nexus Verge — Procedural D&D 5e Roguelike CRPG
**Branch:** `main-beta-quests` | **Phase:** 3 — Combat & Abilities

## Current State
- **Last session:** NPC conversational skill challenges + loot wiring fixes
- **In progress:** Quest system polish; rules directory migration + restyle
- **Next up:** Party system implementation (design locked, see plan below)

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
