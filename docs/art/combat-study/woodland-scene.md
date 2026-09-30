# Woodland road presentation study

Review in `combat-study.html`: **Environment → Woodland road**. The scene adds
soil, scattered gravel and leaf litter, wheel ruts and an asymmetric pine verge.
It deliberately uses no masonry, building or gate. The trees are still stylised
procedural geometry; this is a composition study, not final foliage quality.

Forest encounters now choose between the original road, a shaded glade and a
sunlit bend. Grassland encounters select an open meadow. `Player` supplies the
canonical terrain ID for overworld encounters, and
`main.js` passes it to the presentation adapter. Dungeon and settlement contexts
take precedence over terrain. Unmapped terrain keeps the existing waystation.
Unsupported creature encounters still use cards.

`main.js` also passes a presentation seed made from the saved world seed and
player position. A stable hash selects the forest variant without consuming
gameplay randomness. Re-entering combat at the same location keeps the layout;
missing seed metadata selects the first variant. Explicit study selections take
precedence. This is presentation-only: it does not change encounter generation,
movement, cover or difficulty.

The study Environment menu exposes **Woodland glade**, **Woodland bend** and
**Open meadow** alongside **Woodland road**. All use the same outdoor authoring
function and data-defined palettes, road shapes, vegetation placements and
lighting. Meadow has no buildings or tree wall; short clustered grasses and
low distant banks distinguish it from the forest scenes. These remain stylised
procedural plants, not final botanical assets.

Build the additions with `build_slice.py -- --outdoor-variants-only`, or a single
one with `--outdoor-scene grassland`. Only the selected environment GLB is loaded.

The fighting area remains open. Tree and boulder geometry sits behind the rear
clearance boundary; the renderer shifts this boundary to accommodate the party's
formation and retreat positions. Distant trees can extend beyond the camera as
background, while nearby landmarks participate in framing. Scenery does not
grant cover: the engine's existing terrain cover calculations remain authoritative.
The combat log and existing HUD retain that information; fighters do not seek
individual cover objects in this version.

Assets are original and reproducible from `build_slice.py -- --woodland-only`.
The scene's seed and major placements live in `data/combatScene.json`. The export
contains its soil and surface textures and requires no new runtime dependency.

Automated checks cover canonical terrain references, scene selection precedence,
crowded formation framing at two desktop sizes, GLB integrity, texture coordinates
and tall scenery staying outside the fighting area. Browser checks use the real
study and main-game pages with a disposable encounter; they do not constitute a
full campaign travel/save-load acceptance test.

Verification on 2026-09-25: all 784 tests passed. A disposable main-game forest
encounter rendered three actors, spent one action on Attack, toggled between cards
and 3D, and fell back to cards at 390 × 844 before restoring 3D at desktop width.
No browser page errors were recorded. This fixture supplies terrain presentation
metadata directly; it does not validate world-tile cover calculation.
Screenshot: `main-game-woodland.png`.

The study browser check also passed the eight-figure scenario (player, companion,
six opponents): every figure occupied a distinct position after engagement, weapon
attack playback completed, and disengaging returned the player to their original
position. No page errors were recorded. `woodland-road.png` shows the default
four-figure composition.

Changed JavaScript files have no lint errors. Repository-wide `npm run lint`
remains failing with 203 existing errors; `npm run lint:all` also fails on wider
repository files. Neither is a clean repository-wide lint result.

## Outdoor expansion verification — 2026-09-26

- Full suite: 800 tests passed. After the final meadow refinement and extra GLB
  coverage, 53 presentation/data/camera tests and 15 asset tests passed.
- Main-game browser fixtures used canonical factory-built dire wolves and wolves.
  Grassland selected `grassland`; forest selected `woodlandGlade` from saved
  seed/location metadata. Each rendered five actors and returned to cards without
  page errors. This validates the combat-screen integration, not full campaign travel.
- Live study review exercised glade, bend and meadow with engagement, Bite and
  disengagement. Meadow mobile fallback and restoration to desktop passed without
  page errors. An initial browser harness waited for stale action status text on
  desktop restoration; the corrected check waits for the visible stage.
- GLB tests verify texture coordinates and tall scenery outside the fighting area.
  Camera tests now cover every configured scene at two desktop viewport sizes.
- Legal verification passed. Presentation and changed test files have no lint
  errors. Main-game lint remains affected by existing errors elsewhere in
  `main.js`; repository-wide lint and lint:all are not clean.
- Review captures: `woodland-glade.png`, `woodland-bend.png`, `open-meadow.png`.

The study now fetches its JSON with `cache: 'no-store'`; the local preview server
requires cache revalidation. With older JSON missing a newly selected variant,
the former generic fallback returned the waystation silently. The study now
reports missing scene data explicitly, and both the heading and ready status
identify the loaded environment. An already-open tab needs a reload to pick up
these changes. This reproduces a possible cause of stale-scene reports; the
original user's browser cache was not inspected.
