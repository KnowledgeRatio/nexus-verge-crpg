# Third-Party Asset Attributions

This document provides attribution and licensing information for all third-party assets used in **Nexus Verge**.

---

## Sound Effects

All sound effects used in this game are sourced from Thomas Devlin and require proper attribution:

### Thomas Devlin - Music & Audio
**Source:** https://tommusic.itch.io/
**Author:** Thomas Devlin
**License:** Please verify specific license terms at source

**Assets Used:**
- All combat sound effects in `data/sound/` directory
- All movement footstep sounds
- All UI interaction sounds
- All audio assets (13 files total)

**Attribution Statement:**
All audio created by Thomas Devlin. For more works and licensing information, visit https://tommusic.itch.io/

**Note:** If you have specific license information from Thomas Devlin (e.g., Creative Commons, royalty-free with attribution, commercial license, etc.), please update this section with complete license details including:
- License type (e.g., CC BY 4.0, royalty-free, etc.)
- Usage terms (commercial use allowed, attribution required, etc.)
- Any restrictions or requirements

---

## Sound Asset Inventory

All sound files are created by Thomas Devlin (https://tommusic.itch.io/)

### Combat Sounds
| File | Purpose |
|------|---------|
| `Bow Blocked 1.wav` | Ranged miss sound |
| `Sword Attack 1.wav` | Melee miss sound |
| `Sword Impact Hit 2.wav` | Melee critical hit |
| `Sword Impact Hit 3.wav` | Melee regular hit |
| `Spell Impact 1.wav` | Ranged regular hit |
| `Spell Impact 2.wav` | Ranged critical hit |
| `Ice Freeze 1.wav` | Healing/buff sound |

### Movement Sounds
| File | Purpose |
|------|---------|
| `Dirt Run 1.wav` | Footstep variant 1 |
| `Dirt Run 2.wav` | Footstep variant 2 |
| `Dirt Run 3.wav` | Footstep variant 3 |
| `Dirt Run 4.wav` | Footstep variant 4 |
| `Dirt Run 5.wav` | Footstep variant 5 |

### UI Sounds
| File | Purpose |
|------|---------|
| `Light Torch 2.wav` | UI interaction |

---

## Attribution Statement

**All Audio by Thomas Devlin**

Website: https://tommusic.itch.io/

All audio assets (13 files) in this game are created by Thomas Devlin. We gratefully acknowledge Thomas's contribution to this project.

**Support Thomas:** https://tommusic.itch.io/

---

## Fonts

**No custom fonts are used.** The game uses system fonts specified in CSS:
- **Primary:** `var(--font-mono)` = `'Courier New', Courier, monospace`
- **Fallback:** System default monospace fonts

System fonts do not require attribution as they are pre-installed on user devices.

---

## Textures and Graphics

**No third-party textures or graphics are used.** All visual rendering uses:
- **ASCII characters** - Standard Unicode glyphs (no custom sprites)
- **HTML5 Canvas drawing** - Programmatic rendering (rectangles, text)
- **CSS styling** - Pure CSS for UI components

All visual code and styling is original work.

---

## Icons and Emojis

**Unicode emoji characters** are used throughout the UI:
- ⚔️ (Crossed Swords) - Combat indicator
- 📜 (Scroll) - Quest indicator
- 🗡️ (Dagger) - Weapon icon
- 🛡️ (Shield) - Defense icon
- ✨ (Sparkles) - Buff indicator
- 💫 (Dizzy) - Debuff indicator

Unicode emoji are part of the Unicode Standard and do not require licensing or attribution.

---

## Music

**No background music is currently included.** The game framework supports music playback but no music files are distributed at this time.

If music is added in future versions, attribution will be provided here.

---

## Future Asset Additions

When new third-party assets are added, they will be documented in this file with:
1. **Source:** Where the asset was obtained
2. **License:** Full license type and terms
3. **Author:** Original creator
4. **Purpose:** How the asset is used in the game

---

## Verification

Asset attribution can be verified by:
1. Checking source URLs provided above
2. Reviewing license files at source repositories
3. Examining the `data/sound/` directory for included assets
4. Running `npm run legal:verify` to check for missing attributions

---

## Updating This Document

This document should be manually updated whenever:
- New audio assets are added
- New graphics/textures are included
- Custom fonts are integrated
- Music tracks are added

Automated checks can be run with:
```bash
npm run legal:verify-assets
```

---

**Last Updated:** 2026-01-14
**Asset Directories Covered:** `data/sound/`, `assets/`
