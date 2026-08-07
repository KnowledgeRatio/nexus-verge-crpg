---
name: project_practices_system
description: Practices system (data/practices.json) is being expanded from 2 to several; rank 2 requires a second pick; rank 3 design constraint tracked in issue #22
metadata:
  type: project
---

The "practices" system (long-rest/downtime disciplines pickable at level 4/6/8, defined in `data/practices.json`) is being expanded from 2 practices to several more, as of 2026-08-07. It's also being reformed: rank 2 of a practice now requires spending a second pick on it, replacing the old automatic character-level bump (current Forgecraft/Hearthcraft L6 upgrades used the old auto-bump shape).

Design lead's locked call: rank 1 → rank 2 stays "same effect, scaled" (e.g. Forgecraft's 1 modified item → 2 modified items). Whenever rank 3 is designed in the future (not scoped yet), it must be a genuine qualitative step-change, not just bigger numbers on the same effect.

**Why:** without this note, rank-3 design would likely default to "more of the same numbers" by inertia, losing the design lead's intent.

**How to apply:** GitHub issue #22 (`KnowledgeRatio/nexus-verge-crpg`) is the placeholder tracking this constraint for whoever picks up rank-3 design — check it before scoping any rank-3 practices work. `game-designer` owns that design when scheduled.
