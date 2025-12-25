# Abilities, Spells & Traits Framework Design
**Nexus Verge - Character Specializations & Leveling System**

**Version:** 1.0
**Date:** 2025-12-25
**Status:** Framework Design - Ready for Implementation

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Design Principles](#design-principles)
3. [Tier-Based Leveling System](#tier-based-leveling-system)
4. [Specializations (Subclasses)](#specializations-subclasses)
5. [Core Data Models](#core-data-models)
6. [Class Resources Framework](#class-resources-framework)
7. [Effect System](#effect-system)
8. [Targeting & Usage Contexts](#targeting--usage-contexts)
9. [Unlock & Availability System](#unlock--availability-system)
10. [Integration Points](#integration-points)
11. [File Structure](#file-structure)
12. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

This framework establishes the foundation for character progression beyond basic leveling, introducing:

- **Tier-based progression** (Adventurer → Master → Legend → Myth)
- **Specializations** for each of the 7 Callings
- **Unified system** for Abilities, Spells, and Traits (passives)
- **Class Resources** (spell slots, superiority dice, ki points, rage uses, etc.)
- **Flexible effect system** that works in combat, skill checks, dialogue, and exploration
- **Data-driven architecture** avoiding spaghetti code

### Key Features
✅ **No Content Creation** - Framework only, ready for future content
✅ **Tier Unlocks** - Each tier (Adventurer/Master/Legend/Myth) grants new options
✅ **Flexible Execution** - Abilities/spells work anywhere (combat, skills, dialogue, world map)
✅ **Resource Management** - Tracks spell slots, class-specific resources, cooldowns
✅ **Integration Ready** - Works with existing buffs/conditions, combat, and skill systems
✅ **Anti-Spaghetti** - Event-driven, modular, data-driven design

---

## Design Principles

### 1. Data-Driven Everything
- All abilities, spells, and traits defined in JSON files
- No hardcoded ability logic in combat/skill systems
- Abilities reference effects, not vice versa
- Content creators can add new abilities without touching code

### 2. Unified Unlockable System
Abilities, spells, and traits share a common structure:
```javascript
{
  id: "second_wind",
  type: "ability",  // 'ability', 'spell', 'trait'
  name: "Second Wind",
  tier: 1,          // Minimum tier (1=Adventurer, 2=Master, 3=Legend, 4=Myth)
  calling: "dedication",
  specialization: null,  // null = available to all specs, or "bladedancer" for spec-specific
  // ... rest of definition
}
```

### 3. Event-Driven Effect System
Effects trigger on events, not embedded in game logic:
```javascript
// Good (event-driven)
abilityManager.on('onTurnStart', (combatant) => {
  combatant.applyActiveEffects('turnStart');
});

// Bad (spaghetti)
if (hasSecondWind) doSecondWind();
if (hasActionSurge) doActionSurge();
// ... 100 more if statements
```

### 4. Context-Aware Execution
Abilities know where they can be used:
```javascript
{
  usableIn: ["combat", "exploration", "dialogue", "skillCheck"],
  executionContext: {
    combat: { /* combat-specific behavior */ },
    skillCheck: { /* grants bonus to specific skills */ }
  }
}
```

### 5. Resource Agnostic
Each calling can have different resource types without special-casing:
```javascript
{
  resourceCost: {
    type: "spellSlot",  // or "ki", "rage", "superiorityDice", "stamina"
    amount: 1,
    level: 1  // For spell slots only
  }
}
```

---

## Tier-Based Leveling System

### Overview
Characters progress through 10 levels organized into 4 tiers:

| Tier | Levels | Name | Description |
|------|--------|------|-------------|
| **1** | 1-3 | Adventurer | Learning the basics, establishing core identity |
| **2** | 4-6 | Master | Mastering techniques, choosing specialization |
| **3** | 7-9 | Legend | Legendary abilities, defining unique playstyle |
| **4** | 10 | Myth | Mythic capstone, ultimate power |

### Per-Level Rewards
Every level grants:
1. **HP Increase** - Max roll of hit dice + CON modifier
2. **Attribute Point** - +1 to any attribute (STR, DEX, CON, INT, WIS, CHA)
3. **Choice from Tier Unlocks** - Pick from anything available in current tier or below

### Per-Tier Rewards
Reaching a new tier grants:
1. **Tier Unlocks** - New categories of unlockables become available
2. **Resource Upgrades** - New spell slot levels, more ki points, etc.
3. **Specialization Choice** - At Tier 2 (level 4), choose specialization

### Example Tier Unlocks

**Tier 1 (Adventurer - Levels 1-3)**
- Basic abilities (Second Wind, Martial Arts, Spellcasting)
- Cantrips and 1st-level spells
- Basic traits (Fighting Style, Unarmored Defense)

**Tier 2 (Master - Levels 4-6)**
- **Specialization Choice** (level 4)
- Advanced abilities (Action Surge, Extra Attack, Cunning Action)
- 2nd and 3rd level spells
- Improved traits (Evasion, Improved Critical)

**Tier 3 (Legend - Levels 7-9)**
- Legendary abilities (Stunning Strike, Relentless Rage)
- 4th and 5th level spells
- Legendary traits (Diamond Soul, Elusive)

**Tier 4 (Myth - Level 10)**
- Mythic capstone ability unique to specialization
- 6th level spells (if applicable)
- Mythic traits (Perfect Self, Primal Champion)

### Leveling Flow

```
Level Up (e.g., Level 1 → 2)
├─ Calculate New HP (d10 + CON mod)
├─ Grant Attribute Point (player chooses STR/DEX/CON/INT/WIS/CHA)
├─ Check Tier Change
│  ├─ If new tier: Unlock new unlockables
│  └─ If tier 2 (level 4): Force specialization choice
├─ Present Choice UI
│  ├─ Show all available unlockables (abilities, spells, traits)
│  ├─ Filter by: tier ≤ current, calling match, specialization match
│  └─ Player picks ONE
└─ Apply Choice and Update Character
```

---

## Specializations (Subclasses)

### Overview
At **level 4 (Tier 2 - Master)**, players choose a specialization for their calling. This choice:
- **Unlocks unique abilities/spells/traits** available only to that specialization
- **Modifies playstyle** (e.g., Bladedancer focuses on DEX + finesse, Juggernaut on STR + defense)
- **Is permanent** for that character (no respec)
- **Grants unique capstone** at level 10

### Specialization Structure

Each calling has **2-3 specializations**:

#### Example: Dedication (Fighter + Monk)

| Specialization | Theme | Focus | Example Abilities |
|----------------|-------|-------|-------------------|
| **Bladedancer** | DEX-based, finesse weapons, mobility | Agility + Precision | Whirling Defense, Blade Flourish |
| **Juggernaut** | STR-based, heavy armor, tanking | Durability + Control | Indomitable, Shield Wall |
| **Ascetic** | Monk traditions, unarmed, ki mastery | Spirituality + Discipline | Flurry of Blows, Stunning Strike |

#### Example: Scholar (Wizard + Artificer)

| Specialization | Theme | Focus |
|----------------|-------|-------|
| **Arcanist** | Pure spellcasting, arcane theory | Spell Power + Versatility |
| **Artificer** | Item infusions, magical crafting | Item Enhancement + Utility |
| **Sage** | Knowledge skills, rituals, divination | Information + Support |

#### Example: Pact (Cleric + Warlock)

| Specialization | Theme | Focus |
|----------------|-------|-------|
| **Divine Champion** | Healing, support, protection | Buffing + Healing |
| **Voidcaller** | Eldritch blast, dark magic, curses | Damage + Debuffs |
| **Crusader** | Melee combat, divine smite, tanking | Martial + Holy |

### Specialization Data Model

```json
{
  "id": "bladedancer",
  "name": "Bladedancer",
  "calling": "dedication",
  "description": "Masters of agile combat, bladedancers blend martial prowess with graceful movement.",
  "chosenAtLevel": 4,
  "primaryAttributes": ["dex", "wis"],
  "playstyle": "Mobile skirmisher with high AC and precision strikes",

  "specialAbilities": [
    {
      "level": 4,
      "type": "ability",
      "abilityId": "whirling_defense",
      "grantedAutomatically": true
    },
    {
      "level": 7,
      "type": "trait",
      "abilityId": "evasion",
      "grantedAutomatically": true
    },
    {
      "level": 10,
      "type": "ability",
      "abilityId": "mythic_dance_of_blades",
      "grantedAutomatically": true
    }
  ],

  "unlockables": {
    "tier2": [
      "blade_flourish",
      "defensive_spin"
    ],
    "tier3": [
      "shadow_step",
      "perfect_dodge"
    ]
  },

  "resourceModifications": {
    "ki": { "baseAmount": 4, "perLevel": 1 }
  }
}
```

### Specialization Selection Flow

```javascript
// At level 4, force specialization choice
if (character.level === 4 && !character.specialization) {
  // Show specialization modal
  const calling = character.class.id;
  const specs = specializationManager.getSpecializationsFor(calling);

  // Player chooses one
  const chosen = await showSpecializationChoice(specs);

  // Apply specialization
  character.specialization = chosen.id;

  // Grant automatic abilities
  const autoGrants = chosen.specialAbilities.filter(a => a.level === 4 && a.grantedAutomatically);
  autoGrants.forEach(grant => {
    character.learnUnlockable(grant.abilityId);
  });

  // Update available unlockables
  unlockableManager.refreshAvailableUnlockables(character);
}
```

---

## Core Data Models

### 1. Ability Data Model

Abilities are **active actions** (Second Wind, Action Surge, Sneak Attack).

```json
{
  "id": "second_wind",
  "type": "ability",
  "name": "Second Wind",
  "tier": 1,
  "calling": "dedication",
  "specialization": null,

  "description": "You have a limited well of stamina that you can draw on to protect yourself from harm. On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level.",

  "actionType": "bonusAction",
  "usableIn": ["combat"],

  "resourceCost": {
    "type": "shortRest",
    "amount": 1,
    "maxUses": 1
  },

  "targeting": {
    "type": "self"
  },

  "effects": [
    {
      "type": "heal",
      "formula": "1d10 + @level",
      "target": "self"
    }
  ],

  "visualFeedback": {
    "icon": "💪",
    "message": "{casterName} takes a deep breath and recovers {amount} HP!",
    "animation": "greenGlow"
  }
}
```

### 2. Spell Data Model

Spells are **magical effects** with spell slot costs.

```json
{
  "id": "magic_missile",
  "type": "spell",
  "name": "Magic Missile",
  "tier": 1,
  "calling": null,
  "specialization": null,

  "school": "evocation",
  "level": 1,
  "castingTime": "action",
  "range": 120,
  "components": ["verbal", "somatic"],
  "duration": "instantaneous",

  "description": "You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target. The darts all strike simultaneously.",

  "usableIn": ["combat", "exploration"],

  "resourceCost": {
    "type": "spellSlot",
    "amount": 1,
    "level": 1
  },

  "targeting": {
    "type": "multiTarget",
    "count": 3,
    "range": 120,
    "allowSameTarget": true
  },

  "effects": [
    {
      "type": "damage",
      "damageType": "force",
      "formula": "1d4 + 1",
      "target": "each",
      "autoHit": true
    }
  ],

  "upcast": {
    "enabled": true,
    "perLevel": {
      "type": "addMissiles",
      "amount": 1
    }
  },

  "visualFeedback": {
    "icon": "✨",
    "message": "{casterName} fires {count} glowing missiles!",
    "animation": "missiles"
  }
}
```

### 3. Trait Data Model

Traits are **passive effects** (Fighting Style, Alert feat, Unarmored Defense).

```json
{
  "id": "fighting_style_dueling",
  "type": "trait",
  "name": "Fighting Style: Dueling",
  "tier": 1,
  "calling": "dedication",
  "specialization": null,

  "description": "When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.",

  "passive": true,
  "permanent": true,

  "effects": [
    {
      "type": "damageBonus",
      "amount": 2,
      "condition": {
        "weaponSlot": "mainHand",
        "weaponType": "melee",
        "offHandEmpty": true
      }
    }
  ],

  "visualFeedback": {
    "icon": "⚔️",
    "message": null
  }
}
```

### 4. Unified Unlockable Schema

All three types share common fields:

```typescript
interface Unlockable {
  // Identity
  id: string;
  type: 'ability' | 'spell' | 'trait';
  name: string;
  description: string;

  // Unlock Requirements
  tier: 1 | 2 | 3 | 4;
  calling: string | null;        // null = any calling
  specialization: string | null; // null = any spec
  prerequisite?: string;         // ID of required unlockable

  // Execution (abilities/spells only)
  actionType?: 'action' | 'bonusAction' | 'reaction' | 'free' | 'passive';
  usableIn?: ('combat' | 'exploration' | 'dialogue' | 'skillCheck')[];

  // Resource Cost
  resourceCost?: ResourceCost;

  // Targeting (abilities/spells only)
  targeting?: Targeting;

  // Effects
  effects: Effect[];

  // Visual Feedback
  visualFeedback?: VisualFeedback;

  // Spell-specific
  school?: string;
  level?: number;
  castingTime?: string;
  range?: number;
  components?: ('verbal' | 'somatic' | 'material')[];
  duration?: string;
  concentration?: boolean;
  ritual?: boolean;
  upcast?: UpcastRule;

  // Trait-specific
  passive?: boolean;
  permanent?: boolean;
}
```

---

## Class Resources Framework

### Overview
Different callings use different resource types. The framework supports:
- **Spell Slots** (Scholar, Pact, Bond)
- **Ki Points** (Dedication - Ascetic spec)
- **Rage Uses** (Instinct)
- **Superiority Dice** (Dedication - Bladedancer spec)
- **Stamina** (Dedication)
- **Short/Long Rest Uses** (generic abilities)

### Resource Data Model

```json
{
  "resources": {
    "spellSlots": {
      "type": "spellSlot",
      "displayName": "Spell Slots",
      "restoredOn": "longRest",
      "slots": {
        "1": { "max": 2, "current": 2 },
        "2": { "max": 0, "current": 0 }
      }
    },

    "ki": {
      "type": "ki",
      "displayName": "Ki Points",
      "restoredOn": "shortRest",
      "current": 4,
      "max": 4
    },

    "rage": {
      "type": "rage",
      "displayName": "Rage Uses",
      "restoredOn": "longRest",
      "current": 2,
      "max": 2
    },

    "superiorityDice": {
      "type": "superiorityDice",
      "displayName": "Superiority Dice",
      "restoredOn": "shortRest",
      "diceType": "d8",
      "current": 4,
      "max": 4
    }
  }
}
```

### Resource Manager

```javascript
class ResourceManager {
  constructor(character) {
    this.character = character;
    this.resources = character.resources || {};
  }

  // Check if character has enough of a resource
  hasResource(type, amount = 1, level = null) {
    const resource = this.resources[type];
    if (!resource) return false;

    if (type === 'spellSlot') {
      return resource.slots[level]?.current >= amount;
    }

    return resource.current >= amount;
  }

  // Consume resource
  consumeResource(type, amount = 1, level = null) {
    if (!this.hasResource(type, amount, level)) {
      return false;
    }

    const resource = this.resources[type];

    if (type === 'spellSlot') {
      resource.slots[level].current -= amount;
    } else {
      resource.current -= amount;
    }

    gameState.set('character.resources', this.resources);
    return true;
  }

  // Restore resource
  restoreResource(type, amount = null) {
    const resource = this.resources[type];
    if (!resource) return;

    if (type === 'spellSlot') {
      // Restore all spell slots
      Object.keys(resource.slots).forEach(level => {
        resource.slots[level].current = resource.slots[level].max;
      });
    } else {
      // Restore to max or by amount
      resource.current = amount !== null ?
        Math.min(resource.current + amount, resource.max) :
        resource.max;
    }

    gameState.set('character.resources', this.resources);
  }

  // Short rest recovery
  shortRest() {
    Object.values(this.resources).forEach(resource => {
      if (resource.restoredOn === 'shortRest') {
        this.restoreResource(resource.type);
      }
    });
  }

  // Long rest recovery
  longRest() {
    Object.values(this.resources).forEach(resource => {
      if (resource.restoredOn === 'longRest' || resource.restoredOn === 'shortRest') {
        this.restoreResource(resource.type);
      }
    });
  }
}
```

### Resource Scaling by Level

Defined in `data/classResources.json`:

```json
{
  "dedication_ascetic": {
    "ki": {
      "levels": {
        "1": 0,
        "2": 2,
        "3": 3,
        "4": 4,
        "5": 5,
        "6": 6,
        "7": 7,
        "8": 8,
        "9": 9,
        "10": 10
      }
    }
  },

  "scholar_arcanist": {
    "spellSlots": {
      "levels": {
        "1": { "1": 2 },
        "2": { "1": 3 },
        "3": { "1": 4, "2": 2 },
        "4": { "1": 4, "2": 3 },
        "5": { "1": 4, "2": 3, "3": 2 },
        "6": { "1": 4, "2": 3, "3": 3 },
        "7": { "1": 4, "2": 3, "3": 3, "4": 1 },
        "8": { "1": 4, "2": 3, "3": 3, "4": 2 },
        "9": { "1": 4, "2": 3, "3": 3, "4": 3, "5": 1 },
        "10": { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2 }
      }
    }
  }
}
```

---

## Effect System

### Overview
Effects are **modular, reusable actions** that abilities/spells/traits trigger. They integrate with:
- Combat system (damage, healing, conditions)
- Skill system (bonuses, advantage)
- Attribute system (temporary bonuses)
- Conditions system (applying buffs/debuffs)

### Effect Types

```typescript
type EffectType =
  // Combat Effects
  | 'damage'
  | 'heal'
  | 'tempHP'
  | 'applyCondition'
  | 'removeCondition'
  | 'extraAttack'

  // Skill Effects
  | 'skillBonus'
  | 'skillAdvantage'
  | 'skillExpertise'

  // Attribute Effects
  | 'attributeBonus'
  | 'saveBonus'
  | 'acBonus'
  | 'speedBonus'

  // Combat Modifiers
  | 'attackBonus'
  | 'damageBonus'
  | 'critRange'

  // Special Effects
  | 'summonCreature'
  | 'teleport'
  | 'areaOfEffect';
```

### Effect Execution Context

Effects execute differently based on context:

```json
{
  "id": "bless",
  "type": "spell",
  "effects": [
    {
      "type": "applyCondition",
      "conditionType": "blessed",
      "duration": "rounds",
      "roundsRemaining": 10,
      "target": "allies",
      "maxTargets": 3,

      "executionContext": {
        "combat": {
          "message": "{casterName} blesses {targetNames}!",
          "conditionEffect": {
            "attackBonus": "1d4",
            "saveBonus": "1d4"
          }
        },
        "skillCheck": {
          "message": "Your blessing aids you!",
          "bonus": "1d4"
        }
      }
    }
  ]
}
```

### Effect Executor

```javascript
class EffectExecutor {
  constructor() {
    this.handlers = {
      damage: this.executeDamage,
      heal: this.executeHeal,
      applyCondition: this.executeApplyCondition,
      skillBonus: this.executeSkillBonus,
      // ... more handlers
    };
  }

  async executeEffect(effect, context) {
    const handler = this.handlers[effect.type];
    if (!handler) {
      console.warn(`No handler for effect type: ${effect.type}`);
      return null;
    }

    // Get context-specific behavior
    const contextBehavior = effect.executionContext?.[context.type] || {};

    // Execute effect
    return handler.call(this, effect, context, contextBehavior);
  }

  executeDamage(effect, context, behavior) {
    const { target, damageType, formula, autoHit } = effect;
    const targets = this.resolveTargets(target, context);

    targets.forEach(t => {
      const damage = this.rollFormula(formula, context.caster);

      if (autoHit || this.rollAttack(context.caster, t)) {
        t.takeDamage(damage, damageType);

        if (behavior.message) {
          gameState.addMessage(
            this.formatMessage(behavior.message, { caster: context.caster, target: t, damage })
          );
        }
      }
    });
  }

  executeApplyCondition(effect, context, behavior) {
    const { conditionType, duration, roundsRemaining, target } = effect;
    const targets = this.resolveTargets(target, context);

    targets.forEach(t => {
      t.addCondition(conditionType, duration, context.caster.id, {
        roundsRemaining,
        ...behavior.conditionEffect
      });

      if (behavior.message) {
        gameState.addMessage(
          this.formatMessage(behavior.message, { caster: context.caster, target: t })
        );
      }
    });
  }

  executeSkillBonus(effect, context, behavior) {
    // Skill check context
    const { skill, bonus, duration } = effect;

    // Add temporary bonus to skill check
    context.skillRoll.bonus += this.rollFormula(bonus, context.character);

    if (behavior.message) {
      gameState.addMessage(
        this.formatMessage(behavior.message, { skill, bonus })
      );
    }
  }
}
```

---

## Targeting & Usage Contexts

### Targeting Types

```typescript
type TargetingType =
  | 'self'           // Ability affects only the caster
  | 'singleEnemy'    // One enemy in range
  | 'singleAlly'     // One ally in range
  | 'multiTarget'    // Multiple targets (specify count)
  | 'allEnemies'     // All enemies in range/sight
  | 'allAllies'      // All allies in range/sight
  | 'areaOfEffect'   // Area (radius from point)
  | 'cone'           // Cone shape
  | 'line';          // Line shape
```

### Targeting Schema

```json
{
  "targeting": {
    "type": "multiTarget",
    "count": 3,
    "range": 120,
    "allowSameTarget": true,
    "requireLineOfSight": true,
    "excludeCaster": false
  }
}
```

### Usage Contexts

Abilities/spells can be used in different game states:

1. **Combat** - During combat encounters
   - Respects action economy (action, bonus action, reaction)
   - Targets combatants
   - Triggers combat effects (damage, conditions)

2. **Exploration** - On the world map
   - No action economy
   - May have cooldowns or limited uses
   - Can affect terrain, spawn features, etc.

3. **Skill Check** - During skill challenges
   - Grants bonuses to specific skills
   - Provides advantage
   - May auto-succeed certain checks

4. **Dialogue** - During NPC interactions
   - Unlocks dialogue options
   - Affects NPC reactions
   - May provide information or bypass checks

### Context Resolver

```javascript
class UsageContextResolver {
  constructor() {
    this.currentContext = null;
  }

  getCurrentContext() {
    if (gameState.get('combat')?.active) {
      return {
        type: 'combat',
        combatants: gameState.get('combat').combatants,
        currentTurn: gameState.get('combat').currentTurn,
        round: gameState.get('combat').round
      };
    }

    if (gameState.get('activeSkillChallenge')) {
      return {
        type: 'skillCheck',
        challenge: gameState.get('activeSkillChallenge'),
        skill: gameState.get('activeSkillChallenge').skill,
        dc: gameState.get('activeSkillChallenge').dc
      };
    }

    if (gameState.get('activeDialogue')) {
      return {
        type: 'dialogue',
        npc: gameState.get('activeDialogue').npc,
        location: gameState.get('player').location
      };
    }

    return {
      type: 'exploration',
      location: gameState.get('player').location,
      nearbyFeatures: gameState.get('nearbyFeatures')
    };
  }

  canUseAbility(ability, context) {
    // Check if ability is usable in this context
    if (!ability.usableIn.includes(context.type)) {
      return { canUse: false, reason: `Cannot use ${ability.name} during ${context.type}` };
    }

    // Check resource availability
    if (ability.resourceCost) {
      const hasResource = resourceManager.hasResource(
        ability.resourceCost.type,
        ability.resourceCost.amount,
        ability.resourceCost.level
      );

      if (!hasResource) {
        return { canUse: false, reason: `Not enough ${ability.resourceCost.type}` };
      }
    }

    // Check action economy (combat only)
    if (context.type === 'combat') {
      const combatant = context.combatants[context.currentTurn];
      if (!combatant.hasAction(ability.actionType)) {
        return { canUse: false, reason: `No ${ability.actionType} available` };
      }
    }

    return { canUse: true };
  }
}
```

---

## Unlock & Availability System

### Unlock Rules

An unlockable (ability/spell/trait) is **available** to a character if:

1. **Tier Requirement** - Character's tier ≥ unlockable's tier
2. **Calling Match** - unlockable.calling is null OR matches character.class.id
3. **Specialization Match** - unlockable.specialization is null OR matches character.specialization
4. **Prerequisite** - If unlockable.prerequisite exists, character must already have it
5. **Not Already Learned** - Character doesn't already have this unlockable

### Unlockable Manager

```javascript
class UnlockableManager {
  constructor() {
    this.abilities = [];
    this.spells = [];
    this.traits = [];
  }

  async load() {
    const [abilities, spells, traits] = await Promise.all([
      fetch('data/abilities.json').then(r => r.json()),
      fetch('data/spells.json').then(r => r.json()),
      fetch('data/traits.json').then(r => r.json())
    ]);

    this.abilities = abilities;
    this.spells = spells;
    this.traits = traits;
  }

  getAvailableUnlockables(character) {
    const all = [...this.abilities, ...this.spells, ...this.traits];
    const tier = this.calculateTier(character.level);

    return all.filter(unlockable =>
      this.isAvailable(unlockable, character, tier)
    );
  }

  isAvailable(unlockable, character, tier) {
    // Tier check
    if (unlockable.tier > tier) return false;

    // Calling check
    if (unlockable.calling && unlockable.calling !== character.class.id) {
      return false;
    }

    // Specialization check
    if (unlockable.specialization && unlockable.specialization !== character.specialization) {
      return false;
    }

    // Prerequisite check
    if (unlockable.prerequisite && !character.hasUnlockable(unlockable.prerequisite)) {
      return false;
    }

    // Already learned check
    if (character.hasUnlockable(unlockable.id)) {
      return false;
    }

    return true;
  }

  calculateTier(level) {
    if (level <= 3) return 1; // Adventurer
    if (level <= 6) return 2; // Master
    if (level <= 9) return 3; // Legend
    return 4; // Myth
  }

  getUnlockablesForTier(tier, character) {
    return this.getAvailableUnlockables(character)
      .filter(u => u.tier === tier);
  }
}
```

### Level-Up Choice UI

```javascript
class LevelUpUI {
  async showLevelUpChoice(character, newLevel) {
    const tier = unlockableManager.calculateTier(newLevel);
    const available = unlockableManager.getAvailableUnlockables(character);

    // Group by type
    const grouped = {
      abilities: available.filter(u => u.type === 'ability'),
      spells: available.filter(u => u.type === 'spell'),
      traits: available.filter(u => u.type === 'trait')
    };

    // Show modal
    const modal = this.createModal(grouped, tier);
    document.body.appendChild(modal);

    // Wait for choice
    return new Promise(resolve => {
      modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('unlockable-option')) {
          const chosenId = e.target.dataset.unlockableId;
          const chosen = available.find(u => u.id === chosenId);

          modal.remove();
          resolve(chosen);
        }
      });
    });
  }

  createModal(grouped, tier) {
    const modal = document.createElement('div');
    modal.className = 'level-up-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Level Up! Choose an Unlockable (Tier ${tier})</h2>

        <div class="unlockable-tabs">
          <button class="tab active" data-tab="abilities">Abilities (${grouped.abilities.length})</button>
          <button class="tab" data-tab="spells">Spells (${grouped.spells.length})</button>
          <button class="tab" data-tab="traits">Traits (${grouped.traits.length})</button>
        </div>

        <div class="unlockable-sections">
          <div class="section active" data-section="abilities">
            ${this.renderUnlockableList(grouped.abilities)}
          </div>
          <div class="section" data-section="spells">
            ${this.renderUnlockableList(grouped.spells)}
          </div>
          <div class="section" data-section="traits">
            ${this.renderUnlockableList(grouped.traits)}
          </div>
        </div>
      </div>
    `;

    // Tab switching
    modal.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        modal.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        modal.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

        tab.classList.add('active');
        modal.querySelector(`[data-section="${tab.dataset.tab}"]`).classList.add('active');
      });
    });

    return modal;
  }

  renderUnlockableList(unlockables) {
    if (unlockables.length === 0) {
      return '<p class="no-options">No options available at this tier</p>';
    }

    return unlockables.map(u => `
      <div class="unlockable-option" data-unlockable-id="${u.id}">
        <div class="unlockable-header">
          <span class="icon">${u.visualFeedback?.icon || '⚡'}</span>
          <h3>${u.name}</h3>
          <span class="tier-badge">Tier ${u.tier}</span>
        </div>
        <p class="description">${u.description}</p>
        ${this.renderUnlockableDetails(u)}
      </div>
    `).join('');
  }

  renderUnlockableDetails(unlockable) {
    const details = [];

    if (unlockable.actionType) {
      details.push(`<span class="detail">Action: ${unlockable.actionType}</span>`);
    }

    if (unlockable.resourceCost) {
      details.push(`<span class="detail">Cost: ${unlockable.resourceCost.amount} ${unlockable.resourceCost.type}</span>`);
    }

    if (unlockable.range) {
      details.push(`<span class="detail">Range: ${unlockable.range} ft</span>`);
    }

    return `<div class="unlockable-details">${details.join(' • ')}</div>`;
  }
}
```

---

## Integration Points

### 1. Character.js Integration

Add to Character class:

```javascript
class Character {
  constructor(data) {
    // ... existing properties

    // NEW: Specialization
    this.specialization = data.specialization || null;

    // NEW: Unlockables
    this.learnedAbilities = data.learnedAbilities || [];
    this.learnedSpells = data.learnedSpells || [];
    this.learnedTraits = data.learnedTraits || [];

    // NEW: Resources
    this.resources = data.resources || this.initializeResources();

    // NEW: Attribute point pool (unspent)
    this.unspentAttributePoints = data.unspentAttributePoints || 0;
  }

  initializeResources() {
    // Load class-specific resources from classResources.json
    const callingId = this.class.id;
    const spec = this.specialization || 'base';
    const key = `${callingId}_${spec}`;

    const resourceDef = RULES.classResources[key];
    return resourceManager.initializeFromDefinition(resourceDef, this.level);
  }

  learnUnlockable(unlockableId) {
    const unlockable = unlockableManager.getById(unlockableId);

    if (!unlockable) {
      console.error(`Unknown unlockable: ${unlockableId}`);
      return false;
    }

    const list = {
      ability: this.learnedAbilities,
      spell: this.learnedSpells,
      trait: this.learnedTraits
    }[unlockable.type];

    if (list.includes(unlockableId)) {
      console.warn(`Already learned: ${unlockableId}`);
      return false;
    }

    list.push(unlockableId);

    // Apply passive effects immediately (traits)
    if (unlockable.type === 'trait' && unlockable.passive) {
      this.applyTraitEffects(unlockable);
    }

    gameState.set('character', this);
    return true;
  }

  hasUnlockable(unlockableId) {
    return this.learnedAbilities.includes(unlockableId) ||
           this.learnedSpells.includes(unlockableId) ||
           this.learnedTraits.includes(unlockableId);
  }

  getLearnedUnlockables() {
    return [
      ...this.learnedAbilities.map(id => unlockableManager.getById(id)),
      ...this.learnedSpells.map(id => unlockableManager.getById(id)),
      ...this.learnedTraits.map(id => unlockableManager.getById(id))
    ].filter(Boolean);
  }
}
```

### 2. Level-Up Integration

Modify `Character.levelUp()`:

```javascript
async levelUp(newLevel) {
  // Existing: HP increase
  const hpIncrease = Math.floor(this.class.hitDie) + this.abilityModifiers.con;
  this.maxHP += Math.max(1, hpIncrease);
  this.currentHP += hpIncrease;

  // Existing: Hit dice
  this.hitDice.current = newLevel;
  this.hitDice.max = newLevel;

  // Existing: Proficiency bonus
  this.proficiencyBonus = RULES.proficiencyByLevel[newLevel];

  // Existing: Update level
  this.level = newLevel;

  // NEW: Grant attribute point
  this.unspentAttributePoints += 1;

  // NEW: Update resources for new level
  this.resources = this.initializeResources();

  // NEW: Check for specialization choice (level 4)
  if (newLevel === 4 && !this.specialization) {
    const chosen = await specializationManager.showSpecializationChoice(this);
    this.specialization = chosen.id;

    // Grant automatic specialization abilities
    const autoGrants = chosen.specialAbilities.filter(
      a => a.level === 4 && a.grantedAutomatically
    );
    autoGrants.forEach(grant => this.learnUnlockable(grant.abilityId));
  }

  // NEW: Check for automatic specialization abilities
  if (this.specialization) {
    const spec = specializationManager.getById(this.specialization);
    const autoGrants = spec.specialAbilities.filter(
      a => a.level === newLevel && a.grantedAutomatically
    );
    autoGrants.forEach(grant => this.learnUnlockable(grant.abilityId));
  }

  // NEW: Show unlockable choice UI
  const tier = unlockableManager.calculateTier(newLevel);
  const chosen = await levelUpUI.showLevelUpChoice(this, newLevel);
  this.learnUnlockable(chosen.id);

  // NEW: Show attribute point allocation UI
  await attributeAllocationUI.show(this);

  // Existing: Recalculate stats
  this.recalculateStats();

  gameState.addMessage(`🎉 Level Up! You are now level ${newLevel}!`, 'level-up');
  gameState.set('character', this);
}
```

### 3. Combat Integration

Add to CombatManager:

```javascript
class CombatManager {
  renderActionButtons(combatant) {
    if (!combatant.isPlayer) return '';

    const abilities = combatant.character.learnedAbilities
      .map(id => unlockableManager.getById(id))
      .filter(a => a.usableIn.includes('combat'));

    const spells = combatant.character.learnedSpells
      .map(id => unlockableManager.getById(id))
      .filter(s => s.usableIn.includes('combat'));

    let html = `
      <button onclick="game.combat.attack()">Attack</button>
      <button onclick="game.combat.endTurn()">End Turn</button>
    `;

    // Add ability buttons
    abilities.forEach(ability => {
      const canUse = usageContextResolver.canUseAbility(
        ability,
        usageContextResolver.getCurrentContext()
      );

      html += `
        <button
          onclick="game.combat.useAbility('${ability.id}')"
          ${!canUse.canUse ? 'disabled title="' + canUse.reason + '"' : ''}
        >
          ${ability.visualFeedback?.icon || '⚡'} ${ability.name}
        </button>
      `;
    });

    // Add spell buttons
    spells.forEach(spell => {
      const canUse = usageContextResolver.canUseAbility(
        spell,
        usageContextResolver.getCurrentContext()
      );

      html += `
        <button
          onclick="game.combat.castSpell('${spell.id}')"
          ${!canUse.canUse ? 'disabled title="' + canUse.reason + '"' : ''}
        >
          ${spell.visualFeedback?.icon || '✨'} ${spell.name}
        </button>
      `;
    });

    return html;
  }

  async useAbility(abilityId) {
    const ability = unlockableManager.getById(abilityId);
    const combatant = this.getCurrentCombatant();
    const context = usageContextResolver.getCurrentContext();

    // Check availability
    const canUse = usageContextResolver.canUseAbility(ability, context);
    if (!canUse.canUse) {
      gameState.addMessage(canUse.reason, 'error');
      return;
    }

    // Get targets
    const targets = await this.selectTargets(ability.targeting, combatant);
    if (!targets) return; // User cancelled

    // Consume resources
    if (ability.resourceCost) {
      resourceManager.consumeResource(
        ability.resourceCost.type,
        ability.resourceCost.amount,
        ability.resourceCost.level
      );
    }

    // Consume action
    combatant.consumeAction(ability.actionType);

    // Execute effects
    for (const effect of ability.effects) {
      await effectExecutor.executeEffect(effect, {
        ...context,
        caster: combatant,
        targets
      });
    }

    // Visual feedback
    if (ability.visualFeedback?.message) {
      gameState.addMessage(
        this.formatMessage(ability.visualFeedback.message, {
          casterName: combatant.name,
          targetNames: targets.map(t => t.name).join(', ')
        }),
        'ability'
      );
    }

    this.renderCombat();
  }
}
```

### 4. Skill Check Integration

Add to skill check system:

```javascript
class SkillCheckManager {
  async performSkillCheck(skill, dc) {
    const character = gameState.get('character');
    const context = {
      type: 'skillCheck',
      skill,
      dc,
      character
    };

    // Base roll
    let roll = this.rollD20();
    let bonus = character.skills[skill].bonus;

    // Check for active trait bonuses
    const relevantTraits = character.learnedTraits
      .map(id => unlockableManager.getById(id))
      .filter(t => this.traitAffectsSkillCheck(t, skill));

    relevantTraits.forEach(trait => {
      trait.effects.forEach(effect => {
        if (effect.type === 'skillBonus') {
          bonus += this.evaluateFormula(effect.amount);
        }
      });
    });

    // Check for usable abilities that grant bonuses
    const usableAbilities = character.learnedAbilities
      .map(id => unlockableManager.getById(id))
      .filter(a => a.usableIn.includes('skillCheck'));

    // Offer to use abilities
    const useAbility = await this.promptAbilityUse(usableAbilities, skill);
    if (useAbility) {
      // Execute ability effects
      for (const effect of useAbility.effects) {
        await effectExecutor.executeEffect(effect, {
          ...context,
          skillRoll: { roll, bonus }
        });
      }
    }

    const total = roll + bonus;
    const success = total >= dc;

    return { roll, bonus, total, success };
  }
}
```

---

## File Structure

```
nexus-verge-crpg/
├── data/
│   ├── abilities.json          # All ability definitions
│   ├── spells.json             # All spell definitions
│   ├── traits.json             # All trait/passive definitions
│   ├── specializations.json    # Specialization definitions for each calling
│   ├── classResources.json     # Resource scaling per calling/spec
│   └── unlockableProgression.json  # Tier unlock tables (optional)
│
├── src/
│   ├── systems/
│   │   ├── UnlockableManager.js      # Manages abilities/spells/traits
│   │   ├── ResourceManager.js        # Manages class resources
│   │   ├── SpecializationManager.js  # Handles specialization choice
│   │   ├── EffectExecutor.js         # Executes effects in any context
│   │   ├── UsageContextResolver.js   # Determines current context
│   │   └── Character.js              # (MODIFY) Add unlockable support
│   │
│   ├── ui/
│   │   ├── LevelUpUI.js              # Level-up choice modal
│   │   ├── SpecializationChoiceUI.js # Specialization selection modal
│   │   ├── AttributeAllocationUI.js  # Attribute point spending
│   │   └── AbilityBarUI.js           # Combat/exploration ability bar
│   │
│   └── main.js                  # (MODIFY) Initialize new systems
│
└── docs/
    └── ABILITIES_FRAMEWORK.md   # This document
```

---

## Implementation Roadmap

### Phase 1: Core Data Models (Week 1)
**Goal:** Define all data structures, no code yet

✅ **Tasks:**
1. Create `data/abilities.json` with schema (0 entries, just structure)
2. Create `data/spells.json` with schema (0 entries)
3. Create `data/traits.json` with schema (0 entries)
4. Create `data/specializations.json` with all 7 callings' specializations defined
5. Create `data/classResources.json` with resource scaling tables
6. Document data schemas in this file

✅ **Deliverables:**
- 5 JSON files with complete schemas
- 0 content entries (framework only)
- Updated ABILITIES_FRAMEWORK.md with examples

---

### Phase 2: Resource Management (Week 2)
**Goal:** Implement class resources system

✅ **Tasks:**
1. Create `ResourceManager.js`
   - Load classResources.json
   - hasResource(), consumeResource(), restoreResource()
   - shortRest(), longRest()
2. Modify `Character.js`
   - Add resources property
   - initializeResources() on character creation
   - Update resources on level up
3. Integrate with rest system
   - Call resourceManager.shortRest() on short rest
   - Call resourceManager.longRest() on long rest
4. Add resource display to character sheet UI
5. Test with mock spell slots, ki points, rage

✅ **Acceptance Criteria:**
- Character sheet shows spell slots, ki, rage, etc.
- Resources consume on use (manual test)
- Resources restore on rest
- Scaling works correctly per level

---

### Phase 3: Unlockable Manager (Week 3)
**Goal:** Load and filter abilities/spells/traits

✅ **Tasks:**
1. Create `UnlockableManager.js`
   - load() all JSON files
   - getAvailableUnlockables(character)
   - isAvailable() with tier/calling/spec checks
   - calculateTier(level)
2. Create `SpecializationManager.js`
   - getSpecializationsFor(calling)
   - showSpecializationChoice(character)
   - applySpecialization(character, specId)
3. Modify `Character.js`
   - Add specialization, learnedAbilities, learnedSpells, learnedTraits
   - learnUnlockable(id)
   - hasUnlockable(id)
   - getLearnedUnlockables()
4. Test filtering logic
   - Tier filtering works
   - Calling filtering works
   - Specialization filtering works

✅ **Acceptance Criteria:**
- getAvailableUnlockables() returns correct filtered list
- Specialization choice forces at level 4
- Character can learn and track unlockables

---

### Phase 4: Level-Up UI (Week 4)
**Goal:** Show unlockable choice on level up

✅ **Tasks:**
1. Create `LevelUpUI.js`
   - showLevelUpChoice(character, newLevel)
   - createModal() with tabs (abilities/spells/traits)
   - renderUnlockableList()
   - Return chosen unlockable
2. Create `AttributeAllocationUI.js`
   - show(character) with +/- buttons for each attribute
   - Validate only 1 point spent
   - Apply to character
3. Create `SpecializationChoiceUI.js`
   - showSpecializationChoice(calling)
   - Render specialization cards with descriptions
   - Return chosen specialization
4. Modify `Character.levelUp()`
   - Grant attribute point
   - Check for specialization choice (level 4)
   - Show unlockable choice UI
   - Show attribute allocation UI
   - Apply choices
5. Add CSS styling for modals

✅ **Acceptance Criteria:**
- Level up shows modal with available unlockables
- Player can choose 1 ability/spell/trait
- Player can allocate 1 attribute point
- Choices persist in character object
- Specialization forced at level 4

---

### Phase 5: Effect Executor (Week 5)
**Goal:** Execute effects in any context

✅ **Tasks:**
1. Create `EffectExecutor.js`
   - executeEffect(effect, context)
   - Handlers for each effect type:
     - damage, heal, tempHP
     - applyCondition, removeCondition
     - skillBonus, attackBonus, damageBonus
     - attributeBonus, acBonus, saveBonus
2. Create `UsageContextResolver.js`
   - getCurrentContext() (combat/skillCheck/exploration/dialogue)
   - canUseAbility(ability, context)
   - resolveTargets(targeting, context)
3. Integrate with CombatManager
   - Add ability/spell buttons to combat UI
   - useAbility(abilityId)
   - castSpell(spellId)
   - Execute effects via EffectExecutor
4. Integrate with SkillCheckManager
   - Check for trait bonuses before roll
   - Offer to use abilities that grant skill bonuses
   - Execute effects and apply to roll
5. Test effect execution
   - Damage effect works in combat
   - Heal effect works
   - Skill bonus works in skill checks
   - Conditions apply correctly

✅ **Acceptance Criteria:**
- Abilities execute in combat
- Effects integrate with existing combat system
- Skills bonuses apply to skill checks
- No spaghetti code - modular, event-driven

---

### Phase 6: Trait System (Week 6)
**Goal:** Passive effects always active

✅ **Tasks:**
1. Implement passive trait application
   - Character.applyTraitEffects(trait)
   - Apply permanent bonuses (AC, damage, etc.)
   - Store active trait effects
2. Integrate with combat calculations
   - Check trait effects in attack rolls
   - Check trait effects in damage rolls
   - Check trait effects in AC calculation
3. Integrate with skill calculations
   - Check trait effects in skill rolls
   - Check trait effects for advantage
4. Add trait effects to character sheet
   - Show active traits
   - Show bonuses from traits
5. Test passive effects
   - Fighting Style: Dueling adds +2 damage
   - Alert adds +5 initiative
   - Unarmored Defense calculates AC correctly

✅ **Acceptance Criteria:**
- Traits apply automatically when learned
- Passive bonuses always active
- Traits visible on character sheet
- Calculations include trait bonuses

---

### Phase 7: Polish & Testing (Week 7)
**Goal:** Complete integration and testing

✅ **Tasks:**
1. Full integration test
   - Create character, level to 10
   - Choose specialization at level 4
   - Learn abilities/spells/traits at each level
   - Use abilities in combat
   - Use abilities in skill checks
   - Verify resources consume and restore
2. UI polish
   - Improve modal styling
   - Add animations
   - Add tooltips
   - Improve visual feedback
3. Documentation
   - Update CLAUDE.md
   - Document how to add new abilities/spells/traits
   - Create content creation guide
4. Bug fixes
   - Fix any edge cases
   - Handle error states
   - Validate all data

✅ **Acceptance Criteria:**
- Full level 1-10 progression works
- All systems integrated
- No critical bugs
- Framework ready for content creation

---

## Summary

This framework provides:

✅ **Tier-based leveling** (1-3 Adventurer, 4-6 Master, 7-9 Legend, 10 Myth)
✅ **Specializations** at level 4 for all 7 callings
✅ **Unified system** for abilities, spells, and traits
✅ **Class resources** (spell slots, ki, rage, superiority dice, etc.)
✅ **Effect system** that works in combat, skills, dialogue, exploration
✅ **Data-driven architecture** - all content in JSON
✅ **Anti-spaghetti** - modular, event-driven, extensible
✅ **Integration ready** - works with existing combat, skills, conditions

**Next Step:** Begin Phase 1 (Core Data Models) when user approves this framework.

---

**End of Framework Design**
