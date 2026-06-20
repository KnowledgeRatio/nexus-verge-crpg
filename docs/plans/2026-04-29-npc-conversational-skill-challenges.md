# NPC Conversational Skill Challenges — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire passive and active skill challenges into NPC settlement dialogue so talking to innkeepers, merchants, blacksmiths, guards, and leaders has mechanical depth.

**Architecture:** NPC challenges live in `skillChallenges.json` alongside terrain challenges. They are distinguished from terrain challenges by `"npcOnly": true` in their `balance` block, which prevents them firing during world movement. `getContextualSkillChallenges()` looks up challenges from `terrainChallengesData.challenges` by role-specific ID lists. Passive checks fire silently on dialogue open (like existing intel check), results stored permanently on the NPC object. Active challenges use the existing `promptSkillCheck` / `promptChoiceSkillChallenge` pipeline, with consequences delegated to `SkillChallengeManager.applyConsequences()`. DCs are adjusted by relation tier using the same `dcModifierByTier` table already in `relations.json`.

**Tech Stack:** Vanilla JS (ES6 modules), JSON data files, existing `SkillChallengeManager`, `RelationManager`, `SettlementUI`

---

## Amendments Applied (from Game Designer + Devils Advocate reviews)

| # | What changed | Why |
|---|---|---|
| GD-1 | `craft_assistance` choice 2: `arcana` → `academia`, DC 15 → 13 | Arcana is magic knowledge, not metallurgy |
| GD-2 | `appraise_goods`: `academia` → `investigation` | Examining goods is deduction, not book recall |
| GD-3 | All `relationChange` fields use named event keys, not integers | Must match how `RelationManager.applyRelationEvent` works |
| GD-4 | Innkeeper passive: one Empathy DC 12 check sets both `intelStatus` and `innkeeperWorried` | Removes duplicate Empathy check at DC 13 |
| GD-5 | Add `"intimidationUsed": { "min": -5, "max": -5 }` to `relations.json modifiers` | Independent tuning of intimidation's relationship cost |
| GD-6 | `persuade_npc`: `influence` → `creativity`, DC 15 → 13 | Differentiates from `negotiate` option 1 which is already Influence DC 13 |
| GD-7 | `market_haggle`: rename `dc` → `baseDC` in JSON | Consistent field naming across all challenges |
| GD-8 | DC 25 cap on hostile intimidation is by design — document it | Prevent future devs from "fixing" it |
| DA-1 | All NPC challenges get `"npcOnly": true` in `balance` block | Prevents terrain movement from accidentally triggering NPC challenges |
| DA-2 | `shouldTriggerChallenge()` returns false early when `npcOnly: true` | Guards the terrain trigger path |
| DA-3 | `_applyNPCChallengeOutcome` delegates XP/gold to `applyConsequences()` | `window.game.awardXP` does not exist; `applyConsequences` already works |
| DA-4 | `negotiate` converted from `choice` to `single` type for now | `choice` type outcomes (relation, gold, flags) are not wired; would silently award nothing |
| DA-5 | Passive checks use `SkillChallengeManager.getSkillModifier()` | `character.skillBonuses` may omit proficiency bonus; this method handles it correctly |
| DA-6 | Task order: 1 → 3 → 2 → 4 | Prevents "Test Your Skills" button disappearing when IDs change before data exists |
| DA-7 | `gather_rumors` drink cost shown in choice text + minimum gold guard | Player should see the cost before selecting; no going negative |
| DA-8 | `passiveFlags: {}` initialised on NPCs in `NPCGenerator.js` | Explicit persistence contract; prevents undefined vs false confusion |

---

## Current State Audit

### Three broken wiring points:
1. **`getContextualSkillChallenges`** — guard checked `.challenges` (social Map, always truthy) instead of `.terrainChallengesData`. *Fixed in prior session.* IDs in `roleChallengeMap` still don't match challenge IDs in JSON.
2. **`startSkillChallenge`** (~line 1507) — `skillChallengeManager.challenges.challenges[id]` is double-wrong. `.challenges` is a `Map`, `.challenges` on a Map is `undefined`. Should be `terrainChallengesData.challenges[id]`.
3. **`roleChallengeMap`** — uses invented IDs (`haggle`, `gather_rumors`, `appraise_goods`) that don't exist in `skillChallenges.json`.

### Existing terrain challenges reusable for NPC dialogue:
| JSON ID | Type | Reuse for |
|---|---|---|
| `detect_lie` | `contested` (Empathy vs Deception DC 14) | innkeeper, merchant, guard |
| `market_haggle` | `single` (Influence DC 13) | merchant |
| `guard_patrol` | `choice` (Influence/Deception/Cunning) | guard |

### Missing challenges (need new JSON entries in `skillChallenges.json`):
| ID to create | Role | Type |
|---|---|---|
| `gather_rumors` | innkeeper | `choice` |
| `appraise_goods` | merchant | `single` |
| `identify_item_quality` | blacksmith | `single` |
| `craft_assistance` | blacksmith | `choice` |
| `intimidate_npc` | leader, guard | `single` |
| `negotiate` | leader | `single` *(was choice — DA-4)* |
| `persuade_npc` | leader | `single` |
| `gather_information` | guard | `choice` |

---

## DC Design

All NPC social challenge DCs are relation-tier adjusted using `dcModifierByTier` from `relations.json` (`hostile: +99, wary: +2, neutral: 0, friendly: -2, trusted: -4, allied: -6`). All DCs are capped at 25 by `Math.min(25, baseDC + tierMod)`.

**Note on hostile tier + intimidate_npc:** Base DC 16 + hostile modifier 99 = capped at 25. ~10% pass rate at level 1. This is by design — you should not be able to threaten someone who already hates you into compliance easily.

**Base DCs by challenge:**
| Challenge | Base DC | Primary skill |
|---|---|---|
| `gather_rumors` (drink path) | 11 | Empathy |
| `gather_rumors` (direct path) | 14 | Investigation |
| `gather_rumors` (deception path) | 13 | Deception |
| `market_haggle` | 13 | Influence |
| `detect_lie` | 14 | Empathy |
| `appraise_goods` | 12 | Investigation |
| `identify_item_quality` | 13 | Academia |
| `craft_assistance` (physical) | 14 | Athletics |
| `craft_assistance` (academic) | 13 | Academia |
| `intimidate_npc` | 16 | Influence |
| `negotiate` | 13 | Influence |
| `persuade_npc` | 13 | Creativity |
| `gather_information` (casual) | 12 | Influence |
| `gather_information` (authority bluff) | 15 | Deception |
| `gather_information` (body language) | 14 | Empathy |

**Passive check DCs (by role):**
| Role | Skill | Base DC | Reveals |
|---|---|---|---|
| innkeeper | Empathy | 12 | `intelStatus = 'available'` AND `innkeeperWorried = true` (merged — GD-4) |
| innkeeper | Perception | 11 | `atmosphereRead` |
| merchant | Investigation | 12 | `goodsOverpriced` |
| merchant | Academia | 13 | `raritySpotted` |
| blacksmith | Academia | 12 | `qualityRead` |
| guard | Perception | 12 | `guardDistracted` |
| leader | Empathy | 14 | `leaderStressed` |

---

## Outcome Design

**Active challenge outcomes** use named relation event keys:
- Success: `"relationChange": "dialogueSkillCheckPass"` (+5 to +10 per `relations.json`)
- Failure: `"relationChange": "dialogueSkillCheckFail"` (-5 to -10)
- Intimidation success: `"relationChange": "intimidationUsed"` (fixed -5, new key)
- No `relationChange` key = no relation effect

**Other outcome fields:**
- `npcFlag`: string — stored on `npc.passiveFlags` for downstream dialogue/pricing
- `revealIntel`: true — sets `npc.intelStatus = 'available'`
- `xp`, `gold`: delegated to `applyConsequences()` which already handles both correctly

**Cooldowns:** All NPC challenges use `cooldown: 3600000` (1 hour real-time). Note: cooldowns are in-memory only and reset on page reload — this is acceptable for a session-based roguelike.

---

## Task 1: Fix `startSkillChallenge` + add `_applyNPCChallengeOutcome`

**Files:**
- Modify: `src/ui/SettlementUI.js` — `startSkillChallenge()` method (~line 1501)
- Modify: `src/systems/SkillChallengeManager.js` — `shouldTriggerChallenge()` method

**Step 1: Add `npcOnly` guard to `shouldTriggerChallenge` in `SkillChallengeManager.js`**

Find `shouldTriggerChallenge(challengeId, context)`. After the existing `!this.terrainChallengesData` guard, add:
```javascript
// NPC-only challenges must not fire during terrain movement
if (challenge?.balance?.npcOnly === true) return false;
```
This is the one-line fix that prevents NPC challenges from randomly firing in the wilderness.

**Step 2: Replace `startSkillChallenge` method body**

Find `startSkillChallenge` (~line 1501). Replace the entire method:
```javascript
async startSkillChallenge(challengeId, npc) {
    if (!window.skillChallengeManager || !window.game) {
        console.error('Skill challenge system not initialized');
        return;
    }

    const challenge = window.skillChallengeManager.terrainChallengesData?.challenges?.[challengeId];
    if (!challenge) {
        console.error(`Challenge ${challengeId} not found`);
        return;
    }

    this.closeNPCDialogue();

    const character = window.gameState?.get('character');
    if (!character) return;

    window.skillChallengeManager.recordChallengeAttempt(challengeId);

    // Relation-aware DC
    const relationManager = window.game?.relationManager;
    const relation = relationManager?.getRelation(npc);
    const tierConfig = relationManager?.config?.intel?.dcModifierByTier || {};
    const tierMod = tierConfig[relation?.tier?.id || 'neutral'] ?? 0;

    const effectiveType = challenge.type === 'contested' ? 'single' : challenge.type;
    const skillField = challenge.type === 'contested' ? challenge.playerSkill : challenge.skill;
    const baseDC = challenge.baseDC ?? challenge.dc ?? challenge.stages?.[0]?.baseDC ?? 14;
    const adjustedDC = Math.min(25, baseDC + tierMod);

    const config = {
        title: challenge.name,
        description: challenge.description,
        skill: skillField,
        dc: adjustedDC
    };

    let result;
    if (effectiveType === 'single') {
        result = await window.game.promptSkillCheck(config, challenge, null);
    } else if (effectiveType === 'sequential') {
        await window.game.player.handleSequentialSkillChallenge(challenge);
        return;
    } else if (effectiveType === 'choice') {
        await window.game.player.handleChoiceSkillChallenge(challenge, adjustedDC);
        return;
    }

    if (result?.attempted) {
        this._applyNPCChallengeOutcome(challengeId, npc, challenge, result.success, relation);
        window.questManager?.onSkillChallengeCompleted(challengeId, result);
    }
}
```

**Step 3: Add `_applyNPCChallengeOutcome` method** (paste directly after `startSkillChallenge`):
```javascript
_applyNPCChallengeOutcome(challengeId, npc, challenge, success, relation) {
    const outcomeBlock = success ? challenge.onSuccess : challenge.onFailure;
    if (!outcomeBlock) return;

    // Delegate XP and gold to the existing consequence system
    const character = window.gameState?.get('character');
    if (character && window.skillChallengeManager) {
        window.skillChallengeManager.applyConsequences(
            character, challenge, outcomeBlock,
            { success, rollTotal: 0, naturalRoll: 0, dc: 0, succeeded: success }
        );
    }

    // Relation change via named event key
    if (outcomeBlock.relationChange && window.game?.relationManager && npc) {
        window.game.relationManager.applyRelationEvent(npc, outcomeBlock.relationChange);
    }

    // NPC flag for downstream dialogue/pricing
    if (outcomeBlock.npcFlag && npc) {
        if (!npc.passiveFlags) npc.passiveFlags = {};
        npc.passiveFlags[outcomeBlock.npcFlag] = true;
    }

    // Intel reveal
    if (outcomeBlock.revealIntel && npc) {
        npc.intelStatus = 'available';
    }

    const msg = outcomeBlock.message || (success ? 'You succeeded.' : 'You failed.');
    window.gameState?.addMessage(`${npc?.name ?? 'NPC'}: ${msg}`, success ? 'success' : 'info');
}
```

**Step 4: Verify in browser**
Open settlement, talk to any NPC. "Test Your Skills" button should be absent (no matching challenges exist yet — expected). No crash, no error. Console should be clean.

**Step 5: Commit**
```
git add src/ui/SettlementUI.js src/systems/SkillChallengeManager.js
git commit -m "fix: repair startSkillChallenge lookup, add NPC outcome handler, guard npcOnly challenges from terrain trigger"
```

---

## Task 2: Add `passiveFlags` to NPC initialisation + `intimidationUsed` to relations.json

**Files:**
- Modify: `src/systems/NPCGenerator.js` — NPC object construction
- Modify: `data/relations.json` — add `intimidationUsed` modifier key

**Step 1: Find NPC object construction in `NPCGenerator.js`**

Find where NPC objects are built (look for `name:`, `role:`, `dialogue:` being assigned together). Add `passiveFlags: {}` to that object so it's always initialised:
```javascript
passiveFlags: {},  // Populated by SettlementUI passive approach checks
```

**Step 2: Add `intimidationUsed` to `relations.json`**

In the `modifiers` section, add:
```json
"intimidationUsed": { "min": -5, "max": -5 }
```
This gives intimidation its own tunable key, separate from generic failure penalties.

**Step 3: Commit**
```
git add src/systems/NPCGenerator.js data/relations.json
git commit -m "feat: initialise passiveFlags on NPCs, add intimidationUsed relation modifier"
```

---

## Task 3: Add 8 new NPC challenges to `skillChallenges.json` + fix `market_haggle`

**Files:**
- Modify: `data/skillChallenges.json` — add 8 entries inside `challenges`, fix `market_haggle`

All NPC challenges have `"npcOnly": true` in their `balance` block and `"terrainModifiers": {}`.

**Step 1: Fix `market_haggle`**

Find `market_haggle` in `skillChallenges.json`. Rename `"dc": 13` → `"baseDC": 13`.

**Step 2: Add `gather_rumors` (innkeeper)**
```json
"gather_rumors": {
    "id": "gather_rumors",
    "name": "Gather Rumors",
    "description": "The innkeeper has an ear for local gossip. You could try to draw them out.",
    "type": "choice",
    "terrainModifiers": {},
    "balance": { "cooldown": 3600000, "riskLevel": "low", "npcOnly": true },
    "choices": [
        {
            "text": "Buy them a drink and ask casually — Empathy DC 11 (costs 5 gold)",
            "skill": "empathy",
            "dc": 11,
            "onSuccess": {
                "message": "Over a shared drink, the innkeeper lets slip something useful.",
                "xp": 40,
                "gold": -5,
                "revealIntel": true,
                "npcFlag": "rumorRevealed",
                "relationChange": "dialogueSkillCheckPass"
            },
            "onFailure": {
                "message": "They smile politely and change the subject.",
                "xp": 10,
                "gold": -5
            }
        },
        {
            "text": "Ask directly — you heard there's trouble — Investigation DC 14",
            "skill": "investigation",
            "dc": 14,
            "onSuccess": {
                "message": "Your direct approach catches them off guard. They confirm what you suspected.",
                "xp": 60,
                "revealIntel": true,
                "npcFlag": "rumorRevealed"
            },
            "onFailure": {
                "message": "They clam up. Too forward.",
                "xp": 10,
                "relationChange": "dialogueSkillCheckFail"
            }
        },
        {
            "text": "Spin a cover story about being a traveling merchant — Deception DC 13",
            "skill": "deception",
            "dc": 13,
            "onSuccess": {
                "message": "Your false identity opens doors. The innkeeper warns you about the roads.",
                "xp": 50,
                "revealIntel": true,
                "npcFlag": "rumorRevealed"
            },
            "onFailure": {
                "message": "They see through the act. Their expression cools.",
                "xp": 10,
                "relationChange": "dialogueSkillCheckFail"
            }
        }
    ]
}
```

Note: gold -5 applies on both success and failure for the drink path — you bought the drink regardless of what they said. The choice text states the cost upfront so the player sees it before selecting.

**Step 3: Add `appraise_goods` (merchant)**
```json
"appraise_goods": {
    "id": "appraise_goods",
    "name": "Appraise Goods",
    "description": "You want to know if this merchant's wares are worth the asking price.",
    "type": "single",
    "terrainModifiers": {},
    "skill": "investigation",
    "baseDC": 12,
    "balance": { "cooldown": 3600000, "riskLevel": "low", "npcOnly": true },
    "onSuccess": {
        "message": "You assess the stock with a practiced eye. You know exactly what's worth buying.",
        "xp": 30,
        "npcFlag": "goodsAppraised"
    },
    "onFailure": {
        "message": "The quality is hard to judge. You're not sure what's genuine.",
        "xp": 10
    }
}
```

**Step 4: Add `identify_item_quality` (blacksmith)**
```json
"identify_item_quality": {
    "id": "identify_item_quality",
    "name": "Read the Craft",
    "description": "A blacksmith's work reveals their skill. You could tell a lot by examining the forge.",
    "type": "single",
    "terrainModifiers": {},
    "skill": "academia",
    "baseDC": 13,
    "balance": { "cooldown": 3600000, "riskLevel": "low", "npcOnly": true },
    "onSuccess": {
        "message": "You spot the hallmarks of exceptional craft. This smith knows their trade.",
        "xp": 40,
        "npcFlag": "craftQualityRead",
        "relationChange": "dialogueSkillCheckPass"
    },
    "onFailure": {
        "message": "The metalwork is competent but you can't read more than that.",
        "xp": 10
    }
}
```

**Step 5: Add `craft_assistance` (blacksmith)**

Note: choice 2 uses `academia` at DC 13 (GD-1 applied).
```json
"craft_assistance": {
    "id": "craft_assistance",
    "name": "Lend a Hand",
    "description": "The blacksmith is in the middle of a difficult job. You could help — or hinder.",
    "type": "choice",
    "terrainModifiers": {},
    "balance": { "cooldown": 3600000, "riskLevel": "medium", "npcOnly": true },
    "choices": [
        {
            "text": "Grip the metal and work the bellows — Athletics DC 14",
            "skill": "athletics",
            "dc": 14,
            "onSuccess": {
                "message": "You haul and hold. The smith nods, impressed. The job goes faster.",
                "xp": 60,
                "relationChange": "dialogueSkillCheckPass",
                "npcFlag": "craftHelped"
            },
            "onFailure": {
                "message": "You fumble the grip. The smith waves you off, jaw tight.",
                "xp": 10,
                "relationChange": "dialogueSkillCheckFail"
            }
        },
        {
            "text": "Suggest a technique from something you've studied — Academia DC 13",
            "skill": "academia",
            "dc": 13,
            "onSuccess": {
                "message": "The smith raises an eyebrow, tries it, and it works. Respect earned.",
                "xp": 70,
                "relationChange": "dialogueSkillCheckPass",
                "npcFlag": "craftHelped"
            },
            "onFailure": {
                "message": "The suggestion falls flat. Book learning doesn't translate here.",
                "xp": 10
            }
        }
    ]
}
```

**Step 6: Add `intimidate_npc` (leader, guard)**

Note: success uses `intimidationUsed` (-5 fixed), failure uses `dialogueSkillCheckFail`. DC 25 cap at hostile tier is by design.
```json
"intimidate_npc": {
    "id": "intimidate_npc",
    "name": "Intimidating Presence",
    "description": "You make clear that obstructing you would be unwise.",
    "type": "single",
    "terrainModifiers": {},
    "skill": "influence",
    "baseDC": 16,
    "balance": { "cooldown": 3600000, "riskLevel": "high", "npcOnly": true },
    "onSuccess": {
        "message": "They measure you and decide cooperation costs less than resistance.",
        "xp": 50,
        "npcFlag": "intimidated",
        "relationChange": "intimidationUsed"
    },
    "onFailure": {
        "message": "They hold your gaze. Your threat lands hollow.",
        "xp": 10,
        "relationChange": "dialogueSkillCheckFail"
    }
}
```

**Step 7: Add `negotiate` (leader) — single type (DA-4 applied)**
```json
"negotiate": {
    "id": "negotiate",
    "name": "Negotiate Terms",
    "description": "Propose a mutual benefit — appeal to their self-interest.",
    "type": "single",
    "terrainModifiers": {},
    "skill": "influence",
    "baseDC": 13,
    "balance": { "cooldown": 3600000, "riskLevel": "medium", "npcOnly": true },
    "onSuccess": {
        "message": "They see the angle and nod slowly. Terms accepted.",
        "xp": 70,
        "gold": 30,
        "relationChange": "dialogueSkillCheckPass",
        "npcFlag": "negotiationWon"
    },
    "onFailure": {
        "message": "The deal doesn't look appealing enough to them.",
        "xp": 10
    }
}
```

Note: `negotiate` is single-approach for now (mutual benefit / Influence path only). The deception and academia paths from the original design are deferred until `choice` type outcomes are fully wired.

**Step 8: Add `persuade_npc` (leader) — Creativity (GD-6 applied)**
```json
"persuade_npc": {
    "id": "persuade_npc",
    "name": "Make Your Case",
    "description": "Find an unexpected angle they hadn't considered — lateral thinking, not direct pressure.",
    "type": "single",
    "terrainModifiers": {},
    "skill": "creativity",
    "baseDC": 13,
    "balance": { "cooldown": 3600000, "riskLevel": "medium", "npcOnly": true },
    "onSuccess": {
        "message": "Your argument is clear and well-reasoned. They yield the point.",
        "xp": 60,
        "relationChange": "dialogueSkillCheckPass",
        "npcFlag": "persuaded"
    },
    "onFailure": {
        "message": "They're not convinced. Perhaps another approach.",
        "xp": 10
    }
}
```

**Step 9: Add `gather_information` (guard)**
```json
"gather_information": {
    "id": "gather_information",
    "name": "Ask the Guard",
    "description": "Guards see everything that moves through a settlement.",
    "type": "choice",
    "terrainModifiers": {},
    "balance": { "cooldown": 3600000, "riskLevel": "low", "npcOnly": true },
    "choices": [
        {
            "text": "Ask casually about recent activity — Influence DC 12",
            "skill": "influence",
            "dc": 12,
            "onSuccess": {
                "message": "The guard relaxes and shares what they've seen lately.",
                "xp": 40,
                "revealIntel": true,
                "npcFlag": "guardInfoGathered"
            },
            "onFailure": {
                "message": "They're not in a talkative mood. 'Move along.'",
                "xp": 10
            }
        },
        {
            "text": "Claim you're investigating on behalf of the town — Deception DC 15",
            "skill": "deception",
            "dc": 15,
            "onSuccess": {
                "message": "The authority of the claim loosens their tongue considerably.",
                "xp": 60,
                "revealIntel": true,
                "npcFlag": "guardInfoGathered"
            },
            "onFailure": {
                "message": "They know the real investigators. This doesn't add up.",
                "xp": 10,
                "relationChange": "dialogueSkillCheckFail"
            }
        },
        {
            "text": "Don't ask — read their posture and fill in the gaps — Empathy DC 14",
            "skill": "empathy",
            "dc": 14,
            "onSuccess": {
                "message": "You don't need them to talk. Their body language tells the story.",
                "xp": 55,
                "revealIntel": true
            },
            "onFailure": {
                "message": "Nothing readable in their expression. Professionally blank.",
                "xp": 10
            }
        }
    ]
}
```

**Step 10: Validate JSON**
```
node -e "JSON.parse(require('fs').readFileSync('data/skillChallenges.json','utf8')); console.log('valid')"
```
Expected: `valid`

**Step 11: Commit**
```
git add data/skillChallenges.json
git commit -m "feat: add 8 NPC conversational skill challenges to skillChallenges.json"
```

---

## Task 4: Align `roleChallengeMap` with real challenge IDs

**Files:**
- Modify: `src/ui/SettlementUI.js` — `getContextualSkillChallenges()` (~line 1428)

This task comes AFTER Task 3 so that challenge IDs exist in JSON before the map points to them.

**Step 1: Update the map**
```javascript
const roleChallengeMap = {
    'merchant':   ['market_haggle', 'appraise_goods', 'detect_lie'],
    'blacksmith': ['identify_item_quality', 'craft_assistance'],
    'innkeeper':  ['gather_rumors', 'detect_lie'],
    'leader':     ['intimidate_npc', 'negotiate', 'persuade_npc'],
    'guard':      ['intimidate_npc', 'detect_lie', 'gather_information']
};
```

**Step 2: Verify "Test Your Skills" button appears**

Open settlement, talk to innkeeper — button should now appear. Click it — challenge list should show `gather_rumors` and `detect_lie`.

**Step 3: Commit**
```
git add src/ui/SettlementUI.js
git commit -m "fix: align roleChallengeMap IDs with actual skillChallenges.json entries"
```

---

## Task 5: Add passive approach checks system

**Files:**
- Modify: `src/ui/SettlementUI.js` — add `_runPassiveApproachChecks()` and `_skillToAbility()`
- Modify: `data/relations.json` — add `passiveApproachChecks` config block

**Step 1: Add passive check config to `relations.json`**

Add after the closing `}` of the `"intel"` block:
```json
"passiveApproachChecks": {
    "innkeeper": [
        { "skill": "empathy",      "dc": 12, "flag": "innkeeperWorried",  "setsIntel": true },
        { "skill": "perception",   "dc": 11, "flag": "atmosphereRead" }
    ],
    "merchant": [
        { "skill": "investigation","dc": 12, "flag": "goodsOverpriced" },
        { "skill": "academia",     "dc": 13, "flag": "raritySpotted" }
    ],
    "blacksmith": [
        { "skill": "academia",     "dc": 12, "flag": "qualityRead" }
    ],
    "guard": [
        { "skill": "perception",   "dc": 12, "flag": "guardDistracted" }
    ],
    "leader": [
        { "skill": "empathy",      "dc": 14, "flag": "leaderStressed" }
    ]
}
```

Note: `setsIntel: true` on the innkeeper Empathy check — this single check replaces `_checkPassiveIntel` for innkeepers, setting both `innkeeperWorried` and `npc.intelStatus = 'available'` on pass (GD-4).

**Step 2: Add `_runPassiveApproachChecks` and `_skillToAbility` to `SettlementUI`**

Add after `_checkPassiveIntel`:
```javascript
_runPassiveApproachChecks(npc, relation) {
    if (!npc?.role) return;
    const config = window.game?.relationManager?.config;
    if (!config?.passiveApproachChecks) return;

    const checksForRole = config.passiveApproachChecks[npc.role] || [];
    if (!checksForRole.length) return;

    const character = window.gameState?.get('character');
    if (!character) return;

    if (!npc.passiveFlags) npc.passiveFlags = {};

    const tierMod = config.intel?.dcModifierByTier?.[relation?.tier?.id || 'neutral'] ?? 0;

    for (const check of checksForRole) {
        if (npc.passiveFlags[check.flag] !== undefined) continue; // already run

        const skillMod = window.skillChallengeManager
            ? window.skillChallengeManager.getSkillModifier(character, check.skill)
            : (character.skillBonuses?.[check.skill] ?? character.abilityModifiers?.[this._skillToAbility(check.skill)] ?? 0);

        const passiveScore = 10 + skillMod;
        const dc = check.dc + tierMod;
        const passed = passiveScore >= dc;

        npc.passiveFlags[check.flag] = passed;

        if (passed && check.setsIntel) {
            npc.intelStatus = 'available';
        }

        console.log(`🔍 Passive ${check.skill} (${check.flag}): ${passiveScore} vs DC ${dc} → ${passed ? 'pass' : 'fail'}`);
    }
}

_skillToAbility(skillId) {
    const map = {
        athletics: 'str', acrobatics: 'dex', sleightOfHand: 'dex',
        endurance: 'con', academia: 'int', arcana: 'int', investigation: 'int',
        perception: 'wis', cunning: 'wis', creativity: 'wis', empathy: 'wis',
        influence: 'cha', deception: 'cha'
    };
    return map[skillId] || 'wis';
}
```

**Step 3: Update `showNPCDialogue` to call `_runPassiveApproachChecks`**

Find the existing `this._checkPassiveIntel(npc, relation)` call. Add immediately after it:
```javascript
this._runPassiveApproachChecks(npc, relation);
```

**Step 4: Add context clues to dialogue description**

In `showNPCDialogue`, find where the NPC description/greeting text is set in `textEl`. After that assignment, add:
```javascript
if (textEl) {
    const flags = npc.passiveFlags || {};
    let clue = '';
    if (flags.atmosphereRead === true)      clue = ' The common room feels tense tonight.';
    else if (flags.innkeeperWorried === true) clue = ' The innkeeper keeps glancing toward the door.';
    else if (flags.goodsOverpriced === true)  clue = ' You notice the prices marked higher than they should be.';
    else if (flags.guardDistracted === true)  clue = ' The guard seems distracted, eyes elsewhere.';
    else if (flags.leaderStressed === true)   clue = ' There are lines of worry around their eyes.';
    if (clue) textEl.textContent = (textEl.textContent || '') + clue;
}
```

**Step 5: Commit**
```
git add src/ui/SettlementUI.js data/relations.json
git commit -m "feat: add per-role passive approach checks on NPC dialogue open"
```

---

## Task 6: End-to-end test pass

**Step 1: Test each NPC role — "Test Your Skills" button**
- [ ] Innkeeper → shows `gather_rumors`, `detect_lie`
- [ ] Merchant → shows `market_haggle`, `appraise_goods`, `detect_lie`
- [ ] Blacksmith → shows `identify_item_quality`, `craft_assistance`
- [ ] Guard → shows `intimidate_npc`, `detect_lie`, `gather_information`
- [ ] Leader → shows `intimidate_npc`, `negotiate`, `persuade_npc`

**Step 2: Test passive checks**
Open browser console. Talk to an innkeeper. Should see passive check log lines (Empathy, Perception). Confirm context clue appears in dialogue text when check passes.

**Step 3: Test active challenge — single type**
Innkeeper → Test Your Skills → Gather Rumors → pick a path → complete roll → confirm XP awarded (check character sheet), confirm message appears, confirm relation changed (check if NPC tone shifts on next open).

**Step 4: Test detect_lie (contested type)**
Any eligible NPC → detect_lie → confirm it dispatches as `single` using Empathy skill, confirm DC is tier-adjusted.

**Step 5: Test intimidate_npc**
Talk to guard → intimidate → pass → confirm relation decreased (not increased) — success still costs relation.

**Step 6: Test cooldown**
Complete any challenge → immediately reopen NPC dialogue → "Test Your Skills" should still show but that challenge should be absent from the list (on cooldown per `canAttemptChallenge`).

**Step 7: Test no terrain trigger**
Walk around the world map for several tiles in any terrain. Confirm none of the new NPC challenges fire as terrain events. Check console for any `npcOnly` guard log.

**Step 8: Final commit if fixes needed**
```
git add -A
git commit -m "fix: NPC skill challenge corrections from test pass"
```

---

## Known Gaps / Out of Scope

- **`choice` type outcomes (relation, flags) not fully wired** — `gather_rumors`, `craft_assistance`, `gather_information` are choice type. XP and gold from `applyConsequences` will work; relation changes and `npcFlag` writes won't fire until `handleChoiceSkillChallenge` is connected to `_applyNPCChallengeOutcome`. These are low-stakes misses (info challenges, not economy challenges).
- **`negotiate` multi-path version deferred** — the deception and academia paths from the original design are cut for now. Single Influence path ships. Restore as a `choice` type once choice outcomes are wired.
- **Passive flags affecting merchant pricing** — `goodsOverpriced` stored on NPC but `MerchantManager` doesn't read it yet.
- **Cooldown not persisted across page reload** — acceptable for session-based roguelike.
- **`gather_rumors` gold cost (-5) not validated against player gold** — add a minimum-gold guard in a follow-up if players report confusion.
