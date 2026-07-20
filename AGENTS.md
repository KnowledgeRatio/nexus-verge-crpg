# Nexus Verge Agent Guide

## Project

Nexus Verge is a browser-based, procedurally generated CRPG inspired by D&D 5e SRD 5.2.1. It uses three Callings, levels 1–10, non-grid combat, seeded world generation, and data-driven content.

Read `claude.md` for the concise session state, but verify every implementation claim against code and data before acting.

## Sources of Truth

- Actual behavior: `src/`, `index.html`, `styles.css`, and `data/`.
- Architecture and ADRs: `.claude/rules/architecture.md`.
- System-specific constraints: `.claude/rules/systems/`.
- Code, UI, data, and compliance rules: `.claude/rules/`.
- World canon: `docs/world/`.
- Plans and design jams: historical decisions and proposals, not proof of current implementation.
- Active product roadmap: GitHub issues and the configured GitHub Project.

When a plan disagrees with implementation, trust the code/data and update the plan’s status when the task authorizes documentation changes.

## Product Standard

Judge work by its player outcome, not by technical output alone. Protect:

- authentic but principled D&D 5e adaptation
- meaningful decisions and build identity
- replayability, risk/reward tension, and information value
- the established tone of desperate wonder on a living frontier
- clarity, accessibility, responsiveness, and game feel
- performance and a modifiable, data-driven foundation

The user is the product sponsor and final decision-maker.

## Architecture Constraints

- Follow ADR-000: modifiability first.
- Follow ADR-010: data drives code. JSON should completely specify abilities, items, monsters, progression, and narrative content where an existing generic effect or content type applies.
- Do not add per-ability or per-item ID branches when a generic handler or data field can model the behavior.
- `src/core/rulesEngine.js` is the source of truth for configurable balance values.
- Combat is non-grid. Do not implement distance or movement mechanics that have no meaningful representation.
- Preserve seeded determinism where the surrounding system expects it.
- Characters restored from `gameState` may be plain objects; do not assume class methods survive serialization.

## Working Agreements

- Never commit automatically.
- Preserve unrelated and user-authored changes.
- Use `rg` or `rg --files` for repository search.
- Use `apply_patch` for focused file changes.
- Prefer the smallest coherent change and existing patterns.
- Do not add dependencies without a concrete need.
- Do not treat a passing unit test as sufficient evidence for a player-facing outcome.

## Validation

Choose checks proportionate to the change:

- JavaScript behavior: `npm test`
- JavaScript lint: `npm run lint`
- Broader lint when configuration or nonstandard paths change: `npm run lint:all`
- Legal artifacts: `npm run legal:verify`
- Data changes: validate JSON syntax, identifiers, cross-file references, formulas, and campaign inheritance.
- UI changes: test relevant viewport sizes, input modes, modals, and player flows.
- Gameplay changes: validate levels 1, 5, and 10, action/resource economy, save/load, and seeded behavior where applicable.

If a required check cannot run, report the exact reason and what evidence was obtained instead.

## Agent Routing

Use a custom subagent only when its specialist context or independent execution materially helps. Do not duplicate work already delegated.

- `product-owner`: product vision, player outcomes, roadmap ordering, GitHub issues/project, release scope, and acceptance.
- `creative-director`: holistic emotional, tonal, visual, auditory, pacing, and presentation coherence.
- `game-designer`: mechanics, D&D rules adaptation, balance intent, progression, and roguelike fit.
- `architect`: system boundaries, ADR compliance, integration design, and technical feasibility.
- `backend-dev`: gameplay systems, rules logic, procedural generation, and backend implementation.
- `frontend-dev`: DOM/canvas UI, responsive interaction, accessibility, and presentation implementation.
- `worldbuilder`: canon, setting, player-facing narrative, dialogue, and naming.
- `creative-prompt-engineer`: model-facing image/audio/video prompts and generation-pipeline prompt conventions.
- `data-agent`: JSON schema integrity, cross-references, campaign inheritance, and formula safety.
- `mechanics-master`: read-only tracing of implemented mechanic interactions.
- `balance-engineer`: simulations and quantitative diagnosis; no production balance edits.
- `refactor-engineer`: behavior-preserving cleanup and architecture enforcement.
- `devils-advocate`: constructive challenge of decisions, risks, assumptions, and completed work.
- `legal-reviewer`: SRD, licensing, attribution, trademark, and release compliance.

## Decision Rights

- Product Owner decides priority, scope, outcomes, and acceptance, subject to the user.
- Creative Director decides the cross-discipline experiential direction.
- Game Designer decides mechanic and balance intent.
- Worldbuilder decides narrative canon and voice.
- Architect decides technical architecture within product and design intent.
- Implementing agents decide local implementation details within those constraints.

Escalate a genuine conflict between decision rights to the user. Do not silently let one role absorb another role’s authority.

## Delegation Paths

- `product-owner` may consult `creative-director`, `game-designer`, `architect`, `frontend-dev`, `worldbuilder`, and `devils-advocate`.
- `creative-director` may consult `game-designer`, `worldbuilder`, `frontend-dev`, and `creative-prompt-engineer`.
- `game-designer` may consult `mechanics-master` and `balance-engineer`.
- `architect` may consult `refactor-engineer`.
- `balance-engineer` may delegate independent simulation batches.

Keep nested delegation bounded to a named unresolved question. Return distilled evidence to the parent instead of raw logs.

## GitHub Product Operations

Use the installed GitHub connector first for repository and issue reads/writes. Search before creating, read before editing, and restate exact targets before mutations.

The installed connector may not expose GitHub Projects v2. Use `gh project` only when authentication is valid and the user has requested project mutation. Do not create a local shadow roadmap when project synchronization is unavailable.

## Response Style

Lead with the result. Keep updates concise and evidence-based. Use tables only when they clarify exact mappings, priorities, or comparisons.
