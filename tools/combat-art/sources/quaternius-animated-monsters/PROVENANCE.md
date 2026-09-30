# Animated Monster Pack — inspected, rejected for direct integration

Creator: Quaternius. Downloaded free from the creator's itch.io page on
2026-09-26: https://quaternius.itch.io/lowpoly-animated-monsters
The creator explicitly identifies the pack as CC0. The downloaded archive has
no separate licence text. Archive: `Monster Pack Animated by Quaternius.zip`.
SHA-256: `c0b73e7d641a25348e46195e1413d050d08cf14302d999e0d40a634c43c47a9b`.

The four .blend files are unmodified extracts from Blend/. Candidate glTF files
were exported with embedded scripts disabled using Blender 4.5.9 and:

```sh
blender --background --factory-startup --python tools/combat-art/export_enemy_candidates.py -- --pack quaternius-animated-monsters --models Skeleton Dragon Bat Slime
```

The exporter now accepts a pack/model list and converts legacy materials even
when the source lacks a Principled BSDF node. Motion audits use the existing
audit_creature.mjs tool, measuring all clips with precise skinned bounds at 30 Hz.
Pose captures under docs/art/combat-study use `<name>-candidate-poses.png`.

## Findings

- Skeleton: Attack, Death, Idle, Running, Spawn. Large head, simplified anatomy,
  exaggerated motion, no dedicated hand joints, bow animation or hit reaction.
  Running raises its lowest surface by up to 1.007 source units. Death clips
  through the floor by 0.270 units. The canonical game skeleton requires both
  shortsword and shortbow presentation. Not suitable for direct activation.
- Dragon: only Flying and Hit clips. Cartoon proportions and no attack, breath
  or death motion. Does not cover the canonical young dragons.
- Bat: only Flying. Cartoon proportions and no bite/death; no canonical bat
  exists in the current roster. This is not an acceptable stirge substitute.
- Slime: Attack, Death, Idle and Walk. Googly-eyed cartoon body; no canonical
  slime exists. Do not relabel it as a void creature to claim coverage.

None is registered in combatScene.json. These findings change the next action:
seek a better-proportioned skeletal/humanoid base compatible with the existing
animation library, or author a skeletal body on the established traveller rig.
Do not revisit these sources without a specific adaptation that addresses both
their visual mismatch and missing combat capabilities.
