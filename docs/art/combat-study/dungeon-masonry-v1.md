# Dungeon masonry texture v1

Created 2026-09-25 with the built-in image generation tool as an original surface
asset for the reusable dungeon combat kit.

Image: [dungeon-masonry-v1.png](../../../data/graphics/combat/textures/dungeon-masonry-v1.png)

- PNG: 1254 × 1254 RGB
- SHA-256: `cd376c6020aa0d77cdd2c5508e8e48924a7fa15055c79cf41ce379fa7480f734`
- Runtime use: colour texture on selected dungeon wall geometry; Three.js supplies
  lighting and perspective.

This improves material definition on reusable geometry. It is not a generated 3D
mesh, normal map, physically calibrated material set, or proof of seamless tiling.
The generated file is retained in the repository so builds never depend on an
external generation service.

## Generation prompt

```text
Use case: stylized-concept
Asset type: reusable albedo texture for a browser-based Three.js CRPG dungeon kit
Primary request: a seamless square texture of old frontier dungeon masonry, built from irregular hand-cut slate and limestone blocks with worn mortar, hairline cracks, soot staining, faint mineral discoloration, restrained moss in a few joints, and evidence of repeated repair
Style/medium: grounded hand-painted realism suitable for an adult atmospheric CRPG; detailed but readable from a high three-quarter camera; align with desperate wonder on a harsh living frontier
Composition/framing: perfectly front-facing orthographic surface sample, evenly distributed masonry, edge-to-edge tileable in both axes, no focal object
Lighting/mood: flat neutral albedo lighting with no cast shadows, no directional highlights, no ambient occlusion baked into corners
Color palette: muted charcoal, warm grey limestone, small traces of desaturated olive and rust
Materials/textures: rough stone, chipped edges, granular mortar, subtle age variation
Constraints: no characters, weapons, doors, arches, props, floor perspective, text, symbols, runes, borders, vignette, watermark, or obvious repeated motif; preserve enough midtone contrast to remain legible under runtime lighting
Avoid: cartoon outlines, bright fantasy colors, glossy stone, photogrammetry noise, dramatic scene lighting, perspective distortion
```
