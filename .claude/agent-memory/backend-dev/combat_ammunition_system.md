---
name: combat-ammunition-system
description: Ranged weapon ammoCapacity/ammoCount tracking, refill consumable, and forgecraft practice interaction
metadata:
  type: project
---

## Ammunition System (implemented 2026-03-08)
- `ammoCapacity` field on ranged weapon items.json entries is the magazine size (shortbow/longbow=20, crossbows=15, heavyCrossbow=10).
- `ammoCount` is set at runtime on the equipped weapon object (initialized lazily from `ammoCapacity ?? 20` on first attack).
- Ammo check block goes BEFORE the push restriction check in `attack()` (returns early if 0). Decrement goes AFTER all mastery/condition blocks, BEFORE `consumeAction`.
- Only the player's ammoCount is persisted to gameState (`attacker.id === 'player'`). Monster ammo is not tracked.
- Consumable `quiverOfArrows` (`effect: "refillAmmo"`, `charges: 20`) in items.json consumables array. Frontend must handle `effect === "refillAmmo"` to set `weapon.ammoCount = weapon.ammoCapacity ?? 20`.
- Forgecraft practice check in `Character.longRest()`: if `this.practices?.includes('forgecraft')` and mainHand is ranged, refills to `ammoCapacity ?? 20`.
- `handCrossbow` and `heavyCrossbow` added as full weapon entries in items.json (they were only referenced in weaponMasteries.json/classes.json before).
