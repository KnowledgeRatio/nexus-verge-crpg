# Whole-game skill check audit

Status: entry-point audit and concrete repairs implemented locally. Whole-game skill exposure, legal-build achievability, qualitative value, contextual content and sponsor play acceptance remain open in GitHub #41. Quest-consequence slice #57 follows its baseline; #39 retains tracking/reputation ownership. Nothing committed or deployed by this task.

## Entry points reviewed

| Surface | Runtime entry points | Outcome of audit |
|---|---|---|
| Character skills | Character.getSkillBonus/rollSkill; SkillRegistry | Nine canonical skills, authored attribute pairings, proficiency/expertise and old aliases retained. |
| Overworld challenges | Player.checkForSkillChallenge; single/choice/sequential handlers | Both authored choice shapes resolve; actual attempts persist cooldowns; preparation modifies the next check. |
| Dangerous traversal | Player.getSkillCheckForTerrain/applySkillCheckFailure | Correct dice parser; plain-character damage/temp HP, fatigue exhaustion, equipped-item loss and death checks. |
| Dungeon room challenges | Player.checkForDungeonSkillChallenge | Shared handlers, authored boolean next-stage progression and legacy stage DCs now work. |
| Dungeon traps and doors | Player.triggerDungeonTrapChallenge/handleInteraction; DungeonManager door state | Trap disarm harm is applied once; temporary HP survives plain-object handling. Existing per-door completion/lock state retained. |
| Branching dialogue | SkillChallengeManager passive/active checks, selectChoice, endChallenge | Authored endConversation endings and forced combat resolve; contextual reveals interpolate; unaffordable bribes cannot be selected; matching social quest objective completes. |
| Settlement NPC checks | SettlementUI passive approaches, intel, contextual challenges | Shared check math; resources once, selected outcomes and actual NPC effects persist; earned flags restored on reentry. |
| Quest skills | QuestManager.onSkillChallengeCompleted/onRoomEntered/retryRoomInvestigations | Matching successful stages notify objectives. Failed room searches no longer reroll automatically on reentry; E offers a deliberate fatigue-cost retry. |
| Trading and pricing | MerchantManager; RelationManager; SettlementUI pricing hints | Influence proficiency/expertise survives plain saved characters; service hints agree with actual prices. |
| Combat | CombatManager/EffectDispatcher audit | No current skill-roll consumer. Flee, initiative, attack rolls and saves use their existing attribute rules; no extra skill mechanics added. |

This is an inventory of distinct runtime boundaries, not proof that every authored template has a live context or equal encounter frequency. NPC/quest templates with zero terrain frequency must be invoked through a real contextual caller before claiming player exposure.

## Shared resolution and consequences

SkillChallengeManager supplies a shared preview and roll context including capped assigned-companion help, trueParty synergy, fatigue, disadvantage and passive-score adjustment. Displayed odds match that context. No-roll authored choices resolve without dice or critical rewards. Cancellation completes pending UI promises; compulsory checks remain compulsory; fatal results terminate rather than hanging.

Both options/baseDC/description and choices/dc/text are accepted at the existing content boundary. Authored critical outcomes override normal terminal outcomes once; preparatory critical successes cannot award final-stage treasure. Signed gold, paid approaches, exhaustion, messages, loot and combat initiation have working consumers. NPC contextual relations, flags and intel are handled separately without replaying XP/gold.

Cooldowns are saved in flags.skillChallengeAttempts. Six omitted cooldowns use RULES.skillChallenges.defaultCooldownMs (five minutes); explicit zero remains an authoring choice. Actual attempts record the cooldown; turning back does not. Existing finite dungeon-door/trap completion is preserved.

## Design and balance

Keep the nine skills and current helper/expertise cap. A same-level assigned helper fills the proficiency cap; adding a second matching helper does not increase it. The exact live-resolver harness enumerates 218,600 resolutions over 101 authored checks at levels 1/5/10. These are analytical catalogue probabilities, not encounter win rates or legal universal-expertise builds. Level-10 trained/helper means span 70.0–75.3%; expert/helper/trueParty means span 92.0–94.1%. Reliable mastery of routine checks is acceptable; do not raise every DC to counter it.

Designer-approved existing-content changes make river approaches trade difficulty against failure harm and rune-puzzle approaches trade difficulty against reward. Text-grounded secondary approaches now cover sustained Athletics, intuitive Investigation, patient Perception and active Empathy. Unsupported lockpick-consumption and alarm promises were removed.

See the separate design review and tools/balance-sim/skill-party-exact.md for methodology, initial versus updated figures, authoring coverage and source provenance.

## Remaining content work

- Generic unlockPath, revealLocation, revealFeature, revealInformation and questClue strings do not identify a real path, target, clue or location. They are returned as flags, but no corresponding world mutation is implemented. Author actual context and targets before wiring effects; do not invent a location from a string.
- Generic reputation outcomes without a culture/NPC/settlement target remain unsupported. NPC relationChange has a real separate consumer; quest reputation rewards remain the separate #39 item.
- The detect_lie template declares contested skills, but its current settlement caller uses the authored fixed DC. A true opposed-check producer requires an actual opponent and an approved tie/outcome rule.
- Lore/Intuition and actual encounter frequency remain content-watch items. Catalogue counts do not prove a useful opportunity in a normal run.
- Five-minute pacing is not a finite-object or service economy design. Retain intentional zero cooldowns and identify actual repeatable opportunities before changing their policy.
- Finish sponsor play review of whether approaches are understandable and consequences meaningful across a representative campaign. The browser fixtures below verify integration, not that experience over a whole run.

## Follow-up: skill value and quest outcomes

Success probabilities alone do not establish that investing in each skill is worthwhile. #41 now requires actual opportunity exposure, supported legal builds, acquisition paths and quantitative/qualitative outcomes. Count generated, reachable, offered, attempted and resolved opportunities separately; repeated rolls on one search are not several unique opportunities. Rarer skills may justify themselves through distinctive high-impact outcomes rather than equal frequency or fungible rewards.

Verified qualitative outcomes include bandit combat avoidance and social quest completion (`SkillChallengeManager`), NPC intel and relations (`SettlementUI`), and Influence pricing. Generated Investigation currently completes a single-room objective with XP/gold and normal quest relation benefits. Its `cleansed` tag creates a visible map marker (`MapRenderer`) but no future consequence event (`ConsequenceManager`). It does not create an evidence object, interpretation choice or branching resolution. The richer investigation templates in `data/quests.json` are not instantiated by the current three-slot procedural constructor in `QuestGenerator`.

Named NPC completion flags such as `goodsAppraised` and `craftQualityRead` prevent repeat rewards but have no verified named downstream price/dialogue consumers. Contextless clue/path/location flags remain unsupported. Authored promises and cosmetic feedback must not be counted as durable gameplay changes.

The balance follow-up audits supported builds and acquisition explicitly: expertise declarations/storage are not proof that a new character can earn expertise. Earlier expert probability cells remain diagnostic until an acquisition producer is verified. The bounded dungeon-offer diagnostic in `tools/balance-sim/skill-exposure-audit.js` measures availability under a synthetic route, not campaign play frequency or skill investment payoff; see `docs/reports/2026-10-07-skill-value-balance-scope.md`.

Live roadmap gates: #41 current baseline → #57 bounded consequence design/delivery → repeat the same #41 evaluation and joint play acceptance. #57 does not wait for #41 closure. #39 proceeds independently and blocks only selected tracking/reputation-dependent outcomes. True opposed checks remain deferred mechanic discovery, not a blocker for measuring current value.

## Validation

- Full suite: 1,276 tests pass across 111 files with npm test -- --testTimeout=30000.
- Real browser fixtures at 1440×900 and 390×844 cover plain characters, active/passive checks, both choice schemas, the actual no-roll crop approach, keyboard, Escape/backdrop cancellation, compulsory checks, costs, signed payments, fatal outcomes and the real Player E → QuestManager search retry. No uncaught page errors; screenshots visually reviewed. These fixtures use the application methods and authored data, not a full generated-world traversal.
- Data: all 42 JSON files parse; all 41 challenge identifiers/campaign references and 103 skill/attribute references validate.
- build:web and legal:verify pass. The app build is 63.06 MiB; referenced media is 438.52 MiB.
- Standard lint still fails on 190 existing errors; broad lint still fails on 3,266 existing errors. New regression files and the exact enumeration harness have zero lint errors. Counts are lower than the starting 205/3,281; this is not a clean-repository lint claim.
- git diff --check passes. Save/load integration tests cover NPC knowledge, service modifiers, cooldowns and the quest's attempted-search marker.
