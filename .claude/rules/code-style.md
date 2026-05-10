# Code Style Rules

## Modules
ES6 modules everywhere. `import`/`export`. No CommonJS.

## Naming
- `camelCase` for variables and functions
- `PascalCase` for classes
- Descriptive names — no abbreviations unless universally understood (`hp`, `ac`, `xp`, `rng`)

## Comments
Default: **no comments.** Only add one when the WHY is non-obvious — a hidden constraint, a subtle invariant, a workaround for a specific external bug. If removing the comment wouldn't confuse a future reader, don't write it. Never explain what the code does; well-named identifiers do that.

## Scope Discipline
- No features, refactors, or abstractions beyond what the task requires
- No error handling for scenarios that can't happen — trust framework and internal guarantees
- Only validate at system boundaries (user input, external APIs)
- No half-finished implementations — if it can't ship, don't merge the stub

## Backwards Compatibility
No backwards-compat hacks: no `_unusedVar` renames, no re-exported types for removed code, no `// removed` comments. If something is unused, delete it.

## Plain Objects vs Class Instances
Characters from `gameState` are **plain objects**, not `Character` class instances — they lack methods. Use standalone helper functions in `main.js` for calculations on plain objects (e.g. `calculateACForCharacter()`, `recalculateCombatStats()`). Never assume `character.calculateAC()` will work on a deserialized character.
