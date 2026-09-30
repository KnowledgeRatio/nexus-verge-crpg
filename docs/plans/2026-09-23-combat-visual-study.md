# Combat visual study — implemented prototype

**Status:** Implemented (prototype, 2026-09-23). The first art target's visual direction is sponsor-approved;
first-pass Blender assets now load in the study, while production-quality art and
expanded presentation remain unimplemented.

Approved direction: Wartales / Pillars of Eternity atmosphere and elevated framing,
desktop first, with the existing non-grid gameplay engine. Movement illustrates
actions and engagement; it does not create range, cover, flanking or opportunity attacks.

## Review entry points

### Combat guard and wall-boundary correction — 2026-09-24

Implemented after sponsor feedback: the traveller now has knee, ankle and elbow
bones, blended mesh weights, and data-driven static guards with staggered planted
feet and raised hands. Long guns use a separate two-handed guard; sidearms have
a compact support-hand pose. Reduced motion retains the guard. Artificial idle
inflation/rocking is removed. Coordinated animation clips and natural start/stop
locomotion remain unfinished; this is a static combat-readiness review first.

The fixed backdrop now bounds formation placement, staging detours and melee
contact routes. Opening the preview mid-engagement also reserves the original
retreat homes before anchoring the scenery. Combat rules remain unchanged.

Validation: 697 tests pass across 50 files. Actual exported-model tests verify
planted staggered feet, bent knees and guard hand placement. Browser review covers
sword/carbine guards at the normal camera, three/shared/six-opponent engagement
and retreat, and the wall clearance boundary. Lint retains 203 existing errors.
Sponsor acceptance of the new static pose remains outstanding.

### Reusable humanoid foundation — 2026-09-24

The original traveller now exports a weighted 11-bone skin, including spine/head
and separate weapon attachment bones. Shoulder, hip and coat seams blend into
their parent bone. Runtime instances share geometry/materials but own independent
skeletons. Subtle upper-body idle replaces whole-body vertical bobbing for this
asset; feet remain planted, and actions/reduced motion suppress idle.

The export is 1,040,176 bytes, 15,808 triangles and eight skinned meshes. These are
asset counts, not a performance budget or desktop frame-rate claim. Appearance,
camera framing and stature are preserved. This is the original pipeline candidate
for #43/#46, not completion of the character art slice: sculpt/material refinement,
knees/elbows, authored combat animation, two-handed support poses and a second
appearance remain. The production asset-source decision is still open.

Foundation validation: 693 tests pass across 50 files, including deformation of
the actual exported skin, independent instances and bind-pose recovery. A browser
check confirms planted feet during idle, preserved 1.838m stature and the existing
normal-camera composition. Repository lint retains 203 existing errors.

Sponsor follow-up found the initial idle visually imperceptible and placeholders
still bobbing. Removed all idle root lift; placeholders now expand their chest,
and the traveller combines chest expansion/rise with clearer shoulder motion.
Default-camera browser measurement shows approximately 2.2 pixels of shoulder
travel across a breath, with identical foot positions and zero body-height offset
for all five actors. Reduced-motion mode resets chest scaling and suppresses idle.

Further sponsor review rejected that motion as forward/back rocking. Idle spine
and head tilt, and vertical spine scaling, are now disabled; chest-depth breathing
remains. The current rig has no knees and no lower-body idle weight shift. Its
whole-leg movement is still a prototype, not accepted natural humanoid animation.
The earlier pixel-displacement measurement established visibility, not quality.

### Main-game integration

The optional desktop preview now plays supported player, companion and enemy
weapon attacks through the shared scene. Live equipment selects the weapon;
damage feedback and combat sounds wait for impact, and the combat log, next
turn and victory/defeat presentation wait for playback. Disengagement illustrates
the existing rules. **Finish animations** skips the remaining presentation.

This first integration supports the configured weapon visuals and medium
humanoids. Unknown weapons, unsupported creatures, downed allies, ability effects
and reaction choices return to combat cards. Mobile and graphics failures also
retain cards. The figures and generic waystation remain prototype artwork;
encounter-specific environments and complete spell/effect coverage are unfinished.

Product sequencing is tracked in GitHub: integration [#44](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/44),
then the reusable animated character slice [#43](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/43),
with asset-source decision [#46](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/46).

Integration validation: 689 tests pass across 49 files. Browser checks exercise
main-game player and companion weapon attacks, impact audio/log timing,
accumulated engagements, disengagement, card switching, unsupported-action
fallback, enemy turns, delayed victory, a subsequent unsupported-creature encounter,
mobile and simulated WebGL loss. Repository lint retains 203 existing
errors. Software-rendered browser checks are functional evidence, not a
representative desktop GPU benchmark.

### Study pages

- **Play the encounter** on the animation-study page opens `combat-encounter.html`:
  a disposable level-3 traveller and companion versus three bandits, driven by
  the real CombatManager. Initiative, enemy AI, attacks, ammo, Dodge, Disengage,
  engagement, defeat and victory use existing rules. The companion is directly
  controlled on its own turn. There is no manual Engage or forced Hit/Miss control.
  This page never imports the main game or SaveManager and never loads/writes saves.
- Run a static server at the repository root and open `combat-study.html`, or use
  **Combat Visual Study** on the main menu.
- `combat-art-study.html` shows the first generated character/environment target.
  It is concept art, not a rendered gameplay screenshot or a completed 3D asset.
  The image, exact prompt and production limits are retained in
  `docs/art/combat-study/character-waystation-v1.md`.
- In an actual fight, **Show 3D preview** switches between the scene and the existing
  cards. This is opt-in; `RULES.combatPresentation.enabled` disables the entry point.
- Mobile defaults to cards. The standalone study has a compact textual fallback.
- The scene has optional zoom buttons, wheel zoom and **Fit** to restore the whole
  encounter. Sponsor feedback rejects an inspection-led experience: detail needs
  to read in the normal combat view, and the current art is still too basic.
  The character-focus selector has been removed. Opening team separation is now
  two layout steps rather than four (6.4 rather than 12.8 units at current spacing),
  while neighbouring-character clearance is unchanged. The default minimum span
  is 10 units. The camera retains its initial centre and expands its encounter
  envelope only when necessary; it does not repeatedly tighten after movement.
  Zoom survives resizing and compact-view toggles. The authored
  traveller measures about 1.84 units tall, comparable to the bandit stand-ins
  (1.84) and companion (1.91); the older figures still have much bulkier proportions.
  The waystation's gateway timbers are 2.8 units tall. Character scale is unchanged.
  The next visual acceptance target is a refined traveller and one opponent at
  normal combat framing: silhouette, modelled clothing, materials and grounded
  poses need to approach the approved concept before broadening the cast/effects.
  Tighter-staging validation: 673 tests pass across 48 files. Browser checks
  confirm distinct positions and visible actors in the three/shared/six-opponent
  scenarios, a stable camera centre and working zoom/reset controls. The new
  default view was visually inspected. Repository lint still has 203 existing errors.

### Composition review after tighter staging

Sponsor feedback: the tighter combat framing improves readability but crops too
much of the setting. Composition must be judged with characters, environment and
camera together; zoom/inspection is not the intended normal experience.

The next composition pass brings the gateway and a smaller lantern shelter behind
the closer formation. Landmark extents participate in overview framing, including
height and viewport aspect ratio. The camera biases its initial centre toward the
backdrop. For a deeper starting formation the backdrop and its lights move back
at setup, then stay fixed. Peripheral wall ends may crop; the key landmarks should
remain recognisable. This is an environment composition pass, not finished art.

Review at default zoom: can the player read the fighters and still recognise a
place to shelter on a dangerous road? Check the small encounter and six opponents,
including engagement, retreat and laptop widths. Art investment should proceed
against that integrated view: a refined traveller and one matching opponent,
followed by their contact/response animation. The current primitive appearance
remains below the approved target.

Composition validation: 675 tests pass across 48 files; all three asset integrity
tests pass against the rebuilt exports. Browser checks cover three/shared/six
opponents, stable backdrop placement, actor and landmark containment, zoom/reset,
and the narrow desktop layout at 1001px. Default and crowded screenshots were
visually reviewed. The small encounter's vertical span is about 10.38 units at
1100px viewport width, versus 10 before this pass. Larger formations still need a
wider view. `combat-art-study.html` retains the current composition screenshot.
Repository lint remains at 203 pre-existing errors.

The study offers one-versus-three, shared opponents and one-versus-six examples,
two temporary player appearances, engagement/withdrawal and sample action effects.
These demonstration controls do not invoke combat rules or change saved characters.

Study 02 adds independent weapon selection: Sword, Quarterstaff, Shortbow,
Carbine, Sidearm and Battle Rifle. Labels and handedness load from `items.json`;
the study's explicit item-to-model references do not infer firearms from legacy
crossbow IDs. Changing weapons keeps engagement positions. Changing coats keeps
the selected weapon. Weapon changes wait for action playback to finish.

Attack poses distinguish melee, bow release and firearm recoil/shot. A free-hand
casting gesture accompanies Fire Bolt and healing. Steady Nerve demonstrates
self-healing only; Healing Word demonstrates self or companion healing. Names
come from `abilities.json` and `spells.json`. Healing highlights the recipient
without a damage recoil or hostile projectile. These controls demonstrate
presentation, not character eligibility or implemented live ally targeting, and
never change HP, resources or engagement. Cure Wounds' touch presentation remains
outside this pass because it needs a separate approach/contact study.

## Implemented boundaries

The playable slice builds characters through `Character` and enemies through
`createEnemyFromMonster`, using references in `combatEncounterStudy.json`. It uses
the existing campaign filter and item/stat-block records, without copying attack
or damage rules. It demonstrates weapon combat only: main-game spell/ability UI
flows have not been duplicated in this isolated page. The engine's current attack
economy remains authoritative; this is not a balance or rules-correction pass.

Presentation events optionally carry the actual weapon ID. A per-encounter
presentation gate delays enemy execution while the prior action is visible;
normal game instances have no gate and retain their existing timings. The study
stages engagement with pre-impact HP, plays the outcome, then publishes the final
HP/death pose. Controls wait for playback, including the last hit before victory.
Defeated actors retain their last layout positions and are excluded from any
temporary move-aside operation when the survivors rearrange.
Finish animations, mobile/compact mode and WebGL fallback keep the fight usable.
Restart reloads the disposable page so no callbacks from an old encounter survive.
Compact view now switches back to 3D without restarting on desktop. Outcome audio
uses the visible impact callback; skip settles each cue once. Defeat sounds and
the outcome log wait for the resolved presentation. Release/aftermath sound
families are deferred, not implemented by the callback alone.

Study 03 adds temporary melee approach/contact/return paths. The presentation
router avoids other characters' body clearance and leaves engagement cells and
home positions unchanged. Layout updates received during an attack wait until
the attacker returns. Hit feedback is timed to contact or projectile arrival;
damage creates a brief impact burst and one recoil/step, while misses produce a
small evasive movement without the damage burst. Healing retains its separate
recipient effect. Reduced motion retains roster feedback without these motions.
The study now lets the player select an enemy and choose a Hit/Miss example.
This pass does not add action costs, damage rolls or new gameplay targeting rules
to the standalone study.

- Three.js now loads an original first-pass Blender traveller and waystation
  from self-contained GLB exports. Editable `.blend` sources and a reproducible
  authoring script are retained; see `tools/combat-art/README.md`. The traveller
  uses a simple articulated node hierarchy, not a production deforming skin rig.
  `data/combatScene.json` supplies asset/attachment references alongside the prior
  geometry, palette, camera and movement settings. Asset failure or disabling
  `artAssets.enabled` retains the geometric prototype.
- `CombatSceneLayout` assigns unique positions to engagement components, retains
  encounter home positions and plans sequential collision-free routes. Characters
  temporarily make room when needed. Spacing conservatively accommodates the
  largest configured model footprint, including clearance past a third actor.
  Its placement lattice is presentation-only
  and is never exposed as a tactical grid or stored in game state.
- In the playable encounter, directed attack events move the attacker into a free
  position near the defender; the defender and existing partners retain their
  positions. The manual arrangement study still demonstrates group layout.
  Disengage returns to the original position while other relationships remain intact.
- Facing prioritises the active strike/incoming attack, then the nearest living
  engagement instead of the oldest engagement link. This is presentation only.
- Existing Disengage had stale reciprocal references; it now uses the existing
  `clearEngagement` helper. Costs and opportunity-attack protection are unchanged.
- Optional presentation events identify actual attack sources. Standard attacks,
  monster attacks, special monster actions and the standard flee-opportunity-attack
  path are hooked. UI state remains current while approach animations complete.
- Reduced motion skips travel and action effects. Renderer resources are disposed
  at combat end, and WebGL failure returns to cards. Hidden views stop animation.
- Three.js 0.180.0 is vendored with its MIT licence because deployment has no build
  step. No runtime CDN or additional npm dependency is required.

## Deliberate prototype limits

This is an art-pipeline/composition/movement study, not finished art. The traveller
has an imported first-pass model; other combatants use team-based humanoid
stand-ins, including monsters. Portrait choice and equipment
are not yet mapped to the models in live combat. Appearance and equipment selection
are demonstrated only in the standalone study. Environment selection is fixed to
the waystation.

The imported traveller has separate orientation-normalised weapon attachments,
with projectile origins following the held weapon and a free-hand casting origin.
Shared geometry/material/texture resources are owned and disposed by the scene.
There is still no production skinned rig, persistent appearance schema or complete
live equipment-appearance system. The rigid-node clone/pose adapter must be
extended before introducing skeletal skinning; clothing, hair, facial anatomy,
material finish and two-handed poses need further art work.
No settlement, dungeon or travel renderer has been changed.

The hooded traveller reference expressed an interest in ambiguous identity and
player projection, not a mandatory hood or fixed gender restriction. The sponsor
is open to body/clothing choices. Armour customisation can follow later; weapons
need to communicate the action accurately from the first equipment-aware pass.

In the first concept review, the sponsor accepted that visible faces can present
as masculine or feminine without an explicit identity label. Face concealment and
perfect neutrality are not requirements. Preserve grounded adult proportions,
practical worn clothing, restrained detail and player projection. The waystation
scene's visual direction is approved. This does not decide the final appearance
inventory or replace existing 2D avatar/portrait decisions. Review evidence is in
`docs/art/combat-study/character-waystation-v1.md`.

Outside the isolated playable slice, dispatcher spells, inline cleave/nick and improvised strikes still rely on existing
outcome feedback rather than dedicated source animations. Action effects are
illustrative, not a cinematic replay: rapid engine actions can outpace them, and
combat ends immediately according to the engine rather than awaiting a final
animation. Mobile GPU performance and final asset budgets are not established.

## Acceptance and next decision

### Agreed next sequence

1. Correct melee contact and visible spell consequences, including crowded
   engagements, misses, healing and recovery.
2. Connect a small encounter to actual turns, costs, target resolution and defeat.
3. Upgrade one character and a small environment section to test the intended
   Wartales/Pillars atmosphere, proportions, materials and animation at this camera.
4. Expand reusable weapon/action/effect families after that slice is convincing.

The art upgrade is step 3, before full content coverage; it does not wait for every
weapon and spell. The sponsor confirmed engagement must accumulate unless an
explicit rule removes it. Ordinary and monster melee attacks now retain prior
reciprocal links when adding a target. Disengage and defeat retain explicit cleanup.

### Sponsor feedback and revision

Camera angle and engagement movement are approved as a direction. The geometric
stand-ins read as RuneScape-like; that is not approval of a low-poly final style.
Final-art references remain Wartales and Pillars of Eternity, with grounded,
adult-targeted atmosphere and restrained violence rather than exaggerated gore.

In player review, overhead health labels overlapped despite the earlier sampled
browser checks. Names, HP and outcome feedback now occupy a separate roster below
the scene; future resources belong there too. Both model hover and roster focus
highlight engagement partners, and both support target selection.

Repeated side-to-side hit wobble and repeated weapon oscillation are removed.
A strike has one preparation, decisive stroke and recovery; a hit has one small
backward recoil and settle, timed to the strike's impact. Reduced motion retains
static roster feedback. The camera and engagement travel settings are unchanged.

The artificial ring of scattered stones is removed. Sparse, explicitly placed
rubble clusters near broken walls now explain the stones as ruin debris.

Revision verified in-browser at 1440, 1024 and 768px: all roster entries remain
below the viewport without overlap or page overflow. Keyboard engagement
highlighting, return to rest after a strike, reduced motion, original-position
retreat and the 390px compact fallback passed. Controlled live-engine checks
also passed for attack feedback, retreat, card toggling and WebGL context loss.
The full 635-test suite still passes; modified source files have no lint errors.

### Validation

Blender asset proof: 668 tests across 47 files pass, with no lint errors in changed
source/test files and 203 existing repository-wide lint errors. Legal verification
passes all 12 checks. Browser checks cover the imported traveller's melee and
carbine actions, impact audio, all six weapon swaps retaining the grip/model,
three accumulated engagements, stationary recipients, facing, Disengage,
WebGL loss, missing-GLB fallback, compact/3D switching and mobile avoiding GLB
loads. No page errors occurred. The artwork remains an initial articulation and
import proof, not accepted production-quality art.

The two self-contained runtime exports total about 3.7 MiB. In the five-actor
encounter, Chromium/SwiftShader reported 97 draw calls, 56,382 rendered triangles,
92 geometries and 10 textures. This is a resource-count sanity check, not a
representative hardware frame-time or memory benchmark. Sources are retained in
`data/graphics/combat/`; current screenshots are
`docs/art/combat-study/runtime-pipeline-v1.png` (normal camera) and
`traveller-pipeline-close-v1.png` (temporary inspection camera, other actors hidden).

Latest presentation revisions: 665 tests across 46 files pass. Browser checks
confirmed melee/firearm sound dispatch on the same visible impact callback,
no early or duplicated outcome sounds, reversible compact view and mobile return
to desktop. Rendered actors faced their nearest living engagement after three
enemy attacks; the carbine defender stayed stationary as those links accumulated.
Modified source/test files have no lint errors; repository lint retains 203
existing errors. This verifies cue dispatch, not end-to-end audio-device latency.

Playable slice: 656 tests across 44 files pass. Changed UI/rendering/test files
have zero lint errors; repository-wide lint retains 203 existing errors.
Canonical factory/action checks at levels 1, 5 and 10 pass,
including ammo use, spent-action rejection, source-data immutability and cancelling
an enemy turn while waiting for presentation. A browser fight reached victory
through real controls with deterministic test rolls, verified localStorage was
unchanged, and exercised companion turns, Dodge, mobile, desktop reduced-motion
rendering and compact fallback without page errors. A normal-speed browser check
also passed for melee playback lockout, three accumulated companion engagements,
real Disengage preserving those companion links, and WebGL-loss fallback.
Pre-fatal-hit formation and stationary defeated actors have regression coverage.
This is functional validation,
not a GPU performance benchmark or comprehensive spell-system acceptance.

Study 03: 648 tests across 43 files pass. New contact-routing checks cover every
linked pair in all three study arrangements, in both attack directions, plus an
intervening body. Browser checks verify contact distance, exact return, impact
burst/recoil, miss without damage reaction, Disengage requested during a strike,
reduced motion and mobile fallback. Changed files have zero lint errors; the
repository-wide lint command retains 203 existing errors.

Study 02: 636 tests across 41 files pass. Changed JavaScript and tests have zero
lint errors (97 warnings). Browser checks pass for weapon switching,
appearance/weapon independence, self-only healing restrictions, ally healing
without damage recoil, Fire Bolt, melee, six-opponent retreat, reduced motion and
390–1920px layouts. No browser page errors were reported. Repository-wide lint
still has 203 errors in existing files.

Automated layout checks cover three, six and twelve opponents, shared opponents,
stable placements, original-position retreat, swaps and opening an escape route.
Engine tests cover reciprocal Disengage at levels 1/5/10 and presentation event
sources, eligibility and observer isolation.

User review should decide whether the camera distance, staging, separation and
retreat communicate the intended encounter. Then choose a finished character and
environment asset pipeline before expanding content. This document records the
prototype and its limits; it is not a replacement product roadmap.

Validation recorded: 635 tests across 41 files passed. Targeted rendering/data
checks passed again after the footprint metadata change. Browser checks covered
the three study scenarios with no overlapping target labels, widths 768–1920 and
390px compact fallback, reduced-motion preference, a controlled real-engine
attack/Disengage encounter, card toggling and simulated WebGL context loss. No
browser page errors occurred in the final study run. This is functional evidence,
not a benchmark of representative desktop/mobile GPU performance.

Legal verification passed (12 checks). New source/test files have zero lint
errors. Repository-wide `npm run lint` remains failing with 203 errors;
`npm run lint:all` also fails on existing repository-wide lint debt.
