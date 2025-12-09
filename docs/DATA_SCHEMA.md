# Data Schema Documentation
# Nexus Verge - D&D 5e Roguelike CRPG

**Version:** 1.0
**Last Updated:** 2025-12-09

This document defines the structure of all JSON data files used in the game.

---

## Table of Contents
1. [Classes](#classes)
2. [Races](#races)
3. [Spells](#spells)
4. [Items](#items)
5. [Monsters](#monsters)
6. [Skills](#skills)
7. [Feats](#feats)
8. [Backgrounds](#backgrounds)
9. [Terrains](#terrains)
10. [Factions](#factions)
11. [Quests](#quests)
12. [Campaigns](#campaigns)
13. [Names](#names)
14. [Save Game State](#save-game-state)

---

## Classes
**File:** `data/classes.json`

### Schema
```json
{
  "classes": [
    {
      "id": "fighter",
      "name": "Fighter",
      "description": "A master of martial combat, skilled with a variety of weapons and armor.",
      "hitDie": 10,
      "primaryAbility": ["str", "dex"],
      "savingThrowProficiencies": ["str", "con"],
      "armorProficiencies": ["light", "medium", "heavy", "shields"],
      "weaponProficiencies": ["simple", "martial"],
      "toolProficiencies": [],
      "skillChoices": {
        "choose": 2,
        "from": ["acrobatics", "animalHandling", "athletics", "history", "insight", "intimidation", "perception", "survival"]
      },
      "startingEquipment": {
        "choices": [
          {
            "choose": 1,
            "from": [
              ["chainMail"],
              ["leatherArmor", "longbow", "arrow:20"]
            ]
          },
          {
            "choose": 1,
            "from": [
              ["martialWeapon", "shield"],
              ["martialWeapon", "martialWeapon"]
            ]
          },
          {
            "choose": 1,
            "from": [
              ["lightCrossbow", "bolt:20"],
              ["handaxe:2"]
            ]
          },
          {
            "fixed": ["dungeoneersPack"]
          }
        ]
      },
      "spellcaster": false,
      "features": {
        "1": [
          {
            "name": "Fighting Style",
            "description": "You adopt a particular style of fighting as your specialty.",
            "choices": ["archery", "defense", "dueling", "greatWeaponFighting", "protection", "twoWeaponFighting"]
          },
          {
            "name": "Second Wind",
            "description": "You have a limited well of stamina that you can draw on to protect yourself from harm. On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level. Once you use this feature, you must finish a short or long rest before you can use it again.",
            "type": "bonusAction",
            "uses": 1,
            "recharge": "shortRest"
          }
        ],
        "2": [
          {
            "name": "Action Surge",
            "description": "You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action. Once you use this feature, you must finish a short or long rest before you can use it again.",
            "uses": 1,
            "recharge": "shortRest"
          }
        ],
        "3": [
          {
            "name": "Martial Archetype",
            "description": "Choose a martial archetype: Champion, Battle Master, or Eldritch Knight.",
            "subclassLevel": true
          }
        ]
      }
    }
  ]
}
```

### Field Descriptions
- **id:** Unique identifier (lowercase, no spaces)
- **name:** Display name
- **description:** Flavor text
- **hitDie:** Hit die size (d6, d8, d10, d12)
- **primaryAbility:** Recommended ability scores (array)
- **savingThrowProficiencies:** Proficient saving throws
- **armorProficiencies:** Armor types character can wear
- **weaponProficiencies:** Weapon types character can use
- **skillChoices:** Skills to choose from at character creation
- **startingEquipment:** Equipment choices/defaults
- **spellcaster:** Boolean, if class can cast spells
- **features:** Object keyed by level, containing feature arrays

---

## Races
**File:** `data/races.json`

### Schema
```json
{
  "races": [
    {
      "id": "human",
      "name": "Human",
      "description": "Humans are the most adaptable and ambitious people among the common races.",
      "abilityScoreIncrease": {
        "str": 1,
        "dex": 1,
        "con": 1,
        "int": 1,
        "wis": 1,
        "cha": 1
      },
      "size": "medium",
      "speed": 30,
      "languages": ["common", "choice:1"],
      "traits": [
        {
          "name": "Versatile",
          "description": "Humans gain +1 to all ability scores."
        }
      ],
      "subraces": []
    },
    {
      "id": "elf",
      "name": "Elf",
      "description": "Elves are a magical people of otherworldly grace.",
      "abilityScoreIncrease": {
        "dex": 2
      },
      "size": "medium",
      "speed": 30,
      "languages": ["common", "elvish"],
      "traits": [
        {
          "name": "Darkvision",
          "description": "You can see in dim light within 60 feet as if it were bright light."
        },
        {
          "name": "Keen Senses",
          "description": "You have proficiency in the Perception skill."
        },
        {
          "name": "Fey Ancestry",
          "description": "You have advantage on saving throws against being charmed, and magic can't put you to sleep."
        },
        {
          "name": "Trance",
          "description": "Elves don't need to sleep. Instead, they meditate deeply for 4 hours a day."
        }
      ],
      "subraces": [
        {
          "id": "highElf",
          "name": "High Elf",
          "abilityScoreIncrease": {
            "int": 1
          },
          "traits": [
            {
              "name": "Cantrip",
              "description": "You know one cantrip of your choice from the wizard spell list."
            }
          ]
        }
      ]
    },
    {
      "id": "dwarf",
      "name": "Dwarf",
      "description": "Bold and hardy, dwarves are known as skilled warriors and craftspeople.",
      "abilityScoreIncrease": {
        "con": 2
      },
      "size": "medium",
      "speed": 25,
      "languages": ["common", "dwarvish"],
      "traits": [
        {
          "name": "Darkvision",
          "description": "You can see in dim light within 60 feet as if it were bright light."
        },
        {
          "name": "Dwarven Resilience",
          "description": "You have advantage on saving throws against poison, and you have resistance against poison damage."
        },
        {
          "name": "Stonecunning",
          "description": "Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient and add double your proficiency bonus."
        }
      ]
    }
  ]
}
```

---

## Spells
**File:** `data/spells.json`

### Schema
```json
{
  "spells": [
    {
      "id": "fireBolt",
      "name": "Fire Bolt",
      "level": 0,
      "school": "evocation",
      "castingTime": "1 action",
      "range": 120,
      "components": ["V", "S"],
      "duration": "instantaneous",
      "classes": ["wizard", "sorcerer"],
      "description": "You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage.",
      "higherLevels": "This spell's damage increases by 1d10 when you reach 5th level (2d10), 11th level (3d10), and 17th level (4d10).",
      "damageType": "fire",
      "damageDice": "1d10",
      "attackType": "ranged",
      "savingThrow": null,
      "areaOfEffect": null,
      "scaling": {
        "5": "2d10",
        "11": "3d10",
        "17": "4d10"
      }
    },
    {
      "id": "cureWounds",
      "name": "Cure Wounds",
      "level": 1,
      "school": "evocation",
      "castingTime": "1 action",
      "range": "touch",
      "components": ["V", "S"],
      "duration": "instantaneous",
      "classes": ["cleric", "bard", "druid", "paladin", "ranger"],
      "description": "A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier.",
      "higherLevels": "When you cast this spell using a spell slot of 2nd level or higher, the healing increases by 1d8 for each slot level above 1st.",
      "healingDice": "1d8",
      "healingModifier": "spellcastingAbility",
      "attackType": null,
      "savingThrow": null,
      "upcastBonus": "1d8"
    },
    {
      "id": "holdPerson",
      "name": "Hold Person",
      "level": 2,
      "school": "enchantment",
      "castingTime": "1 action",
      "range": 60,
      "components": ["V", "S", "M"],
      "materialComponent": "a small, straight piece of iron",
      "duration": "concentration, up to 1 minute",
      "classes": ["bard", "cleric", "druid", "sorcerer", "warlock", "wizard"],
      "description": "Choose a humanoid that you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration. At the end of each of its turns, the target can make another Wisdom saving throw. On a success, the spell ends on the target.",
      "higherLevels": "When you cast this spell using a spell slot of 3rd level or higher, you can target one additional humanoid for each slot level above 2nd.",
      "savingThrow": "wis",
      "condition": "paralyzed",
      "concentration": true
    }
  ]
}
```

---

## Items
**File:** `data/items.json`

### Schema
```json
{
  "weapons": [
    {
      "id": "longsword",
      "name": "Longsword",
      "type": "weapon",
      "category": "martial",
      "weaponType": "melee",
      "damage": "1d8",
      "damageType": "slashing",
      "properties": ["versatile"],
      "versatileDamage": "1d10",
      "weight": 3,
      "cost": 15,
      "description": "A sword with a long blade, effective in one or two hands.",
      "equipSlots": ["mainHand", "offHand"],
      "twoHanded": false,
      "range": null,
      "rarity": "common",
      "reputationRequirement": 0
    },
    {
      "id": "longbow",
      "name": "Longbow",
      "type": "weapon",
      "category": "martial",
      "weaponType": "ranged",
      "damage": "1d8",
      "damageType": "piercing",
      "properties": ["ammunition", "heavy", "twoHanded"],
      "weight": 2,
      "cost": 50,
      "description": "A tall bow that fires arrows with great force.",
      "equipSlots": ["mainHand"],
      "twoHanded": true,
      "range": {
        "normal": 150,
        "long": 600
      },
      "ammunition": "arrow",
      "rarity": "common",
      "reputationRequirement": 0
    }
  ],
  "armor": [
    {
      "id": "leatherArmor",
      "name": "Leather Armor",
      "type": "armor",
      "armorClass": 11,
      "addDexModifier": true,
      "maxDexBonus": null,
      "armorType": "light",
      "strengthRequirement": null,
      "stealthDisadvantage": false,
      "weight": 10,
      "cost": 10,
      "description": "Boiled leather provides some protection without restricting movement.",
      "equipSlot": "armor",
      "rarity": "common",
      "reputationRequirement": 0
    },
    {
      "id": "chainMail",
      "name": "Chain Mail",
      "type": "armor",
      "armorClass": 16,
      "addDexModifier": false,
      "maxDexBonus": 0,
      "armorType": "heavy",
      "strengthRequirement": 13,
      "stealthDisadvantage": true,
      "weight": 55,
      "cost": 75,
      "description": "Made of interlocking metal rings, chain mail is heavy but protective.",
      "equipSlot": "armor",
      "rarity": "common",
      "reputationRequirement": 20
    }
  ],
  "shields": [
    {
      "id": "shield",
      "name": "Shield",
      "type": "shield",
      "armorClassBonus": 2,
      "weight": 6,
      "cost": 10,
      "description": "A shield grants +2 to AC.",
      "equipSlot": "offHand",
      "rarity": "common",
      "reputationRequirement": 0
    }
  ],
  "consumables": [
    {
      "id": "potionOfHealing",
      "name": "Potion of Healing",
      "type": "consumable",
      "effect": "heal",
      "healAmount": "2d4+2",
      "weight": 0.5,
      "cost": 50,
      "description": "A character who drinks this potion regains 2d4 + 2 hit points.",
      "rarity": "common",
      "reputationRequirement": 10,
      "consumable": true
    }
  ],
  "artifacts": [
    {
      "id": "ringOfProtection",
      "name": "Ring of Protection",
      "type": "artifact",
      "effect": {
        "acBonus": 1,
        "savingThrowBonus": 1
      },
      "weight": 0,
      "description": "You gain a +1 bonus to AC and saving throws while wearing this ring.",
      "equipSlot": "artifact",
      "rarity": "rare",
      "reputationRequirement": 60,
      "attunement": true
    }
  ]
}
```

---

## Monsters
**File:** `data/monsters.json`

### Schema
```json
{
  "monsters": [
    {
      "id": "goblin",
      "name": "Goblin",
      "size": "small",
      "type": "humanoid",
      "alignment": "neutral evil",
      "challengeRating": 0.25,
      "xpValue": 50,
      "armorClass": 15,
      "hitPoints": "2d6",
      "speed": 30,
      "abilities": {
        "str": 8,
        "dex": 14,
        "con": 10,
        "int": 10,
        "wis": 8,
        "cha": 8
      },
      "skills": {
        "stealth": 6
      },
      "senses": "darkvision 60 ft.",
      "languages": ["common", "goblin"],
      "traits": [
        {
          "name": "Nimble Escape",
          "description": "The goblin can take the Disengage or Hide action as a bonus action on each of its turns."
        }
      ],
      "actions": [
        {
          "name": "Scimitar",
          "type": "meleeWeaponAttack",
          "attackBonus": 4,
          "reach": 5,
          "damage": "1d6+2",
          "damageType": "slashing"
        },
        {
          "name": "Shortbow",
          "type": "rangedWeaponAttack",
          "attackBonus": 4,
          "range": {
            "normal": 80,
            "long": 320
          },
          "damage": "1d6+2",
          "damageType": "piercing"
        }
      ],
      "lootTable": {
        "dropChance": 0.4,
        "items": [
          {"id": "scimitar", "chance": 0.3},
          {"id": "shortbow", "chance": 0.2},
          {"id": "arrow", "count": "1d10", "chance": 0.3},
          {"id": "gold", "count": "1d4", "chance": 0.2}
        ]
      }
    },
    {
      "id": "youngRedDragon",
      "name": "Young Red Dragon",
      "size": "large",
      "type": "dragon",
      "alignment": "chaotic evil",
      "challengeRating": 10,
      "xpValue": 5900,
      "armorClass": 18,
      "hitPoints": "17d10+85",
      "speed": 40,
      "fly": 80,
      "abilities": {
        "str": 23,
        "dex": 10,
        "con": 21,
        "int": 14,
        "wis": 11,
        "cha": 19
      },
      "savingThrows": {
        "dex": 4,
        "con": 9,
        "wis": 4,
        "cha": 8
      },
      "skills": {
        "perception": 8,
        "stealth": 4
      },
      "damageImmunities": ["fire"],
      "senses": "blindsight 30 ft., darkvision 120 ft.",
      "languages": ["common", "draconic"],
      "actions": [
        {
          "name": "Multiattack",
          "description": "The dragon makes three attacks: one with its bite and two with its claws."
        },
        {
          "name": "Bite",
          "type": "meleeWeaponAttack",
          "attackBonus": 10,
          "reach": 10,
          "damage": "2d10+6",
          "damageType": "piercing",
          "additionalDamage": "1d6",
          "additionalDamageType": "fire"
        },
        {
          "name": "Fire Breath",
          "recharge": "5-6",
          "description": "The dragon exhales fire in a 30-foot cone. Each creature in that area must make a DC 17 Dexterity saving throw, taking 56 (16d6) fire damage on a failed save, or half as much damage on a successful one.",
          "savingThrow": "dex",
          "dc": 17,
          "damage": "16d6",
          "damageType": "fire",
          "areaOfEffect": {
            "type": "cone",
            "size": 30
          }
        }
      ]
    }
  ]
}
```

---

## Skills
**File:** `data/skills.json`

### Schema
```json
{
  "skills": [
    {
      "id": "acrobatics",
      "name": "Acrobatics",
      "ability": "dex",
      "description": "Your Dexterity (Acrobatics) check covers your attempt to stay on your feet in a tricky situation, such as when you're trying to run across a sheet of ice, balance on a tightrope, or stay upright on a rocking ship's deck."
    },
    {
      "id": "athletics",
      "name": "Athletics",
      "ability": "str",
      "description": "Your Strength (Athletics) check covers difficult situations you encounter while climbing, jumping, or swimming."
    },
    {
      "id": "perception",
      "name": "Perception",
      "ability": "wis",
      "description": "Your Wisdom (Perception) check lets you spot, hear, or otherwise detect the presence of something. It measures your general awareness of your surroundings and the keenness of your senses."
    }
  ]
}
```

---

## Backgrounds
**File:** `data/backgrounds.json`

### Schema
```json
{
  "backgrounds": [
    {
      "id": "soldier",
      "name": "Soldier",
      "description": "You have served in a military organization, learning discipline and martial skills.",
      "skillProficiencies": ["athletics", "intimidation"],
      "toolProficiencies": ["gamingSet", "vehiclesLand"],
      "languages": 0,
      "equipment": [
        "insigniaOfRank",
        "trophy",
        "gamingSet",
        "commonClothes",
        "gold:10"
      ],
      "feature": {
        "name": "Military Rank",
        "description": "You have a military rank from your career as a soldier. Soldiers loyal to your former military organization still recognize your authority and influence."
      },
      "personalityTraits": [
        "I'm always polite and respectful.",
        "I face problems head-on."
      ],
      "ideals": [
        "Responsibility. I do what I must and obey.",
        "Might. The strongest are meant to rule."
      ],
      "bonds": [
        "I would still lay down my life for the people I served with.",
        "My honor is my life."
      ],
      "flaws": [
        "I have trouble trusting in my allies.",
        "I obey the law, even if the law causes misery."
      ]
    }
  ]
}
```

---

## Terrains
**File:** `data/terrains.json`

### Schema
```json
{
  "terrains": [
    {
      "id": "grassland",
      "name": "Grassland",
      "symbol": ".",
      "color": "#7ec850",
      "traversable": true,
      "movementCost": 1,
      "description": "Open fields of grass sway gently in the breeze.",
      "encounterModifier": 1.0,
      "coverType": null,
      "difficultTerrain": false
    },
    {
      "id": "forest",
      "name": "Forest",
      "symbol": "T",
      "color": "#2d5016",
      "traversable": true,
      "movementCost": 1.5,
      "description": "Dense trees provide shade and cover.",
      "encounterModifier": 1.3,
      "coverType": "half",
      "difficultTerrain": true
    },
    {
      "id": "mountain",
      "name": "Mountain",
      "symbol": "^",
      "color": "#8b7355",
      "traversable": true,
      "movementCost": 2,
      "description": "Rocky peaks reach toward the sky.",
      "encounterModifier": 0.7,
      "coverType": "threeQuarters",
      "difficultTerrain": true
    },
    {
      "id": "water",
      "name": "Water",
      "symbol": "~",
      "color": "#4a9eff",
      "traversable": false,
      "movementCost": null,
      "description": "Deep water blocks your path.",
      "encounterModifier": 0,
      "coverType": null,
      "difficultTerrain": false
    },
    {
      "id": "road",
      "name": "Road",
      "symbol": "=",
      "color": "#b8a589",
      "traversable": true,
      "movementCost": 0.8,
      "description": "A well-worn path connects settlements.",
      "encounterModifier": 0.5,
      "coverType": null,
      "difficultTerrain": false
    }
  ]
}
```

---

## Factions
**File:** `data/factions.json`

### Schema
```json
{
  "factionTypes": [
    {
      "id": "cityState",
      "name": "City-State",
      "namePattern": "{settlement} Council",
      "description": "The governing body of {settlement}.",
      "baseRelationships": {
        "otherCityStates": "neutral",
        "guilds": "friendly",
        "religiousOrders": "friendly"
      }
    },
    {
      "id": "guild",
      "name": "Guild",
      "options": [
        {
          "id": "magesGuild",
          "name": "Mages Guild",
          "description": "A collective of spellcasters dedicated to magical research and education.",
          "baseRelationships": {
            "cityStates": "friendly",
            "thievesGuild": "hostile",
            "fightersGuild": "neutral"
          }
        },
        {
          "id": "thievesGuild",
          "name": "Thieves Guild",
          "description": "A shadowy organization of rogues and criminals.",
          "baseRelationships": {
            "cityStates": "neutral",
            "magesGuild": "hostile",
            "fightersGuild": "neutral"
          }
        }
      ]
    }
  ]
}
```

---

## Quests
**File:** `data/quests.json`

### Schema
```json
{
  "questTemplates": [
    {
      "id": "killEnemies",
      "name": "{{enemyType}} Extermination",
      "type": "combat",
      "description": "{{questGiver}} has asked you to clear {{location}} of {{enemyType}}s that have been threatening travelers.",
      "objectives": [
        {
          "id": "killCount",
          "type": "killEnemies",
          "description": "Defeat {{count}} {{enemyType}}s",
          "target": "{{enemyType}}",
          "count": "{{count}}"
        }
      ],
      "rewards": {
        "xp": "{{count}} * {{enemyCR}} * 100",
        "reputation": {
          "faction": "{{questGiverFaction}}",
          "amount": 10
        },
        "items": ["{{rewardItem}}"]
      },
      "difficulty": "medium",
      "minLevel": 1,
      "maxLevel": 20,
      "timeLimit": null,
      "canFail": false,
      "canAbandon": true,
      "allowedLocations": ["town", "city", "village"]
    },
    {
      "id": "retrieveItem",
      "name": "The Lost {{itemName}}",
      "type": "retrieval",
      "description": "{{questGiver}} has lost their precious {{itemName}} somewhere in {{location}}. They need you to retrieve it.",
      "objectives": [
        {
          "id": "findItem",
          "type": "obtainItem",
          "description": "Find the {{itemName}}",
          "itemId": "{{questItemId}}",
          "location": "{{location}}"
        },
        {
          "id": "returnItem",
          "type": "deliverItem",
          "description": "Return the {{itemName}} to {{questGiver}}",
          "itemId": "{{questItemId}}",
          "targetNPC": "{{questGiver}}"
        }
      ],
      "rewards": {
        "xp": 200,
        "reputation": {
          "faction": "{{questGiverFaction}}",
          "amount": 15
        },
        "items": ["{{rewardItem}}"]
      },
      "difficulty": "easy",
      "minLevel": 1,
      "maxLevel": 10,
      "timeLimit": null,
      "canFail": true,
      "canAbandon": true
    }
  ]
}
```

---

## Campaigns
**File:** `data/campaigns.json`

### Schema
```json
{
  "campaigns": [
    {
      "id": "defeatLichKing",
      "name": "Defeat the Lich King",
      "description": "An ancient lich has risen and threatens to plunge the realm into eternal darkness. You must gather allies and power to face this ultimate evil.",
      "winCondition": "defeatBoss",
      "bossId": "lichKing",
      "stages": [
        {
          "id": "stage1",
          "name": "Rumors of Evil",
          "description": "Investigate strange occurrences in the northern villages.",
          "minLevel": 1,
          "objectives": [
            {
              "type": "completeQuest",
              "questTemplate": "investigateLocation",
              "variables": {
                "location": "northernVillage"
              }
            }
          ]
        },
        {
          "id": "stage2",
          "name": "The Lich's Servants",
          "description": "Defeat the lich's lieutenants gathering power across the land.",
          "minLevel": 5,
          "objectives": [
            {
              "type": "killBoss",
              "bossId": "deathKnight",
              "location": "cursedCastle"
            },
            {
              "type": "killBoss",
              "bossId": "vampire",
              "location": "shadowkeep"
            }
          ]
        },
        {
          "id": "stage3",
          "name": "The Final Confrontation",
          "description": "Storm the Lich King's fortress and end his reign of terror.",
          "minLevel": 10,
          "objectives": [
            {
              "type": "killBoss",
              "bossId": "lichKing",
              "location": "lichKingFortress"
            }
          ]
        }
      ],
      "keyNPCs": [
        {
          "role": "mentor",
          "name": "{{generated}}",
          "class": "wizard",
          "level": 15,
          "location": "capitalCity",
          "description": "An ancient wizard who knows the lich's secrets."
        },
        {
          "role": "antagonist",
          "name": "{{generated}}",
          "monsterId": "lichKing",
          "location": "lichKingFortress"
        }
      ],
      "keyLocations": [
        {
          "id": "lichKingFortress",
          "name": "{{generated}}",
          "type": "dungeon",
          "size": "large",
          "terrain": "mountain",
          "description": "A dark fortress of necromantic power."
        }
      ]
    }
  ]
}
```

---

## Names
**File:** `data/names.json`

### Schema
```json
{
  "settlements": {
    "prefixes": [
      "Iron", "Stone", "Silver", "Gold", "Shadow", "Light", "Dark", "High", "Deep", "Ever"
    ],
    "suffixes": [
      "hill", "vale", "ford", "haven", "keep", "port", "bridge", "grove", "wood", "peak"
    ]
  },
  "npcs": {
    "human": {
      "male": {
        "first": ["Aldric", "Bram", "Cedric", "Dorian", "Erik", "Finn", "Gareth", "Holt", "Ivan", "Jasper"],
        "last": ["Ashford", "Blackwood", "Crane", "Dustin", "Frost", "Grey", "Hart", "Knight", "Reed", "Stone"]
      },
      "female": {
        "first": ["Aria", "Brynn", "Clara", "Diana", "Elara", "Faye", "Gwen", "Helena", "Iris", "Jade"],
        "last": ["Ashford", "Blackwood", "Crane", "Dustin", "Frost", "Grey", "Hart", "Knight", "Reed", "Stone"]
      }
    },
    "elf": {
      "male": {
        "first": ["Aelrindel", "Belanor", "Celeborn", "Erevan", "Galathil", "Hadarai", "Ivellios", "Lazziar", "Mindartis", "Quarion"],
        "last": ["Amakiir", "Berevan", "Caphaxath", "Daeneiros", "Ealoeth", "Fasharash", "Galanadel", "Holimion", "Ilphelkiir", "Liadon"]
      },
      "female": {
        "first": ["Adrie", "Birel", "Chaedi", "Drusilia", "Enna", "Felosial", "Ielenia", "Keyleth", "Lia", "Meriele"],
        "last": ["Amakiir", "Berevan", "Caphaxath", "Daeneiros", "Ealoeth", "Fasharash", "Galanadel", "Holimion", "Ilphelkiir", "Liadon"]
      }
    },
    "dwarf": {
      "male": {
        "first": ["Adrik", "Baern", "Darrak", "Eberk", "Fargrim", "Gardain", "Harbek", "Kildrak", "Morgran", "Thorin"],
        "clan": ["Balderk", "Battlehammer", "Dankil", "Fireforge", "Frostbeard", "Gorunn", "Holderhek", "Ironfist", "Loderr", "Strakeln"]
      },
      "female": {
        "first": ["Amber", "Bardryn", "Dagnal", "Diesa", "Eldeth", "Falkrunn", "Gurdis", "Helja", "Kathra", "Riswynn"],
        "clan": ["Balderk", "Battlehammer", "Dankil", "Fireforge", "Frostbeard", "Gorunn", "Holderhek", "Ironfist", "Loderr", "Strakeln"]
      }
    }
  }
}
```

---

## Save Game State
**File:** LocalStorage (not a JSON file, but saved as JSON)

### Schema
```json
{
  "version": "1.0.0",
  "timestamp": 1702123456789,
  "playTime": 7234,
  "seed": "NEXUS-7492-ALPHA",
  "worldConfig": {
    "mapSize": "medium",
    "difficulty": "normal",
    "campaignId": "defeatLichKing"
  },
  "character": {
    "id": "uuid-1234",
    "name": "Thorin Ironhammer",
    "race": "dwarf",
    "class": "fighter",
    "background": "soldier",
    "level": 5,
    "xp": 6890,
    "abilities": {
      "str": 17,
      "dex": 12,
      "con": 16,
      "int": 10,
      "wis": 13,
      "cha": 8
    },
    "hp": {
      "current": 42,
      "max": 52,
      "temp": 0
    },
    "hitDice": {
      "current": 3,
      "max": 5
    },
    "skills": {
      "athletics": {"proficient": true, "expertise": false},
      "perception": {"proficient": true, "expertise": false}
    },
    "savingThrows": {
      "str": {"proficient": true},
      "con": {"proficient": true}
    },
    "inventory": [
      {"id": "longsword", "equipped": true, "slot": "mainHand"},
      {"id": "shield", "equipped": true, "slot": "offHand"},
      {"id": "chainMail", "equipped": true, "slot": "armor"},
      {"id": "potionOfHealing", "equipped": false, "quantity": 2}
    ],
    "spellcasting": null,
    "features": ["secondWind", "actionSurge", "fightingStyleDefense"],
    "conditions": [],
    "position": {
      "x": 124,
      "y": 87,
      "region": {
        "x": 3,
        "y": 2
      }
    }
  },
  "world": {
    "exploredRegions": [
      {"x": 0, "y": 0, "tiles": "...encoded or reference..."},
      {"x": 1, "y": 0, "tiles": "...encoded..."}
    ],
    "settlements": [
      {
        "id": "settlement-001",
        "name": "Ironhill",
        "type": "city",
        "position": {"x": 45, "y": 67},
        "faction": "ironhillCouncil",
        "population": 5000,
        "buildings": ["tavern", "merchant", "factionOffice", "temple"],
        "npcs": ["npc-001", "npc-002", "npc-003"]
      }
    ],
    "npcs": [
      {
        "id": "npc-001",
        "name": "Gareth Blackwood",
        "role": "merchant",
        "faction": "ironhillCouncil",
        "location": "settlement-001",
        "alive": true,
        "dialogueState": {"metPlayer": true, "questsGiven": ["quest-001"]}
      }
    ],
    "modifiedTiles": [
      {"x": 50, "y": 60, "terrain": "road", "reason": "questCompletion"}
    ]
  },
  "quests": {
    "active": [
      {
        "id": "quest-001",
        "templateId": "killEnemies",
        "name": "Goblin Extermination",
        "description": "Gareth Blackwood has asked you to clear the northern forest of goblins.",
        "objectives": [
          {
            "id": "killGoblins",
            "description": "Defeat 5 goblins",
            "type": "killEnemies",
            "target": "goblin",
            "required": 5,
            "current": 3,
            "completed": false
          }
        ],
        "questGiver": "npc-001",
        "status": "active",
        "startTime": 1702120000000
      }
    ],
    "completed": [
      {
        "id": "quest-campaign-stage1",
        "completedTime": 1702118000000
      }
    ],
    "failed": [],
    "campaignProgress": {
      "currentStage": 2
    }
  },
  "factions": {
    "ironhillCouncil": {
      "reputation": 45,
      "level": "friendly"
    },
    "magesGuild": {
      "reputation": 20,
      "level": "acquaintance"
    },
    "thievesGuild": {
      "reputation": 5,
      "level": "stranger"
    }
  },
  "combatState": null,
  "restState": {
    "shortRestsUsed": 1,
    "lastLongRest": 1702120000000
  },
  "flags": {
    "metWizardMentor": true,
    "discoveredLichKingFortress": false,
    "clearedNorthernVillage": true
  },
  "ui": {
    "tutorialCompleted": true,
    "shownHints": ["movement", "combat", "rest"]
  }
}
```

---

## Data Relationships

### Entity Relationship Diagram (Text)

```
CHARACTER
  ├── has one RACE (reference by ID)
  ├── has one CLASS (reference by ID)
  ├── has one BACKGROUND (reference by ID)
  ├── has many ITEMS (inventory, reference by ID)
  ├── has many SKILLS (proficiency map)
  ├── has many SPELLS (known/prepared, reference by ID)
  └── has many FACTIONS (reputation map)

MONSTER
  ├── has LOOT_TABLE (drops ITEMS)
  └── has ACTIONS (attacks, abilities)

QUEST
  ├── generated from QUEST_TEMPLATE
  ├── given by NPC (reference)
  ├── rewards ITEMS (reference by ID)
  └── rewards REPUTATION (faction reference)

WORLD
  ├── has many REGIONS (procedurally generated)
  ├── has many SETTLEMENTS (contain NPCs)
  ├── has many NPCs (reference CHARACTER structure)
  └── uses TERRAIN_TYPES (reference by ID)

FACTION
  ├── controls SETTLEMENTS
  ├── has many NPCs (members)
  └── has RELATIONSHIPS with other FACTIONS

CAMPAIGN
  ├── has many STAGES (sequential)
  ├── has KEY_NPCS (reference NPCs)
  ├── has KEY_LOCATIONS (reference world locations)
  └── has WIN_CONDITION
```

---

## Validation Rules

### Required Fields
Each data type must have these required fields:
- **id:** Unique identifier (string, lowercase, no spaces, alphanumeric + underscores)
- **name:** Display name (string)

### Data Types
- **Numbers:** Use integers for discrete values (HP, AC, level), floats for modifiers
- **Booleans:** true/false (lowercase)
- **Arrays:** Use arrays for lists of items
- **Objects:** Use objects for structured data with named properties
- **Dice Notation:** Use strings like "1d8", "2d6+3", "1d10" for dice rolls
- **References:** Use ID strings to reference other entities

### Naming Conventions
- **IDs:** camelCase, descriptive (e.g., "longsword", "cureWounds", "goblin")
- **Display Names:** Title Case with spaces (e.g., "Long Sword", "Cure Wounds")
- **Enums:** camelCase (e.g., "meleeWeaponAttack", "shortRest")

---

## Extending the Schema

### Adding New Content
1. **New Monster:** Add entry to `monsters.json` following schema
2. **New Spell:** Add entry to `spells.json`
3. **New Item:** Add entry to appropriate category in `items.json`
4. **New Quest Template:** Add entry to `quests.json`
5. **New Class/Race:** Add entry to `classes.json` or `races.json`

### Custom Fields
- You can add custom fields to any object for mod support
- Custom fields should be prefixed with `custom_` (e.g., `custom_modName_field`)
- Core game logic should ignore unknown fields gracefully

### Versioning
- Save files include `version` field
- When schema changes, increment version
- Implement migration logic to update old saves

---

## Example: Loading and Using Data

### JavaScript Example
```javascript
// Load data files
import classesData from './data/classes.json';
import racesData from './data/races.json';
import itemsData from './data/items.json';

// Access a class
const fighterClass = classesData.classes.find(c => c.id === 'fighter');

// Get level 2 features
const level2Features = fighterClass.features['2'];

// Find an item
const longsword = itemsData.weapons.find(w => w.id === 'longsword');

// Calculate damage
const damage = rollDice(longsword.damage); // "1d8"
```

---

**Document Status:** Ready for Implementation
**Last Updated:** 2025-12-09
**Next Action:** Create actual JSON data files following these schemas
