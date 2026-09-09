---
name: portrait-culture-markers
description: Canon ruling for the large NPC bust-portrait system — borne-not-inherited marker rule, per-culture bust markers, portraits keyed to culture (not species), role-signal tiers, expression range
metadata:
  type: project
---

Ruling given 2026-09-09 to creative-director, for the approved large bust-portrait system (party screen, combat, NPC conversation).

## The load-bearing rule: BORNE, NOT INHERITED

**No culture may be identified in a portrait by anything a person is born with.** Every culture marker must be worn, chosen, done to oneself, or done to a person by circumstance — clothing, grooming, wear, repair, what's at the throat, what the face has learned to do. Never features, skin, bone, hair colour, eye shape.

**Why:** `docs/world/PEOPLES.md:3` — "They are not races — each is multi-racial. They are defined by *when* someone arrived and *why they stayed*." All six are circumstantial/generational, not ethnic — including Verathi (millennia-long, still multi-racial per PEOPLES.md:11). Inherited markers would convert six *circumstances* into six fantasy ethnicities, which directly contradicts canon and produces caricature.

**Test:** could a person change culture in one lifetime and have the portrait become wrong? Canon says yes — Delhari become Kethara (PEOPLES.md:60). If a marker survives that change, it's inherited and must be cut.

## Portraits key to CULTURE, not species

Pool is `[culture][roleTier]`, NOT `[culture][species][role]`.

- Procedural NPC objects carry **no race/species field at all** — `src/systems/NPCGenerator.js` returns `{ id, name, role, personality, culture, ... }`. `data/races.json` is only a name-pool *fallback* for campaigns with no culture data.
- Canon: settlements mix species *within* culture; culture does not track species.
- Therefore: spend the variety budget on **species diversity inside each culture pool** (a Kethara pool spanning human/dwarf/elf/halfling variants), not on a cross-product. This is the canon-true move AND the cheap one.
- Race-keyed portraits stay for **player character creation** only (finite, 5, player picks a species there). Two surfaces, two axes, no conflict.

## Per-culture bust markers (all NEW proposals — canon has almost no dress/appearance text)

- **Kethara** — repair visible at the collar (mismatched patch, re-stitched seam); something useful worn at the throat as a tool not an ornament (cord, key, tally-loop); hair cut short and practical, cut by whoever was nearby. Derived from PEOPLES.md:30 + TECHNOLOGY.md:26.
- **Vaethori** — one issued, matched, symmetrical element at collar/shoulder (fastener, gorget line, shoulder cord); everything else civilian; cloth *maintained*, not clean. Often a small privately-kept votive token half-hidden at the throat (GODS.md:31 — the unofficial contradiction). Hair bound or cut to a regulation line.
- **Verathi** — nothing held, nothing owned: garments layered and re-layered over long time, oldest layer innermost, no insignia of standing anywhere (CIVICS.md:13, "no citizenship"). Hair long and bound in a way that took time. Throat bare or a single very old object.
- **Delhari** — the only culture wearing a *complete, coherent, non-Verge* garment — correctly made for a climate that isn't this one, and wrong here. Collar cut to a foreign fashion, unrepaired. Origin-world professional marking (scholar's pin, guild clasp) worn where it means nothing.
- **Sirathi** — one salvaged item worn at the throat or collar that clearly belonged to somewhere else and is kept, not used. Verge-sourced clothing (they arrived with nothing) over that one object. Hair grown out or cut off abruptly.
- **Vethri** — subtractive: no ornament, no insignia, nothing at the throat at all. Garment reduced to the minimum that functions, hems worn to the edge of use, hair cropped close by function. The only culture whose marker is an *absence*.

## Vethri "calibrated" — expression, not costume

Calibrated = **conserved**, not touched. The face at rest, with the social padding removed: no anticipatory expression, no smoothing, no filling of silence. Gaze level, unhurried, focused at middle distance rather than at the viewer.

**Hard ban list for Vethri:** glowing/luminous eyes, black or white sclera, no pupils, void cracks in skin, ash pallor, veining, scarification, thousand-yard stare, anything that reads "possessed." Vethri are the *most* composed people in the Verge, not the most damaged. Per PEOPLES.md:47, "Null-touched" is a slur — art must not render the slur.

## Role signal at bust level (three tiers)

- **Reads clearly:** guard (chin/collar hardware, arming-cap line), blacksmith (soot at hairline and neck, scorch-pitted shoulder on the hammer side, singed-short hair), leader (better-kept cloth, only role permitted a direct level gaze).
- **Reads weakly, accessory only:** merchant (layered good cloth, strap over one shoulder, tally-cord), innkeeper (apron neck-loop).
- **No bust signal at all:** patron, citizen. These are the civilian baseline and should be the *largest* share of every culture pool.

## Expression range — retire uniform grimness

"Serious and watchful, not smiling" for ~200 portraits flattens the world. Keep the floor (no open smiles, no laughter — it's already in the negative prompt list) but open the range: composed / wry / weary / attentive / guarded / patient. Vary **by culture** (culture is a pool key; `personality` is rolled per-NPC and is not, so art can't key to it):

Kethara wry-practical; Vaethori composed-contained; Verathi patient-amused; Delhari alert-impatient; Sirathi steady, unbothered by small things; Vethri still.

**How to apply:** any future portrait, race, or culture visual work uses the borne-not-inherited rule as a hard gate. Style-guide wording is `creative-prompt-engineer`'s to author; this file is the narrative meaning it translates from.

Related: [[tone-visual-style]], [[race-descriptions-canon]], [[established-canon-nexus-verge-world]]
