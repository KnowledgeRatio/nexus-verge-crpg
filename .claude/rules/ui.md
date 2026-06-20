---
paths: src/ui/**, src/main.js, index.html, styles.css
---
# UI Rules

## State → UI Flow
Always use the observer pattern. Never read gameState directly in a render loop.

```javascript
gameState.subscribe('character.currentHP', (hp) => updateHPDisplay(hp));
gameState.set('character.currentHP', newHP); // subscriber fires automatically
```

After any character mutation, call `gameState.set('character', character)` then `this.updateHUD(character)`. Without `gameState.set`, changes are lost on next state read.

## Modals
Modals toggle via `.active` CSS class — no `display: none` manipulation. Backdrop click and ESC key must both close modals.

## Equipment Slot Order
Consistent across character sheet and inventory modal:
1. Main Hand
2. Off-Hand (weapons or shield — shields always equip here)
3. Armor
4. Helmet
5. Artifact

Never add a separate Shield slot — it's Off-Hand.

## Floating Combat Text
```javascript
showFloatingCombatText(combatantId, text, type)
// types: 'damage' (red), 'critical' (yellow), 'healing' (green),
//        'buff' (cyan), 'condition' (orange), 'miss' (grey)
```
Positioned relative to the combatant card. 1.5s lifetime, auto-removed. Purely presentational — no state.

## Combat Movement Block
Check `gameState.get('combat')?.active` at the start of `handleMovement()`. Show warning once per combat (`shownCombatMovementWarning` flag, reset in `endCombat()`).

## Skill Challenge Modals
- **Environmental challenges** (one-shot, terrain-based): use `skillCheckModal` / `choiceChallengeModal`
- **Social challenges** (multi-turn, NPC-driven): use `socialChallengeModal` + `SkillChallengeManager`

Never mix these two paths.

## Responsive Sidebar
Combat sidebar width scales by breakpoint: 350px → 400px → 500px → 550px → 600px (at 1920px+). Combat log max-height scales with it. Turn order capped at `max-height: 200px` with overflow scroll.

## Pixel Art Toggle
Map rendering mode (`nexusVerge_usePixelArt`) and zoom index (`nexusVerge_zoomIndex`) are persisted to localStorage. Zoom levels: [16, 24, 32, 48]px. The `tileImage` field in `terrains.json` controls which terrains have pixel art; `null` = ASCII fallback.
