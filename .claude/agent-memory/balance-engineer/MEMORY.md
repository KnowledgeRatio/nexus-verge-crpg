# Memory Index

- [Attribute remap: collapsing saves onto 3 Inward stats](project_attribute_remap_saves.md) — Dedication dump/dominance verdict (safe), quantified Insight-AC compounding risk, savingThrowProficiencies migration gap
- [monsters.json abilities:[] NaN bug](reference_monsters_abilities_nan_bug.md) — 19/46 monsters have empty ability-score arrays, silently breaking all save/ability-mod-dependent mechanics against them; safe-to-use monster list included
- [Simulating systems with no code yet](feedback_simulating_unimplemented_systems.md) — reuse live 1:1-mapped mechanics + RULES config instead of reimplementing guessed math; label hypotheticals explicitly
- [Menacing Attack Presence-kicker review](project_menacing_attack_presence_kicker.md) — DC delta table L3-10, no dominance/uptime bug, but "zero regression" claim is false at the point-buy dump floor
- [Player ASI is every-level, not asiLevels-gated](reference_asi_every_level_not_asilevels_gated.md) — corrects prior harness assumption; companions still use the gated 5e-style table
- [Menacing Attack full-convergence review](project_menacing_attack_full_convergence.md) — pure-Prowess loses 2-4 DC, becomes worst-of-4-maneuvers by L7; formula-as-written reproduces the plan's own documented double-floor bug
- [Attribute remap M1 post-implementation findings](project_attribute_remap_m1_postimpl_findings.md) — two blocking bugs: blend resolver missing /2 divide, and zero code path populates six-attribute-keyed abilities (flag flip = silent 0 modifiers everywhere)
- [Attribute remap M1.5 fix-verification](project_attribute_remap_m1_5_fix_verification.md) — all 3 bugs confirmed fixed (21/21 checks); caught+fixed a stale Balanced-DC number in the plan's own decision #5 table
- [Attribute remap M2 full-bestiary validation](project_attribute_remap_m2_full_bestiary_validation.md) — 46/46 monsters CR-safe (safe to ship); found 2 orthogonal pre-existing bugs (weapon.damage.dice shape mismatch suppresses all player weapon DPR; void-monster action.damage object crashes calculateMonsterAttackStats)
