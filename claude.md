# Nexus Verge — Procedural D&D 5e Roguelike CRPG
**Branch:** `main-beta-quests` | **Phase:** 3 — Combat & Abilities

## Current State
- **Last session:** Finalised the six-attribute AC rule as a 2:1 Intuition:Prowess weighted average, validated it through 36,000 real-engine fights, and confirmed all 46 monsters have complete native attributes.
- **Now:** #42 needs only hands-on player-flow acceptance; #41 remains in acceptance for party-ceiling validation and hands-on play; #39 quest tracking/reputation follows.
- **Web delivery:** #53 is Now: finish the reproducible asset pipeline and SWA release acceptance before cloud-save rollout. Public combat media is staged in a separate Blob account; production SWA has not switched.
- **Next / blocked:** #40 sprites and portraits is Next; #38 cloud-save reliability and cutover follows #53, with save-cadence decision #50 required before broad enablement. Open decisions: #16 and #34–#37, #50.

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
