# Frontend Developer Memory - Nexus Verge

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

## Pitfalls to Avoid
- Never add `overflow: hidden` to a flex child that needs to scroll — use `min-height: 0` on it instead so it can shrink and activate the scrollbar.
- Do not inline raw hex colors on elements where an existing CSS variable covers the semantic intent. Use variables for game UI; explicit colors are fine only for branded/feature-specific components.
- The `devModeBtn` uses `margin-top: 20px` inline style — any button added after it should use a smaller value (`8px`) so it visually groups with the secondary buttons.
