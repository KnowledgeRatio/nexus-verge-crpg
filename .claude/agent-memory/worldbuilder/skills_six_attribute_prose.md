---
name: skills-six-attribute-prose
description: descriptionSixAttribute dual-field convention added to data/skills.json for the six-attribute remap; field-naming precedent and the Empathy/Insight name-collision fix
metadata:
  type: project
---

Added `descriptionSixAttribute` to all 17 entries in `data/skills.json` (13 core + 4 campaign-specific: sailing, navigation, defiling, psionics) — 2026-08-01, per `docs/plans/2026-07-30-attribute-system-remap.md` M2 step 11.

**Why:** the six-attribute remap (Prowess/Insight/Vitality/Intellect/Composure/Presence replacing STR/DEX/CON/INT/WIS/CHA) added a mechanical `attributeSixAttribute` field per skill, but `description` prose still named the old ability ("Your Wisdom (Empathy) check..."), contradicting the new mechanical mapping once `RULES.attributes.system` flips to `sixAttribute`. Legacy mode is still the default and needed to keep reading exactly as before — additive sibling field, not an overwrite, matching `kits.json`'s `abilitiesSixAttribute` / `skills.json`'s existing `ability`/`attributeSixAttribute` pattern.

**How to apply:** if any future task touches `description` fields on data with an established dual-mode mechanical field (`XSixAttribute`, `abilitiesSixAttribute`, etc.), mirror the prose the same way — new `descriptionSixAttribute`-style field, old field untouched, both fields' content otherwise identical except the ability-name swap.

**Naming collision caught during this pass:** Empathy's legacy description ends "Replaces Insight" (referring to 5e's retired standalone Insight *skill*). The new attribute is also literally named Insight, so the six-attribute version read as self-referential ("Your Insight (Empathy) check... Replaces Insight"). Fixed by rewording only the sixAttribute copy to "Replaces the standalone 5e Insight skill." — worth checking for again if any other skill/ability prose collides with a new attribute name (Prowess, Vitality, Intellect, Composure, Presence, Insight).

**Scoped out, flagged as coverage gaps, not fixed (explicitly out of scope for this task):**
- `data/monsters.json` — 30+ monster action/trait `description` fields narrate legacy ability checks and saves directly in SRD stat-block prose ("Wisdom (Perception) checks", "Constitution saving throw", "Strength saving throw"). No dual-mode prose field exists for these. Large surface (tied to the 46-monster ability-block conversion, 19 of which still have broken/empty `abilities` blocks per the remap plan) — needs its own scoping decision, not a freelance addition here.
- `data/races.json` — Dwarven "Stonecunning" trait text says "Intelligence check" directly.
- `data/traits.json` — Dragonborn breath weapon trait says "Constitution modifier"; Fighting Style: Unarmed Fighting trait says "Strength modifier". Neither races.json nor traits.json traits have any established sixAttribute-prose sibling field today (unlike `abilityScoreIncreaseSixAttribute`, which is structured data, not prose) — introducing one is a new precedent that belongs to a dedicated pass, not a drive-by fix.

None of the above were touched. `dialogueTemplates.json`'s "Strength without wisdom is like a sword without a handle" proverb line was checked and correctly left alone — flavor/narrative text, not a mechanical ability reference, per the task's own exclusion example.
