# Skill Challenge Design Matrix
**Version:** 1.0
**Purpose:** Comprehensive mapping of skill challenges to create distinct player experiences

---

## Design Philosophy

Each challenge archetype should deliver a **unique gameplay moment**:
- **Environmental Hazards**: Test survivability and spatial awareness
- **Social Conflicts**: Offer non-combat resolution with branching outcomes
- **Discovery & Lore**: Reward curiosity and knowledge
- **Heists & Infiltration**: Enable stealth and cunning approaches
- **Survival Challenges**: Create resource tension and endurance tests
- **Puzzle & Logic**: Engage problem-solving skills
- **Dynamic Obstacles**: Force reactive decision-making

---

## Challenge Archetypes

### 🌪️ **ARCHETYPE 1: ENVIRONMENTAL HAZARDS**
*Experience: Navigating dangerous terrain with high stakes*

| Challenge | Location | Trigger | Primary Skill | Alt Skills | DC | Base Success | Critical Success (20+) | Failure | Critical Failure (1-5) |
|-----------|----------|---------|---------------|------------|-------|--------------|----------------------|---------|----------------------|
| **Rockslide** | Mountains, Hills | Random encounter (15%) | Perception → Acrobatics | Athletics to brace | 14 / 15 | Avoid damage, +75 XP | Find shortcut path (+100 XP, reveal nearby POI) | 3d6 bludgeoning, DEX save DC 13 for half | Pinned under rocks: 4d6 damage + 1 Exhaustion |
| **Quicksand** | Swamp, Marsh | POI feature | Perception → Athletics | Cunning to stay calm | 13 / 16 | Escape safely, +50 XP | Pull out valuable item (50 GP gem), +75 XP | Trapped: 1d6 damage/round until freed (DC 15 Athletics) | Fully submerged: 3d6 damage + lose 1d4 items |
| **Poisonous Gas Vent** | Caves, Volcanic | Dungeon room | Perception → Endurance | Creativity (wet cloth mask) | 15 / 14 | Hold breath, navigate, +100 XP | Identify gas source (alchemy component worth 100 GP) | Poisoned condition (1 hour), -2 to all checks | 2d8 poison damage + Poisoned (4 hours) |
| **Blizzard** | Tundra, Mountains | Random weather | Endurance → Perception | Cunning (find shelter) | 16 / 13 | Push through, +100 XP | Find ice cave sanctuary (safe rest + 25 GP ice crystals) | 2d4 cold damage + 1 Exhaustion | 3d6 cold damage + 2 Exhaustion + lost |
| **Flash Flood** | Desert, Plains | Random weather | Perception → Athletics | Acrobatics (climb tree) | 14 / 15 | Reach high ground, +75 XP | Save drowning merchant (200 GP reward + quest) | 2d6 bludgeoning + swept 100 ft away | 4d6 damage + lose all consumables |
| **Crumbling Bridge** | Canyons, Ruins | Dungeon/POI feature | Investigation → Acrobatics | Athletics (rope swing) | 12 / 14 | Cross safely, +50 XP | Salvage rope + planks (20 GP), +75 XP | Fall to lower level: 3d6 bludgeoning (creates alternate path) | 6d6 bludgeoning + 1 Exhaustion |

**Reward Scaling:** XP scales with player level (+25% per 5 levels)
**Peril Pattern:** Physical damage + environmental conditions (Exhaustion, Poisoned)

---

### 🗣️ **ARCHETYPE 2: SOCIAL CONFLICTS**
*Experience: Negotiation with meaningful consequences*

| Challenge | Location | Trigger | Primary Skill | Alt Skills | DC | Base Success | Critical Success (20+) | Failure | Critical Failure (1-5) |
|-----------|----------|---------|---------------|------------|-------|--------------|----------------------|---------|----------------------|
| **Bandit Tollgate** | Roads, Forest | Random encounter (10%) | Influence → Deception | Empathy (appeal to honor) | 15 / 14 / 16 | Bandits leave, avoid combat, +225 XP | Bandits join you temporarily (1 combat ally) + 35 Rep | Combat vs 3 bandits | Combat vs 5 bandits + surprised condition |
| **Merchant Negotiation** | Settlement | Interact with merchant | Influence → Deception | Empathy (read merchant) | 13 / 15 / 14 | 20% discount on all items | 40% discount + access to rare item | No discount | Merchant refuses service (banned for 1d4 days) |
| **Guard Bribery** | Cities, Strongholds | Caught trespassing | Influence → Deception | Creativity (fake papers) | 14 / 16 / 15 | Guards let you go (-50 GP) | Guards look the other way (no gold cost) + quest tip | Arrested: -100 GP fine + -25 Rep | Combat + arrested + -200 GP + -50 Rep |
| **Rival Adventurer Duel** | Tavern, Settlement | Quest conflict | Influence → Empathy | Athletics (arm wrestle) | 15 / 16 | Share quest objective (ally for quest) | Rival yields their lead (quest clue + 100 XP) | Rivals sabotage you (quest becomes harder, +2 DC) | Combat + rivals steal quest item |
| **Cult Interrogation** | Ruins, Temples | Dungeon encounter | Deception → Influence | Academia (quote scripture) | 17 / 16 / 18 | Cultists believe you're ally, let you pass | Cultists reveal ritual location (dungeon map + 150 XP) | Cultists suspicious, raise alarm (alerted enemies) | Combat vs 4 cultists + boss |
| **Faction Mediator** | Settlement | Quest objective | Empathy → Influence | Academia (cite precedent) | 16 / 17 | Both factions accept truce (+50 Rep both) | Permanent alliance formed (+100 Rep both + unique quest chain) | One faction offended (-25 Rep), other pleased (+25 Rep) | Both factions angry (-50 Rep both) + quest fails |

**Reward Scaling:** Reputation gains scale with settlement size
**Peril Pattern:** Combat escalation, reputation loss, access restrictions

---

### 📜 **ARCHETYPE 3: DISCOVERY & LORE**
*Experience: Uncovering secrets and knowledge*

| Challenge | Location | Trigger | Primary Skill | Alt Skills | DC | Base Success | Critical Success (20+) | Failure | Critical Failure (1-5) |
|-----------|----------|---------|---------------|------------|-------|--------------|----------------------|---------|----------------------|
| **Ancient Runes** | Ruins, Temples | POI feature | Academia → Arcana | Investigation (context clues) | 15 / 16 | Translate text: reveal quest location, +100 XP | Learn ancient spell scroll (1d4 spell scrolls) + 150 XP | Partial translation (vague clue) | Trigger curse: -1d4 HP max (removable at temple) |
| **Star Map Puzzle** | Observatories, Shrines | Dungeon room | Academia → Creativity | Perception (identify constellations) | 16 / 15 | Unlock star door: access treasure room, +150 XP | Gain celestial blessing (+1 to Perception for 24h) + rare item | Door remains locked (must find key elsewhere) | Trigger trap: 2d6 radiant damage |
| **Alchemical Formula** | Laboratories, Ruins | Search action | Investigation → Academia | Arcana (magical component) | 14 / 15 / 16 | Decode formula: gain alchemy recipe, +75 XP | Create potion immediately (free Greater Healing Potion) | Incomplete formula (requires second component) | Explosion: 2d8 fire damage to all nearby |
| **Fossil Record** | Caves, Mountains | POI feature | Investigation → Academia | Creativity (reconstruct) | 13 / 14 | Identify ancient creature: +50 XP + lore entry | Find fossilized treasure (100 GP gemstone) + 100 XP | Misidentify (incorrect lore entry) | Disturb ancient guardian: combat vs Skeleton |
| **Prophecy Mural** | Temples, Sanctuaries | POI feature | Academia → Empathy | Arcana (divine magic) | 17 / 15 | Interpret prophecy: gain quest hint + 125 XP | Receive divine vision (reveal 3 nearby POIs on map) + 200 XP | Vague interpretation (no benefit) | Blasphemy: -50 Rep with temple faction |
| **Hidden Library** | Dungeons, Towers | Sequential: Investigation → Academia | 14 / 16 | Sleight of Hand (unlock) | Find hidden room: +75 XP | Open library: +100 XP + choice of Skill Tome (+1 to one skill permanently) | All library fails to reveal (no benefit) | Trigger magical ward: 3d6 force damage |

**Reward Scaling:** Lore unlocks, permanent character upgrades, quest progression
**Peril Pattern:** Curses, magical damage, false information

---

### 🥷 **ARCHETYPE 4: HEISTS & INFILTRATION**
*Experience: Stealth gameplay with multiple approaches*

| Challenge | Location | Trigger | Primary Skill | Alt Skills | DC | Base Success | Critical Success (20+) | Failure | Critical Failure (1-5) |
|-----------|----------|---------|---------------|------------|-------|--------------|----------------------|---------|----------------------|
| **Guard Patrol** | Strongholds, Camps | Dungeon/Camp | Cunning (hide) → Acrobatics (silent) | Creativity (distraction) | 14 / 13 / 13 | Sneak past undetected, +150 XP | Guards distracted, leave post (shortcut opens) + 200 XP | Guards alerted but not hostile (increased patrols, +2 future DCs) | Combat vs 3 guards (no surprise round) |
| **Locked Vault** | Dungeons, Banks | Quest objective | Sleight of Hand → Athletics | Arcana (dispel lock) | 16 / 18 / 15 | Pick lock: access vault, +100 XP | Silent entry + find master key (all doors in dungeon unlock) | Break lockpick (lose tool), door locked | Trigger alarm: all enemies alerted + time pressure (10 rounds) |
| **Rooftop Chase** | Cities | Quest/Crime | Acrobatics → Athletics | Creativity (improvise path) | 15 / 16 | Escape pursuers, +125 XP | Lose pursuers completely + find hideout (safe rest spot) | Cornered: must fight 2 guards | Fall: 3d6 bludgeoning + captured |
| **Disguise Infiltration** | Settlements, Camps | Quest objective | Deception → Influence | Sleight of Hand (forge papers) | 16 / 15 / 14 | Infiltrate undetected, +175 XP | Gain insider information (dungeon map + enemy weaknesses) | Disguise questioned (1 round to convince or flee) | Discovered immediately: combat + alarm |
| **Treasure Heist** | Sequential: Cunning → Sleight of Hand → Acrobatics | Museums, Vaults | 14 / 15 / 13 | Investigation (find path) | Approach unseen: +100 XP | Steal item: +150 XP | Escape: +200 XP (total +450 XP) | Any stage fails: alarm triggered, guards arrive in 3 rounds | All stages fail: trapped in vault, must fight way out vs 6 guards |
| **Sabotage Mission** | Camps, Warehouses | Quest objective | Cunning → Creativity | Arcana (magical sabotage) | 13 / 14 | Sabotage supplies, +150 XP + quest progress | Perfect sabotage: enemy reinforcements never arrive (removes 1 future combat) | Incomplete sabotage (partial quest progress) | Caught: combat vs 4 enemies + quest fails |

**Reward Scaling:** Access to shortcuts, intel, quest progression
**Peril Pattern:** Alarm states, reinforcements, capture, increased difficulty

---

### 🏕️ **ARCHETYPE 5: SURVIVAL CHALLENGES**
*Experience: Resource management and endurance*

| Challenge | Location | Trigger | Primary Skill | Alt Skills | DC | Base Success | Critical Success (20+) | Failure | Critical Failure (1-5) |
|-----------|----------|---------|---------------|------------|-------|--------------|----------------------|---------|----------------------|
| **Forced March** | Any wilderness | Travel > 8 hours | Endurance → Athletics | N/A | 14 | Continue travel, +50 XP | Tireless: no Exhaustion, +75 XP | 1 Exhaustion level | 2 Exhaustion levels |
| **Contaminated Water** | Swamps, Ruins | Rest action | Perception → Endurance | Investigation (test water) | 12 / 15 | Avoid sickness, +25 XP | Find pure spring (restore 1 Exhaustion), +50 XP | Poisoned condition (8 hours) | Disease: -2 CON for 3 days (removable with Lesser Restoration) |
| **Starvation** | Any (if no rations) | Long rest without food | Endurance → Creativity | N/A / 16 | 15 | Endure hunger, 1 Exhaustion | Forage successfully (find 1d4 rations), +50 XP | 2 Exhaustion | 3 Exhaustion + unable to regain HP |
| **Extreme Heat** | Desert, Volcanic | Daytime travel | Endurance → Cunning | Creativity (makeshift shade) | 15 / 14 / 14 | Endure heat, +75 XP | Find oasis (safe rest + water), +125 XP | 1d6 fire damage + 1 Exhaustion | 2d6 fire damage + 2 Exhaustion + Incapacitated for 1 hour |
| **Frostbite** | Tundra, Mountains | Night travel | Endurance → Creativity | Cunning (find shelter) | 16 / 15 | Endure cold, +75 XP | Find warm cave (safe rest + 1d4 pelts worth 25 GP each) | 1d6 cold damage + 1 Exhaustion | 2d6 cold damage + 2 Exhaustion + lose use of hands (disadvantage on all rolls for 4 hours) |
| **Plague-Ridden Village** | Settlement | Enter settlement | Academia → Endurance | Empathy (comfort sick) | 14 / 16 | Avoid infection + 50 XP | Identify cure (save village, +100 Rep + 500 GP reward) | Infected: -2 to all checks for 2 days (removable at temple) | Severe infection: 1d4 CON damage + spread to party |

**Reward Scaling:** Resources, safe rest locations, condition removal
**Peril Pattern:** Exhaustion, ability damage, conditions, resource loss

---

### 🧩 **ARCHETYPE 6: PUZZLE & LOGIC**
*Experience: Problem-solving with multiple solutions*

| Challenge | Location | Trigger | Primary Skill | Alt Skills | DC | Base Success | Critical Success (20+) | Failure | Critical Failure (1-5) |
|-----------|----------|---------|---------------|------------|-------|--------------|----------------------|---------|----------------------|
| **Elemental Lock** | Dungeons, Temples | Door/chest | Arcana → Investigation | Creativity (unconventional) | 17 / 16 / 15 | Unlock mechanism, +150 XP | Disable permanently + gain elemental essence (crafting component) | Door sealed (need 2nd attempt at +2 DC) | Elemental backlash: 3d8 damage (type varies) |
| **Weight Pressure Plate** | Dungeons | Hallway | Investigation → Creativity | Athletics (brace door) | 14 / 13 | Solve puzzle, +100 XP | Disarm trap mechanism (salvage 50 GP components) | Trigger trap: poison darts 2d6 piercing + poisoned | Pit trap: fall 20 ft (2d6 bludgeoning) + stuck |
| **Mirror Maze** | Dungeons, Ruins | Room | Perception → Investigation | Creativity (mark path) | 15 / 14 | Navigate maze, +125 XP | Find secret mirror (scrying device, 1/day Clairvoyance) | Lost in maze: 1d4 rounds wasted + 1 Exhaustion | Trigger illusion trap: 2d6 psychic damage + Confused (1 min) |
| **Riddle Door** | Dungeons, Crypts | Door | Investigation → Academia | Creativity (lateral thinking) | 16 / 15 / 14 | Answer riddle, +100 XP | Impress guardian spirit (blessing: +1 AC for 24h) | Door remains sealed (must find key) | Wrong answer: 2d8 force damage |
| **Musical Sequence** | Temples, Towers | Puzzle room | Investigation → Creativity | Academia (music theory) | 15 / 14 | Play correct sequence, +125 XP | Unlock bonus chamber (treasure chest + 200 GP) | Sequence resets (can retry with +2 DC) | Sonic blast: 3d6 thunder damage + Deafened (1 hour) |
| **Constellation Navigation** | Outdoors at night | Lost/Navigation | Academia → Perception | Investigation (patterns) | 14 / 13 | Find correct direction, +75 XP | Discover ancient ley line (fast travel point) | Travel wrong direction (lose 1d4 hours) | Completely lost (wasted day + random encounter) |

**Reward Scaling:** Access to treasures, shortcuts, magical items
**Peril Pattern:** Magical damage, time waste, access denial, psychic effects

---

### ⚡ **ARCHETYPE 7: DYNAMIC OBSTACLES**
*Experience: Quick decision-making under pressure*

| Challenge | Location | Trigger | Primary Skill | Alt Skills | DC | Base Success | Critical Success (20+) | Failure | Critical Failure (1-5) |
|-----------|----------|---------|---------------|------------|-------|--------------|----------------------|---------|----------------------|
| **Collapsing Ceiling** | Dungeons, Ruins | Triggered trap | Perception → Acrobatics | Athletics (shield debris) | 13 / 15 | Dodge debris, +100 XP | Grab falling relic (100 GP artifact), +150 XP | 3d6 bludgeoning damage | 5d6 bludgeoning + Restrained (buried, DC 16 STR to escape) |
| **Swinging Blade Trap** | Dungeons | Hallway | Perception → Acrobatics | Investigation (find disable) | 14 / 16 | Dodge blades, +75 XP | Disable mechanism (disarm permanently) | 2d8 slashing damage | 4d8 slashing damage + Bleeding (1d4 damage/round until healed) |
| **Ambush by Assassin** | Any | Random encounter (rare) | Perception → Cunning | Empathy (sense intent) | 17 / 15 | Avoid surprise round, +100 XP | Counter-ambush (gain surprise on assassin) | Surprised: assassin gets free attack | Critically surprised: assassin gets advantage on attack + sneak attack damage |
| **Wild Magic Surge** | Arcane areas | Spellcasting nearby | Arcana → Creativity | Investigation (predict) | 16 / 14 | Control surge, +100 XP | Channel surge beneficially (free spell slot or buff) | Random effect (roll on wild magic table) | Hostile effect: summon hostile elemental or 3d10 force damage |
| **Runaway Cart** | Roads, Cities | Random encounter | Acrobatics → Athletics | Creativity (redirect) | 14 / 16 | Dodge cart, +50 XP | Stop cart, save NPC (+100 GP reward + 25 Rep) | 2d6 bludgeoning damage | 4d6 bludgeoning + knocked prone + cart destroyed (angry merchant) |
| **Stampeding Herd** | Plains, Savanna | Random encounter | Perception → Athletics | Cunning (hide) | 15 / 16 | Avoid stampede, +75 XP | Calm lead animal (prevent stampede) + potential animal companion | 3d6 bludgeoning + prone | 5d6 bludgeoning + trampled (2 Exhaustion) |

**Reward Scaling:** Situational benefits, NPC rewards, bonus items
**Peril Pattern:** High burst damage, conditions, surprise attacks

---

## Implementation Strategy

### Trigger System

```javascript
// Pseudocode for challenge triggering
function checkForSkillChallenge(context) {
  const triggers = {
    randomEncounter: () => roll(1, 100) <= encounterRate,
    poiFeature: () => playerEntersPOI && !poi.explored,
    questObjective: () => activeQuest.requiresChallenge,
    dungeonRoom: () => roomFeature === 'challenge',
    weatherEvent: () => weatherCondition === 'extreme',
    terrainHazard: () => terrainDifficulty >= 15
  };

  if (triggers[context.type]()) {
    const challenge = selectChallenge(context.archetype, context.location);
    return challenge;
  }
}
```

### Reward Scaling

```javascript
// Scale rewards by player level
function scaleReward(baseReward, playerLevel) {
  const scalingFactor = 1 + (Math.floor(playerLevel / 5) * 0.25);
  return {
    xp: Math.floor(baseReward.xp * scalingFactor),
    gold: Math.floor(baseReward.gold * scalingFactor),
    reputation: baseReward.reputation // Doesn't scale
  };
}
```

### Critical Success/Failure

```javascript
// Determine outcome based on roll
function resolveChallengeOutcome(roll, dc) {
  const total = roll.total;
  const natural = roll.natural;

  if (natural === 20 || total >= dc + 5) {
    return 'criticalSuccess';
  } else if (total >= dc) {
    return 'success';
  } else if (natural === 1 || total <= dc - 10) {
    return 'criticalFailure';
  } else {
    return 'failure';
  }
}
```

### Location-Based Challenge Pool

```javascript
const challengesByLocation = {
  mountain: ['rockslide', 'cliff_climb', 'blizzard', 'thin_air'],
  forest: ['bandit_tollgate', 'wild_beast', 'quicksand', 'tracking'],
  desert: ['extreme_heat', 'sandstorm', 'mirages', 'flash_flood'],
  dungeon: ['trap', 'locked_door', 'puzzle', 'cursed_relic'],
  settlement: ['merchant_negotiate', 'guard_bribery', 'faction_mediate'],
  ruins: ['ancient_runes', 'crumbling_structure', 'guardian_riddle'],
  // etc...
};
```

---

## Encounter Frequency

| Location Type | Challenge Rate | Archetype Distribution |
|--------------|----------------|----------------------|
| **Wilderness** | 8% per travel | Environmental (50%), Survival (30%), Discovery (20%) |
| **Dungeon** | 25% per room | Puzzle (40%), Heists (30%), Dynamic (20%), Discovery (10%) |
| **Settlement** | Quest-driven | Social (60%), Discovery (30%), Heists (10%) |
| **POI** | 100% (feature) | Discovery (50%), Environmental (25%), Puzzle (25%) |
| **Random** | 5% per move | Dynamic (40%), Environmental (35%), Social (25%) |

---

## Feasibility Checklist

✅ **Uses existing skill system** (13 skills)
✅ **Uses existing DC system** (10, 13, 15, 18, 20)
✅ **Uses existing reward types** (XP, gold, items, reputation)
✅ **Uses existing combat system** (can trigger fights)
✅ **Uses existing condition system** (Exhaustion, Poisoned, etc.)
✅ **Integrates with locations** (terrain, POIs, dungeons)
✅ **Supports sequential challenges** (multi-stage)
✅ **Supports choice challenges** (player picks approach)
✅ **Scales with difficulty settings** (Easy/Normal/Hard)
✅ **No new systems required** (works with current codebase)

---

## Next Steps

1. **Implement Challenge Manager** (`src/systems/SkillChallengeManager.js`)
2. **Expand `skillChallenges.json`** with new templates from this design
3. **Hook into existing systems:**
   - Random encounters (Player.js)
   - POI exploration (WorldGenerator.js)
   - Quest objectives (QuestManager.js)
   - Dungeon rooms (future DungeonGenerator.js)
4. **Create UI for challenge presentation** (show options, DCs, consequences)
5. **Playtest and balance** DCs and rewards

---

**Design Status:** ✅ Ready for Implementation
**Estimated Implementation Time:** 2-3 development sessions
**Dependencies:** Existing game systems only
