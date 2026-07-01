---
name: worldbuilding-expansion-2026-07
description: Four canon threads landed 2026-07-01 — Verathi civic rewrite (Convocation), anachronistic multiversal tech (no ceiling), gods/godsign relics, "the Wrought" + Apex Riftborn tier
metadata:
  type: project
---

Implemented from `docs/plans/2026-07-01-worldbuilding-expansion.md` (locked design, not re-litigated). Touched: `docs/world/PEOPLES.md`, `docs/world/HISTORY.md`, `docs/world/CREATURES.md`, `docs/world/WORLD.md`, new `docs/world/TECHNOLOGY.md`, new `docs/world/GODS.md`, `data/cultures.json`, `data/magicItems.json`.

## Verathi civic rewrite

Verathi are now explicitly **philosopher-citizens governing by open debate** — no central authority, each threshold settlement holds its own **Convocation** (poleis-like assembly, legitimacy via persuasion not vote-counting). "Stewards, not owners" is now explicit civic doctrine, not just temperament. Name pool, phonetics, and the measured/allusive oracular dialogue voice are unchanged — only the governance framing changed. Retcon: **Vaethoran Stoicism descends from codified Verathi ethical debate** — this is *why* Verathi hold contempt for Vaethoran law (a living argument frozen into procedure). Added to Vaethori's existing "Relationship to Verathi" paragraph, not a rewrite of that section.

## "The Wrought"

Umbrella term for all playable/humanoid peoples across all six cultures. Contrasted explicitly against Voidborn (unmade, unraveling) and riftborn fauna (shaped by environment, not will). Introduced in `PEOPLES.md` intro, used in `CREATURES.md` and `data/cultures.json` top-level description. Use this term going forward instead of "humanoid" or "settlers" in new canon text.

## Technology — no tech ceiling

Aevorn technology is anachronistic and multiversal by design, **explicitly no pre-industrial ceiling** — tech fragments arrive from origin-worlds at any level via the same convergence logic as riftborn materials (arrival, not invention; most can't be locally reproduced). Setting texture stays majority medieval-fantasy-frontier; anachronistic tech intrudes rarely and startlingly, never saturates. Full framework + all six per-culture takes (Delhari over-explain/arrive-with-it, Vaethori institutionalize/classify, Kethara jury-rig without ceremony, Verathi study-don't-exploit, Sirathi grief-tech, Vethri wary because complexity attracts Voidborn) now live in new `docs/world/TECHNOLOGY.md`. Tech relics are now a third contested resource alongside riftborn materials and null-flux.

## Gods / godsign relics

Departure myth added to `HISTORY.md` §I as a **live contested theory, not a resolution** (matches the doc's existing convention for the Unmooring's cause). No pantheon, no divine casters — lore/flavor only, explicit writing rule in new `docs/world/GODS.md`. Godsign relic traits: resist appraisal, don't degrade, faint response near Void-adjacent conditions. All six per-culture takes documented (Vaethori officially agnostic but soldiers keep votive tokens; Sirathi most devotional; Kethara folk superstition; Delhari open academic question; Vethri quietly theorize gods used Void-like boundary mechanics; Verathi minority view equates gods with the pre-Convergence "something already here").

**Existing legendary items reflavored as godsign relics** (description-only, no stat/rarity changes): `vorpal-sword` and `armor-of-invulnerability` in `data/magicItems.json` — both already used Meridian Amber "heat distortion" as their legendary-rarity visual signal (see [[item-description-conventions]]), so the godsign layer was added on top of that existing riftborn-material framing rather than replacing it. This is the reusable pattern for reflavoring the *next* legendary item as godsign, if one is added: keep the riftborn-material tell, add resist-appraisal + no-degradation + Void-proximity-response as an additional 1-2 sentences.

## Apex Riftborn (new CREATURES.md tier)

New tier parallel to the Voidborn table but structurally opposite: these are **ordinary living riftborn fauna** (not Voidborn) that happen to be ecologically dominant on the frontier — indifferent not evil (same "bear doesn't hate you" register as Voidborn text), but explicitly *do* get hunger/territory/offspring language, which is forbidden for Voidborn. Three qualitative tiers (Territorial / Dominant / Convergence-Old) — deliberately no CR numbers, since no matching monsters.json entries exist yet (flagged gap, see below). Added a "Contested Ground" subsection reframing existing Verathi/Vaethori tension and Delhari opportunism as partly resource competition over riftborn materials/tech relics/territory (political, not predatory) — ties into Vaethoran infrastructure-obsession as compensation for lacking ecological dominance.

## Addendum — Civics & Diplomacy (same session, plan §5/§6)

Two new docs added on top of the above: `docs/world/CIVICS.md` (per-culture governance model — Verathi Convocation coexisting-rulings + no-citizenship angles, Vaethori imperial administration + bureaucracy/lived-identity gap, Kethara town councils, Vethri near-silent consensus, Delhari guest-under-host-law, Sirathi mutual aid) and `docs/world/DIPLOMACY.md` (all 15 pairwise culture relationships; Verathi–Vaethori referenced from PEOPLES.md rather than duplicated; closes with apex-riftborn/contested-resource pressure temporarily overriding standing friction, tying to CREATURES.md "Contested Ground"). Also fixed a stale "Five cultures" → "Six cultures" line in `docs/world/PEOPLES.md` intro (Vaethori is documented at the bottom of that file but the intro hadn't been updated when it was added).

No new lore facts were invented for Diplomacy beyond synthesizing PEOPLES.md/HISTORY.md/CREATURES.md/GODS.md/TECHNOLOGY.md, per plan constraint — treat CIVICS.md and DIPLOMACY.md as expansions/cross-references, not new source-of-truth facts; if a contradiction ever surfaces, defer to PEOPLES.md.

## Gaps flagged during implementation (smallest-consistent-choice calls, not big new decisions)

- Apex Riftborn tier table has no CR column/mechanical stat mapping — plan scope was docs-only, no monsters.json entries were created. If `/game-designer` wants actual Apex Riftborn monster entries, the tier names (Territorial/Dominant/Convergence-Old) and the "living fauna, not Voidborn" framing should be the source of truth.
- No new items were created for tech relics or a "godsign" item category — plan explicitly said reflavor existing legendary items only, so this is intentional, not an oversight.

Related: [[riftborn-materials]], [[item-description-conventions]], [[established-canon-nexus-verge-world]]
