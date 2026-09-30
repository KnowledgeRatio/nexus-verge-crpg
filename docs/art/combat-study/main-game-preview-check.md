# Main-game preview verification — 2026-09-25

Verified the renderer in `index.html`, not only the isolated animation study.
The browser used a disposable party built by `buildStudyEncounter` through the
canonical character/enemy factories: level-three traveller, firearm companion,
and one veteran. It entered the main game's normal pending-combat screen path.
This bypassed world travel and character creation; it does not establish a full
campaign/save-load playthrough.

Observed at 1100 × 760:

- `Show 3D preview` loaded the shared waystation asset with detailed paving.
- The main-game Attack button and an enemy's 3D roster entry submitted an attack.
- The authoritative player's action count changed from one to zero.
- The preview contained player, companion and enemy, and the main-game action
  controls reflected the spent action.
- Switching to cards hid the stage; switching back restored the preview.
- Resizing to 390 × 844 activated fallback; returning to desktop restored 3D.
- No browser page errors occurred.

Capture: `main-game-textured-preview.png`.

This checks one reachable main-game attack and the presentation controls. It does
not prove the full action/creature matrix, companion command flows, every context,
audio perception, hardware performance or final character fidelity. Prone weapon
attacks, natural Bite, and downed-versus-dead body presentation remain incomplete.

All three environment exports now share the image-textured floor construction
and physical texture-density convention. Walls/props still use simpler grain
materials and remain candidates for the subsequent surface-detail pass. This
is floor consistency, not final art approval for every material.
