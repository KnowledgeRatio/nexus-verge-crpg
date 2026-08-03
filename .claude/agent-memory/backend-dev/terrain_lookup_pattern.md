---
name: terrain-lookup-pattern
description: How to read terrain tiles/types from WorldGenerator inside combat and HUD code
metadata:
  type: project
---

## Terrain Lookup Pattern (combat / HUD)
- `worldGenerator.getCachedTile(x, y)` — sync, returns tile from cache or null.
- `worldGenerator.terrainTypes` — the parsed terrains.json object (has `.terrains` array).
- `worldGenerator.terrainData` is used in some older main.js code — same object, different alias; prefer `terrainTypes` when inside systems.
