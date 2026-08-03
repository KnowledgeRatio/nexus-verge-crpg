---
name: project-attribute-rework-scope
description: Scope/impact assessment for the proposed 6-ability -> 6-attribute (Prowess/Insight/Vitality/Intellect/Composure/Presence) rework, done 2026-07-29
metadata:
  type: project
---

Diagnosis-only pass (no data edited) covering every `data/*.json` reference to D&D ability scores, ahead of a possible rename from STR/DEX/CON/INT/WIS/CHA to Prowess/Insight/Vitality/Intellect/Composure/Presence.

**Why:** Team is evaluating collapsing/splitting the classic six abilities into a new six-attribute system where DEX, WIS, and CHA each fan out into two new attributes (DEX->Prowess+Insight, WIS->Insight+Composure, CHA->Presence+Composure) while STR/CON/INT map 1:1 (->Prowess/Vitality/Intellect). This is a many-to-many mapping, not a pure rename, so a chunk of the fields below cannot be mechanically find-replaced.

**How to apply:** If this rework is greenlit, re-verify counts against current data before editing (this snapshot is frozen at commit `cbc0845`, 2026-07-29) — do not trust the numbers below without re-grepping first, per the "before recommending from memory" rule.

Key structural risk found: saving throws collapse WIS and CHA onto the same new "Composure" save. Three monster entries (`youngWhiteDragon`, `youngGreenDragon`, `youngRedDragon` in `data/monsters.json`) have **both** `wis` and `cha` as independent keys in the same `savingThrows: {}` object with different bonus values — these cannot be flattened into one `composure` key without a real design decision (keep higher? sum? split into a different mechanic?). Any future ability-system rework must treat this as a blocking case, not a mechanical rename, and check `classes.json`/monster data again for new instances before assuming it's still just these three.

Also flagged: naive text find/replace of the old 2-3 letter ability codes (`str`, `dex`, `con`, `int`, `cha`) is unsafe project-wide — those substrings appear constantly inside unrelated field names and prose (`conditionImmunities`, `hitPoints`→int, `strengthRequirement`→str, `restrained`/`monstrosity`→str, `concentration`→con, etc). Confirmed via grep across `monsters.json`, `items.json`, `traits.json`. Any rename tooling must be JSON-path-scoped (exact key/value match), never a bare string replace — same principle as the existing formula-substitution longest-first rule in `.claude/rules/data-integrity.md`, generalized to the rename operation itself.

See also [[reference_data_file_inventory]] for the general shape of `data/*.json` (useful starting point for future data surveys in this repo).
