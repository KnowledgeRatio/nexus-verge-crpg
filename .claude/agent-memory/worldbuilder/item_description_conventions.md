---
name: item-description-conventions
description: Established conventions for item description prose in items.json and magicItems.json — tone, structure, Verge-specific detail rules
metadata:
  type: project
---

Established 2026-05-26 during full items.json description rewrite.

## Core rules

- **Length:** 1–2 sentences. No exceptions. Two tight sentences beat one long one.
- **Structure:** What it is physically (material, condition, origin) + one Verge-specific detail (repair, mismatched origin, rift provenance, two-climate wear).
- **Voice:** Object's perspective — what it looks like and what it has been through. Not what it does mechanically.
- **No boilerplate:** "A simple blade" is always wrong. Name the detail that makes this object specific to this world.

## Per-category rules

**Weapons (melee):** Hint at source-world origin (culture's geometry, stamped marks in unknown scripts) and what repair has been done on the Verge (replacement haft, copper wire winding, mismatched pommel alloy).

**Bows:** Organic, hand-shaped construction language. Reference the wood, the tiller, the asymmetry of a weapon made for a body. One Verge-climate detail (damp/dry face, oversized for local archers).

**Crossbows:** Precise mechanical engineering from a more structured culture. Reference the lock mechanism, the laminated prod, the maker's mark. The engineering is from somewhere else; repairs are Verge-origin.

**Rift firearms (riftPistol, riftMusket):** Alien mechanism + local repair. The barrel geometry and lock are rift-origin precision work; the grip and stock have been rebuilt with Verge materials (bone, leather cord, salvaged iron). Propellant smell is unnamed. Loading is slow and deliberate. Use `campaignIds: ["nexus-verge"]`.

**Ammunition:** For standard ammo (quiver, bolt case): mixed-origin fletching/sort patterns, field-organised. For shot: uniform precision that couldn't have been cast on the Verge.

**Armor:** Mismatched origin is the default. Different cultures' work combined. Repairs in different materials. Padded where original fit was wrong.

**Gear packs:** Evoke the kind of person who carries it and what the Verge has done to it. No content lists. One functional detail, one Verge detail.

**Consumables (potions):** Appearance and smell only. Colour, viscosity, vessel material, what it smells like. Never state what it does.

**Scrolls:** Describe the physical object (material, ink colour, format) and one unusual detail about the script or container.

**Materials (pelts, bones, etc.):** Describe what creature or dimension they came from in Verge terms. Unnamed species, convergence-specific properties, iridescence/weight anomalies.

**Gear (tools, clothing, misc):** One sentence of what it is + one Verge-specific detail (Verge-tanned leather, foundry mark in unread script, named cultural practice).

## Rift firearms — established precedents

- The `shot` ammo type is introduced by `shotPouch` (nexus-verge only).
- Both rift weapons use `campaignIds: ["nexus-verge"]` — they do not appear in generic core content.
- The propellant smell is deliberately unnamed ("something from another world that Verge chemists haven't named") — do not name it in future text.
- The repair vocabulary: bone grip, leather cord winding, salvaged iron fittings. Hold this for future rift-weapon entries.

## Coldcast Bronze reference

The glaive description uses Coldcast Bronze (from [[riftborn-materials]]) as the repair material — "cold on one face, warm on the other." This is the first use of a named riftborn material in a mundane item description. It establishes that riftborn materials can appear in ordinary equipment as expensive repairs, not only in dedicated riftborn items.

## Magic item description rules (established 2026-05-26, magicItems.json rewrite)

Magic items follow all base rules plus these additional constraints:

**Rarity signals through visual temperature:**
- common: raw iron and worn leather tones, no glow
- uncommon: faint blue-silver edge sheen
- rare: cold violet edge-light
- veryRare: deep violet aura, subtle distortion
- legendary: deep amber aura, visible heat distortion (no actual light cast)

**Enchantment tone:** Restrained and unsettling — the enchantment feels like it shouldn't be there. Never triumphant or heroic. The glow/sheen is a property, not a feature.

**Magic weapons and armor look used.** The enchantment didn't spare them from wear. Every +1 weapon has scratches, replaced hafts, mismatched pommels. The enchantment predates the damage.

**Wondrous items hint at source dimension.** Impossible geometry, contradictory material properties, functions that suggest technology we don't understand. Reference riftborn materials (Meridian Amber, Weftglass, etc.) where appropriate.

**Legendary items feel old in a way that predates current settlements.** No archivist can date them. Origin script is unfamiliar. The enchantment has outlasted everything else about the object.

**Mechanical restatement is always wrong.** Never write "grants a +1 bonus." Describe the physical phenomenon only.

**Precedents set in magicItems.json rewrite:**
- `amulet-of-health` uses Meridian Amber — establishes riftborn materials are appropriate for rare wondrous items
- `wand-of-magic-missiles` uses Weftglass — establishes Weftglass for arcane focus items (shadow with extra edges is the correct Weftglass tell)
- `armor-of-invulnerability` uses Vethsteel density banding — establishes riftborn materials in legendary armor
- Legendary amber "heat distortion" is described as warmth without light source, not as visible fire or visible distortion

**Why:** Full items.json description rewrite 2026-05-26. These conventions are now the established baseline for all future item text. magicItems.json rewrite 2026-05-26 extended them to enchanted items.

**How to apply:** Any new item added to items.json or magicItems.json must follow these per-category rules. When reviewing existing items after content additions, check against these conventions before accepting.

Related: [[established-canon-nexus-verge-world]], [[riftborn-materials]], [[tone-visual-style]]
