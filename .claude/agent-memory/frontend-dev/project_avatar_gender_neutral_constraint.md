---
name: avatar-gender-neutral-constraint
description: Hard constraint (2026-09-09) that all player avatars and picker labels must read as gender-neutral; shapes how much the picker can lean on large character art
metadata:
  type: project
---

All player avatar art and the avatar picker's labels must read as **gender-neutral**. Constraint handed down by `creative-director` on 2026-09-09 while setting art direction for the player map sprite.

**Why:** Not recorded in any rules file or data file — it arrived as a direction-setting constraint, so it is invisible to anyone reading the code. Large bust/portrait art is exactly where gender reads hardest, so this constraint pushes the picker away from big face art and toward silhouette, gear, name, and flavour text.

**How to apply:** When building or restyling the avatar step in `src/ui/CharacterCreation.js` (`renderAvatarStep`), prefer sprite-plus-flavour-text or true-scale-on-terrain presentations over a large portrait pane. Keep option names occupation/archetype based ("Knight", "Monk"), never gendered. Check with `creative-director` before adding any large character image to the picker. See [[skills_json_description_field_wired]] for the sibling pattern of adding text affordances to existing card UI.
