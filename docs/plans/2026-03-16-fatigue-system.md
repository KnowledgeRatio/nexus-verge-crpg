# Fatigue System Implementation Plan

**Status:** Approved (unverified — flagged 2026-07-17; no status line existed before this pass; check whether a fatigue system exists in `src/systems/` before treating this as current)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a travel fatigue system that drains on movement/combat/skill challenges, applies escalating penalties, and is toggled per-campaign via a Worldbuilder setting.

**Architecture:** Fatigue lives in `gameState.data.fatigue` (percent + exhaustion levels + supplies). A shared `FatigueManager` module handles all reads/writes. Movement hooks in Player.js, combat hooks in CombatManager.endCombat(), Make Camp in RestManager, and threshold penalties wired into existing attack/skill check call sites.

**Tech Stack:** Vanilla JS ES6 modules, GameState observer pattern, existing floating combat text system, existing updateHUD() pattern.

---

## Locked Design Values (do not change without designer sign-off)

```
baseFatiguePerTile:        0.5      (% per tile at movementCost 1.0)
maxFatigueTerrainMult:     1.5      (cap — swamp/mountain don't one-shot you)
conModMultiplier:          0.1      (CON +3 → 0.7× rate)
minFatigueMultiplier:      0.5      (cap at CON +5)
combatEncounterFatigue:    8        (% per fight, any outcome)
skillChallengeFatigue:     2        (% per attempt)
makeCampFatigueRecovery:   15       (% per Make Camp action, unlimited uses)
exhaustionTriggerResetTo:  45       (% fatigue resets to on hitting 100%)
suppliesPerLongRest:       1        (consumed per long rest)
suppliesStartCount:        5        (starting supplies)
suppliesZeroHPRecovery:    0.5      (long rest at 0 supplies = 50% max HP only)
suppliesZeroExhaustion:    2        (consecutive long rests with 0 supplies → +1 exhaustion)
```

**Wanderlust special rule:** Use `max(CON_mod, DEX_mod)` for fatigue rate (nimble pacing).

**Thresholds:**
| Fatigue % | State | Effect |
|-----------|-------|--------|
| 0–49 | Rested | None |
| 50–74 | Wearied | −1 to all skill checks |
| 75–89 | Tired | −1 skill checks, −1 attack rolls |
| 90–99 | Staggering | Disadvantage on attacks AND skill checks |
| 100 | Spent | +1 exhaustion level; reset fatigue to 45% |

**Exhaustion levels:** D&D 5e 2024 — cumulative −1 to all d20 tests per level. Only cleared by long rest (1 per rest). Fatigue threshold effects are separate from and stack with exhaustion level penalties.

---

## Task 1: RULES.fatigue Config + GameState Init

**Files:**
- Modify: `src/core/rulesEngine.js` (after the `rest:` block, around line 386)
- Modify: `src/core/GameState.js` (the `data` object constructor, after `rest:` block ~line 64)

**Step 1: Add RULES.fatigue block to rulesEngine.js**

Find the closing `},` of the `rest:` block (after `longRestSpellSlots: true`) and add immediately after:

```javascript
    // ====================
    // FATIGUE SYSTEM
    // ====================
    fatigue: {
        enabled: true,                    // Master toggle — override per campaign or worldbuilder

        // Movement fatigue
        baseFatiguePerTile: 0.5,          // % per tile at movementCost 1.0, CON +0
        maxFatigueTerrainMultiplier: 1.5, // Cap terrain scaling — prevents unavoidable exhaustion in swamp/mountain
        conModMultiplier: 0.1,            // Each CON mod point reduces fatigue rate by 10%
        minFatigueMultiplier: 0.5,        // Floor at CON +5 — can't go below 50% rate

        // Activity fatigue (flat % per event)
        combatEncounterFatigue: 8,        // Per combat encounter (any result)
        skillChallengeFatigue: 2,         // Per skill challenge attempt

        // Make Camp (unlimited, no hit dice spent)
        makeCampFatigueRecovery: 15,      // % recovered per Make Camp action

        // Spent threshold behaviour
        exhaustionTriggerResetTo: 45,     // Fatigue resets to this % when hitting 100%

        // Supplies
        suppliesStartCount: 5,
        suppliesPerLongRest: 1,           // Consumed per long rest
        suppliesZeroHPRecovery: 0.5,      // Long rest at 0 supplies = 50% max HP only
        suppliesZeroExhaustionRests: 2,   // Consecutive 0-supply long rests before +1 exhaustion

        // Thresholds (fatigue % → named state)
        thresholds: {
            wearied:    50,   // -1 skill checks
            tired:      75,   // -1 skill checks, -1 attack rolls
            staggering: 90,   // Disadvantage on attacks AND skill checks
            spent:      100   // Trigger exhaustion level
        }
    },
```

**Step 2: Add fatigue state to GameState constructor**

Find the `rest:` state block (around line 64) and add `fatigue:` immediately after the closing `},` of `rest:`:

```javascript
            // Fatigue state
            fatigue: {
                current: 0,             // 0–100 percent
                exhaustionLevels: 0,    // Persistent D&D exhaustion (cleared 1/long rest)
                supplies: 5,            // Trail supplies (consumed on long rest)
                suppliesZeroStreak: 0,  // Consecutive long rests with 0 supplies
                lastThreshold: null     // 'rested'|'wearied'|'tired'|'staggering'|'spent'
            },
```

**Step 3: Update initNewGame() to apply starting supplies from RULES**

Find `initNewGame()` in GameState.js. Locate where `rest:` state is initialised and add the fatigue init alongside it (or update the fatigue block already added in constructor):

```javascript
// Inside initNewGame(), after setting rest state:
this.set('fatigue', {
    current: 0,
    exhaustionLevels: 0,
    supplies: RULES.fatigue.suppliesStartCount,
    suppliesZeroStreak: 0,
    lastThreshold: 'rested'
});
```

**Step 4: Verify in browser console**
Start a new game. Run:
```javascript
gameState.get('fatigue')
// Expected: { current: 0, exhaustionLevels: 0, supplies: 5, suppliesZeroStreak: 0, lastThreshold: 'rested' }
RULES.fatigue.enabled
// Expected: true
```

**Step 5: Commit**
```bash
git add src/core/rulesEngine.js src/core/GameState.js
git commit -m "feat: add RULES.fatigue config block and fatigue state to GameState"
```

---

## Task 2: FatigueManager Module (shared utility)

**Files:**
- Create: `src/systems/FatigueManager.js`

This module is the single place for all fatigue logic. Other systems call into it; they never touch `gameState.fatigue` directly.

**Step 1: Create the file**

```javascript
/**
 * FatigueManager
 * Central utility for the fatigue / exhaustion / supplies system.
 * All reads and writes to gameState.fatigue go through here.
 */

import { RULES } from '../core/rulesEngine.js';
import { gameState } from '../core/GameState.js';

// ─── Read helpers ────────────────────────────────────────────────────────────

export function getFatigueState() {
    return gameState.get('fatigue') || {
        current: 0, exhaustionLevels: 0, supplies: 5,
        suppliesZeroStreak: 0, lastThreshold: 'rested'
    };
}

/** Returns named threshold for a given fatigue % */
export function getThresholdName(pct) {
    const t = RULES.fatigue.thresholds;
    if (pct >= t.spent)      return 'spent';
    if (pct >= t.staggering) return 'staggering';
    if (pct >= t.tired)      return 'tired';
    if (pct >= t.wearied)    return 'wearied';
    return 'rested';
}

/**
 * Returns modifiers imposed by current fatigue + exhaustion levels.
 * Callers apply these to their rolls.
 */
export function getFatigueModifiers() {
    if (!RULES.fatigue.enabled) return { attackMod: 0, skillMod: 0, disadvantageAttacks: false, disadvantageSkills: false };

    const { current, exhaustionLevels } = getFatigueState();
    const threshold = getThresholdName(current);
    const exPenalty = -exhaustionLevels; // cumulative -1 per level

    let attackMod  = exPenalty;
    let skillMod   = exPenalty;
    let disadvantageAttacks = false;
    let disadvantageSkills  = false;

    if (threshold === 'wearied')    { skillMod  -= 1; }
    if (threshold === 'tired')      { skillMod  -= 1; attackMod -= 1; }
    if (threshold === 'staggering') { disadvantageAttacks = true; disadvantageSkills = true; }

    return { attackMod, skillMod, disadvantageAttacks, disadvantageSkills };
}

// ─── Write helpers ────────────────────────────────────────────────────────────

/**
 * Add fatigue percent. Handles threshold crossings and exhaustion triggers.
 * @param {number} amount  Positive number (% to add)
 * @param {string} source  For log messages: 'movement' | 'combat' | 'skillChallenge'
 */
export function addFatigue(amount, source = 'movement') {
    if (!RULES.fatigue.enabled) return;

    const state = getFatigueState();
    const prevThreshold = getThresholdName(state.current);
    let newPct = Math.min(100, state.current + amount);

    // Trigger exhaustion level if hitting 100
    if (newPct >= RULES.fatigue.thresholds.spent) {
        state.exhaustionLevels = Math.min(6, state.exhaustionLevels + 1);
        newPct = RULES.fatigue.exhaustionTriggerResetTo;
        const msg = state.exhaustionLevels >= 6
            ? '☠️ Total exhaustion — death approaches.'
            : `😩 Exhaustion sets in! (Level ${state.exhaustionLevels}) — find a safe place to rest.`;
        gameState.addMessage(msg, 'error');
        _showFloatingFatigueText('SPENT! 💀');
    } else {
        const newThreshold = getThresholdName(newPct);
        if (newThreshold !== prevThreshold) {
            _onThresholdCrossed(newThreshold);
        }
    }

    state.current = Math.max(0, newPct);
    state.lastThreshold = getThresholdName(state.current);
    gameState.set('fatigue', state);
    _updateFatigueHUD();
}

/**
 * Remove fatigue percent (Make Camp action).
 */
export function removeFatigue(amount) {
    if (!RULES.fatigue.enabled) return;

    const state = getFatigueState();
    const prev = state.current;
    state.current = Math.max(0, state.current - amount);
    state.lastThreshold = getThresholdName(state.current);
    gameState.set('fatigue', state);

    if (prev > 0) {
        gameState.addMessage(`🏕️ You make camp and rest. Fatigue reduced to ${Math.round(state.current)}%.`, 'success');
    }
    _updateFatigueHUD();
}

/**
 * Handle long rest effects on fatigue:
 * - Reset fatigue to 0
 * - Clear 1 exhaustion level
 * - Consume 1 supply (handle penalties at 0)
 * Returns { hpRecoveryMultiplier, exhaustionCleared, suppliesConsumed, exhaustionGained }
 */
export function applyLongRestFatigue() {
    if (!RULES.fatigue.enabled) return { hpRecoveryMultiplier: 1, exhaustionCleared: 0, suppliesConsumed: 0, exhaustionGained: 0 };

    const state = getFatigueState();
    let hpRecoveryMultiplier = 1;
    let exhaustionCleared = 0;
    let suppliesConsumed = 0;
    let exhaustionGained = 0;

    // Consume supply
    if (state.supplies > 0) {
        state.supplies -= RULES.fatigue.suppliesPerLongRest;
        suppliesConsumed = 1;
        state.suppliesZeroStreak = 0;
        gameState.addMessage(`🎒 Supplies consumed. ${state.supplies} remaining.`, 'info');
    } else {
        // No supplies
        state.suppliesZeroStreak++;
        hpRecoveryMultiplier = RULES.fatigue.suppliesZeroHPRecovery;
        gameState.addMessage(`⚠️ No supplies! HP recovery halved.`, 'warning');

        if (state.suppliesZeroStreak >= RULES.fatigue.suppliesZeroExhaustionRests) {
            state.exhaustionLevels = Math.min(6, state.exhaustionLevels + 1);
            state.suppliesZeroStreak = 0;
            exhaustionGained = 1;
            gameState.addMessage(`😩 Hunger sets in — Exhaustion Level ${state.exhaustionLevels} gained.`, 'error');
        }
    }

    // Clear fatigue
    state.current = 0;
    state.lastThreshold = 'rested';

    // Clear 1 exhaustion level (only if not just gained one)
    if (state.exhaustionLevels > 0 && exhaustionGained === 0) {
        state.exhaustionLevels--;
        exhaustionCleared = 1;
        if (state.exhaustionLevels === 0) {
            gameState.addMessage(`✅ Exhaustion cleared.`, 'success');
        } else {
            gameState.addMessage(`😴 Exhaustion reduced to Level ${state.exhaustionLevels}.`, 'info');
        }
    }

    gameState.set('fatigue', state);
    _updateFatigueHUD();
    return { hpRecoveryMultiplier, exhaustionCleared, suppliesConsumed, exhaustionGained };
}

// ─── Movement fatigue helper ──────────────────────────────────────────────────

/**
 * Calculate fatigue gain for one tile of movement.
 * @param {number} movementCost  Terrain movementCost value
 * @param {Object} character     Character object (needs abilityModifiers + class.id)
 * @returns {number}  Fatigue % to add
 */
export function calcMovementFatigue(movementCost, character) {
    if (!RULES.fatigue.enabled) return 0;

    const r = RULES.fatigue;

    // Terrain cap: never multiply fatigue beyond 1.5× even in swamp/mountain
    const terrainMult = Math.min(movementCost || 1, r.maxFatigueTerrainMultiplier);

    // CON factor (Wanderlust may use DEX instead)
    const conMod = character.abilityModifiers?.con ?? 0;
    const dexMod = character.abilityModifiers?.dex ?? 0;
    const isWanderlust = character.class?.id === 'wanderlust';
    const statMod = isWanderlust ? Math.max(conMod, dexMod) : conMod;
    const conFactor = Math.max(r.minFatigueMultiplier, 1 - statMod * r.conModMultiplier);

    return r.baseFatiguePerTile * terrainMult * conFactor;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function _onThresholdCrossed(name) {
    const messages = {
        wearied:    { msg: '😴 You feel wearied. (−1 skill checks)', type: 'warning', float: 'WEARIED 😴' },
        tired:      { msg: '😩 You feel tired. (−1 skills & attacks)', type: 'warning', float: 'TIRED 😩' },
        staggering: { msg: '⚠️ You are staggering with exhaustion! (Disadvantage on attacks & skills)', type: 'error', float: 'STAGGERING ⚠️' },
    };
    const entry = messages[name];
    if (!entry) return;
    gameState.addMessage(entry.msg, entry.type);
    _showFloatingFatigueText(entry.float);
}

function _showFloatingFatigueText(text) {
    // Uses existing floating combat text system via window.game
    if (window.game?.showFloatingCombatText) {
        // Show relative to player card or centre-screen — use null to trigger centre fallback
        window.game.showFloatingCombatText('player', text, 'condition');
    }
}

function _updateFatigueHUD() {
    if (window.game?.updateFatigueHUD) {
        window.game.updateFatigueHUD();
    }
}
```

**Step 2: Verify module exports in console (after wiring into main.js import later)**

```javascript
// After Task 7 is complete:
import { getFatigueState, calcMovementFatigue } from './systems/FatigueManager.js'
// Should not throw
```

**Step 3: Commit**
```bash
git add src/systems/FatigueManager.js
git commit -m "feat: add FatigueManager module with all fatigue calculation logic"
```

---

## Task 3: Movement Fatigue in Player.js

**Files:**
- Modify: `src/systems/Player.js`

**Step 1: Import FatigueManager at top of Player.js**

Add to the existing imports at the top:
```javascript
import { addFatigue, calcMovementFatigue } from './FatigueManager.js';
```

**Step 2: Add fatigue gain after the move delay update**

In `Player.js`, find the block that updates move delay (around line 249–252):
```javascript
        const movementCost = terrainDef?.movementCost || 1.0;
        const multiplier = Math.min(movementCost, RULES.movement.maxMoveDelayMultiplier);
        this.currentMoveDelay = RULES.movement.baseMoveDelay * multiplier;
```

Immediately after that block, add:
```javascript
        // Fatigue from movement
        const character = gameState.get('character');
        if (character) {
            const fatigueDelta = calcMovementFatigue(movementCost, character);
            if (fatigueDelta > 0) addFatigue(fatigueDelta, 'movement');
        }
```

**Step 3: Add Make Camp keyboard handler**

Find where the 'R' key (rest) is handled in Player.js `handleInput()`. It will look like:
```javascript
case 'r':
case 'R':
    // open rest menu
```

Add a new case for Make Camp immediately before or after (use 'T' — "Take a rest/camp"):
```javascript
case 't':
case 'T':
    if (!gameState.get('combat')?.active) {
        const { removeFatigue } = await import('./FatigueManager.js');
        removeFatigue(RULES.fatigue.makeCampFatigueRecovery);
    }
    break;
```

**Note:** Check the actual key handling pattern in Player.js — it may use `this.keys.has()` in a loop rather than a switch. Adapt to match the existing pattern.

**Step 4: Manual test**
- Start game, walk across grassland
- Open console: `gameState.get('fatigue').current` — should increase with each step
- Walk into a forest — increase should be faster
- Press T — fatigue should drop by 15%

**Step 5: Commit**
```bash
git add src/systems/Player.js
git commit -m "feat: wire movement fatigue into Player.js tile movement"
```

---

## Task 4: Combat End Fatigue in CombatManager.js

**Files:**
- Modify: `src/systems/CombatManager.js`

**Step 1: Import FatigueManager at top of CombatManager.js**

Add to imports:
```javascript
import { addFatigue } from './FatigueManager.js';
```

**Step 2: Add fatigue gain in endCombat()**

In `endCombat(result)` (around line 2032), after the condition cleanup block and BEFORE the `if (result === 'victory')` block, add:

```javascript
        // Fatigue from combat (applies regardless of outcome)
        addFatigue(RULES.fatigue.combatEncounterFatigue, 'combat');
```

**Step 3: Manual test**
- Start a combat, win or lose
- `gameState.get('fatigue').current` should increase by 8 after each fight

**Step 4: Commit**
```bash
git add src/systems/CombatManager.js
git commit -m "feat: add +8% fatigue on combat encounter end"
```

---

## Task 5: Skill Challenge Fatigue in SkillChallengeManager.js

**Files:**
- Modify: `src/systems/SkillChallengeManager.js`

**Step 1: Import FatigueManager**

Add to imports:
```javascript
import { addFatigue } from './FatigueManager.js';
```

**Step 2: Find where a skill challenge attempt is made**

Look for `selectChoice()` or whichever method processes a player's skill challenge action. After the roll is resolved (success or fail path), add:

```javascript
        // Fatigue from skill challenge attempt
        addFatigue(RULES.fatigue.skillChallengeFatigue, 'skillChallenge');
```

Place it once per attempt — not per stage pass/fail, but per player action. If the method processes one node at a time, add it once at the top of the attempt processing block.

**Step 3: Manual test**
- Trigger a skill challenge
- `gameState.get('fatigue').current` should increase by 2 per choice made

**Step 4: Commit**
```bash
git add src/systems/SkillChallengeManager.js
git commit -m "feat: add +2% fatigue per skill challenge attempt"
```

---

## Task 6: Long Rest Supplies + Exhaustion Level Clearing in RestManager.js

**Files:**
- Modify: `src/systems/RestManager.js`

**Step 1: Import FatigueManager**

```javascript
import { applyLongRestFatigue, getFatigueState } from './FatigueManager.js';
```

**Step 2: Modify longRest() to apply fatigue effects**

In `longRest()` (around line 244), after the existing HP restore and spell slot recovery, add:

```javascript
        // Apply fatigue long-rest effects (supplies, exhaustion clearing, fatigue reset)
        const fatigueResult = applyLongRestFatigue();

        // Apply HP recovery multiplier if out of supplies
        if (fatigueResult.hpRecoveryMultiplier < 1) {
            const penaltyHP = Math.floor(character.currentHP * (1 - fatigueResult.hpRecoveryMultiplier));
            character.currentHP = Math.max(1, character.currentHP - penaltyHP);
            // Note: HP was already set to max above — redo the calc:
            character.currentHP = Math.floor(character.maxHP * fatigueResult.hpRecoveryMultiplier);
        }
```

**Important:** The HP penalty must run AFTER the existing full-restore line (`character.currentHP = character.maxHP`). Find that line and ensure the supplies penalty overwrites it if needed.

**Step 3: Add supplies info to rest UI**

In `updateRestUI()` (the method that renders the rest modal), add a supplies display line. Find where `Short Rests:` is shown and add:

```javascript
                ${RULES.fatigue.enabled ? `
                <div class="rest-stat">
                    <span class="label">Supplies:</span>
                    <span class="value ${fatigueState.supplies === 0 ? 'warning' : ''}">${fatigueState.supplies} remaining</span>
                </div>
                ${fatigueState.exhaustionLevels > 0 ? `
                <div class="rest-stat">
                    <span class="label">Exhaustion:</span>
                    <span class="value warning">Level ${fatigueState.exhaustionLevels}</span>
                </div>` : ''}
                ` : ''}
```

Add `const fatigueState = getFatigueState();` near the top of `updateRestUI()`.

**Step 4: Manual test**
- Long rest with supplies > 0: full HP, supplies drops by 1
- Long rest with supplies = 0: HP capped at 50%, warning message shown
- Long rest with exhaustion level: check it decrements by 1

**Step 5: Commit**
```bash
git add src/systems/RestManager.js
git commit -m "feat: wire supplies consumption and exhaustion clearing into long rest"
```

---

## Task 7: Apply Threshold Penalties to Attack Rolls and Skill Checks

**Files:**
- Modify: `src/systems/CombatManager.js` (attack roll section)
- Modify: `src/main.js` (skill check roll section)

### 7A: Combat Attack Rolls

**Step 1: Import getFatigueModifiers in CombatManager.js**

Add to imports (already has addFatigue from Task 4):
```javascript
import { addFatigue, getFatigueModifiers } from './FatigueManager.js';
```

**Step 2: Apply modifiers in attack()**

Find where the attack roll d20 is calculated in `attack()`. It will look something like:
```javascript
const attackRoll = rollD20() + attackBonus;
```

Before that line, add:
```javascript
        const fatigueMods = getFatigueModifiers();
        // Apply disadvantage if staggering
        let rollResult;
        if (fatigueMods.disadvantageAttacks) {
            const r1 = rollD20(), r2 = rollD20();
            rollResult = Math.min(r1, r2); // disadvantage = take lower
            gameState.addMessage(`🎲 Fatigue Disadvantage: rolled ${r1} and ${r2}, using ${rollResult}`, 'info');
        } else {
            rollResult = rollD20();
        }
        const attackRoll = rollResult + attackBonus + fatigueMods.attackMod;
```

**Important:** The existing code already handles advantage/disadvantage via `rollWithAdvantage`. Find the actual roll pattern rather than assuming — adapt this to fit. The key addition is `+ fatigueMods.attackMod` to the final roll sum, and disadvantage stacking with existing disadvantage (if already disadvantaged, it stays disadvantaged; don't double-roll).

**Step 3: Verify** — Fight an enemy while at 75%+ fatigue. Attack roll should show penalty in combat log.

### 7B: Skill Check Rolls

**Step 1: Find skill check roll in main.js**

Search for where skill checks are rolled (look for `rollD20` or `d20` near `skillCheckModal` or `applyConsequences`). The roll likely looks like:
```javascript
const roll = Math.floor(Math.random() * 20) + 1 + modifier;
```

**Step 2: Import and apply**

Add near the top of the skill check roll block:
```javascript
import { getFatigueModifiers } from './systems/FatigueManager.js';
// ...
const fatigueMods = getFatigueModifiers();
// Apply disadvantage: if disadvantageSkills, roll twice and take lower
let baseRoll;
if (fatigueMods.disadvantageSkills) {
    const r1 = Math.floor(Math.random() * 20) + 1;
    const r2 = Math.floor(Math.random() * 20) + 1;
    baseRoll = Math.min(r1, r2);
} else {
    baseRoll = Math.floor(Math.random() * 20) + 1;
}
const roll = baseRoll + modifier + fatigueMods.skillMod;
```

**Step 3: Commit**
```bash
git add src/systems/CombatManager.js src/main.js
git commit -m "feat: apply fatigue threshold penalties to attack and skill check rolls"
```

---

## Task 8: HUD Elements (Fatigue Bar, Supplies Counter, Exhaustion Icons)

**Files:**
- Modify: `index.html` (HUD section around line 88–93)
- Modify: `styles.css` (add fatigue bar styles)
- Modify: `src/main.js` (updateHUD + new updateFatigueHUD method)

### 8A: index.html HUD additions

Find the `<div class="hud-right">` block (around line 89). After the existing spans, add:

```html
                    <!-- Fatigue HUD (shown when fatigue system enabled) -->
                    <div id="fatigueHUD" class="fatigue-hud" style="display: none;">
                        <div class="fatigue-bar-container" title="">
                            <div id="fatigueBar" class="fatigue-bar"></div>
                        </div>
                        <span id="fatigueLabel" class="fatigue-label">Rested</span>
                        <span id="exhaustionIcons" class="exhaustion-icons"></span>
                        <span id="suppliesDisplay" class="supplies-display">🎒 5</span>
                    </div>
```

### 8B: styles.css additions

Add at end of file:

```css
/* ── Fatigue HUD ─────────────────────────────────────────────── */
.fatigue-hud {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 8px;
}

.fatigue-bar-container {
    width: 80px;
    height: 10px;
    background: rgba(255,255,255,0.15);
    border-radius: 5px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.2);
    cursor: help;
}

.fatigue-bar {
    height: 100%;
    width: 0%;
    border-radius: 5px;
    transition: width 0.3s ease, background-color 0.3s ease;
    background-color: #4caf50; /* green = rested */
}

.fatigue-bar.wearied    { background-color: #ffeb3b; }
.fatigue-bar.tired      { background-color: #ff9800; }
.fatigue-bar.staggering { background-color: #f44336; }

.fatigue-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    min-width: 60px;
}

.exhaustion-icons {
    font-size: 0.85rem;
    letter-spacing: 1px;
}

.supplies-display {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.supplies-display.low { color: var(--warning-color); }
.supplies-display.empty { color: var(--error-color); }
```

### 8C: main.js — updateFatigueHUD() method

Add as a new method in the game class, near `updateHUD()`:

```javascript
    /**
     * Update fatigue HUD elements
     */
    updateFatigueHUD() {
        const fatigueHUD = document.getElementById('fatigueHUD');
        if (!fatigueHUD) return;

        if (!RULES.fatigue.enabled) {
            fatigueHUD.style.display = 'none';
            return;
        }

        fatigueHUD.style.display = 'flex';

        const { current, exhaustionLevels, supplies } = gameState.get('fatigue') || { current: 0, exhaustionLevels: 0, supplies: 5 };
        const { getThresholdName } = window._fatigueManager || {};

        // Bar fill and colour class
        const bar = document.getElementById('fatigueBar');
        if (bar) {
            bar.style.width = `${current}%`;
            bar.className = 'fatigue-bar';
            if (current >= 90)      bar.classList.add('staggering');
            else if (current >= 75) bar.classList.add('tired');
            else if (current >= 50) bar.classList.add('wearied');
        }

        // Threshold label
        const label = document.getElementById('fatigueLabel');
        if (label) {
            const names = { rested: 'Rested', wearied: 'Wearied', tired: 'Tired', staggering: 'Staggering', spent: 'Spent' };
            const state = current >= 90 ? 'staggering' : current >= 75 ? 'tired' : current >= 50 ? 'wearied' : 'rested';
            label.textContent = names[state];
        }

        // Tooltip on bar container
        const container = document.querySelector('.fatigue-bar-container');
        if (container) {
            container.title = `Fatigue: ${Math.round(current)}% — Exhaustion Levels: ${exhaustionLevels}`;
        }

        // Exhaustion icons (💀 per level)
        const icons = document.getElementById('exhaustionIcons');
        if (icons) icons.textContent = '💀'.repeat(exhaustionLevels);

        // Supplies
        const suppliesEl = document.getElementById('suppliesDisplay');
        if (suppliesEl) {
            suppliesEl.textContent = `🎒 ${supplies}`;
            suppliesEl.className = 'supplies-display';
            if (supplies === 0)      suppliesEl.classList.add('empty');
            else if (supplies <= 2)  suppliesEl.classList.add('low');
        }
    }
```

**Also:** Add `this.updateFatigueHUD();` at the end of the existing `updateHUD()` method.

**Also:** Export the reference so FatigueManager can call it:
In the existing place where `window.game = this` is set (in game init), it's already accessible via `window.game.updateFatigueHUD()`. The `_updateFatigueHUD()` in FatigueManager already calls `window.game?.updateFatigueHUD()` so this wires up automatically.

**Step: Manual test**
- Start game — fatigue HUD bar should be visible and green
- Walk around — bar should fill up
- When hitting 50%: bar turns yellow, label shows "Wearied"
- Long rest: bar resets to 0, green

**Step: Commit**
```bash
git add index.html styles.css src/main.js
git commit -m "feat: add fatigue bar, supplies counter, and exhaustion icons to HUD"
```

---

## Task 9: Worldbuilder Fatigue Toggle

**Files:**
- Modify: `index.html` (worldbuilder modal, after POIs section ~line 1111)
- Modify: `src/main.js` (`applyWorldbuilderSettings()` ~line 723)

### 9A: Add Gameplay section to worldbuilder modal

Find the `<div class="worldbuilder-section">` for POIs (around line 1105). After its closing `</div>`, add:

```html
                    <div class="worldbuilder-section">
                        <h3>⚙️ Gameplay</h3>
                        <div class="worldbuilder-row">
                            <label for="wbFatigueEnabled">Travel Fatigue:</label>
                            <select id="wbFatigueEnabled">
                                <option value="true">Enabled (recommended)</option>
                                <option value="false">Disabled</option>
                            </select>
                        </div>
                        <p class="worldbuilder-hint">When enabled, travel and combat drain fatigue. Rest at camps and settlements to recover. Supplies are consumed on long rests.</p>
                    </div>
```

Add `.worldbuilder-hint` to styles.css:
```css
.worldbuilder-hint {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 4px 0 0 0;
    font-style: italic;
}
```

### 9B: Read toggle in applyWorldbuilderSettings()

In `applyWorldbuilderSettings()` (around line 723), after the existing reads, add:

```javascript
        const fatigueEnabled = document.getElementById('wbFatigueEnabled')?.value !== 'false';
```

Then at the end of the method where `RULES.worldGen.campaignOverrides` is set, also update the fatigue rule:

```javascript
        // Apply fatigue toggle directly to RULES (takes effect immediately for new game)
        RULES.fatigue.enabled = fatigueEnabled;

        console.log('⚙️ Worldbuilder settings applied:', this.worldbuilderOverrides, '| fatigue:', fatigueEnabled);
```

Also store it in worldConfig so it persists to new game state:
```javascript
        const worldConfig = gameState.get('worldConfig') || {};
        worldConfig.fatigueEnabled = fatigueEnabled;
        gameState.set('worldConfig', worldConfig);
```

### 9C: On new game start, sync worldConfig.fatigueEnabled → RULES.fatigue.enabled

In `main.js`, find `initGameScreen()` or wherever new game starts (after worldConfig is set). Add:

```javascript
        // Sync fatigue toggle from worldbuilder
        const worldConfig = gameState.get('worldConfig');
        if (worldConfig?.fatigueEnabled !== undefined) {
            RULES.fatigue.enabled = worldConfig.fatigueEnabled;
        }
```

Also do this in the save LOAD path — find `loadGame()` or post-load init and add the same sync.

**Step: Manual test**
- Open Worldbuilder, set Fatigue to Disabled, start game — HUD bar should not appear, no fatigue messages
- Open Worldbuilder, set Fatigue to Enabled, start game — bar appears

**Step: Commit**
```bash
git add index.html styles.css src/main.js
git commit -m "feat: add fatigue enabled/disabled toggle to Worldbuilder"
```

---

## Task 10: Import FatigueManager in main.js + Expose to HUD

**Files:**
- Modify: `src/main.js`

FatigueManager calls `window.game.updateFatigueHUD()` — that's already covered. But main.js needs to import `RULES` for the worldbuilder sync (it already does) and `getFatigueState` for the rest modal display if needed.

**Step 1:** At the top of main.js, add:
```javascript
import { getFatigueModifiers } from './systems/FatigueManager.js';
```

(FatigueManager is used in Task 7 inline in skill check rolls — this ensures it's imported once at file top rather than dynamic imports.)

**Step 2: Add Make Camp to quick menu (optional but recommended)**

Find the quick-menu buttons in `index.html` (around line 1137). Add a Make Camp button:

```html
            <button class="quick-menu-btn" data-action="camp" title="Make Camp (T)">
                <span class="quick-menu-kbd">T</span>
                <span class="quick-menu-icon">🏕️</span>
                <span class="quick-menu-label">Camp</span>
            </button>
```

In main.js `setupQuickMenu()` (find where data-action handlers are registered), add:
```javascript
                case 'camp':
                    if (window.game?.player && !gameState.get('combat')?.active) {
                        import('./systems/FatigueManager.js').then(({ removeFatigue }) => {
                            removeFatigue(RULES.fatigue.makeCampFatigueRecovery);
                        });
                    }
                    break;
```

**Step 3: Commit**
```bash
git add src/main.js index.html
git commit -m "feat: wire FatigueManager into main.js and add Make Camp to quick menu"
```

---

## Final Verification Checklist

Run through these manually after all tasks complete:

- [ ] Walk across grassland — fatigue bar fills gradually, green
- [ ] Walk into forest — bar fills faster than grassland
- [ ] Walk 100+ tiles — Wearied threshold triggers floating text + message log
- [ ] Press T (Make Camp) — fatigue drops 15%, message logged
- [ ] Win a combat fight — fatigue jumps by 8%
- [ ] Lose a combat fight — fatigue jumps by 8%
- [ ] Trigger skill challenge — fatigue increases by 2% per choice
- [ ] Rest modal shows supplies count
- [ ] Long rest with supplies: supplies decrements, full HP, any exhaustion level clears
- [ ] Long rest at 0 supplies: HP capped at 50%, warning shown
- [ ] Reach 100% fatigue: Exhaustion Level 1 gained, fatigue resets to 45%, skull icon appears in HUD
- [ ] Worldbuilder: toggle fatigue off, start new game — bar hidden, no fatigue accumulation
- [ ] Worldbuilder: toggle fatigue on, start new game — bar visible, accumulation works
- [ ] Save/load: `gameState.get('fatigue')` persists correctly across save/load

---

## What This Does NOT Include (Out of Scope)

- Fieldcraft Practice mechanics (designed, not yet wired to rest system — separate task)
- Supplies as purchasable inventory item (requires inventory system work — separate task)
- Exhaustion effects on saving throws (not currently tracked in the combat system)
