# Quaternius Ultimate Animated Animal Pack — wolf candidate

Retrieved 2026-09-25 from the creator's public free download. Unmodified
`Wolf.gltf` and accompanying `License.txt` retained unmodified. The source is
adapted by `tools/combat-art/build_wolf.mjs` into the runtime `wolf-v1.glb`.
The canonical medium wolf and its separately adapted large dire-wolf variant are
enabled; other beasts remain unsupported. The latter reuses the rig/clips with
chest shaping and vertex coat colours in `dire-wolf-v1.glb`.

- Creator: Quaternius.
- Pack: https://quaternius.com/packs/ultimateanimatedanimals.html
- Creator-linked folder: https://drive.google.com/drive/folders/1uJ3N5HfB7jKTseJUNQr3N4YaN0UuEtHk
- glTF folder: https://drive.google.com/drive/folders/1yJXdB1iSrI8Db7hG77zxZ66vKsqIt0ry
- Wolf file ID: `1lFQoQ9ln2Z2wGuFFWObj9i5jHqUl_ftG`
- Licence file ID: `1F2uy8T2fRpdc6gZ4mnS02_C2E63WvKtn`
- Licence: CC0 1.0, stated both on the creator page and accompanying text.
- Download size: 3,175,890 bytes.

Inspected animation names: Attack, Death, Eating, Gallop, Gallop_Jump, Idle,
Idle_2, Idle_2_HeadLow, Idle_HitReact1, Idle_HitReact2, Jump_ToIdle, Walk.
Skeleton includes separate fore/hind limbs, neck chain and tail chain. A named
Attack clip is not proof of convincing bite contact; view the animation before
mapping an impact time or approving it for runtime.

This is a motion/rig foundation for the existing canonical wolf. The low-poly
surface is not approved final art. Its suitability for the game's coat detail,
proportions, joint realism and normal camera remains unverified. Do not assume
quadruped motion transfers to the biped gnoll or that its size matches our units.

## Browser and motion inspection

`docs/art/combat-study/wolf-motion-candidate.png` captures this source in the
existing dungeon lighting/camera beside the traveller cast. It is a temporary
browser injection, not an enabled combat actor. The capture normalizes total
height to 1 m as a comparison only; this leaves the shoulders too low for the
canonical hip-height wolf and is not an approved runtime scale. The sampled
attack visibly lunges forward; the death pose rolls onto its side. No browser
errors occurred. Surface detail remains visibly flat and preliminary.

Reproduce the complete-clip geometry measurements:

```sh
node tools/combat-art/audit_creature.mjs tools/combat-art/sources/quaternius-animals/Wolf.gltf
```

`wolf-motion-audit.json` records the source checksum and precise skinned-vertex
bounds sampled at 30 Hz. Native rest dimensions are approximately 1.056 wide,
2.674 high and 5.274 long, including ears/tail. These are uncalibrated source
units. The native minimum surface height is -0.0102 at rest, -0.0549 during
Walk, -0.0439 during Attack and -0.1946 during Death. A single rest-floor offset
therefore does not keep the whole animated mesh above ground. At the capture's
scale, the worst Death penetration is approximately 6.9 cm below the rest floor.
Adaptation must address that without making planted feet float in other clips.

The source is viable for continued quadruped investigation, not accepted final
motion. Still unverified: foot slip through a complete walk cycle, believable
bite contact at engine-driven approach distance, transitions/recovery, crowded
turning clearance, hit/miss distinctions and the final art surface.
