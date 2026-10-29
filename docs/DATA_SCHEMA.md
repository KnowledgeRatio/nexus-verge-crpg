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
7. [Backgrounds](#backgrounds)
8. [Terrains](#terrains)
9. [Factions](#factions)
10. [Quests](#quests)
11. [Campaigns](#campaigns)
12. [Names](#names)
13. [Save Game State](#save-game-state)
14. [Building Interior Presentation](#building-interior-presentation)
15. [Interface Icon References](#interface-icon-references)

---

## Interface Icon References

Presentation `icon` fields in abilities, monsters and traits, and terrain `symbol` fields, use semantic catalogue IDs such as `condition.prone`, `equipment.weapons` and `terrain.water`, not emoji glyphs. These are presentation references and do not define mechanics. Source geometry and aliases live in `src/ui/iconCatalogue.js`; `src/ui/Iconography.js` handles DOM/canvas rendering and legacy saved glyphs.

Runtime conditions require a truthy `icon` for symbol visibility: null, empty, undefined and false stay hidden even for recognized types. For visible conditions, a recognized type takes precedence over its stored icon and aliases resolve to canonical IDs; unknown types with unrecognized icons use a generic buff/debuff mark. Rendering does not mutate saved condition payloads. Keep prose descriptions free of SVG markup and catalogue IDs.

Generated `data/icons/catalogue.json` maps each semantic ID to `{ label, file, master }`; aliases have their own exported SVG filenames and identify the shared master. Regenerate via `node scripts/generate-icons.mjs`. See the [iconography library](art/iconography/README.md) for authoring and validation status.

## Building Interior Presentation

**Files:** `data/buildingInteriors.json`, `data/buildingPeople.json`

Maps `tavern`, `merchant`, `blacksmith` and `greathall` to presentation defaults
and a `variants` array. Each variant supplies `image` and `alt` and may shallowly
override `people`, `counterForeground` or other presentation fields. `people`
slots specify an image, percentage coordinates/width and optional NPC `roles`;
`counterForeground` clips a duplicated room image to occlude the keeper's lower
body. Optional `glow` and `ambience` configure lighting decoration and audio
tracks. These fields do not create NPCs, services or tradable items.

With `RULES.buildingPresentation.proceduralPeople.enabled`, rooms have stable
`id`, `introducedVersion` and `campaignIds`; `legacyVariantIds` freezes the old
two-room mapping. Slots add stable `id` and composition `profile`. Their `image`
remains the fixed-art rollback value; procedural rendering resolves the NPC's
saved artwork from the separate people catalogue.

`buildingPeople.json` contains integer `version` and `people[]`. Each entry has
`id`, `image`, eligible `roles[]`, compatible `profiles[]`, `campaignIds` and
`introducedVersion`. Optional `identityConstraints` maps explicit NPC fields to
allowed values; missing NPC fields impose no constraint. Role/profile matching
does not infer gender or anatomy from names or culture. Campaign filtering occurs
once on load; version filtering uses the saved catalogue version.

All 28 current artwork entries specify `identityConstraints.gender` as `["male"]`
or `["female"]`. Generated NPCs now persist `gender` from the existing naming
draw; this captures the original choice without another RNG draw or changing
names. On settlement entry, saved gender restores before artwork assignment.
For an old NPC missing gender, the generator replays the original seeded roster
and copies gender only when both ID and name match. Unmatched/custom records
remain unspecified; names and culture are not used to guess gender.

`settlement.buildingPresentation` stores `schemaVersion`, `algorithmVersion`,
`catalogueVersion`, a separate presentation `seed`, and `buildings[type]` records
with `roomId` and `slots` mapping slot IDs to NPC IDs or deliberate `null` omissions.
Each NPC stores `buildingAppearance: { artworkId }`, also permitting `null`.
`world.metadata.buildingPresentationCatalogueVersion` pins new assignments in a
saved world. Room receipts are prepared during finite-world generation; people
bind after actual NPC restoration/creation. The renderer only resolves receipts.
Persistent settlements, metadata and NPC Map copies are reconciled through the
existing state/save paths, including the explicit appearance restoration field.

Catalogue ordering does not affect fresh selection; existing saved IDs survive
pool expansion. Future additions must increment catalogue `version` and set
their `introducedVersion` accordingly. Missing or incompatible saved artwork IDs
receive deterministic repairs, including a one-time gender mismatch correction;
failed image requests do not reroll saved identity. Old saves receive missing
receipts through ordinary load/entry paths, preserving the legacy room mapping
where available. No migration script is required. See the
[field reference and variant contract](art/building-interiors/README.md#data-and-implementation)
for presentation fallback, authoring and study controls.

### Settlement and building soundscapes

`data/settlementSoundscapes.json` contains integer `version` and `village`, `town`,
`city` arrays of exterior mixes. Building pools remain in the base
`data/buildingInteriors.json` entries' `ambience` arrays. A mix has stable `id`,
`label`, `campaignIds`, `introducedVersion`, optional `settlementTypes`, optional
`localOnly`, and `tracks[]` with `url`/`volume`. Current local pools contain two
mixes per size and two per building. The soundscape loader campaign-filters once;
resolution filters by settlement size and saved catalogue version.

`settlement.soundscapes` stores `schemaVersion: 1`, `catalogueVersion`,
`exteriorMixId` and `buildings` mapping building types to mix IDs (or `null`).
`world.metadata.soundscapeCatalogueVersion` pins additions for unvisited places.
Selection sorts stable IDs and uses a separate world/settlement/context seed,
independent of room artwork and gameplay RNG. World generation prepares receipts;
ordinary load/settlement entry fills missing keys and reconciles saved copies.
Keep IDs stable; future additions increment the catalogue version and set their
introduction version accordingly.

Unavailable saved mix IDs are retained, including private IDs loaded in a public
build. Resolution uses the first sorted available compatible mix without rewriting
that receipt, or exposes no controls when the pool is empty. Manual Sound selection
is local to the mounted controls and does not change the saved choice. Playback
always starts muted. `RULES.settlementSoundscapes.enabled` gates exterior ambience
and seeded mix resolution; existing building ambience remains the fallback path.
The build strips `localOnly` mixes from both catalogues and excludes ignored local
audio. See the [variety report](reports/2026-10-24-soundscape-variety.md).

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
            "choices": ["marksmanship", "defense", "dueling", "greatWeaponFighting", "protection", "twoWeaponFighting"]
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

Merchant-only offers in `data/merchantInventory.json` may declare `purchaseEffect: { "type": "restoreSupplies", "amount": 1 }`. The purchase applies directly to `fatigue.supplies`, creates no inventory item and rejects overflow before charging. Positive whole quantities, live row stock, enabled fatigue and valid saved counters are required. `guaranteedStock: true` reserves a slot within the existing eligible merchant inventory budget. Expedition Supplies has provisional base value 35; ordinary relation/Influence pricing applies. This shop offer is not a canonical loot item or a conversion of quest provisions.

Physical trap challenge templates may declare `physicalTrapOnly: true` to exclude them from random room challenges while retaining their authored disarm outcomes. `RULES.dungeon.trapChoicesEnabled` controls distinct trap choices and sparse persistence. Dungeon feature `trapStates` holds source-room/tile receipts replayed during entry rather than complete room saves. Receipts include room identity/dimensions, coordinates, original DC/damage and armed/detected flags. `dungeonTypeSeedDraw` preserves the initial automatic type-selection RNG draw during regeneration. Known avoided traps remain armed; disarmed/triggered traps remain spent. Active dungeon saves still restore the player outside.

Dungeon feature `doorStates` stores sparse shared-passage receipts, keyed by the sorted room-index pair (for example, `"0:2"`). Each receipt contains `roomIndices`, corresponding `roomIds`, `challengeCompleted` and `locked`. Opening or failing a physical door updates both directional tile representations. Regeneration restores receipts only when both room IDs and reciprocal connections still match; incompatible receipts are ignored. Successful passage stays open in both directions, while failure preserves the existing shared lock consequence. These receipts save passage state without serializing full rooms.

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
      "addEvasionModifier": true,
      "maxEvasionBonus": null,
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
      "addEvasionModifier": false,
      "maxEvasionBonus": 0,
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

Optional `conditionImmunities` is an array of exact condition-type strings, such as `"prone"` or `"frightened"`. EncounterBuilder carries it into encounter actors. Combatant reads/writes the source character array and explicitly copies it in `toJSON()`; plain restored actors retain the same data contract. Immune conditions are rejected before stacking or refreshing, while valid damage and resource costs remain. This changes runtime enforcement, not monster content or numerical values.

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

## Hostile Settlement Opportunities

`data/hostileSettlements.json` supplies `messages` plus campaign-filtered `combat`, `exploration`, `social` and `rebuilding` arrays. Templates have `id`, `type`, `campaignIds`, `name`, `description` and `options`, with optional `npcName` and sequential `nodes`. Combat templates declare a fallback `monsterPool` and `monsterPoolsByTier:[{maxLevel,monsterPool}]`; the shared EncounterBuilder uses the frozen first-entry level and configured medium difficulty. Options have `id`, `label`, optional registered `skill`/`attribute`, and `onSuccess`/`onFailure` messages with optional generic skill-challenge `effects`. Node options may declare `decision`, `requiresDecision` and `supportSkill`; decisions gate later options within the same step, and the selected support skill grants advantage on matching rebuilding checks. Current liberation/rebuilding DCs are 12/14/16 at levels 1–3/4–7/8–10.

New-world metadata stores `hostileState:{phase:'hostile',contentPlan:{steps,rebuildSteps}}` on selected existing settlements. Seed-derived content is selected before metadata persistence. First actual entry consumes/removes `contentPlan` and saves `level`, three selected `steps`, three distinct `rebuildSteps`, `index`, `nodeIndex`, `rebuildIndex`, `attempt`, `decisions` and `readyAt`; optional fields include `supportSkill`, `lastResult`, `pendingCombat:{settlementId,stepId,attempt}`, `liberatedAt` and `restoredAt`. Phase-only older hostile receipts use the same seeded content selector as a compatibility fallback. Phases are `hostile`, `rebuilding` and `restored`. The shared `world.worldClock` drives `readyAt`; two ticks gate the first/next project, one gates failed rebuilding retries. Level freezes from the character on first visit. State is plain serializable data mirrored through settlement persistence and metadata/loaded features. Saved interrupted combat receipts are cleared without progression because runtime combat is not saved. Old ordinary worlds are not backfilled. See [hostile settlement validation](reports/2026-10-13-hostile-settlements-validation.md) for scope and limitations.

## Skills

Finite wilderness provisioning content lives in `data/provisioning.json`: `challenge` defines the skill ID, attribute and textual outcomes; `cues` define IDs, titles, descriptions, action labels, eligible biomes and campaign IDs. Shelter cues use `eligiblePoiTypes`; standalone cues use `eligibleHostTypes:["provisioning"]` and may override the shared `marker` with `{symbol,color}`. Current standalone cue IDs are `wild_plants` and `wild_tracks`. `RULES.provisioning` defines enabled state, DC and supply reward. `generation` controls shelter allocation/spacing/map-size caps; `wilderness` controls standalone enablement, region chance, attempts per region, spacing and settlement exclusion.

New-world generation attaches `provisioning:{id,cueId,attempt:null}` to selected existing sanctuary-resolving metadata features and creates standalone features shaped as `{id,x,y,type:"provisioning",renderLayer:"overlay",name,provisioning:{id,cueId,attempt:null}}`, with stable ID `provisioning:x,y`. Standalone objects use traversable compatible ground without replacing its terrain or granting shelter. Confirmation writes a pending `attempt` before fatigue/roll resolution, then records success/failure/error, the roll and actual restored supplies. Any receipt spends the opportunity permanently for that run; cancellation and full-meter inspection do not write receipts. Canonical metadata owns the saved receipt, not a copied tile or inventory item. Old saved worlds are not backfilled. Standalone objects open through E/touch Interact and draw cue markers over visible terrain, dimmed when spent. Revealed shelter cues retain their rest/interaction UI and available-source badge.

**File:** `data/skills.json`

### Schema
```json
{
  "skills": [
    {
      "id": "finesse",
      "campaignIds": ["core"],
      "name": "Finesse",
      "ability": "dex",
      "primaryAttribute": "prowess",
      "secondaryAttribute": "composure",
      "legacyIds": ["acrobatics", "sleightOfHand", "sleight_of_hand", "cunning"],
      "description": "Experience in balance, stealth, manual precision, lockpicking, concealment, and sleight of hand.",
      "descriptionNVSystem": "Finesse applies Prowess for agile execution and Composure for patient, steady precision."
    }
  ]
}
```

The core catalogue contains exactly nine broad skills. `primaryAttribute` is the default NVSystem approach and `secondaryAttribute` is the only standard alternative. Skill-check content should explicitly author `attribute` when the approach matters. `legacyIds` are accepted for migration only and must not be used by new content.

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
      "tileImage": "grassland-cartographic-atlas-v1.png",
      "imageDescription": "Continuous open warm-olive grassland...",
      "visual": {
        "mode": "continuousAtlas",
        "atlasTilesPerSide": 16,
        "atlasWrapMode": "mirror",
        "transitionGroup": "temperateNatural",
        "transitionPriority": 10,
        "motifsPerTile": { "min": 3, "max": 6 }
      },
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

### Terrain visual modes

- `legacyTile` or an absent `visual` field draws the complete `tileImage` into each world tile.
- `continuousAtlas` treats `tileImage` as one continuous painted sheet. Adjacent world coordinates sample adjacent atlas regions. `atlasTilesPerSide` declares how many world tiles the square atlas represents. `atlasWrapMode` may be `repeat` for a verified seamless source or `mirror` for guaranteed continuity at the atlas boundary.
- `autotile` is reserved for topology-aware roads, bridges, coastlines, walls, and connections.
- `landmark` is reserved for features that render over base terrain rather than repeating as ground.

`imageDescription` is model-facing art direction and must not replace the player-facing `description`. `motifsPerTile` calibrates prompt density at the final world-tile scale; it does not change gameplay.

Continuous materials in the same `transitionGroup` can form organic visual boundaries. When unlike materials meet, the higher `transitionPriority` extends a small deterministic edge into the lower-priority material. This affects presentation only; the underlying terrain ID and mechanics do not change.

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

### Explicit quest standing rewards

`rewards.reputation:{faction,amount}` supports `faction:"settlement"`, `"both"` or `"all"`. Amounts retain their authored values; RelationManager clamps final scores to its existing limits. Targets are existing campaign culture IDs, not new organizations. `settlement` resolves distinct valid cultures from the bound issuer settlement's actual NPC roster, falling back to the giver's culture only when no usable roster exists. `both` unions issuer and actual destination cultures without duplicates; `generationData.targetSettlementId` or the travel objective's `requirement.settlementId` supplies the destination. `all` uses the loaded campaign culture catalogue.

Missing required community data makes the whole standing reward unavailable, rather than partially paying known targets. XP/gold and normal completion remain available with a clear warning. `QuestReputation.js` provides a preview shaped as `{available,reason,changes}`, with each change naming `targetId`, `targetName` and authored `amount`. The saved `reputationRewardReceipt.changes` records actual per-target `{targetId,targetName,amount,previous,current}` after clamping; repeat payout skips recorded targets. Turn-in summaries expose actual change records and any `reputationWarning`.

Rich quests with explicit `faction` resolution effects retain that path and suppress duplicate legacy reputation payout. Personal NPC bonuses still apply; when explicit standing exists they use `contributeToFaction:false` to prevent a second culture award. Quests without explicit standing retain prior personal-to-culture spillover.

### Tracking and received information

`gameState.quests.trackedQuestId` is one active quest ID or `null`. QuestManager validates selection; GameState and SaveManager default missing values to `null` and clear stale IDs on load. Ending the tracked job by completion, failure, expiry or abandonment clears selection.

Offers may declare `intelQuality` (`high`, `medium`, `low`, `none`) and `intelDialogue`, keyed by quality. Composed offers bind these from `questComposition.tracking` during generation, including `{siteName}` in the medium briefing. Generation alone grants no received information: acceptance must display a nonempty selected briefing before saving `trackingIntel:{quality,origin,targetKey,bearing?}`. `origin` records the issuer; low-quality `bearing` is fixed to that origin and the configured eight directions.

`trackingDiscoveries:{"x,y":true}` records actual discovery of bound quest sites. QuestManager refreshes these receipts on visibility/proof changes; getters and renderers do not acquire knowledge. Existing saves without receipts retain unknown guidance unless actual discovery proves the location.

`RULES.quests.tracking` owns enablement, `searchAreaSize`, `qualityModes` and `bearings`. The safe navigation view exposes only the permitted shape: high `exact` coordinates; medium `area` bounds aligned globally to 64×64 tiles with exclusive `maxX/maxY` and no target pin; low `direction` with issuer origin/bearing; or `unknown`. Hidden bindings stay out of nonexact views. Completed required fieldwork switches to exact issuer guidance without forcing optional objectives. See [quest rules](../.claude/rules/systems/quests.md).

### Live procedural bundle contract

The current file contains `sideQuestTemplates`, `campaignQuests`, `proceduralBundles` and `questComposition`. The older schema examples below are illustrative historical shapes; use the live data and [quest rules](../.claude/rules/systems/quests.md) when authoring current content.

`questComposition` declares a version/family, baseline and six component dimensions. Components have explicit cross-dimension `requires`, optional capability requirements and reusable activity references. Generic activities contribute objectives/actions; goals contribute guarded resolutions. Component campaign filtering occurs at load time; activities are shared core content. The generator persists chosen component IDs and fully instantiated content; item/name permutations do not establish structural variety.

New iteration-enabled composed records also save `iteration.version`, `offeredLevel`, `taskTier`, `risk` and `deadlineObjectives`. Optional `deadlineDuration` is a world-clock interval; acceptance sets `deadlineAt`, and `fulfilledAt` records completed required work. `failureEffects`, `expiryPending`, `expiryEffectsApplied` and `failureStandingApplied` distinguish retryable expiry application from completed once-only failure. Unaccepted offers do not count down. These fields do not retrofit already instantiated boards or legacy content.

`questComposition.outcomes` contributes capability-compatible typed success/failure effects; `informationOutcome` adds a supported `reveal_location` effect only to corroborated resolutions. `local_safety` carries `siteId`, `radius` and `multiplier`; `merchant_availability` carries `settlementId`, `merchantRole`, `itemId` and `availability`; `reveal_location` carries a real `siteId`. ConsequenceManager validates producers/consumers before publication and stores idempotent `world.metadata.questOutcomes` receipts with quest/effect IDs and sequence. Settlement-owned `questAvailability` stores the bound item/role availability state. Discovery updates the actual feature, modified tiles and loaded tile cache; it does not create a new location.

Specialist subject components require real campaign equipment, an eligible merchant and the loaded item-property producer. A `merchant_stock` effect with `qualityScore` creates one deterministically enchanted paid offer, saved as `questStock[].generatedItem` with its instance ID and value. Quality/price premiums are configured in `RULES.quests.iteration`; they are not extra commission or free inventory grants. Dungeon features bound to iteration offers save `questEncounterLevel` when generated; the shared encounter-level lookup uses this frozen level, otherwise the bound iteration offer level, otherwise the current level.

Subject `resolutionReply` optionally replaces fulfilled reporting prose after normal placeholder binding. Outcome descriptions are appended to the persisted reply. Combat capability eligibility also checks actual boss candidates against the configurable offered-level minimum XP budget; no speculative boss identity is persisted by this check.

Shared records use stable objective IDs, `baseline.objectiveId`, facts/actions/objective prerequisites, optional exclusion predicates and either top-level or legacy procedural participants. Rich content is detected by capability, independent of type/provenance. `defeat_encounter.requirement.source` binds `{siteId,encounterRole,encounterKey}`; live proof additionally records numeric room, target and encounter identity. `target_cleared.sourceObjectiveId` points to that objective's proof.

Recovery action payloads `acquire`/`salvage` declare `{itemId,quantity,sourceId}`. Actual inventory goods carry `questSource:{questId,sourceId}` and a protected quest-item identity. Choice `custody` entries declare item/source, positive quantity or minimum quantity, and consumption. `merchant_stock.quantityFromCustody` names the source whose actual handed-over quantity supplies stock. `resolutionPending`/`resolution.deliveries` and applied-effect/reward receipts prevent repeated transfer/payment. Dungeon-feature `questEncounterVictories` and `questEncounterClears` own actual victory and clearance provenance; the quest does not duplicate encounter state.

Each procedural bundle declares `id`, `campaignIds`, `arrangement`, `name`, `description`, `requiredParticipants`, `baseline`, `actions` and `resolutions`. Baseline facts have `id` and `text`; actions declare `location`, optional `npcParticipant`/`skillId`, prerequisites and acquired facts. Resolutions declare prerequisites, a remembered `reply`, optional `incomplete` commission and generic effects. Supported effects are `relation` (existing modifier and participant), `faction` (supported participant culture and configured reward tier) and `merchant_stock` (existing campaign item and bound merchant).

The generator freezes real participant names into placeholders such as `{giverName}`, `{merchantName}`, `{witnessName}` and `{claimantName}`. Generated records save `procedural.participants`, `evidence.facts/actions/attempts` and their instantiated activities. `resolution` stores the selected choice, reply, rewards and applied effect IDs. Settlement-owned `questStock` stores source quest/effect, item, merchant role and remaining quantity; it is not a second inventory on the quest. Configurable DC, commission and shipment quantity live in `RULES.quests.proceduralCore`.

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
