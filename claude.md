# Nexus Verge — Procedural D&D 5e Roguelike CRPG
**Branch:** `main-beta-quests` | **Phase:** 3 — Combat & Abilities

## Current State
- **Last session:** #56 blood/bone implementation is complete and locally enabled: eligible blood weapon base deals 80% immediately plus 40% over three target-turn starts; bone remains immediate. Injury stays separate; elemental DoT is deferred to Curiosity spellcasting #47. No commit or deployment is implied.
- **Now:** #42 and #41 await play acceptance; #39 owns quest tracking/reputation; #44 combat presentation and #51 settlement scene remain in progress. #53 owns reproducible web/media release before cloud-save rollout.
- **Next / decisions:** #49 condition immunities, #40 character identity, #43 animated combatant and #52 settlement variants remain open; #38 cloud-save rollout follows #53 and save-policy decision #50. Necrotic/Void classification remains #16; other open decisions include #34–#37 and #46.

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
