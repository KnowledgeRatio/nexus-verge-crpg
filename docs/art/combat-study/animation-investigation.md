# Humanoid animation investigation — 2026-09-24

Status: researched proposal, not implemented or visually accepted. This note
supports #43/#46; GitHub remains the product roadmap.

## References and conclusions

- [Peyman Massoudi: non-repetitive idle](https://peyman-mass.blogspot.com/2015/09/creating-non-repetitive-randomized-idle.html)
  demonstrates a breathing base, left/right weight-shift poses, optional additive
  looks, and variable transitions with holds. The useful principle is to settle
  into a supported pose rather than continuously oscillating between extremes.
- [Three.js skeletal blending example](https://threejs.org/examples/webgl_animation_skinning_blending.html)
  and its [r180 source](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/webgl_animation_skinning_blending.html)
  show imported idle/walk/run clips, per-model AnimationMixer, playback speed and
  transitions. This is a runtime reference, not our visual style or combat stance.
- [Three.js additive blending example](https://threejs.org/examples/webgl_animation_skinning_additive_blending)
  provides a reference for secondary poses layered over a base animation.
- [AnimationAction documentation](https://threejs.org/docs/pages/AnimationAction.html)
  covers crossfades, one-shot playback, weights and time scaling.

These references were investigated through their published examples, descriptions
and code. They are not acceptance evidence for a new animation in our game.

## Verified implementation gaps

`tools/combat-art/build_slice.py` exports with `export_animations=False`.
Each leg is one bone; knees, independently articulated feet, pelvis motion and
elbows are absent. Adding a skin did not create those capabilities.

`CombatArtAssets.load()` retains `result.scene`, not `result.animations`.
`poseCharacterArt()` restores bind transforms every frame and uses independent
sinusoids for breathing and leg swing. Simply adding a mixer alongside this
function would result in competing writes to the same bones.

`CombatScene.frame()` moves actors along presentation paths independently of
their stride and supplies only a moving boolean to the pose function. It also
applies body lean and weapon rotations. Translation speed therefore does not
determine footfall cadence, and animation transitions lack a coordinated pose.
The bundled Three.js r180 already exports AnimationMixer and AnimationClip.

## Proposed implementation, in dependency order

1. **Rig and motion asset.** Produce or adapt one humanoid with pelvis, spine,
   thigh/shin/foot chains, upper/lower arms and weapon sockets. Author or retarget
   one restrained armed idle and a compatible walk/start/stop sequence in Blender.
   Bake constraints into deform-bone keyframes and export named glTF clips.
   Check weights, coat clearance, soles and weapon grip before runtime work.
   A licensed base remains an option, subject to #46; nothing is acquired here.
2. **Asset loader.** Retain named clips alongside the scene in CombatArtAssets.
   Keep the existing independent skeleton cloning and shared mesh resources.
3. **Single animation owner.** Add `src/rendering/CombatAnimator.js`, one instance
   per actor, owning its mixer/actions and transition state. Suggested interface:
   `update(deltaSeconds, { moving, speed, retreating, action, reducedMotion })`,
   `finishPresentation()`, and `dispose()`. Replace direct authored-bone writes;
   retain the existing procedural path only for placeholder actors.
4. **Scene integration.** CombatScene owns formation, facing and path translation;
   CombatAnimator owns the skeleton pose. Use in-place locomotion initially,
   synchronising clip cadence to actual visual path speed. Preserve pelvis motion
   inside the clip but exclude forward travel so movement is not applied twice.
   Stop on a planted pose; use a backward-step clip for withdrawal while facing
   a threat. Measure sliding before adding runtime foot IK: our floor is flat.
5. **Data and timing.** Put clip names, nominal locomotion speed, transitions and
   impact markers in combatScene.json. Map presentation families/weapon stances,
   not ability IDs. Keep one authoritative presentation clock for contact, shot,
   projectile arrival and hit feedback. One-shot actions must trigger cues exactly
   once, including skip, interruption and fallback. Idle never blocks a turn.

Illustrative data only:

```json
{
  "clips": { "idle": "GuardIdle", "walk": "GuardWalk", "retreat": "GuardBackstep" },
  "transitions": { "idleToWalk": 0.18, "walkToIdle": 0.22 },
  "locomotionSpeed": 1.4
}
```

Values would be measured against the chosen clips, not adopted as balance rules.

## What natural should mean here

A watchful adult stance: weight supported by a leg, the other knee relaxed,
pelvis and torso counterbalancing, quiet head, hands respecting the held weapon.
Breathing is secondary. Occasional weight shifts have pauses; not every joint
moves constantly and not all characters act in synchrony. Feet can remain planted
while knees and hips move. Avoid rhythmic rocking, mesh inflation and marching
on the spot as substitutes for coordinated motion.

## First acceptance slice

One character at the unchanged normal combat camera: idle, start, a few steps,
stop, return to idle. Then the same sequence with a sword and carbine, plus a
second simultaneous instance. Inspect foot sliding, weight support, silhouettes,
coat intersections, hand contact, transition popping and repetition over 30 seconds.
Check reduced motion and missing-asset fallback. Tests prove contracts and timing;
sponsor visual review decides naturalness. Only then expand attacks and reactions.

The main dependency is animation asset quality, not a new rendering framework.
Full-body clips are recommended over further independent sine-wave adjustments;
procedural corrections can supplement a convincing base afterwards.
