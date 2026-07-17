---
name: user-profile
description: Nexus Verge project owner's Claude Code sophistication level and setup style
metadata:
  type: user
---

The user runs a deliberately engineered `.claude/` setup for Nexus Verge (procedural D&D 5e roguelike CRPG spanning game code, JSON balance data, narrative/worldbuilding prose, AI art prompts, and legal/deployment docs). They already understand and correctly use advanced Claude Code mechanisms most users don't reach for: path-scoped rules (`paths:` frontmatter in `.claude/rules/`), the subagent `memory:` field, nested subagent delegation, and skill/subagent mirroring as an explicit tradeoff. They write formal decision records (dated, with rationale) directly into `.claude/rules/workflow.md` rather than just making ad hoc calls — e.g. the 2026-07-01 "Decision Record: Skill/Subagent Mirroring."

**Why this matters:** coaching this user should assume advanced familiarity with Claude Code mechanics — skip beginner explanations of what a subagent or skill is, and go straight to "is this specific mechanism earning its cost at this project's current scale." They respond well to being shown verified doc mechanics they may not have checked recently (e.g. exact nested-subagent depth/tool-restriction semantics) rather than generic best-practice reminders.

**How to apply:** lead audits with concrete file:line evidence and verified current-doc mechanics, not restatements of principles they've already internalized. See [[nexus-verge-audit-2026-07-17]] for the specific findings from the first full audit.
