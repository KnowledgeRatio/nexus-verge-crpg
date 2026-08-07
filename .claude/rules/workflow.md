# Workflow Rules

## Commits
**Never auto-commit.** Do not run `git commit` automatically. Let the user decide. Applies to the main agent and all subagents.

## Git Safety for Subagents
**Never run `git checkout`, `git reset`, `git stash`, `git clean`, or any other command that discards uncommitted changes on any file — including to self-correct your own mistake.** This project routinely carries substantial uncommitted work across many files at once (nothing gets committed until the user says so, per the rule above). A `git checkout`/`reset` on "just the file I'm fixing" reverts *everything* uncommitted on that file, not just your own change — including other agents' work you don't know about. This has already happened once this session and destroyed real, unrelated work.

If you make an editing mistake: fix it with a targeted `Edit` back to the correct state, never a git revert. If you need to compare against the pre-edit state, read the diff (`git diff <file>`) or keep a copy of the old content in context before editing — don't stash or checkout to get there. If you're ever unsure whether a file has other uncommitted work you might destroy, run `git diff --stat <file>` first and treat any output as a hard stop on git-revert-style commands for that file.

## Response Style
- Super brief. Tables over prose.
- No trailing summaries ("I just did X") — the diff speaks for itself.
- One sentence per update while working. State results, not process.

## Design Capture
After a design conversation reaches conclusions, summarize decisions into `docs/plans/YYYY-MM-DD-topic.md`. Ask the user if they want capture before writing the file. Plans are a reference library — not every plan becomes a decision, not every plan moves forward. Don't surface plan files in CLAUDE.md; let them be looked up when relevant.

Every plan file starts with a `**Status:**` line using one of these values: `Proposed`, `Approved`, `Implemented`, `Superseded`, `Abandoned`. Include the date the status was last set.

**Plans are not authoritative for current state.** A plan records what was decided on the date it was written. It does not update itself when implementation changes. The authoritative sources for what currently exists are `.claude/rules/architecture.md` (the ADR log), `docs/callings/*.md` (per-calling reference docs, see below) for anything calling-specific, and the actual code and data files. Treat any specific claim in a plan as something to verify against the code, not as settled fact.

**Update on contact.** If you read a plan file to inform a decision and find that the actual code has diverged from what it says, update that plan's status line and add a short note describing what actually happened, before using the plan or moving on. Do not leave a plan showing a stale status once you know it is wrong. Fix it at the moment you notice, not in a separate cleanup pass — a cleanup pass nobody is assigned to run will not happen.

## Calling Reference Docs
*Decided: 2026-08-05*

One living reference doc per calling at `docs/callings/{calling}.md` (e.g. `docs/callings/dedication.md`), covering that calling's identity/narrative and its **currently implemented** mechanics — not a plan, not future state.

**How this differs from a plan:** a plan is frozen at the date it was written and may never ship. A calling doc describes only what is live in the code and data *right now*, and is authoritative for that — same standing as `architecture.md`'s ADR log, not "a reference to verify against the code." If a calling doc and the code disagree, that's a bug in the doc, not an acceptable staleness.

**Update discipline — stricter than a plan's "update on contact":** any change that touches a calling's implemented mechanics (new ability, changed formula, new level content, renamed system) updates that calling's doc **in the same change**, not as a follow-up. A design conversation that reaches conclusions but isn't implemented yet stays in a `docs/plans/` file until it actually ships — only promote it into the calling doc once real. Don't write proposed/unimplemented content into a calling doc; that defeats the reason it exists.

**Structure:** Identity & Narrative (the fiction — what they are, why, tone) → Mechanical Identity Pillars (how the fiction translates to systems) → Progression table (implemented levels only) → Full ability roster (implemented abilities only, with data-file IDs) → Specializations (same structure, nested) → Known Implementation Gaps (places where the doc's own description reveals something documented elsewhere — like a rules file — isn't actually wired up in code; call these out rather than silently matching the aspirational description).

Not auto-loaded into every session via `CLAUDE.md` — same as plans, read on demand when working on that calling, so unrelated conversations don't carry the weight of every calling's full narrative.

## Agent Infrastructure

### Decision Record: Skill/Subagent Mirroring
*Decided: 2026-07-01*

**Context:** Team-role agents grew ad hoc — some had both a skill and a subagent, some (the newer nested delegation workers) were added as subagents only, on the assumption that narrow execution roles wouldn't be consulted directly. That assumption was overruled: even a narrow role benefits from being reachable both as a direct persona and as a delegated worker.

**Decision:** Every agent role gets both a subagent definition (`.claude/agents/{name}.md`) and a matching skill (`.claude/skills/{name}/SKILL.md`), kept aligned. This is deliberate duplication, not redundancy — they're different invocation modes for the same expertise: a skill for direct persona-driven conversation in the main thread with full tool access, a subagent for isolated/delegated execution with a scoped tool list.

**Consequence — tool-restriction discipline doesn't carry over:** Where a subagent's design relies on tool restriction to force a behavior (`mechanics-master`/`balance-engineer` have no Edit/Write, forcing delegate-don't-implement), the skill form runs in the main conversation with full tool access, so the restriction doesn't apply automatically. Their skill files state the discipline explicitly as a behavioral instruction instead. This must be a deliberate call for any future paired role, not a silent gap.

**Maintenance rule:** When a team-role agent is added or its tools/responsibilities change, update its Claude subagent + skill and its Codex custom agent + repo skill exposure together. Codex custom agents live in `.codex/agents/`; Codex discovers repo skills in `.agents/skills/`. Compatible Claude skills may be exposed there by symlink to avoid a third copy. This section is the enforcement point.

**Current roster (all fourteen, skill + subagent + Codex custom agent):** `product-owner`, `creative-director`, `game-designer`, `architect`, `backend-dev`, `frontend-dev`, `devils-advocate`, `legal-reviewer`, `worldbuilder`, `data-agent`, `mechanics-master`, `balance-engineer`, `refactor-engineer`, `creative-prompt-engineer`.

- **Skills** = personas loaded into the main conversation
- **Subagents** = isolated autonomous workers via the Agent tool
- Only spawn a subagent when the task matches the agent's description and you need isolation or parallelism
- Never duplicate work a subagent is already doing
- Global skills at `~/.claude/skills/` must be synced manually from project `.claude/skills/`

### Nested subagents
Since Claude Code v2.1.172, a subagent can spawn its own child subagents (max depth 5, requires bare `Agent` — no parentheses — in the subagent's `tools:` list). Current nesting in this project:
- `product-owner` → `creative-director` (experiential vision), `game-designer` (mechanics/player-choice intent), `architect` (feasibility), `frontend-dev` (player-facing UX), `worldbuilder` (narrative impact), `devils-advocate` (roadmap stress test)
- `creative-director` → `game-designer` (mechanic expression), `worldbuilder` (narrative meaning), `frontend-dev` (interaction/presentation), `creative-prompt-engineer` (generation execution)
- `game-designer` → `mechanics-master` (implementation-trace questions), `balance-engineer` (simulated playtesting)
- `architect` → `refactor-engineer` (mechanical cleanup/enforcement of architecture decisions)

Both `mechanics-master` and `balance-engineer` diagnose/quantify only — they delegate actual fixes to `backend-dev`/`data-agent` rather than editing directly. `refactor-engineer` does edit code, but only for behavior-preserving cleanup; balance and design-level changes still route through `game-designer`/`backend-dev`.

## CLAUDE.md Updates
Keep the "Current State" block in CLAUDE.md to 3 lines max. Historical record goes in `docs/CHANGELOG.md`.
