---
name: reference-asi-every-level-not-asilevels-gated
description: Player-character ASI is granted every level-up in this codebase, NOT gated by RULES.progression.asiLevels ([4,8,12,16,19]) as 5e RAW and prior balance-sim harnesses assumed
metadata:
  type: reference
---

Corrects a wrong assumption baked into `tools/balance-sim/attribute-remap-dump-dominance-sim.js` (2026-07-30, [[project-attribute-remap-saves]]) and its accompanying memory: that harness assumed only 2 ASI events land by level 10 (`RULES.progression.asiLevels.filter(l => l <= 10)` -> [4,8]).

**Verified 2026-07-30 (Menacing Attack Presence-kicker review) that this is wrong for the player-controlled character.** `src/systems/LevelUpManager.js`'s level-up modal (`renderASISelection`, `selectASI`, `validateAndUpdateUI`) requires an ASI ability choice on **every single level-up**, with no `asiLevels` check anywhere in the file. `Character.js`'s `applyLevelUpSelections()` applies `selections.asiChoice` unconditionally (`+1` to one chosen ability, capped at 20) whenever a level-up is confirmed — also no `isASILevel()` gating, despite that function existing and being imported into `Character.js` (dead import, never called there). That means a player character gets **9 ASI events by level 10** (levels 2-10), not 2.

**Companions are different and DO follow 5e-style gating**: `CompanionManager.js:711` explicitly checks `RULES.progression.asiLevels?.includes(newLevel)` before auto-applying an ASI (`_autoApplyASI`). So companion-controlled Dedication characters get the traditional 2 ASI events (levels 4, 8) by level 10, while the player character gets 9. This is a real asymmetry, not yet flagged to `game-designer`/`backend-dev` as of this discovery.

**Practical implication for future balance-sim work on player builds:** when modeling "max plausible investment in stat X while still funding stat Y," use the every-level +1 mechanic for PLAYER chassis, not `asiLevels`. Use the gated `asiLevels` table only when modeling a companion chassis. The prior remap harness's PC builds (`BALANCED`/`DUMP_OUTWARD` in `attribute-remap-dump-dominance-sim.js`) only modeled 2 ASI events and are therefore an undercount for player characters — the qualitative "no dominance bug" verdict from that pass is still probably fine directionally (more ASI events available to both compared builds equally would not flip the balanced-build-wins conclusion, since damage stays single-stat and the dump build's own growth is equally undercounted), but the exact win-rate-delta numbers in that memory should be treated as a lower bound on real build divergence, not a precise figure, if re-cited.

See [[project-attribute-remap-saves]] for the original context this correction applies to, and the 2026-07-30 Menacing Attack Presence-kicker review (`tools/balance-sim/menacing-attack-presence-kicker-sim.js`) where this was re-derived correctly from source.
