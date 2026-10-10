# Nexus Verge — Procedural D&D 5e Roguelike CRPG
**Branch:** `main-beta-quests` | **Phase:** 3 — Combat & Abilities

## Current State
- **Unified quest core:** sponsor-approved compatible composition is enabled locally behind `RULES.quests.proceduralCore.enabled`: seven activity structures combine observation, interpretation, actual boss victory, protected recovery and Craft salvage. Shared choices work for authored/generated content; handover drives finite stock, and resolved boss threats stay removed. Boss jobs are labelled Deadly. Existing boards/signatures remain; #39/#41/#57 stay open for outstanding scope, full-policy/whole-journey balance and sponsor acceptance. See `docs/reports/2026-10-10-unified-quest-validation.md`. Nothing committed or deployed.
- **Skill-value evidence:** `docs/reports/2026-10-10-legal-skill-baseline.md` and reproducible legal-skill tooling record creation/acquisition paths, 480,480 exact active resolutions and 1,440 rune outcome applications. Upper-level profiles are skill-stat projections, not full UI-confirmed progression or played runs. Expertise has no verified grant path. The bounded #57 consequence design is now approved and implemented locally; #41 remains open for exposure/value and play acceptance.
- **2026-10-10 follow-up:** sponsor-approved Investigation expansion preserves owned hooks and otherwise selects the nearest real eligible dungeon within a separate 300-tile radius. Quest rewards now work for real/restored/plain characters; earned pending level-ups survive saving. All 1,325 tests pass; desktop/mobile fallback acceptance, search/retry and XP/gold turn-in pass. All-town coverage audit is recorded in the investigation report. Old targetless saves and already generated settlement offers remain unchanged. See `docs/plans/2026-10-09-investigation-target-repair.md`.
- **Last session:** #56 blood/bone implementation is complete and locally enabled: eligible blood weapon base deals 80% immediately plus 40% over three target-turn starts; bone remains immediate. Injury stays separate; elemental DoT is deferred to Curiosity spellcasting #47. No commit or deployment is implied.
- **Now:** #41 runtime repairs and the first #57 procedural consequence slice are implemented locally; whole-run skill value and play acceptance remain. The culture-standing/persistence portion needed from #39 is integrated; broader tracking/reputation work remains open. #42 awaits play acceptance; #44 combat presentation and #51 settlement scene remain in progress. #53 owns reproducible web/media release before cloud-save rollout.
- **Next / decisions:** #49 condition immunities, #40 character identity, #43 animated combatant and #52 settlement variants remain open; #38 cloud-save rollout follows #53 and save-policy decision #50. Necrotic/Void classification remains #16; other open decisions include #34–#37 and #46.

## Docs
- Architecture & ADR log: [`.claude/rules/architecture.md`](.claude/rules/architecture.md)
- Session history: [`docs/CHANGELOG.md`](docs/CHANGELOG.md)

## Agent Infrastructure
- Fifteen roles are mirrored across Claude subagents/skills and native Codex custom agents/skills, including `documentation-agent` for required documentation handoffs, requested reviews, and artifacts from user requirements.
- Claude definitions live in `.claude/agents/` and `.claude/skills/`; Codex definitions live in `.codex/agents/` and `.agents/skills/`, with repo guidance in `AGENTS.md` and nesting limits in `.codex/config.toml`.
- The authoritative roster, routing, decision rights, and mirroring rules are maintained in `.claude/rules/workflow.md` and `AGENTS.md`.

@.claude/rules/workflow.md
@.claude/rules/architecture.md
@.claude/rules/code-style.md
@.claude/rules/data-integrity.md
@.claude/rules/d5e-compliance.md
