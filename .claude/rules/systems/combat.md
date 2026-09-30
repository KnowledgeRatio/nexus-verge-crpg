---
paths: src/systems/CombatManager.js
---
# Combat System Rules

## Combatant Schema
Each `Combatant` has:
- `conditions: []` — array of condition objects (see below)
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
