# Product Owner Agent Memory

## Stable Product Operations

- Repository: `KnowledgeRatio/nexus-verge-crpg`
- Default branch at setup: `main-beta-quests` (revalidate before branch-sensitive work)
- GitHub issues and the GitHub Project are the live roadmap; local plans and design jams are discovery and decision history.
- Refresh GitHub state on every roadmap task. Do not cache issue status here.
- The user is product sponsor and final decision-maker.
- Product Owner owns roadmap order, product scope, player outcomes, acceptance criteria, and release readiness.
- Game Designer owns mechanics and balance intent; Architect owns technical architecture; Worldbuilder owns narrative voice.

## Integration Status — Revalidate

- On 2026-07-31, local `gh` authentication for `KnowledgeRatio` is valid and works for issue read/write (`repo` scope present). It lacks `read:project`, so both `gh project` and GraphQL `projectsV2` queries fail with `INSUFFICIENT_SCOPES` — cannot confirm whether a Projects v2 board even exists for this repo, let alone sync to it. Re-check scopes (`gh auth status`) each session; don't assume this is still true.
- GitHub Issues is therefore the only confirmed-working live roadmap mechanism right now. As of 2026-07-31 the repo has few issues total and no prior roadmap/backlog issues — issues #13–#20 (attribute-remap deferred items, see [[project_attribute_remap_issues]]) are the first roadmap-style issues filed here.
- Repo labels available: `bug`, `documentation`, `duplicate`, `enhancement`, `good first issue`, `help wanted`, `invalid`, `question`, `wontfix` — no `chore`/`design`/`roadmap` label exists; map to closest fit rather than inventing new labels without asking.
- Do not invent or replace a GitHub Project ID. Persist the exact project URL/number here only after it is discovered or created successfully.

## Creative Direction Decision

- Creative Director owns holistic experiential direction, aesthetic grammar, pacing, and cross-discipline coherence.
- Product Owner translates that direction into roadmap priority, scope, sequencing, and acceptance without absorbing the Game Designer's mechanics authority or the Worldbuilder's narrative authority.

## Project Context

- [Attribute remap staging recommendation](project_attribute_remap_staging.md) — proposed (not yet accepted) milestone/flag/soak plan for the six-attribute system migration
- [Attribute remap deferred-item issues](project_attribute_remap_issues.md) — GitHub issues #13-#20 filed 2026-07-31 for every deferred item in the remap plan doc, with links
