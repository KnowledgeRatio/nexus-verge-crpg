# Core Weapon Roster Expansion (SRD Parity)

**Date:** 2026-07-01
**Status:** Executed (11 weapons + 2 armors; Lance/Net still deferred)

## Execution notes (2026-07-01)

- Added all 11 non-deferred weapons (`lightHammer`, `sickle`, `dart`, `flail`, `maul`, `warPick`, `warhammer`, `whip`, `trident`, `pike`, `blowgun`) and 2 armors (`paddedArmor`, `splintArmor`) to `data/items.json`, matching the spec table below.
- `data/weaponMasteries.json` already had entries pre-seeded for all of these (plus `lance`, inert until an item exists) — only fix needed was a casing mismatch, `warpick` → `warPick`, in both the `sap` mastery's `weaponTypes` list and the id→mastery lookup table.
- **Naming swap (user decision, 2026-07-01):** `greatsword` (2d6, heavy, twoHanded) now displays as **"Longsword"**; `longsword` (1d8, versatile) now displays as **"Sword"**. Item `id`s unchanged (mechanical keys stay stable per ADR-010 spirit) — only `name` fields changed, cascaded everywhere a display name was duplicated: `data/items.json`, `data/magicItems.json` (6 entries: `longsword-plus-1/2/3` → "Sword +1/+2/+3", `greatsword-plus-1/2/3` → "Longsword +1/+2/+3"), `data/merchantInventory.json` (2 entries), `data/monsters.json` (wight/veteran attack names + multiattack prose, both referencing `weaponId: "longsword"`).
- Result: a plain short/mid/long naming ladder — Shortsword / Sword / Longsword — replacing the "great-" fantasy-tier prefix with real size language. Established as a deliberate departure from 5e nomenclature: **names are not required to track SRD terminology**, only mechanics need to.
- Lance and Net remain unimplemented, per user hold.
- **Naming swap #2 (user decision, 2026-07-01):** same "great-" prefix problem existed in the axe family. `greataxe` (1d12, heavy, twoHanded) now displays as **"Battleaxe"**; `battleaxe` (1d8, versatile) now displays as **"Axe"**; `handaxe` unchanged. Cascaded through `data/items.json`, `data/magicItems.json` (`battleaxe-plus-1/2` → "Axe +1/+2"), `data/merchantInventory.json` (1 entry), `data/monsters.json` (3 monsters' Greataxe attacks → Battleaxe, ettin's Battleaxe attack → Axe, plus multiattack/imageDescription prose for minotaur and ettin). Result: Handaxe / Axe / Battleaxe — same short/mid/long-tier pattern as the sword family.
- **Naming swap #3 (user decision, 2026-07-01):** reconsidered — user wanted the same upward-reassignment treatment applied to hammers too. `maul` (2d6, heavy, twoHanded) now displays as **"Warhammer"**; `warhammer` (1d8/1d10, versatile) now displays as **"Hammer"**. Both entries were only added this session, so no cascade needed (no magic/merchant/monster references existed yet). Result: Light Hammer / Hammer / Warhammer — same pattern as the other two families. `mace` (1d6, simple, no properties) is a separate weapon outside this ladder and stays "Mace", unchanged.

## Problem

`data/items.json` implements 24 of the SRD's 37 simple/martial weapons and 10 of 12 armors. The 24 present are **100% correct** on damage type already — every RAW piercing/slashing weapon is tagged `blood`, every RAW bludgeoning weapon is `bone` (verified against real monster data: skeleton resists `blood`/vulnerable to `bone`, void-family resist `blood`, incorporeal undead resist both). This binary is a deliberate, working system tied to the "rift salvage" worldbuilding voice (Kethara/Verathi/foreign-culture parts fused onto Verge-made repairs) — **not being touched**, only extended.

Gap: 13 weapons + 2 armors missing from the core roster.

## Damage type rule (unchanged, restated for the new entries)

RAW piercing or slashing → `blood`. RAW bludgeoning → `bone`. No new damage types introduced.

## New weapons

| id | name | category/type | damage | dmgType | properties | mastery |
|---|---|---|---|---|---|---|
| lightHammer | Light Hammer | simple/melee | 1d4 | bone | light, thrown (20/60) | Nick |
| sickle | Sickle | simple/melee | 1d4 | blood | light | Nick |
| dart | Dart | simple/ranged | 1d4 | blood | finesse, thrown (20/60) | Vex |
| flail | Flail | martial/melee | 1d8 | bone | — | Sap |
| maul | Maul | martial/melee | 2d6 | bone | heavy, twoHanded | Topple |
| warPick | War Pick | martial/melee | 1d8 | blood | — | Sap |
| warhammer | Warhammer | martial/melee | 1d8 (vers. 1d10) | bone | versatile | Push |
| whip | Whip | martial/melee | 1d4 | blood | finesse, reach | Slow |
| trident | Trident | martial/melee | 1d6 (vers. 1d8) | blood | thrown (20/60), versatile | Topple |
| pike | Pike | martial/melee | 1d10 | blood | heavy, reach, twoHanded | Push |
| lance | Lance | martial/melee | 1d10 | blood | reach, twoHanded* | Topple |
| blowgun | Blowgun | martial/ranged | 1 (flat) | blood | ammunition, loading | Vex |
| net | Net | martial/ranged | — (no damage) | — | thrown (5/15) | none |

\* see Lance ruling below.

## Two rulings needed before these are pure data entries

**Lance** — RAW is one-handed + no melee-disadvantage *only when mounted*; this game has no mount system (ADR-014, non-grid). Ruling: Lance permanently uses the "unmounted" RAW branch — `twoHanded: true`, plus a new generic weapon property `disadvantageInMelee` (attacks against a target within the weapon's minimum effective range take disadvantage). Write the property generically, not lance-specific (ADR-010) — it's reusable for any future reach weapon that wants the same tradeoff. Add this substitution to the ADR-014 table in `architecture.md`.

**Net** — deals no damage; RAW imposes Restrained on hit, escaped via a check. This game's condition system (`combatant.conditions[]`) is already generic but has no `restrained` type yet. Ruling: add `restrained` as a new generic condition (disadvantage on the restrained combatant's attacks, advantage to attackers against them, removable via an escape action — DC 10 check, skill TBD by game-designer against the 13-skill list, likely Athletics). Build it generic, not Net-specific, since future spells/effects (Entangle-equivalent) can reuse it.

Both rulings are architecture/backend-dev scope, not data-only — flag for `/architect` sign-off before `/backend-dev` implements. Everything else in the table is pure `items.json` + `weaponMasteries.json` data entry.

**Lance and Net are on hold** (2026-07-01) — deferred by user decision, revisit separately. Do not include in the next execution pass; the other 11 weapons + 2 armors are unaffected and can proceed independently.

## Naming alignment review (resolved)

Checked all 24 existing + 13 proposed weapon names against world canon. Conclusion: **no changes needed.**

- 21 of 24 existing weapons keep plain SRD names (Dagger, Longsword, Mace, etc.) — correct per the `core`-layer convention (generic name, Verge flavor lives in the description only).
- The three firearm-reskinned crossbows (`lightCrossbow`/"Carbine", `handCrossbow`/"Sidearm", `heavyCrossbow`/"Longarm") were initially flagged as conflicting with `docs/world/TECHNOLOGY.md`'s "anachronism should read as an event, not a setting" rule. On review, they don't conflict — the descriptions already model the reproduction mechanism correctly ("reproduced badly a dozen times since, which is why no two look quite alike"). The actual rule is about *variety* (multiple tech eras coexisting casually), not about one normalized anachronism becoming baseline-common. **Kept as-is.**
- `docs/world/TECHNOLOGY.md`'s Writing Rule section was amended to state this distinction explicitly, so the doc no longer overclaims and future content doesn't get flagged against a rule that wasn't precise. See "Exception — one normalized tier vs. casual variety."
- All 13 proposed new weapon names stay plain-SRD, consistent with the same convention — no firearm-style reskins applied to any of them (Blowgun included).

## New armor

| id | name | slot | AC | notes |
|---|---|---|---|---|
| paddedArmor | Padded Armor | light | 11 + Dex | stealth disadvantage |
| splintArmor | Splint Armor | heavy | 17 | Str 15 req, stealth disadvantage |

## Worldbuilder draft text (rift-salvage voice, matching existing convention)

| id | description |
|---|---|
| lightHammer | A short-hafted hammer meant to be thrown in pairs; the head is Verge-cast, but the balance was copied from a foreign original nobody local could explain. |
| sickle | A tight-curved blade built for harvest work before someone decided it did other work just as well; the edge is honed past what any field needs. |
| dart | A weighted needle of a thing, fletched with scrap leather; a dozen ride loose in a belt pouch and nobody remembers where the first one came from. |
| flail | A hinged length of chain between haft and head, the join a Kethara design nobody local has fully reproduced; the weight arrives a half-beat after the swing looks finished. |
| maul | A two-handed hammer with a head too large for its haft by local proportions; whatever alloy it's cast from is denser than it looks, and it never seems to chip. |
| warPick | A hooked spike balanced opposite a hammer face, built to punch through plate rather than cut it; the spike is a later graft, welded on in a style that doesn't match the rest. |
| warhammer | A flat-faced hammer on a haft long enough to swing two-handed when the grip demands it; the poll is stamped with a foreign maker's mark half worn away. |
| whip | Braided cord over a wire core, the tip weighted with a bead of Coldcast Bronze; it reaches further than its length should allow. |
| trident | A three-tined spear balanced for throwing as readily as thrusting; the tines are cold-worked steel, riveted to a haft that's seen saltwater nowhere near the Verge. |
| pike | A spearhead on a haft twice the length a single hand could manage; unwieldy anywhere but a line, and useless anywhere but a line. |
| lance | A tapered length of ashwood meant to be couched under an arm no rider on the Verge still rides with; without a mount, it's mostly just long. |
| blowgun | A hollow reed reinforced with a foreign lacquer; the needles it fires barely mark flesh unless something's been done to the tip. |
| net | Knotted cord weighted at the corners, thrown wide rather than aimed true; it isn't meant to hurt, just to hold. |
| paddedArmor | Quilted layers stitched over scavenged batting; better than nothing, and loud enough to prove it. |
| splintArmor | Overlapping vertical strips riveted to a leather backing, half of them a mismatched foreign alloy; heavier than plate and half as elegant. |

## Execution order

1. `/architect` — rule on `disadvantageInMelee` weapon property and `restrained` condition shape (generic dispatch, ADR-010 compliant).
2. `/backend-dev` — implement the two new mechanics; add all 15 entries to `items.json`, mastery assignments to `weaponMasteries.json`.
3. `/data-agent` — cross-file validation pass (loot table refs, campaignIds, no ghost IDs).
4. Update ADR-014 substitution table with the Lance ruling.
