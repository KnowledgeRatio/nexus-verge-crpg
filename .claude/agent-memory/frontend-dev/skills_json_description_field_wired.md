---
name: skills-json-description-field-wired
description: data/skills.json's `description`/`descriptionSixAttribute` fields had zero consumers anywhere in the codebase (verified 2026-08-01) — now wired to a native `title` tooltip on the character-sheet skill row.
metadata:
  type: project
---

`data/skills.json` has had a per-skill `description` field (flavor text like "Your Strength (Athletics) check covers...") since the initial public-release commit (only commit ever to touch that file, per `git log`). Before 2026-08-01 it had **no consumer anywhere** — not the character sheet, not the skill-check modals, not the choice-challenge modal. Every place in `src/main.js` that looks like it might render a skill description (`skillCheckDescription`, `choice-option-description`, `promptChoiceSkillChallenge`) actually renders a *skill challenge's own* `description` from `data/skillChallenges.json`/inline challenge config — a different, unrelated `description` field on a different object shape. This was true even before `descriptionSixAttribute` was added alongside it as part of the attribute-remap ([[attribute_system_remap]] if that memory exists, else see `docs/plans/2026-07-30-attribute-system-remap.md`).

**Fix (2026-08-01):** `Game.prototype.renderAllSkills()` (`src/main.js`) now calls a new `Game.prototype.getSkillDescription(skillId)` helper and adds the result as a `title="..."` attribute on each `.skill-row` div (native browser tooltip on hover) — same `title=` pattern already used elsewhere in `main.js` for tooltips (flee button, combatant condition badges, etc.), no new CSS/tooltip component needed. `getSkillDescription()` reads `this.skillsData` (already loaded at game init for `formatSkillName()`) and branches on `RULES.attributes.system === 'sixAttribute'`, same dual-field convention as every other fix in the attribute remap (`SettlementUI._skillToAbility()`, `SkillChallengeManager.getSkillModifier()`).

**Why this matters for future orphaned-field checks:** this project has a documented pattern (see `docs/plans/2026-07-30-attribute-system-remap.md`'s Bug 2 postmortem) of adding a dual-mode data field without wiring a real consumer, causing silent bugs later. This specific field turned out to be a *pre-existing* orphan (not something the remap itself broke) — worth remembering that "orphaned field" checks during this remap sometimes surface bugs that predate the remap entirely, not just remap-introduced ones.

No automated test was added for `getSkillDescription()` — see [[testing_main_js_not_importable]] for why `Game.prototype` methods in `src/main.js` can't be unit-tested by importing the module in this project's vitest setup.
