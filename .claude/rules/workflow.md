# Workflow Rules

## Commits
**Never auto-commit.** Do not run `git commit` automatically. Let the user decide. Applies to the main agent and all subagents.

## Response Style
- Super brief. Tables over prose.
- No trailing summaries ("I just did X") — the diff speaks for itself.
- One sentence per update while working. State results, not process.

## Design Capture
After a design conversation reaches conclusions, summarize decisions into `docs/plans/YYYY-MM-DD-topic.md`. Ask the user if they want capture before writing the file. Plans are a reference library — not every plan becomes a decision, not every plan moves forward. Don't surface plan files in CLAUDE.md; let them be looked up when relevant.

## Agent Infrastructure
Five roles exist as both **skills** (`.claude/skills/`) and **subagents** (`.claude/agents/`): `game-designer`, `architect`, `backend-dev`, `frontend-dev`, `devils-advocate`.

- **Skills** = personas loaded into the main conversation
- **Subagents** = isolated autonomous workers via the Agent tool
- Only spawn a subagent when the task matches the agent's description and you need isolation or parallelism
- Never duplicate work a subagent is already doing
- Global skills at `~/.claude/skills/` must be synced manually from project `.claude/skills/`

## CLAUDE.md Updates
Keep the "Current State" block in CLAUDE.md to 3 lines max. Historical record goes in `docs/CHANGELOG.md`.
