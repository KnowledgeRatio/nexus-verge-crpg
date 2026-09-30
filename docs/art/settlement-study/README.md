# Settlement scenes

Early integrated POC, 2026-09-27. The existing `settlementType` selects between
a rougher village square and a more urban town/city street. Town and city share
the same urban treatment for now; further type-specific architecture,
environmental dressing and culturally authored neighbourhoods are tracked in
[#52](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/52).
Integration/acceptance is tracked in [#51](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/51).

Open `settlement-study.html` on the local preview server for quick review, or
enter a settlement in `index.html` for the actual game integration. The study
reuses the real settlement/building modal markup, manager and UI with temporary
fixtures; its empty NPC/quest lists are not a generated campaign walkthrough.

`SettlementSceneUI` mounts the scene from `SettlementUI.showSettlementModal`.
The four configured buttons call the existing `SettlementManager.enterBuilding`
routes after presentation-only walking. The current engine offers these routes
in all settlement types. Merchant locks and other restrictions remain checked
by the existing service handlers. Quest boards and consequence messages remain
visible alongside the scene.

The player's saved appearance and equipped weapons use the combat art catalogue;
weapons are carried and inhabitants use relaxed idle clips. Six ambient residents
vary clothing, hair, complexion and stature using the appearance catalogue.
They are visual dressing, not representations of named generated NPCs. Six
additional non-enterable buildings and two market stalls frame the village
square. Town and city replace the rough paving and improvised shopfronts with
regular cut-stone, closer civic frontages, benches and planters. Two additional
civilians walk repeatable routes around the urban foreground; reduced-motion
mode leaves them stationary. Building interiors and named NPC interactions
retain the existing UI.

Desktop opens the scene by default while services remain accessible during
loading. The toggle restores the service list. Mobile uses that list directly.
Leaving disposes the scene; opening an interior pauses it. Loading/graphics
failure restores services. `RULES.settlementPresentation.enabled` disables the
feature. `data/settlementScene.json` controls service destinations, composition,
inhabitants, camera, carried equipment and movement timing.

The preview server allowlist includes only the named study/game HTML pages and
existing public asset paths. Example launch from the repository uses
`tools/audio-gen/preview_server.py`; the current review instance is on port 8766.

This POC does not establish final art quality, production delivery performance,
named NPC likenesses, world-state architectural overlays or full campaign
acceptance. The service route tests use controlled animation ticks in Chromium's
software renderer; they do not provide a hardware frame-rate benchmark.

Validation: all 1,209 automated tests pass with a 30-second per-test allowance
(the initial full run hit timeouts in two existing expensive creature-geometry
tests). The release build and legal verifier pass. New scene/UI/study/test files
have no lint errors; repository-wide lint still reports 205 standard and 3,281
broad errors elsewhere, plus warnings.

Browser evidence covers all four routes, all three type fixtures, scene/list
switching and mobile fallback. The actual main game generated Darkburg with
14 NPCs, entered its settlement scene, retained quests, opened the real merchant
interior and returned/exited correctly. A separate scene check verifies saved
hood/short-coat/gathered-trouser choices, the equipped Battle Rifle, relaxed idle
and graphics-context-loss fallback with usable service buttons.

`town-square.png` captures the urban view, `inhabited-square.png` the rougher
village, and `universal-square.png` the earlier sparse composition for comparison.
`customised-traveller.png` shows saved appearance and equipment. These capture
the canvas directly (HTML service labels are outside it). Main-game screenshots
document integration before the paving-size correction.

The denser pass was checked in Chromium at desktop size: all four service
buttons were visible and routed to their existing destinations with reduced
motion enabled, and the browser reported no errors. The focused scene UI tests,
scene syntax check and web build pass; focused lint has no errors.

The village/town/city selection was checked in Chromium: each loaded with all
four service routes visible and working, and no page errors. Controlled animation
ticks moved both urban pedestrians along their configured paths. The paved surface
uses one instanced mesh; this is not a hardware frame-rate benchmark.
