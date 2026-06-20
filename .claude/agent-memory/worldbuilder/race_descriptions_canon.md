---
name: race-descriptions-canon
description: Canonical visual descriptions for the five races in Nexus Verge — written for image generation prompts, not player-facing lore text
metadata:
  type: project
---

Written 2026-05-25. Race descriptions in `data/races.json` were rewritten from D&D boilerplate to visually precise, image-gen-ready text. These are the key decisions that set precedent.

## Governing principles

- Race descriptions are painter's observations: build, colouring, dress, posture. No personality, alignment, or class-role language.
- Every description includes convergence evidence: mismatched materials, improvised equipment, or evidence of multi-world origin.
- No cultural specificity — five cultures (Verathi, Kethara, etc.) determine portrait backgrounds via a separate system. Race descriptions do not name cultures.
- Descriptions are 2-3 sentences, written to be read by an image model.

## Canonical visual anchors per race

**Human:** Wide skin tone range (pale ochre to deep umber). Layered improvised clothing — base cloth, repaired leather or scavenged plate. Emphasis on variation: no two look like they came from the same source-world.

**Elf:** Silver-grey or deep olive skin. Eyes with faint luminescence (pale gold, washed green, near-white). Tall and lean, upright posture. Equipment modified with mismatched materials — long Verge tenure shows.

**Dwarf:** Short and broad. Skin weathered to ash-brown or iron grey, heavily textured at hands/jaw. Structural gear: stone-fitted plate fastened with rivets, not straps.

**Halfling:** Small (≈3.5 feet), round-faced, sandy to russet skin, dark curly hair. Posture: low and level, weight forward. Gear is scaled-down and mismatched in material — assembled from Verge availability.

**Dragonborn:** Tall and heavily built. Scale tones: charcoal black, tarnished copper, dark indigo, bone white. Vertical-pupilled reflective eyes. Arrived in lineage groups — equipment is matched and maintained, contrasting with the patchwork gear around them.

## What to avoid

- Any D&D boilerplate ("ethereal grace", "proud and honorable", "bold and hardy")
- Personality descriptors of any kind
- Cultural environment hints in the race description (forest-dwelling elves, mountain-dwelling dwarves)
- Emotional framing

**Why:** Race descriptions feed directly into AI image generation prompts. Visual precision and convergence-world grounding produce better portrait output than personality language, which image models cannot render.

**How to apply:** Any future race added to `data/races.json` should follow these conventions. Any portrait generation that references race should pull from this anchor set.

Related: [[tone-visual-style]], [[established-canon-nexus-verge-world]]
