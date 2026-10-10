# Skill System Rules

## Canonical model

Nexus Verge uses nine broad skills representing experience or excellence: Athletics, Finesse, Survival, Craft, Lore, Investigation, Perception, Empathy, and Influence. `data/skills.json` is the source of truth for IDs, names, legacy aliases, and attribute pairings.

Each skill has exactly one primary and one secondary NVSystem attribute. Content authors select an allowed attribute to express the approach; players select an authored approach, never an arbitrary raw attribute. Different approaches may have different DCs and outcomes. If content omits the attribute, the primary applies.

Retired skills are save/content aliases only. Arcana and Academia map to Lore; Acrobatics, Sleight of Hand, and Cunning map to Finesse; Deception maps to Influence; Endurance maps to Survival; Creativity maps to Craft. Do not author new content with retired IDs.

## Resolution architecture

- Resolve IDs, attributes, modifiers, rolls, and old-save migration through `src/systems/SkillRegistry.js`.
- Store proficiency and expertise on the character. Do not store an attribute-specific modifier as authoritative state.
- `SkillChallengeManager` owns challenge sequencing, party help, DC scaling, critical interpretation, and consequences; it delegates skill math to `SkillRegistry`.
- Dialogue, quests, settlement checks, traps, terrain, and dungeon checks must use the same resolver. Do not add a UI-local skill-to-attribute map.
- Use `SkillChallengeManager.getSkillCheckContext` for shared party help, fatigue and roll previews; plain saved characters must retain their skill modifiers.
- Omitted challenge cooldowns use `RULES.skillChallenges.defaultCooldownMs`; preserve explicit zero. Record actual attempts in saved `flags.skillChallengeAttempts`, never cancellation. Finite NPC opportunities use their authored completion flags.
- Quest room Investigation persists its initial attempt. Failed searches require the deliberate E retry action and the existing `RULES.fatigue.skillChallengeFatigue` cost; room reentry must not grant free rerolls.
- Expertise is the highest mastery tier. Player-facing wording may use “Expert” or “Master,” but the mechanical state remains `expertise` until a separately approved progression redesign.

## Canonical pairings

| Skill | Primary | Secondary |
|---|---|---|
| Athletics | Prowess | Resilience |
| Finesse | Prowess | Composure |
| Survival | Intuition | Resilience |
| Craft | Intellect | Prowess |
| Lore | Intellect | Intuition |
| Investigation | Intellect | Intuition |
| Perception | Intuition | Composure |
| Empathy | Composure | Presence |
| Influence | Presence | Composure |
