---
name: testing-main-js-not-importable
description: src/main.js (the Game class) cannot be unit-imported in vitest — module-level singleton side effects throw in the node test environment; no existing test does this, and attempting it is a dead end.
metadata:
  type: project
---

`src/main.js`'s `Game` class cannot be tested by `import Game from '../../src/main.js'` in this project's vitest setup, even with `globalThis.document` stubbed.

**Why:** `vitest.config.js` uses `environment: 'node'` (no jsdom). `main.js` has a module-level `document.addEventListener('DOMContentLoaded', ...)` call, but that's not the actual blocker — `document.addEventListener` can be stubbed away like in `tests/ui/SettlementUI.skillToAbility.test.js`. The real blocker is transitive: `main.js` imports `src/systems/AudioManager.js`, which instantiates a singleton (`new AudioManager()`) at that module's own top level, whose constructor calls `new Audio(path)` for every sound. ES module import evaluation order means all of `main.js`'s static imports (including the AudioManager chain) fully evaluate before the *importing test file's* own top-level stub assignments run — so `globalThis.Audio = ...` written above the `import Game from ...` line in the test file does not take effect in time, unlike `document`, which for reasons not fully root-caused still resolved without stubbing in-test (possibly a Vite/vitest transform quirk, not spec-pure ESM order — not worth relying on).

Confirmed empirically 2026-08-01: stubbing both `document` and `Audio` before the import still threw `ReferenceError: Audio is not defined` from deep inside `AudioManager.loadSounds`.

**How to apply:** Don't attempt to unit-test any `Game.prototype` method in `src/main.js` by importing the module directly — there is no existing precedent for this anywhere in `tests/`, and it's not a path worth re-investigating. When UI logic lives on the `Game` class and needs test coverage, either: (a) skip the automated test and note why (as done for `getSkillDescription()`, see [[skills_json_description_field_wired]]), or (b) if the logic is substantial enough to be worth testing, propose extracting it to a standalone module (`src/ui/` or `src/utils/`) that doesn't transitively pull in `AudioManager` — that's a real refactor decision, not something to do silently as a side effect of adding a test.
