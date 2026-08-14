---
name: worldbuilder_ui_removed_dead_fixed_count_fields
description: wbDungeons/wbSanctuaries worldbuilder fields were removed from index.html 2026-08-09 as part of the Unified POI System redesign — main.js still referenced them at removal time, coordinate with backend-dev before touching that area again
metadata:
  type: project
---

`index.html`'s Worldbuilder modal had a "🏛️ Dungeons" section (`wbDungeons`, "Total Dungeons") and a "☼ Sanctuaries" section (`wbSanctuaries`, "Total Sanctuaries") — both fixed-count concepts. Removed entirely 2026-08-09 per the Unified POI System redesign (`docs/plans/2026-08-09-terrain-atlas-overhaul.md`, §3 "Config surface"): dungeons/sanctuaries are no longer independently-counted feature types, they're `resolvedType` outcomes of the 7 real POI types (`wbPOIs` total × `wbPoiDungeonChance` global rate, optionally overridden per-type via `poiResolution.typeOverrides` — that per-type override UI was *not* built this pass, judged out of scope since it required `main.js` changes outside this task's file ownership; the config field still works via direct `rulesEngine.js`/campaign-file edits without it).

**Known gap at time of removal:** `src/main.js` (`applyWorldbuilderSettings()`, `wbResetBtn` handler, summary-panel builder — grep `wbDungeons`/`wbSanctuaries` there) still read `document.getElementById('wbDungeons')`/`wbSanctuaries` at the moment these elements were deleted from `index.html`. That's `backend-dev` territory (owns `main.js` in this redesign per the task split) and was mid-flight in the same parallel work session — expected to be cleaned up there, not a frontend-dev oversight. If you land in this area again and those `main.js` references are still live, that's a stale-coordination bug worth flagging immediately, not silently working around.

See [[poi_reveal_symmetric_art_fix]] for the rendering-side half of this same redesign.
