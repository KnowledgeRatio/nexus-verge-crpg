# Frontend Developer Memory - Nexus Verge

## Index
- [skills.json description field wired to a UI consumer](skills_json_description_field_wired.md) — was a pre-existing orphaned field; now a `title` tooltip on skill rows
- [main.js cannot be unit-imported in vitest](testing_main_js_not_importable.md) — AudioManager singleton side effect blocks it; don't retry this
- [Canvas corner-badge overlay pattern](canvas_corner_badge_overlay_pattern.md) — reusable idiom for stacking independent tile-state indicators in MapRenderer.js corners
- [POI reveal symmetric art fix](poi_reveal_symmetric_art_fix.md) — dungeon/sanctuary renderFeature() cases must resolve via feature.originalPoiType, never a generic icon
- [Worldbuilder UI removed dead fixed-count fields](worldbuilder_ui_removed_dead_fixed_count_fields.md) — wbDungeons/wbSanctuaries deleted from index.html 2026-08-09; main.js refs were backend-dev's cleanup, not mine

## Key File Locations
- `index.html` - 1432 lines (as of Roger feature). All modals live inside `#app` div, before the `<footer>` tag.
- `styles.css` - 7731 lines (as of Roger feature). New sections append at the very end.
- `src/main.js` - Main game loop and all UI setup methods.

## Confirmed Patterns

### Modal / Overlay Show-Hide
- Game modals use `classList.add/remove('active')` and a `.modal { display: none }` / `.modal.active { display: flex }` pair.
- The Roger overlay uses `.roger-overlay` + `.roger-overlay.active` with `display: none` / `display: flex` — same pattern adapted for non-`.modal` named classes.
- Always add ESC key listener, close button listener, and backdrop click listener for every modal.

### Multi-View Panels (e.g., auth -> agent -> chat)
- Use sibling divs inside a shared body, each with a base class that is `display: none` and an `.active` class that is `display: flex`.
- JS switches views by removing `.active` from current view and adding to the target view.

### CSS Variable Usage
- `--font-mono` for all monospace text (game title, stats, message log).
- `--warning-color` (#ffaa44) for orange accents — NOT raw `#ffaa00` etc.
- `--accent-color` (#4a9eff) for blue accents.
- `--bg-primary` / `--bg-secondary` / `--bg-tertiary` for background layers.
- `--text-primary` / `--text-secondary` / `--text-highlight` for text.
- Roger panel uses `#1a1a2e` / `#16213e` / `#c9a84c` / `#ffd700` as explicit values per spec — acceptable when a feature has its own design language distinct from game UI.

### Button Classes
- `.menu-btn` — full-width main menu button (font-mono, border, hover lift).
- `.menu-btn.secondary` — transparent background variant. Used for Dev Mode and Roger buttons.
- `.small-btn` — compact tertiary button.

### Responsive Breakpoints (all 6 required for game UI)
- `<768px` — mobile
- `768–1200px` — laptop (300px panel)
- `1200–1400px` — desktop (350px)
- `1400–1600px` — large (500px)
- `1600–1920px` — HD (550px)
- `1920px+` — ultra (600px)
- Roger modal only needed mobile + 768-1200 + 1200-1400 + 1400+ since it is a fixed-width overlay.

### Flexbox Layout for Scrollable Panels
- Outer container: `display: flex; flex-direction: column; overflow: hidden`.
- Scrollable inner section: `flex: 1; overflow-y: auto; min-height: 0`. The `min-height: 0` is critical — without it, flexbox children will not shrink below their content size.

### Accessible Attributes
- Close buttons: `aria-label="Close ..."`.
- Message containers that update dynamically: `aria-live="polite"`.
- Input fields: `aria-label="..."` when no visible `<label>` is present.

## index.html Structure Summary
- Screens: `#mainMenu`, `#newGameScreen`, `#loadGameScreen`, `#characterCreationScreen`, `#gameScreen`.
- Modals/overlays: appended just before the `<footer id="appFooter">` near the bottom of `#app`.
- Script: single `<script type="module" src="src/main.js">` at end of `<body>`.
- As of party system: `#partyHealthBar` lives between the `#hud` and the `.game-container` div inside `#gameScreen`.
- Line counts (post-party Phase 5): `index.html` ~1508, `styles.css` ~8420, `src/main.js` ~7430.

## Party System UI Patterns (Phase 5)
- Party health bar: `#partyHealthBar` with class `party-health-bar hidden`. JS removes `hidden` when party size > 1. Uses `gameState.getFullParty()`.
- Companion turn panel: `renderCompanionActions(companionId, combatState)` replaces the action panel when `combatState.isCompanionTurn === true`. Restored by `renderCombatActions()` on next player turn.
- Combat team filtering: allies panel (`#playerCombatants`) now renders `team === 'player' || team === 'companion'`. Enemy panel unchanged.
- `handleTargetClick()` checks `this.selectedAction === 'companionAttack'` before the player-turn guard, allowing companion-controlled attacks.
- `selectCompanionAction(actionType, companionId)` sets `this._pendingCompanionId` for the target-click handler to consume.
- Fallen companions: `buildFallenCompanionsHTML()` on the Game class reads `gameState.get('fallenCompanions')`. Called from both `showVictoryModal` and `showGameOver` in CombatManager via `window.game.buildFallenCompanionsHTML?.()`.
- CompanionManager is initialized in `initGameScreen()` before player spawn. `checkUltimata()` called after successful long rest in `setupRestSystem()`.
- Flee warning: class `flee-warning` added to the Flee button when downed companions exist. Animated pulsing orange glow via `@keyframes fleeWarnPulse`.

## Pitfalls to Avoid
- Never add `overflow: hidden` to a flex child that needs to scroll — use `min-height: 0` on it instead so it can shrink and activate the scrollbar.
- Do not inline raw hex colors on elements where an existing CSS variable covers the semantic intent. Use variables for game UI; explicit colors are fine only for branded/feature-specific components.
- The `devModeBtn` uses `margin-top: 20px` inline style — any button added after it should use a smaller value (`8px`) so it visually groups with the secondary buttons.
