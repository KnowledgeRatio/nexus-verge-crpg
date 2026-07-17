---
name: skill-subagent-mirroring-tradeoff
description: Nexus Verge's deliberate 1:1 skill+subagent mirroring for all 12 team-role agents — the decision, and the evidence-based test for whether it's still earning its cost
metadata:
  type: project
---

Nexus Verge mirrors every team-role agent as both a skill (`.claude/skills/<name>/SKILL.md`, persona for main-conversation use, full tool access) and a subagent (`.claude/agents/<name>.md`, isolated/delegated execution, scoped tools). Documented as a formal decision record in `.claude/rules/workflow.md`, dated 2026-07-01, with an explicitly acknowledged tradeoff: tool-restriction discipline (e.g. `mechanics-master`/`balance-engineer` having no Edit/Write to force delegate-don't-implement) doesn't carry over to the skill form, so it has to be restated as behavioral instruction there instead of enforced.

**Why it matters:** this is a reasonable bet for roles the user talks to directly AND delegates to (game-designer, architect, worldbuilder — clear evidence of both modes being used). It's a weaker bet for roles designed primarily as delegation targets from other agents (`mechanics-master`, `balance-engineer` — "Typically spawned by game-designer"; `refactor-engineer` — spawned by architect; `data-agent` — "Can be spawned by backend-dev"). For those, the subagent form's tool restriction and isolation only pays off if it's actually being invoked as a subagent, not just used as a skill persona.

**How to apply:** don't recommend pruning any role to skill-only or subagent-only without first confirming actual invocation patterns (see the zero-memory-footprint evidence in [[nexus-verge-audit-2026-07-17]] for `creative-prompt-engineer`, `data-agent`, `mechanics-master`, `refactor-engineer`). If a future audit confirms one of these 4 has never been delegated to as a subagent across many months of active work, that's the concrete "what breaks without it" test failing — recommend dropping the subagent form for that specific role and keeping skill-only, rather than assuming the mirroring bet has gone stale for all 12 uniformly.
