# Dungeon flagstone texture v1

Created 2026-09-25 with the built-in image generation tool as an original floor
surface for the reusable dungeon combat kit.

Image: [dungeon-flagstone-v1.png](../../../data/graphics/combat/textures/dungeon-flagstone-v1.png)

- PNG: 1254 × 1254 RGB
- SHA-256: `0284efe40821d34582cf272d156c0c626073148a4a2796b82ee3bfebffeef05e`
- Runtime use: repeated colour texture on the dungeon chamber floor; Three.js
  supplies lighting and perspective.

This is a colour surface, not a generated 3D mesh, normal map, collision surface,
or guarantee of perfect edge tiling. The source is retained locally so runtime
and builds do not depend on an external service.

## Generation prompt

```text
Use case: stylized-concept
Asset type: reusable albedo texture for the horizontal floor of a browser-based Three.js CRPG dungeon kit
Primary request: a seamless square top-down texture of an old dungeon floor made from irregular broad flagstones, worn flatter along travel paths, repaired with a few smaller inset stones, fine grit and restrained dirt in joints, subtle damp discoloration near some edges
Style/medium: grounded hand-painted realism for an adult atmospheric CRPG; coherent with weathered frontier slate-and-limestone masonry; detailed but readable from a high three-quarter gameplay camera
Composition/framing: perfectly top-down orthographic surface sample, larger stones than a wall, edge-to-edge tileable in both axes, no focal object and no implied room boundary
Lighting/mood: flat neutral albedo lighting, no cast shadows, no directional highlights, no baked character shadows
Color palette: muted warm grey, charcoal slate, desaturated brown dust, tiny traces of olive dampness
Materials/textures: rough worn stone faces, chipped joints, granular mortar and grit, subtle repair variation
Constraints: no characters, footprints, blood, weapons, furniture, traps, symbols, runes, grids, borders, perspective, vignette, text, watermark, or obvious repeated motif; moderate contrast for runtime lighting
Avoid: wall-brick layout, cobblestones, glossy wet floor, bright fantasy colors, dramatic scene lighting, photogrammetry noise
```
