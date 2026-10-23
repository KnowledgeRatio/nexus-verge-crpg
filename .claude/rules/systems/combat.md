---
paths: src/systems/CombatManager.js
---
# Combat System Rules

## Combatant Schema
Each `Combatant` has:
- `conditions: []` — array of condition objects (see below)
- `conditionImmunities: []` — condition-type strings; the Combatant getter/setter uses the authoritative `character.conditionImmunities` array, including plain restored data. `toJSON()` explicitly copies this array.
- `masteryEffects: { sapped, slowed, vexed, prone }` — legacy, being migrated to conditions
- `hasEngaged: false` — set `true` on first melee attack; only engaged enemies count for flee DC and opportunity attacks
- `team: 'player' | 'enemy' | 'companion'`
- `sourceCharacter` — back-reference to the original character object, populated for companions and used for `isDowned` writeback

## Conditions Object Shape
```javascript
{
  type: string,           // 'slowed', 'sapped', 'prone', 'shielded', etc.
  duration: string,       // 'untilStartOfTurn' | 'untilEndOfTurn' | 'rounds' | 'combat' | 'permanent'
  appliedBy: string,      // combatant ID
  value: any,             // effect value (e.g. -1 for AC reduction)
  roundsRemaining: number,
  isBuff: boolean,
  curable: boolean,
  icon: string            // emoji for UI
}
```
`addCondition()` prevents stacking. `removeCondition()` checks curability. Cure spells use `removeCurableConditions()` which only removes debuffs.

`addCondition()` returns a boolean and rejects immune types before any stack, refresh or value change. `conditionApplication.js` provides the shared immunity query and rejection message for runtime and plain restored actors. Do not bypass this check or claim that a rejected condition applied.

Generic control handlers report `conditionApplied` and `conditionOutcome` (`applied`, `immune`, `alreadyAffected` or `saved`). Immunity blocks the condition, not otherwise valid damage, resource costs or unrelated effects. Do not show condition-success text, start concentration or consume the one-shot Exposed benefit for an immune control effect. Topple skips its condition save/reaction when the target is immune to prone and reports immunity; the attack damage remains.

## Flee Formula
```
d20 + floor((Prowess_mod + Intuition_mod) / 2) + proficiency bonus >= DC   (RULES.attributes.system === 'NVSystem', current default)
d20 + max(DEX modifier, WIS modifier) + proficiency bonus >= DC   (RULES.attributes.system === '5EClassic')
DC = 10 + 2 × (engaged_enemies - 1) + situational modifiers
```
See `docs/plans/2026-07-30-attribute-system-remap.md` decision #4 for the NVSystem-mode formula's rationale.
- Boss encounter: +5 DC. Ambush (round 1): +3 DC. DC cap: 25.
- Restrained/Grappled/Stunned/Paralyzed/Unconscious: blocks flee entirely.
- Prone: disadvantage on flee check. Frightened: advantage.
- Standard flee costs an Action. Audacity Cunning Action (level 2+): flee as Bonus Action.
- Opportunity attacks resolve **before** flee check. Only engaged melee enemies attack.

## Initiative
Initiative is `d20 + Intuition modifier` in `NVSystem`. Tied totals are broken by the higher Intuition modifier. Both calculation paths must resolve through `RULES.attributes.derivedStatMap.initiative`; never read DEX directly. The temporary `5EClassic` rollback mode redirects that same context to DEX. Companions use `team: 'companion'` and slot into the single unified turn queue — no team grouping.

## Combat End Event
`endCombat()` emits `gameState.notify('combat.ended', { outcome })` for victory, TPK, and flee outcomes. `CompanionManager` subscribes to this event for post-combat handling.

## Action Economy
Each combatant gets: Action, Bonus Action, Reaction per turn. Movement is narrative-only (no grid).

## Engagement
Melee attacks add reciprocal `engagedWith` links, including on a miss. Links accumulate:
attacking another target never releases previous opponents. Ranged attacks do not
add or clear links. Only an explicit removal rule, such as Disengage or defeat,
clears engagement. Multiple attackers and shared opponents must remain supported.

## Weapon Mastery Checks
`hasWeaponMastery(attacker, weapon, masteryType)` — requires proficiency with the weapon. Never apply mastery effects without this check.
