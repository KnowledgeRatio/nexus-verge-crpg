# Nexus Verge: Party Member System Design

**Date:** 2026-03-07
**Author:** Chief Game Designer
**Status:** Design Document - Ready for Architect Review

---

## Pre-Analysis: Rules Compliance Check

Before the design, let me establish where this system maps to D&D 5e RAW and where it principally deviates.

**D&D 5e Comparison:** The closest analog is the Sidekick rules from Tasha's Cauldron of Everything (p. 142) and the 2024 PHB's treatment of adventuring companions. This gives us design latitude.

**Proficiency stacking (the novel mechanic):** RAW, proficiencies do not stack. The "companion proficiency stacks ON TOP of the leader's" mechanic is a principled deviation. It treats group skill challenges as a collaborative pool rather than individual checks, which is faithful to how D&D 5e group checks work (PHB 2024, p. 21: "If at least half the group succeeds, the whole group succeeds"). We are formalizing that into a quantitative bonus. Justified.

---

## Rules Compliance

**RAW Match:** Party size of 4 (player + 3) is standard D&D convention. Full character sheets, leveling, and combat control per-companion matches Baldur's Gate 3's interpretation of the rules.

**Justified Deviations:**
- Companion proficiency stacking on skill challenges
- Wanderlust companions contributing to 3 skills instead of 2 (class-driven feature)
- Permanent death as default (5e has Raise Dead; roguelike permanence is a principled design choice)

---

## 1. Acquisition System

### Philosophy

In a roguelike, party members must be discoverable through play, not guaranteed. This creates run variance. Companions are a resource - you choose whether to invest actions and risk bringing them along. A party of 4 is not always better than a party of 2; relationship and action economy costs must be real.

### Recruitment Triggers

**A. Settlement Rest Points (Primary Source)**

When the player takes a long rest at a tavern, the settlement may have companion candidates in the common room. These are procedurally generated from the current dungeon's encounter table's level range.

- Settlements roll 1-3 candidates on arrival (seeded to settlement, not re-rolled on revisit)
- Each candidate has a Calling, a brief bio, and a recruitment condition
- Recruitment conditions create choices: some candidates join free, some want gold, some want you to complete a task first

**B. Combat Rescue Events (Secondary Source)**

Procedural encounters can include an NPC fighting alongside the player's target. If the player leaves that NPC alive and speaks to them post-combat, a recruitment offer triggers.

- Chance to appear: 20% of non-boss encounters in dungeon zones
- These companions always join at the player's current level minus 1
- Creates a minor narrative hook without requiring authored content

**C. Quest Completion Rewards (Tertiary Source, Authored)**

Specific quest lines can unlock named companions with authored personality. These are the highest-relationship-ceiling companions.

- "Named" companions have authored dialogue trees
- "Generic" companions (A, B above) use the dialogue template system
- Design target: 2-3 named companions per campaign, unlimited generic

**D. Dungeon Events (Roguelike Surprise)**

Specific dungeon room types can contain a trapped or imprisoned NPC. Freeing them offers a recruitment choice.

- No recruitment condition — they join immediately out of gratitude
- Relationship starts at Neutral (not Friendly) — gratitude doesn't mean loyalty
- These companions have the highest risk of leaving if treated poorly

### Capacity Rules

- Max party of 4 (player + 3). Hard cap, no exceptions.
- If at cap and a new candidate appears, the player must choose: pass on the candidate, or dismiss a current companion.
- Candidates do not persist indefinitely. Settlement candidates leave if you visit another settlement before recruiting them.

---

## 2. Removal System

### Removal Vectors

**A. Player-Initiated Dismissal**

Available anytime outside combat.

- If relationship is Friendly or higher: companion leaves with parting dialogue, no penalty
- If relationship is Neutral: companion leaves, no dialogue
- If relationship is Hostile: companion leaves with a threat — this can seed a future enemy encounter

**B. Death — The Roguelike Decision**

| Option | Roguelike Fit | D&D Fit | Verdict |
|--------|--------------|---------|---------|
| Permanent death (no recovery) | High | Low | Too punishing for first implementation |
| Death with revival cost (gold + long rest) | Medium | Medium | Good starting point |
| Unconscious only, auto-revives after combat | Low | High | Too safe, removes tension |
| Death + relationship cost to remaining party | High | Medium | Best roguelike variant |

**Recommended:** Companions drop to 0 HP and are "Downed" (unconscious, out of combat). After combat, the player can choose to stabilize them (free, automatic). At next long rest, they return to 1 HP. However: if a companion is Downed and the combat ends in a TPK or forced retreat before they are stabilized, they die permanently.

**Balance note at level 1:** At level 1-2, companions have a free "Last Stand" — they return from 0 HP to 1 HP once per long rest without player intervention. This disappears at level 3.

**C. Relationship-Driven Departure**

When the relationship meter hits the Hostile threshold, the companion presents an ultimatum at the next rest. If the player does not satisfy the condition, the companion leaves at dawn.

- NOT triggered mid-combat. Companions finish fights even if angry.
- The ultimatum gives the player one session to fix things.
- Cannot be re-recruited this run.

**D. Faction Conflict Departure**

If the player takes an action that directly contradicts the companion's stated faction allegiance, the companion leaves immediately. Authored companions only.

---

## 3. Relationship System

### The "Soul" Mechanic

Companions have an inner motivation that the player can learn through dialogue and observation. This motivation governs what they react positively and negatively to. The soul is not revealed at recruitment — it emerges through play.

Generic companions have one of five motivation archetypes (seeded at creation):
- **Duty** — cares about protecting innocents, keeping promises
- **Wealth** — cares about gold, rewards, not dying for nothing
- **Glory** — cares about facing worthy opponents, being recognized
- **Knowledge** — cares about discovery, ruins, lore
- **Freedom** — cares about autonomy, resents being ordered around

Named companions have authored motivations revealed through their quest lines.

### Relationship Meter

A hidden integer from -100 to +100. Players never see the number directly — they see a tier label and behavioral shifts.

| Tier | Range | Label | Visible Effects |
|------|-------|-------|-----------------|
| Hostile | -100 to -51 | "Distant" | Reduced combat performance, ultimatum pending |
| Unfriendly | -50 to -21 | "Wary" | No bonus actions for player requests, terse dialogue |
| Neutral | -20 to +20 | "Cordial" | Default state. Functional, no extras |
| Friendly | +21 to +60 | "Trusted" | Companion uses bonus actions proactively, expands dialogue |
| Devoted | +61 to +100 | "Devoted" | Unique combat reactions, share resources, exclusive dialogue |

The internal number is hidden. Players learn to read the companion. This is intentional — it's a social skill, not a meter management game.

### What Drives Relationship Changes

**Positive Events (values-gated by motivation):**

| Event | Duty | Wealth | Glory | Knowledge | Freedom |
|-------|------|--------|-------|-----------|---------|
| Save civilian NPC | +10 | +0 | +2 | +0 | +3 |
| Accept high-risk quest | +3 | -5 | +10 | +5 | +2 |
| Share loot fairly | +5 | +15 | +0 | +0 | +8 |
| Explore optional ruin | +0 | -3 | +2 | +15 | +5 |
| Let companion make decision | +0 | +0 | +2 | +0 | +12 |
| Win a hard fight | +5 | +3 | +12 | +0 | +0 |

**Negative Events:**

| Event | Duty | Wealth | Glory | Knowledge | Freedom |
|-------|------|--------|-------|-----------|---------|
| Abandon civilian NPC | -15 | +0 | -3 | +0 | +0 |
| Flee from enemy (cowardly) | -5 | +8 | -15 | +0 | +0 |
| Take all loot without sharing | +0 | -20 | +0 | +0 | -5 |
| Skip dungeon exploration | +0 | +5 | -2 | -15 | +0 |
| Override companion's expressed preference | -5 | -5 | -5 | -5 | -15 |
| Companion downed, not stabilized | -10 | -10 | -10 | -10 | -10 |

**Combat Performance Events (universal):**

- Player kills enemy that had companion in kill range: +3
- Player orders companion into suicide position (downed): -8
- Player ignores companion being attacked for 2+ turns: -5
- Companion lands killing blow on significant enemy: +5

### Rest-Based Relationship Activities

At long rest (tavern), companions offer optional activity interactions:

- **Train Together:** Dedication companion. +8 relationship. One per long rest.
- **Share a Drink:** Universal. +5 relationship. Advances one dialogue node (reveals motivation hint).
- **Spar (Friendly):** Glory/Duty companions prefer this. Player makes one attack roll vs. companion's AC (no damage). Success: +8, failure: +4.
- **Plan the Route:** Knowledge/Duty companions. +5 Rel. Reveals one hidden room on next dungeon map.
- **Split the Spoils:** Wealth companions. Player offers gold. +1 rel per 5 gold spent, up to +15 per rest.

### Devoted Tier Mechanics

When a companion reaches Devoted, they unlock a unique passive:

| Motivation | Devoted Passive |
|------------|----------------|
| Duty | Once per long rest, companion uses their Reaction to impose Disadvantage on an attack targeting the player |
| Wealth | Companion's loot rolls have +1 tier bonus (uncommon → rare). Shared with player. |
| Glory | Companion deals +2 damage on their first attack of any combat |
| Knowledge | Companion reveals the type of the next dungeon boss before entry |
| Freedom | Companion can take the Help action as a free action once per combat |

---

## 4. Skill Challenge Integration

### Core Mechanic

Standard companions (Dedication, Scholar) have 2 designated skill proficiencies. Wanderlust companions have 3. In a skill challenge, companion proficiency bonus adds directly to the roll for those skills only.

**Resolution Formula:**

```
Effective Skill Bonus = Player Base Bonus + (Sum of companion proficiency bonuses for this skill)
```

Where:
- Player Base Bonus = ability modifier + (proficiency bonus if proficient) + (proficiency bonus again if Expertise)
- Companion contribution = their proficiency bonus only (not their ability modifier)

### Specific Examples

**Scenario: Athletics check, DC 15**

Level 5 player (Wanderlust, Athletics Expertise: DEX +2, prof +3, expertise = +8 total) plus one Dedication companion with Athletics proficiency.

```
Player bonus:     +8 (DEX mod +2, proficiency +3, Expertise +3)
Companion:        +3 (level 5 proficiency)
Effective total:  +11
Needs: 4+ on d20 (85% success vs. 70% without companion)
```

**Scenario: Investigation check, DC 18**

Level 3 player (Dedication, NOT proficient in Investigation: INT +0) plus one Scholar companion and one Wanderlust companion, both with Investigation.

```
Player bonus:     +0
Scholar:          +2 (level 3 proficiency)
Wanderlust:       +2 (level 3 proficiency)
Effective total:  +4
Needs: 14+ on d20 (35% success vs. 15% without companions)
```

### Skill Assignment at Companion Creation

**Dedication companion:** 2 skills chosen from: Athletics, Acrobatics, Endurance, Perception, Empathy, Influence, Cunning

**Scholar companion:** 2 skills chosen from: Arcana, Academia, Empathy, Investigation, Creativity, Cunning

**Wanderlust companion:** 3 skills chosen from: Acrobatics, Athletics, Deception, Empathy, Influence, Investigation, Perception, Creativity, Sleight of Hand, Cunning

Players should see companion skill contributions on the companion sheet before recruiting.

### Stacking Cap

**Rule:** Companion contributions to any single skill check are capped at the player's proficiency bonus. So at level 5 (+3 proficiency), companions can add a maximum of +3 total across all contributors for that skill.

This means one full-proficiency companion gives the maximum benefit. A second companion in the same skill provides no bonus for that skill but contributes to their other skills. This prevents full-Wanderlust parties from trivializing all social/skill content.

### Passive Check Integration

Passive checks use `10 + modifier`. Companion contributions still apply.

```
Player: Wanderlust with Empathy proficiency. CHA +3, proficiency +2 → +5. Passive: 15.
Companion: Wanderlust type with Empathy as one of their 3 skills. Proficiency +2.
Effective passive: 10 + 5 + 2 = 17.
```

---

## 5. Combat Integration

### Turn Order

All party members participate in the same initiative order as the player, as separate entities.

1. Player character turn
2. Companion turns (in initiative order, highest to lowest)
3. Enemy turns

Each companion turn: player takes direct control of that companion. Interface switches context to the companion's action panel. This is the BG3 model.

**Initiative:** Each companion rolls their own d20 + DEX modifier at combat start. Automatic — no player input needed. Companion initiatives shown in the turn order tracker.

### Action Economy Per Companion

Each companion has the full standard action economy:
- 1 Action
- 1 Bonus Action
- 1 Reaction (auto-resolved or player-prompted)
- Movement (non-grid: "engage" or "disengage" positioning)

Dedication companions have access to Steady Nerve, Action Surge, Extra Attack — these must be available to player-controlled companions.

**Reaction handling:** Reactions should auto-trigger based on a per-companion setting: "Auto-use reactions: Always / Ask / Never." Default to "Always" for simplicity. "Ask" pauses combat and prompts.

### UI Requirements

1. **Turn order tracker** — All entities in initiative order, labeled with icons (player = distinct, companion = colored per companion, enemy = red).
2. **Active companion switcher** — When it's a companion's turn, the ability bar switches to show that companion's abilities.
3. **Party health overview** — A persistent bar showing all 4 party members' HP at all times.
4. **Companion ability queue** — Optional: right-click on a companion during player's turn to queue a single planned action.

### Encounter Scaling

With a full party of 4, encounter HP must scale or fights will be trivially easy.

**Recommendation:** Add `RULES.party.encounterScalingMultiplier` in `rulesEngine.js`.

Starting point: Enemy HP x 1.25 per additional companion above 1. Tune upward based on playtesting.

```
1 companion: x1.25 enemy HP
2 companions: x1.5 enemy HP
3 companions (full party): x1.75 enemy HP
```

---

## 6. Character Progression

### Level Synchronization

Companions level up when the player levels up. Not independently.

**Rationale:**
1. Players don't track separate XP for 3 companions. Cognitive load is already high.
2. Companion death has a relationship cost, not a progression cost.
3. The roguelike's compressed level 1-10 curve needs all party members to feel power spikes simultaneously.

### Class Options

Companions can be any Calling. Their class functions identically to the player's class. Companions use the same `classes.json` entries — no separate companion class data.

**Specializations at level 3:** The player chooses the companion's specialization. The companion's reaction to the choice (which can affect relationship slightly, based on motivation) gives the companion agency without taking the choice from the player.

### ASI at Level 4

Companions get the same ASI at level 4. Player chooses from a limited set: the companion's two primary ability scores, or a feat from a companion-appropriate list. Full feat selection is too complex for roguelike companion management.

---

## 7. Party Synergies

### D&D 5e Synergies (RAW)

**Help Action:** Any companion can use their Action to give the player Advantage on an attack or skill check. Costs the companion's full action — a real trade-off.

**Bardic Inspiration (Wanderlust):** Companions can grant Bardic Inspiration dice to the player or other companions.

**Sneak Attack Enablement:** If any party member is Engaged with the enemy, the Wanderlust's Sneak Attack triggers.

**Stunning Strike Setup:** A Dedication companion who lands Stunning Strike applies Stunned. Stunned enemies grant Advantage to all attackers, triggering Sneak Attack for Wanderlust. Costs Focus per attempt.

### Composition-Based Passive Synergies (Designed)

These live in `rulesEngine.js` and are toggleable.

**Vanguard (3+ Dedication in party):** All Dedication party members gain +1 to attack rolls.

**Arcane Assembly (2+ Scholar in party):** Mana recovery from Arcane Recovery increases by 1 for all Scholars.

**Band of Rogues (3+ Wanderlust in party):** Bardic Inspiration dice upgrade by one step (d6 → d8, d8 → d10 capped).

**True Party (one of each Calling + player):** All skill challenge checks gain a flat +1 bonus.

**Note:** These synergies must not be so powerful that they dictate party composition. The goal is to make every composition feel good with slight reward for certain archetypes.

---

## Balance Assessment

### Level 1

- Single companion doubles player action economy. Enemy HP scaling must be tuned immediately.
- Companion has 8-10 HP (Dedication d10). Will go down in 2 hits. "Last Stand" mechanic at level 1-2 prevents feel-bad moments.
- Skill challenges: +2 companion proficiency shifts DC 10-12 checks from ~60% to ~70% success. Correct.

### Level 5 (Extra Attack breakpoint)

- Full party of 4 Dedication companions = 8 attacks per round plus player's 2.
- Stunning Strike creates a viable combo loop. Costs Focus, lasts one turn. Acceptable.

### Level 10 (Capstone)

- Focus pools large enough to sustain high-frequency special abilities.
- Skill challenge stacking cap prevents trivial success.
- Encounter design must assume full party of 4 as expected state.

---

## Data Schema Additions Required

### companion.json (new file in `/data/`)

```json
{
  "companionTypes": {
    "standard": { "skillContributions": 2 },
    "wanderlust": { "skillContributions": 3 }
  },
  "motivationArchetypes": ["duty", "wealth", "glory", "knowledge", "freedom"],
  "relationshipTiers": {
    "hostile":    { "range": [-100, -51], "label": "Distant" },
    "unfriendly": { "range": [-50, -21],  "label": "Wary" },
    "neutral":    { "range": [-20, 20],   "label": "Cordial" },
    "friendly":   { "range": [21, 60],    "label": "Trusted" },
    "devoted":    { "range": [61, 100],   "label": "Devoted" }
  },
  "acquisitionSources": ["settlement", "rescue", "quest", "dungeon"],
  "lastStandLevelCap": 2
}
```

### rulesEngine.js additions

```javascript
RULES.party = {
  maxSize: 4,
  maxCompanions: 3,
  skillContributionCap: "proficiencyBonus",  // capped at player's proficiency bonus
  companionTypes: { standard: 2, wanderlust: 3 },
  encounterScalingMultiplier: 1.25,           // per additional companion above 1
  synergies: {
    enabled: true,
    vanguard:       { minDedication: 3, attackBonus: 1 },
    arcaneAssembly: { minScholar: 2, arcaneRecoveryBonus: 1 },
    bandOfRogues:   { minWanderlust: 3, inspirationDieUpgrade: true },
    trueParty:      { requireAllCallings: true, skillChallengeBonus: 1 }
  }
};
```

---

## Pillar Alignment

| Pillar | Coverage |
|--------|----------|
| Authentic D&D 5e | Party of 4, full action economy per character, RAW class features, Help action synergy, group check interpretation |
| Infinite Replayability | Procedural companion generation, motivation variety, relationship arc variety, composition-based synergies |
| Meaningful Choices | Recruitment choices, dismissal consequences, rest activity investment, companion specialization at level 3, who to stabilize in a losing fight |
| Performance First | Companions use same class data as player (no duplicate systems), relationship is an integer, encounter scaling is a multiplier |
| Modifiable Foundation | All party rules in `RULES.party`, synergies toggleable, companion data in `companion.json`, skill contribution count in JSON |

---

## Key Design Decisions Summary

1. **Skill contribution stacking cap** (capped at player's proficiency bonus) prevents full-Wanderlust parties from trivializing skill/social content.
2. **Last Stand mechanic** for levels 1-2 prevents new players losing companions on the first dungeon floor.
3. **Devoted tier passives** are the most important design feature — they make relationship investment feel earned and visible.
4. **Encounter scaling multiplier** must be implemented alongside the first companion, not after.
5. **Wanderlust Expertise** (explicitly deferred): when ready, Wanderlust companions with Expertise in one of their 3 skills can contribute 2x their proficiency bonus to that skill, but the stacking cap still applies.

---

## Implementation Order (Handoff)

1. **Architect** — Design the data schema, relationship store in save system, companion state persistence across rest cycles
2. **Backend Dev** — Implement `CompanionManager.js`, extend `CombatManager` for multi-character turn sequencing, wire companion proficiency into `SkillChallengeManager`
3. **Frontend Dev** — Party health overview bar, turn order tracker with companion entities, action panel context-switching
4. **Devils Advocate** — Review encounter scaling numbers before committing (1.25x HP multiplier is a starting guess)
