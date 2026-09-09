# Monster Stat Overhaul Implementation Plan

**Status:** Implemented (verified 2026-09-08) — see `docs/plans/2026-03-11-monster-stat-overhaul.md`. Monster stat blocks in `data/monsters.json` have since also been dual-keyed for NVSystem (`abilitiesNVSystem`, all 46 populated) by the attribute remap.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hardcoded monster attack bonuses and HP with values calculated from ability scores, CR-based proficiency, and proper hit dice rolling — matching how player attacks are calculated.

**Architecture:** Humanoid monsters reference `weaponId` from `items.json`; natural attackers keep inline `damage` but strip hardcoded flat bonuses. Attack bonus = `abilityMod + proficiency` everywhere. HP = rolled (default) or average, multiplied by difficulty. All config lives in `rulesEngine.js`.

**Tech Stack:** Vanilla JS ES6 modules, JSON data files, `gameState.data.items` (already loaded), `roll()` from `dice.js`

---

## Reference

**Monster spawn location:** `src/systems/Player.js:1579-1609` — `createEnemyCharacter()` method
**Attack execution:** `src/systems/CombatManager.js:351` — `executeMonsterAttack()`
**Action filter:** `src/systems/CombatManager.js:304` — `executeMonsterActions()`
**Rules config:** `src/core/rulesEngine.js` — `RULES.combat`
**Items already loaded:** `gameState.data.items` (array, loaded in `GameState.js:659`)
**Design doc:** `docs/plans/2026-03-11-monster-stat-overhaul.md`

**Ability resolution rules:**
| Attack type | Default | `finesse: true` on action | `thrown: true` on action |
|---|---|---|---|
| `weaponId` melee | weapon `properties` | weapon `properties` | weapon `properties` |
| `weaponId` ranged | weapon `properties` | weapon `properties` | weapon `properties` |
| Natural melee (no `weaponId`) | STR | max(STR, DEX) | — |
| Natural ranged (no `weaponId`) | DEX | — | STR |

**Known limitation:** Monsters with damage-enhancing traits (Bugbear's Brute = extra damage die, Minotaur's 2d12 greataxe) will deal standard weapon damage after migration. This is correct behaviour until the abilities system is built.

---

## Task 1: Audit and add missing weapons to items.json

**Files:**
- Modify: `data/items.json`

Missing from `items.json` but needed for monster `weaponId` references (confirmed absent via grep):

| Weapon ID | D&D 5e stats |
|---|---|
| `scimitar` | 1d6 slashing, finesse, light |
| `greataxe` | 1d12 slashing, heavy, two-handed |
| `morningstar` | 1d8 piercing |
| `club` | 1d4 bludgeoning, light |
| `sling` | 1d4 bludgeoning, ranged (30/120) |
| `greatclub` | 1d8 bludgeoning, two-handed |
| `javelin` | 1d6 piercing, thrown (30/120) |

**Step 1: Open `data/items.json` and locate the weapons array (starts at line 1)**

**Step 2: Add the 7 missing weapons** following the existing schema. Place them alphabetically among other simple/martial weapons. Use this exact structure for each:

```json
{
  "id": "scimitar",
  "name": "Scimitar",
  "type": "weapon",
  "weaponType": "melee",
  "category": "martial",
  "damage": "1d6",
  "damageType": "slashing",
  "properties": ["finesse", "light"],
  "weight": 3,
  "cost": 25,
  "rarity": "common",
  "description": "A curved single-edged blade.",
  "campaignIds": ["core"]
},
{
  "id": "greataxe",
  "name": "Greataxe",
  "type": "weapon",
  "weaponType": "melee",
  "category": "martial",
  "damage": "1d12",
  "damageType": "slashing",
  "properties": ["heavy", "two-handed"],
  "weight": 7,
  "cost": 30,
  "rarity": "common",
  "description": "A massive two-handed axe.",
  "campaignIds": ["core"]
},
{
  "id": "morningstar",
  "name": "Morningstar",
  "type": "weapon",
  "weaponType": "melee",
  "category": "martial",
  "damage": "1d8",
  "damageType": "piercing",
  "properties": [],
  "weight": 4,
  "cost": 15,
  "rarity": "common",
  "description": "A spiked metal ball on a handle.",
  "campaignIds": ["core"]
},
{
  "id": "club",
  "name": "Club",
  "type": "weapon",
  "weaponType": "melee",
  "category": "simple",
  "damage": "1d4",
  "damageType": "bludgeoning",
  "properties": ["light"],
  "weight": 2,
  "cost": 1,
  "rarity": "common",
  "description": "A simple wooden club.",
  "campaignIds": ["core"]
},
{
  "id": "sling",
  "name": "Sling",
  "type": "weapon",
  "weaponType": "ranged",
  "category": "simple",
  "damage": "1d4",
  "damageType": "bludgeoning",
  "properties": ["ammunition"],
  "rangeNormal": 30,
  "rangeLong": 120,
  "weight": 0,
  "cost": 1,
  "rarity": "common",
  "description": "A pouch on a cord for hurling stones.",
  "campaignIds": ["core"]
},
{
  "id": "greatclub",
  "name": "Greatclub",
  "type": "weapon",
  "weaponType": "melee",
  "category": "simple",
  "damage": "1d8",
  "damageType": "bludgeoning",
  "properties": ["two-handed"],
  "weight": 10,
  "cost": 2,
  "rarity": "common",
  "description": "A large two-handed wooden club.",
  "campaignIds": ["core"]
},
{
  "id": "javelin",
  "name": "Javelin",
  "type": "weapon",
  "weaponType": "melee",
  "category": "simple",
  "damage": "1d6",
  "damageType": "piercing",
  "properties": ["thrown"],
  "rangeNormal": 30,
  "rangeLong": 120,
  "weight": 2,
  "cost": 5,
  "rarity": "common",
  "description": "A light spear designed for throwing.",
  "campaignIds": ["core"]
}
```

**Step 3: Verify the file is valid JSON**
```bash
node -e "JSON.parse(require('fs').readFileSync('data/items.json', 'utf8')); console.log('Valid JSON')"
```
Expected: `Valid JSON`

**Step 4: Commit**
```bash
git add data/items.json
git commit -m "data: add 7 missing weapons needed for monster weaponId references"
```

---

## Task 2: Add config blocks to rulesEngine.js

**Files:**
- Modify: `src/core/rulesEngine.js`

**Step 1: Open `src/core/rulesEngine.js` and find the `combat:` block**

**Step 2: Add `monsterProficiencyByCR` inside the `combat` object** (after the existing `coverBonuses` entry):

```javascript
// Monster proficiency bonus by Challenge Rating
monsterProficiencyByCR: {
    0: 2, 0.125: 2, 0.25: 2, 0.5: 2,
    1: 2, 2: 2, 3: 2, 4: 2,
    5: 3, 6: 3, 7: 3, 8: 3,
    9: 4, 10: 4
},
```

**Step 3: Add a new `monsterHP` top-level block** after the `combat` block closes:

```javascript
// ====================
// MONSTER HP
// ====================
monsterHP: {
    // true = roll hit dice on spawn (roguelike variety)
    // false = use statistical average (predictable, tournament mode)
    roll: true,
    difficultyMultipliers: {
        easy:   0.75,
        normal: 1.0,
        hard:   1.25,
        deadly: 1.5
    }
},
```

**Step 4: Verify the file loads without errors**
```bash
node -e "import('./src/core/rulesEngine.js').then(m => { const t = m.RULES.combat.monsterProficiencyByCR; console.log('CR 1 prof:', t[1], 'CR 5 prof:', t[5]); }).catch(console.error)"
```
Expected: `CR 1 prof: 2 CR 5 prof: 3`

**Step 5: Commit**
```bash
git add src/core/rulesEngine.js
git commit -m "rules: add monsterProficiencyByCR table and monsterHP config"
```

---

## Task 3: Add useAverageMonsterHP to worldConfig defaults

**Files:**
- Modify: `src/core/GameState.js`

**Step 1: Find `worldConfig` in `GameState.js`** — search for `worldConfig:` or `initNewGame`

**Step 2: Add `useAverageMonsterHP: false` to the worldConfig defaults object.** It should sit alongside `difficulty`, `campaignId`, etc:

```javascript
worldConfig: {
    // ... existing fields ...
    useAverageMonsterHP: false   // true = average HP (worldbuilder toggle)
}
```

**Step 3: Commit**
```bash
git add src/core/GameState.js
git commit -m "state: add useAverageMonsterHP worldConfig toggle (default: roll)"
```

---

## Task 4: Fix monster HP and proficiency at spawn (Player.js)

**Files:**
- Modify: `src/systems/Player.js:1579-1601`

This is the `createEnemyCharacter()` method. Two things to fix:
1. `const hp = roll(monster.hitPoints)` → proper HP calculation with difficulty multiplier + average toggle
2. `proficiencyBonus: 2` → derived from CR

**Step 1: Add the `calculateMonsterHP` helper function** inside the `Player` class, just above `createEnemyCharacter()`:

```javascript
/**
 * Calculate monster spawn HP from hit dice formula.
 * Uses roll or average based on worldConfig + difficulty multiplier.
 * @param {string} hitDiceFormula - e.g. "2d8+6" or "3d6-2"
 * @returns {number} Final HP (minimum 1)
 */
calculateMonsterHP(hitDiceFormula) {
    const worldConfig = gameState.get('worldConfig') || {};
    const difficulty = worldConfig.difficulty || 'normal';
    const useAverage = worldConfig.useAverageMonsterHP === true;
    const multiplier = RULES.monsterHP.difficultyMultipliers[difficulty] ?? 1.0;

    // Parse formula: e.g. "2d8+6", "3d6", "2d6-2", "1d4+1"
    const match = hitDiceFormula.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) {
        // Fallback: treat as static number
        const staticHP = parseInt(hitDiceFormula) || 1;
        return Math.max(1, Math.floor(staticHP * multiplier));
    }

    const numDice = parseInt(match[1]);
    const dieSize = parseInt(match[2]);
    const flatBonus = match[3] ? parseInt(match[3]) : 0;

    let hp;
    if (useAverage || !RULES.monsterHP.roll) {
        // Average: floor(numDice × (dieSize/2 + 0.5)) + flatBonus
        hp = Math.floor(numDice * (dieSize / 2 + 0.5)) + flatBonus;
    } else {
        // Roll each die individually
        let rolled = 0;
        for (let i = 0; i < numDice; i++) {
            rolled += Math.floor(Math.random() * dieSize) + 1;
        }
        hp = rolled + flatBonus;
    }

    return Math.max(1, Math.floor(hp * multiplier));
}
```

**Step 2: In `createEnemyCharacter()` around line 1579-1601, replace these two lines:**

```javascript
// REPLACE:
const hp = roll(monster.hitPoints);

// WITH:
const hp = this.calculateMonsterHP(monster.hitPoints);
```

```javascript
// REPLACE:
proficiencyBonus: 2,

// WITH:
proficiencyBonus: RULES.combat.monsterProficiencyByCR[monster.challengeRating] ?? 2,
```

**Step 3: Verify RULES is imported at the top of Player.js**

Search for `import { RULES }` in Player.js. If not present, add:
```javascript
import { RULES } from '../core/rulesEngine.js';
```

**Step 4: Start a game, trigger a combat encounter, check console for HP values**

Open browser console and look for monster spawn. Verify HP is no longer always the same value for the same monster type.

**Step 5: Commit**
```bash
git add src/systems/Player.js
git commit -m "feat: calculate monster HP from hit dice with difficulty multiplier"
```

---

## Task 5: Migrate monsters.json — humanoid weapon actions

**Files:**
- Modify: `data/monsters.json`

For each humanoid monster below, update their `actions` array:
- **Add** `"weaponId": "<id>"` to each weapon attack action
- **Remove** `"attackBonus"` field from that action
- **Remove** `"damage"` field from that action (damage comes from the weapon lookup)
- **Remove** `"damageType"` field from that action (also from weapon lookup)
- **Keep** `"name"`, `"type"`, `"reach"`, `"range"` fields — they are still used

**Note on gnoll:** Has both a `Bite` (natural — keep inline) and a `Spear` (weapon — migrate). Handle each action individually.

**Note on bugbear/minotaur:** Their damage will reduce to the base weapon damage (morningstar = 1d8, greataxe = 1d12). The extra damage dice come from abilities (Brute trait) — not yet implemented. This is expected and correct.

### Monsters to migrate:

| Monster | Action | weaponId |
|---|---|---|
| goblin | Scimitar | `scimitar` |
| skeleton | Shortsword | `shortsword` |
| skeleton | Shortbow | `shortbow` |
| orc | Greataxe | `greataxe` |
| bandit | Scimitar | `scimitar` |
| bandit | Light Crossbow | `lightCrossbow` |
| bugbear | Morningstar | `morningstar` |
| commoner | Club | `club` |
| kobold | Dagger | `dagger` |
| kobold | Sling | `sling` |
| gnoll | Spear | `spear` |
| scout | Shortsword | `shortsword` |
| scout | Longbow | `longbow` |
| spy | Shortsword | `shortsword` |
| spy | Hand Crossbow | `handCrossbow` |
| berserker | Greataxe | `greataxe` |
| wight | Longsword | `longsword` |
| wight | Longbow | `longbow` |
| veteran | Longsword | `longsword` |
| veteran | Shortsword | `shortsword` |
| veteran | Heavy Crossbow | `heavyCrossbow` |
| ogre | Greatclub | `greatclub` |
| ogre | Javelin | `javelin` |
| minotaur | Greataxe | `greataxe` |

**Example — before:**
```json
{
  "name": "Scimitar",
  "type": "meleeWeaponAttack",
  "attackBonus": 4,
  "reach": 5,
  "damage": "1d6+2",
  "damageType": "slashing"
}
```

**Example — after:**
```json
{
  "name": "Scimitar",
  "type": "meleeWeaponAttack",
  "weaponId": "scimitar",
  "reach": 5
}
```

**Step 1: Edit each monster's actions in `data/monsters.json` per the table above**

Work through them in order. Take care not to accidentally remove `reach` or `range` fields.

**Step 2: Scan for any remaining stale `"attackBonus"` fields on weaponId actions:**
```bash
node -e "
const m = JSON.parse(require('fs').readFileSync('data/monsters.json', 'utf8'));
m.monsters.forEach(mon => {
    (mon.actions || []).forEach(a => {
        if (a.weaponId && a.attackBonus !== undefined) {
            console.log('STALE attackBonus on weaponId action:', mon.id, a.name);
        }
        if (a.weaponId && a.damage !== undefined) {
            console.log('STALE damage on weaponId action:', mon.id, a.name);
        }
    });
});
console.log('Scan complete');
"
```
Expected: `Scan complete` with no STALE lines.

**Step 3: Verify valid JSON**
```bash
node -e "JSON.parse(require('fs').readFileSync('data/monsters.json', 'utf8')); console.log('Valid JSON')"
```

**Step 4: Commit**
```bash
git add data/monsters.json
git commit -m "data: migrate humanoid monster weapon actions to weaponId references"
```

---

## Task 6: Migrate monsters.json — natural attack actions

**Files:**
- Modify: `data/monsters.json`

For natural attack actions (no `weaponId`), make these changes:
- **Remove** `"attackBonus"` field — will be calculated from ability mod + proficiency
- **Strip the flat bonus** from `"damage"` string — e.g., `"2d4+2"` → `"2d4"` (flat bonus is now abilityMod, applied at runtime)
- **Keep** `"damageType"` — still needed
- **Add** `"finesse": true` on natural melee attacks that use the better of STR/DEX (claws on agile beasts)
- **Add** `"thrown": true` on any STR-based ranged natural attacks (none currently)
- **Add** `"abilities": []` stub to boss-tier and special monsters for future use

**Monsters with natural attacks and what to do:**

| Monster | Action | Change |
|---|---|---|
| wolf | Bite `2d4+2` | Remove `attackBonus`. Strip to `"2d4"`. |
| giantRat | Bite `1d4+2` | Remove `attackBonus`. Strip to `"1d4"`. |
| zombie | Slam `1d6+1` | Remove `attackBonus`. Strip to `"1d6"`. |
| stirge | Blood Drain `1d4+3` | Remove `attackBonus`. Strip to `"1d4"`. |
| giantSpider | Bite `1d8+3` | Remove `attackBonus`. Strip to `"1d8"`. |
| direWolf | Bite `2d6+3` | Remove `attackBonus`. Strip to `"2d6"`. |
| gnoll | Bite `1d4+2` | Remove `attackBonus`. Strip to `"1d4"`. (Spear migrated in Task 5) |
| shadow | Strength Drain `2d6+2` | Remove `attackBonus`. Strip to `"2d6"`. |
| ghoul | Bite `2d6+2` | Remove `attackBonus`. Strip to `"2d6"`. |
| ghoul | Claws `2d4+2` | Remove `attackBonus`. Strip to `"2d4"`. Add `"finesse": true` (agile undead, DEX 15 > STR 13). |
| ghast | Bite `2d8+3` | Remove `attackBonus`. Strip to `"2d8"`. |
| ghast | Claws `2d6+3` | Remove `attackBonus`. Strip to `"2d6"`. Add `"finesse": true` (DEX 17 > STR 16). |
| giantHyena | Bite `2d6+3` | Remove `attackBonus`. Strip to `"2d6"`. |
| specter | Life Drain `3d6` | Remove `attackBonus`. Keep `"3d6"` (no flat bonus already). |
| gargoyle | Bite `2d6+2` | Remove `attackBonus`. Strip to `"2d6"`. |
| gargoyle | Claws `2d4+2` | Remove `attackBonus`. Strip to `"2d4"`. |
| owlbear | Beak `1d10+5` | Remove `attackBonus`. Strip to `"1d10"`. |
| owlbear | Claws `2d8+5` | Remove `attackBonus`. Strip to `"2d8"`. |
| minotaur | Gore `2d8+4` | Remove `attackBonus`. Strip to `"2d8"`. (Greataxe migrated in Task 5) |
| flameskull | Fire Ray `3d6` | Remove `attackBonus`. Keep `"3d6"`. Add `"finesse": true` (DEX-based ranged natural). Actually it's ranged — will use DEX by default. |

**Also add `"abilities": []` stub to these boss-tier/special monsters:**
- shadow, specter, ghoul, ghast, gargoyle, flameskull, minotaur, owlbear, wight

**Example — before:**
```json
{
  "name": "Bite",
  "type": "meleeWeaponAttack",
  "attackBonus": 4,
  "reach": 5,
  "damage": "2d4+2",
  "damageType": "piercing"
}
```

**Example — after:**
```json
{
  "name": "Bite",
  "type": "meleeWeaponAttack",
  "reach": 5,
  "damage": "2d4",
  "damageType": "piercing"
}
```

**Step 1: Edit each monster's natural attack actions per the table above**

**Step 2: Scan for any remaining stale `attackBonus` fields on non-weaponId actions:**
```bash
node -e "
const m = JSON.parse(require('fs').readFileSync('data/monsters.json', 'utf8'));
m.monsters.forEach(mon => {
    (mon.actions || []).forEach(a => {
        if (!a.weaponId && a.attackBonus !== undefined) {
            console.log('Remaining attackBonus (natural):', mon.id, a.name);
        }
    });
});
console.log('Scan complete');
"
```
Expected: `Scan complete` with no remaining lines (all `attackBonus` fields should be gone).

**Step 3: Verify valid JSON**
```bash
node -e "JSON.parse(require('fs').readFileSync('data/monsters.json', 'utf8')); console.log('Valid JSON')"
```

**Step 4: Commit**
```bash
git add data/monsters.json
git commit -m "data: migrate natural attack actions, strip hardcoded bonuses, add abilities stubs"
```

---

## Task 7: Add attack calculation helpers to CombatManager.js

**Files:**
- Modify: `src/systems/CombatManager.js`

Add two helper methods to the `CombatManager` class. Place them just above `executeMonsterAttack()` (around line 348).

**Step 1: Add `getWeaponById()` helper:**

```javascript
/**
 * Look up a weapon from the loaded items data by ID.
 * @param {string} weaponId
 * @returns {object|null} weapon item or null if not found
 */
getWeaponById(weaponId) {
    const items = gameState.data?.items;
    if (!items || !weaponId) return null;
    return items.find(i => i.id === weaponId) || null;
}
```

**Step 2: Add `calculateMonsterAttackBonus()` helper:**

```javascript
/**
 * Calculate attack bonus for a monster action.
 * Replaces the old hardcoded action.attackBonus.
 *
 * @param {Combatant} combatant - the attacking monster combatant
 * @param {object} action - the action being executed
 * @returns {{ attackBonus: number, damageBonus: number, damageDice: string, damageType: string }}
 */
calculateMonsterAttackStats(combatant, action) {
    const mods = combatant.character.abilityModifiers;
    const proficiency = combatant.character.proficiencyBonus || 2;
    let abilityMod;
    let damageDice;
    let damageType;

    if (action.weaponId) {
        // Weapon reference — look up from items.json
        const weapon = this.getWeaponById(action.weaponId);
        if (weapon) {
            const props = weapon.properties || [];
            const isFinesse = props.includes('finesse');
            const isThrown = props.includes('thrown');
            const isRanged = weapon.weaponType === 'ranged';

            if (isFinesse) {
                abilityMod = Math.max(mods.str, mods.dex);
            } else if (isRanged && !isThrown) {
                abilityMod = mods.dex;
            } else {
                abilityMod = mods.str;
            }

            damageDice = weapon.damage;   // e.g. "1d6"
            damageType = weapon.damageType;
        } else {
            // Weapon not found in items.json — log warning, fall back to str
            console.warn(`[CombatManager] weaponId "${action.weaponId}" not found in items data`);
            abilityMod = mods.str;
            damageDice = '1d4';
            damageType = 'bludgeoning';
        }
    } else {
        // Natural attack — use action flags or defaults
        const isRangedAction = action.type === 'rangedWeaponAttack';
        if (action.finesse) {
            abilityMod = Math.max(mods.str, mods.dex);
        } else if (isRangedAction && !action.thrown) {
            abilityMod = mods.dex;
        } else {
            abilityMod = mods.str;
        }

        // Parse dice from damage string (strip any existing flat bonus — it's being replaced)
        // Supports "2d6", "1d8+3", "3d6-2", "1d4"
        const diceMatch = (action.damage || '1d4').match(/^(\d+d\d+)/);
        damageDice = diceMatch ? diceMatch[1] : (action.damage || '1d4');
        damageType = action.damageType || 'bludgeoning';
    }

    return {
        attackBonus: abilityMod + proficiency,
        damageBonus: abilityMod,
        damageDice,
        damageType
    };
}
```

**Step 3: Commit**
```bash
git add src/systems/CombatManager.js
git commit -m "feat: add calculateMonsterAttackStats() and getWeaponById() helpers to CombatManager"
```

---

## Task 8: Rewrite executeMonsterAttack() to use calculated stats

**Files:**
- Modify: `src/systems/CombatManager.js:351-~460`

**Step 1: Locate `executeMonsterAttack()` at line 351**

**Step 2: Replace the attack bonus line (around line 369):**

```javascript
// REMOVE this line:
const attackBonus = (action.attackBonus || 0) + (combatant.character.bossAttackBonus || 0);

// REPLACE WITH:
const attackStats = this.calculateMonsterAttackStats(combatant, action);
const attackBonus = attackStats.attackBonus + (combatant.character.bossAttackBonus || 0);
```

**Step 3: Find the damage section** — where `action.damage` is parsed to roll damage after a hit. It will look something like:
```javascript
const damageRoll = rollDice(...);
const damageTotal = damageRoll + someBonus;
```

Replace the damage dice and bonus references to use `attackStats`:

```javascript
// Instead of parsing action.damage directly, use attackStats:
const { damageDice, damageBonus, damageType: resolvedDamageType } = attackStats;

// Parse damageDice for rolling — e.g. "1d6" → sides=6, count=1
const diceMatch = damageDice.match(/^(\d+)d(\d+)$/);
const diceCount = diceMatch ? parseInt(diceMatch[1]) : 1;
const diceSides = diceMatch ? parseInt(diceMatch[2]) : 4;

// Roll damage (double dice on crit)
let damageTotal;
if (isCritical) {
    let rolled = 0;
    for (let i = 0; i < diceCount * 2; i++) rolled += rollDice(diceSides);
    damageTotal = rolled + damageBonus;
} else {
    let rolled = 0;
    for (let i = 0; i < diceCount; i++) rolled += rollDice(diceSides);
    damageTotal = rolled + damageBonus;
}
damageTotal = Math.max(1, damageTotal);

// Use resolvedDamageType instead of action.damageType where needed
```

> **Note:** The existing damage rolling code may use `rollDice()` differently. Adapt the snippet above to match the existing call style — don't rewrite working code, just thread in `attackStats.damageDice` and `attackStats.damageBonus` in place of the old parsed values.

**Step 4: Update executeMonsterActions() filter** at line 304:

```javascript
// REMOVE:
const attackActions = actions.filter(a => a.attackBonus !== undefined && a.damage);

// REPLACE WITH (detect valid weapon attacks by type or presence of damage/weaponId):
const attackActions = actions.filter(a =>
    (a.type === 'meleeWeaponAttack' || a.type === 'rangedWeaponAttack') &&
    (a.weaponId || a.damage)
);
```

**Step 5: Verify the app loads and enters combat without errors**

Open browser, start new game, trigger an encounter. Check console for:
- No `TypeError` on `calculateMonsterAttackStats`
- Monster attack messages appear with reasonable numbers
- No "weaponId not found" warnings (if any appear, the weapon is missing from items.json — go back to Task 1)

**Step 6: Commit**
```bash
git add src/systems/CombatManager.js
git commit -m "feat: monster attacks now calculated from ability mods + proficiency"
```

---

## Task 9: Handle remaining monsters in JSON (ranged enemies + higher CR)

**Files:**
- Modify: `data/monsters.json`

Tasks 5 and 6 covered the monsters visible in the first ~2500 lines. There are additional monsters further in the file (ettin, manticore, mage, medusa, goblin archer, bandit crossbowman, werewolf, wraith, and others). Apply the same rules:

**Step 1: Scan for all remaining `attackBonus` fields** — these are the monsters not yet migrated:

```bash
node -e "
const m = JSON.parse(require('fs').readFileSync('data/monsters.json', 'utf8'));
m.monsters.forEach(mon => {
    (mon.actions || []).forEach(a => {
        if (a.attackBonus !== undefined) {
            console.log(mon.id, '-', a.name, '(type:', a.type + ')');
        }
    });
});
"
```

**Step 2: For each result, apply the migration rules:**

- If the action has a real weapon name (Longsword, Shortbow, Handaxe, etc.) → add `weaponId`, remove `attackBonus` + `damage` + `damageType`
- If the action is a natural attack (Bite, Claw, Tail Spike, Fire Bolt, etc.) → remove `attackBonus`, strip flat bonus from damage string

**Ranged enemy weapons to reference (added in Session 18):**

| Monster | Action | weaponId |
|---|---|---|
| goblinArcher | Shortbow | `shortbow` |
| banditCrossbowman | Light Crossbow | `lightCrossbow` |
| manticore | Tail Spike (natural ranged) | no weaponId — keep inline damage |
| mage | Fire Bolt (natural ranged) | no weaponId |
| medusa | Longbow | `longbow` |

**Step 3: Run the scan again to confirm zero remaining `attackBonus` fields:**

```bash
node -e "
const m = JSON.parse(require('fs').readFileSync('data/monsters.json', 'utf8'));
let count = 0;
m.monsters.forEach(mon => {
    (mon.actions || []).forEach(a => {
        if (a.attackBonus !== undefined) { count++; console.log(mon.id, a.name); }
    });
});
console.log('Remaining attackBonus fields:', count);
"
```
Expected: `Remaining attackBonus fields: 0`

**Step 4: Verify valid JSON, commit**
```bash
node -e "JSON.parse(require('fs').readFileSync('data/monsters.json', 'utf8')); console.log('Valid JSON')"
git add data/monsters.json
git commit -m "data: complete monster migration - all attackBonus fields removed"
```

---

## Task 10: Integration test and final verification

**Step 1: Open the game in browser, open the console**

**Step 2: Create a new character and walk into an encounter**

**Step 3: Verify in combat log and console:**
- [ ] Monster HP varies between encounters (rolled, not static)
- [ ] No JS errors or `attackBonus not defined` warnings
- [ ] No "weaponId not found" warnings
- [ ] Attack totals are reasonable (e.g. goblin attacks at ~+4, ogre at ~+6)
- [ ] Damage values are reasonable (e.g. wolf dealing 2-9 damage, not 2-11)

**Step 4: Test on partial cover terrain (forest)**
- [ ] Monster ranged attacks show "+2 cover" in the attack message
- [ ] Cover bonus applies correctly to the calculated effective AC

**Step 5: Test a higher-difficulty encounter (hard setting)**
- [ ] Monster HP is ~25% higher than normal
- [ ] Check `RULES.monsterHP.difficultyMultipliers.hard = 1.25` is working

**Step 6: Final commit**
```bash
git add -A
git commit -m "feat: monster stat overhaul complete - calculated attacks + proper HP"
```
