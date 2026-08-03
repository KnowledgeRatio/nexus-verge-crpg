---
name: passive-modifier-registry
description: PassiveModifierRegistry — fighting-style bonus lookups, never check fightingStyle === 'X' directly
metadata:
  type: project
---

## PassiveModifierRegistry (implemented 2026-05-27)
- `src/systems/PassiveModifierRegistry.js` — all fighting style bonuses live here. Exported: `getPassiveAttackBonus`, `getPassiveACBonus`, `getPassiveDamageBonus`, `getPassiveUnarmedDie`, `passiveAddsOffHandAbilityMod`, `passiveShouldRerollDamage`.
- Styles registered at module bottom: `marksmanship`, `defense`, `mariner`, `dueling`, `greatWeaponFighting`, `twoWeaponFighting`, `unarmedFighting`.
- Imported by CombatManager.js (attack/damage hooks), Character.js (AC), and main.js `calculateACForCharacter` (AC). Never reference `fightingStyle === 'X'` directly — always go through the registry.
- `getPassiveDamageBonus` ctx must include: `{ isRanged, isOffHand, twoHanded, offHandEmptyOrShield }`. `getPassiveUnarmedDie` ctx: `{ bothHandsFree }`. `passiveShouldRerollDamage(styleId, roll, { twoHanded })`.
