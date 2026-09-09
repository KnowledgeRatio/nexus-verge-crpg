---
name: unisex-player-figure-constraint
description: Hard Chief Designer constraint — every player-character avatar/sprite must read as gender-neutral; treat as a silhouette rule, not a costume note
metadata:
  type: feedback
---

Every player-character avatar must be **unisex**. No player-facing PC figure may read as identifiably male or female. Issued as a hard requirement by the Chief Designer (2026-09-09), not a preference to weigh.

**Why:** stated as a requirement, not justified in detail. Treat it as non-negotiable and design *from* it rather than bolting it on. It arrived mid-brief and was explicitly framed as "if this changes a recommendation you had already formed, change it."

**How to apply:**
- Gender reads through **silhouette** first — shoulder-to-hip ratio, chest contour, hip flare, waist taper, hair mass, stance. So this is a silhouette constraint that sits alongside the 16px legibility floor, not a detail to defer to `creative-prompt-engineer`.
- The solution that satisfies both constraints is the same one: **the load-out is the silhouette, the body is not.** Hood, cloak fall, and pack mass form the outline; anatomy is not visible. See [[player-sprite-direction]].
- It must be **enforceable in `tools/image-gen/style-guide.md`**, as positive direction language *and* literal negative-prompt terms — image models default hard to gendered figures. Prose intent alone is insufficient force (same lesson as the relief-shading ban in [[terrain-atlas-direction]]).
- **Picker labels must be gender-neutral too**, not just the art. The old labels were "Knight" / "Monk".
- Scope: applies to any figure representing the *player character*. NPC and species portraits are not covered and should stay individuated.
