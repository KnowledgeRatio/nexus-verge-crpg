# Memory Index

- [Attribute rework scope (Prowess/Insight/Vitality/Intellect/Composure/Presence)](project_attribute_rework_scope.md) — impact assessment snapshot 2026-07-29 (now stale, see the M2 batch-convert memory for current state)
- [kits.json dual-shape conversion (2026-08-01)](project_kits_json_dual_shape_convention.md) — additive native-field pattern, why a replace would've broken both modes, and why M2/monsters.json won't reuse the same shape
- [M2 batch-convert: monsters/races/classes/backgrounds (2026-08-01)](project_m2_attribute_batch_convert.md) — 19-monster empty-abilities bug found, stale plan collision corrected, JSON-rewrite tooling pitfall, classes.json save-proficiency judgment calls
- [Data file inventory + schema drift reference](reference_data_file_inventory.md) — where ability fields live across data/*.json, and pre-existing DEX/AC and saving-throw format drift
- [Damage type taxonomy migration](project_damage_type_taxonomy.md) — locked 6-type system (blood/bone/injury/elemental/psychic/resonant), mapping rules used, monster's nested damage.type schema quirk, stale code fallback defaults flagged for backend-dev; races.json's dragonborn damageTypes map missed by that migration
- [Empty-abilities regression recovery (2026-08-01)](project_m2_empty_abilities_regression_recovery.md) — uncommitted fix wiped by a teammate's git checkout, redo method (CR→profBonus reverse-derivation), recurring same-ability multi-skill mismatch pattern, AC-not-derived-but-attack-bonus-is runtime fact
