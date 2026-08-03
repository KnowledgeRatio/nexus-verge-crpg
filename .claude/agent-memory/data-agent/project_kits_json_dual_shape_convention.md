---
name: project-kits-json-dual-shape-convention
description: How kits.json was converted to six-attribute keys (2026-08-01) without breaking legacy mode — the additive dual-field pattern, reusable for the M2 monsters.json batch-convert question
metadata:
  type: project
---

**What happened:** `data/kits.json`'s preset ability blocks (only `dedication.knight` has one) got a sibling `abilitiesSixAttribute` field (`prowess`/`insight`/`vitality`/`intellect`/`composure`/`presence`, straight 1:1 copy via the locked `RULES.attributes.legacyToNew` bijection) added alongside the existing legacy `abilities` block — **not a replace.**

**Why additive, not a replace:** Investigated `CharacterCreation.js` before touching data and found `characterData.baseAbilities` is *always* legacy-keyed, in both `'legacy'` and `'sixAttribute'` mode — that's a locked contract Character.js's constructor depends on, explicitly not being changed by this task. `applyKitPreset()` writes straight into `baseAbilities`. A wholesale key replace on `kits.json` would have broken kit-preset application in **both** modes, not just legacy — the failure mode isn't mode-conditional, it's "the one field every mode's write path reads from stops existing." This is the general lesson: before batch-converting any data file in this migration, check whether the *consuming* code path is mode-branched or unconditionally legacy-shaped — `CharacterCreation.js`'s comments (`renderAbilityScoresStep`, `applyKitPreset`) are unusually explicit about this and are worth reading first.

**Shape chosen:** sibling field, not a wrapper object — `preset.abilities` (legacy, untouched) and `preset.abilitiesSixAttribute` (native, new) live side by side on the same `preset` object. Consuming code (`applyKitPreset`, `formatKitPresetAbilities` in `CharacterCreation.js`) prefers `abilitiesSixAttribute` when `RULES.attributes.system === 'sixAttribute'` and present, converting it back to a legacy-keyed bag before writing to `baseAbilities` (since that sink's shape is fixed) — with a defensive fallback to the old bijection-conversion path for any preset that doesn't have the native field yet.

**How to apply to M2 (monsters.json, 46-entry batch-convert):** Monsters are a genuinely different case — by the time M2 runs, legacy mode is being sunset in the same milestone (see "M2 — content volume" in `docs/plans/2026-07-30-attribute-system-remap.md`), so a full replace (not dual-field) is the documented plan there and is *not* a contradiction of this memory. Don't reflexively apply the kits.json dual-field pattern to monsters — check the plan's own execution order per file before assuming one convention fits all. The transferable lesson is the diagnostic step (check the consuming code's mode-branching before choosing replace-vs-additive), not the specific shape.

**Test note:** a pre-existing test (`tests/ui/CharacterCreation.sixAttribute.test.js`, `formatKitPresetAbilities` describe block) called the function with a bare `abilities` object, not a `preset` wrapper — changing the function's signature to accept the full `preset` (needed to reach the sibling field) required updating that test's call sites too. Confirmed this was a legitimate contract change, not a regression, before editing the test.

See also [[project_attribute_rework_scope]] (now stale — written at the diagnosis stage before any of this landed; don't trust its "no data edited yet" framing).
