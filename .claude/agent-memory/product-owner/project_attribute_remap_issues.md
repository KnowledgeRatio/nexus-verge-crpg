---
name: project-attribute-remap-issues
description: GitHub issues filed 2026-07-31 for every deferred/not-yet-decided item pulled out of the six-attribute remap plan doc
metadata:
  type: project
---

On 2026-07-31, filed one GitHub issue per deferred/not-yet-decided item found in `docs/plans/2026-07-30-attribute-system-remap.md` (that doc is a design record, not a tracking tool — items marked deferred inside it don't get picked up again unless they land on the actual roadmap). Each issue links back to its specific section of the plan doc rather than re-explaining inline.

**Filed:**
- #13 Backgrounds full rework (Acolyte/Sage collision was the trigger; scope is all of backgrounds, not a spot-fix)
- #14 Scholar saving-throw doc/data drift (`d5e-compliance.md` vs `classes.json`) — deferred with rest of Scholar
- #15 Sworn Strike damage/DC formula design (attribute assignment to Presence is locked; mechanic itself isn't designed)
- #16 `necrotic → elemental` damage-type classification revisit (migrated, reasoning flagged as not fully settled)
- #17 4 hardcoded fallback-default damage-type literals in `CombatManager.js`/`SkillChallengeManager.js` (backend-dev, latent bug — invalid values reintroduced silently when data omits `damageType`)
- #18 Player/companion ASI-gating asymmetry (found as a side effect of Menacing Attack balance testing, not yet evaluated on its own)
- #19 [Epic] Six-attribute remap full implementation, M0–M2 staged order from the plan doc's execution-order section
- #20 Trip/Pushing/Disarming Attack convergence — filed and immediately closed with reason "not planned." This one was already *decided* (no convergence needed), not deferred; filed as a closed decision record so the reasoning stays discoverable if the question resurfaces, rather than left only in the plan doc.

**Deliberately not filed as separate issues:** four "forward-looking, not a current blocker" notes in the plan doc (Scholar's future save-proficiency pattern, the Insight "free third stat" concern, concentration's Composure-funding risk for a future caster, flee's lost universal-access guarantee for a future non-physical calling) — all are explicitly contingent on Scholar/Wanderlust actually being scheduled, which is out of scope. Folded as context into #14 (Scholar drift) and #19 (epic) instead of creating standalone tickets for work with no trigger condition yet. This was a product-owner judgment call, not something the user specified — revisit if the user wants these tracked independently.

**Why this matters going forward:** if the plan doc gets amended or superseded, these issue numbers won't auto-update — check the doc's current status line before assuming #13–#20 still describe live open questions. See [[project_attribute_remap_staging]] for the separate (still-proposed, not-accepted) M0/M1/M2 staging recommendation that #19's epic body summarizes.
