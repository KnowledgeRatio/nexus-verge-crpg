# Nexus Verge — Image Generation Style Guide

The generator selects sections from this file for matching asset types. Keep prompt instructions direct and unambiguous — selected sections are read by an image model. Coverage and integration requirements below describe approved direction, not proof that assets or UI already exist.

## Medium Scope

Sponsor-approved direction, 2026-10-23: character portraits, portraits for every creature type, and item images use the oil-painted classic CRPG portrait tradition exemplified by the original Baldur's Gate games. Create original Nexus Verge subjects; the reference specifies medium, brushwork, lighting and mood, not existing characters, compositions, logos or interface frames.

Preserve the detailed illustrated building rooms and their separately composited character-image layers. Do not apply the oil-portrait treatment to existing room backgrounds or automatically replace their service-person cutouts. Terrain retains its separate field-atlas gouache/ink treatment. Animated 3D combat remains compatible with painted portraits; selecting a portrait must not require switching combat to a static presentation.

Coverage intent is every creature type and every item type, plus selectable portraits for both the player character and party members. This is an approved target, not a completed catalogue, selection UI or save contract. See `docs/art/visual-direction.md` for current evidence and outstanding scope.

World canon in `docs/world/WORLD.md`, `COSMOLOGY.md`, `TECHNOLOGY.md` and the subject's authored data takes precedence over generic setting shorthand here. Medium rules do not redefine the Void or exclude canon-authored technology. Do not invent anomalous materials or cultural details merely to satisfy a style motif.

---

## Art Style

Apply this oil-painted treatment to character portraits, creature portraits and item art. Preserve anatomically credible faces/forms and readable silhouettes at UI size; brush texture should enrich the subject without obscuring identity. Do not substitute a photorealistic headshot or a rendered 3D-avatar screenshot for a painted portrait.

Illustrative oil painting — gestural, bold, designed. Strong value contrast: peripheral areas dissolve into loose atmospheric shadow while focal subjects are rendered with precision. Concept art aesthetic, not fine art. Visible impasto brushwork throughout. Colour palette: earth tones as the base (ash grey, iron brown, deep slate) with lifted saturation at focal subjects — rich deep green, warm amber, cold slate-blue. No bright saturated fantasy palette, but not washed out. Single warm light source upper-left, cool atmospheric fill from opposite side. Every asset carries evidence of multiple origins: mismatched materials, two-climate details, rift-geometry seams. Equipment shows use — worn, repaired, improvised. Mood: desperate wonder, survival on a living frontier. No photo-realism. No anime. No modern technology. No industrial equipment.

## World Setting

Nexus Verge (called "the Verge" in common speech) is a convergence dimension — a plane that has been pulling matter, ecology, and peoples from other dimensions for ages. It is a living frontier with competing factions and improvised law. At the world's edges the Void advances: pure entropy, no intent, no hunger, just the slow erasure of ordered matter. Tone: desperate wonder, survival on a frontier that is still being mapped. All content is medieval-fantasy in material culture. No industrial equipment, no modern technology, no post-apocalyptic ruin.

## Skill Challenge Scenes

Encounter scenes use the detailed illustrated environment treatment of the
settlement interiors. Place the observer at a standing adult's eye height,
approximately 1.65 metres above the local walking surface. State the physical
camera height explicitly; “first-person” or “eye-level” alone is insufficient.
Use a normal lens and natural downward sightlines for ground-level obstacles.
Keep foreground stones, roots, reeds and driftwood at believable human scale;
show their upper surfaces where the standing observer would see them. A ledge
underfoot must sit below the gaze, and a waist-height latch below eye level.
Avoid ground-skimming, crouched, worm's-eye and extreme wide-angle viewpoints
unless the authored encounter explicitly requires one. Preserve the obstacle,
unresolved outcome and existing world canon. This camera contract applies to
skill encounter illustrations, not terrain atlases or portrait framing.

Outdoor scenes need credible natural landforms and restrained detail. Build
continuous slopes, coherent rock strata, water-worn stones and vegetation in
irregular patches with quiet ground or water between them. Avoid filling every
surface and silhouette with protruding roots, splinters, needles, fins, stumps
or repeated tiny rock towers. Use dramatic geology only when the subject calls
for it. Ordinary landscape atmosphere should come from light, weather and scale.

## Terrain Art Style

Directly overhead orthographic field-atlas cartography in translucent gouache and fine iron-brown ink on a uniform warm stone-grey painted substrate. Restrained natural pigments: warm olive, weathered straw, iron brown, deep desaturated teal, slate blue-grey, and muted mineral highlights. Use broad readable terrain masses, sparse bold cartographic marks, consistent medium brush size and line weight, low-to-medium local contrast, and flat even illumination. Terrain identity must remain immediately legible when reduced to 16, 32, and 48 pixels. The painted surface fills every pixel edge-to-edge: no border, margin, padding, vignette, paper edge, edge fade, directional shadow, horizon, perspective, or focal centre.

Dramatic terrain (mountain, mountainPeak, jungle, denseForest, snowForest, and similarly intense members of a terrain group) earns visual intensity from increased ink density, tighter motif clustering, and a wider local value-contrast band relative to the calm baseline set by grassland — never from relief shading, elevation gradients, embossed or bevelled terrain, hillshade, drop shadows implying height, or directional dramatic lighting. Distinguish neighbouring terrains within the same transition group by hue family, motif-glyph silhouette, and contrast band only.

Pale or snow-covered terrain must remain a visibly painted surface — retain the warm stone-grey substrate and enough dark ink accent marks to stay legible; never render as a blank or near-white fill.

Cultivated or human-worked ground may use evenly spaced motif strokes (furrow lines, planted rows) rendered as loose hand-painted brushstrokes with irregular natural variation — never as mechanically ruled, perfectly straight, or grid-aligned lines.

## Terrain Atlases

Create one continuous square painted terrain sheet, not a self-contained tile, scene, diorama, icon, or complete regional map. Depict exactly one terrain material across the entire atlas. The atlas is divided conceptually into many world-tile regions, but no grid or division may appear in the image. Neighbouring regions must be natural continuations of one another. Distribute broad terrain motifs evenly and irregularly at the requested per-world-tile density. Do not render individually dense micro-features that disappear at 16 pixels. Keep motif density, value range, substrate, and detail scale consistent at the centre and every edge. The outer edges must wrap seamlessly. No second biome, transition zone, road, river, coastline, clearing, settlement, isolated landmark, central composition, text, labels, compass rose, legend, map border, characters, or creatures.

## Terrain Tiles

Legacy one-image-per-world-tile mode. Depict exactly one terrain material with a sparse, bold motif language that survives reduction to 16 pixels. Do not place a complete landscape, neighbouring biome, internal convergence boundary, road, river, coastline, clearing, or landmark inside the tile. No characters, creatures, pixel art, isometric view, sprites, grid lines, graph paper, ruled lines, or squared-paper texture.

Riftborn material-impossibility accents are authored per entry, never added by default. Include one only when the tile's own description explicitly calls for it — then it is a single small detail, two incompatible physical properties visible in the same surface per the Item Icons riftborn-material convention, confined to one detail and not distributed across the composition. Otherwise the tile carries none: no crystal, gemstone, glassy mineral cluster, iridescent patch, or anomalous out-of-place object anywhere in the frame.

The ground around the structure is one single even painted field, carrying the same tone, the same texture, and the same mark density at the centre, at all four edges, and in all four corners alike. Its marks are scattered irregularly and point in no shared direction, the way an evenly washed flat surface reads. The structure simply sits on that field, and the field continues past it unchanged in every direction.

## Monster Art

Use the same oil-painted visual family as character portraits for every creature type, including creatures represented by animated 3D models in combat. Adapt the crop to anatomy: non-humanoid creatures need not fit a human bust. A creature's type-specific silhouette, material and defining features must remain recognizable. Coverage is not limited to humanoids or player-selectable species.

Three-quarter view, creature fills 70% of frame. Bold readable silhouette — creature type and scale are immediately legible from shape. Background is painterly and atmospheric: aged stone, mist, or deep shadow. Peripheral background is gestural and unresolved; all rendering precision on the creature. Medieval-fantasy setting only: no modern technology, no industrial elements, no electric lighting. Creatures from other dimensions are biologically distinctive in precise ways — unusual proportions, fur adapted to a different climate, eyes built for different light. Render the distinctiveness as a specific physical observation, not exaggeration. No white border, no frame, no bezel.

## Item Icons

Use original oil-painted item images across the item catalogue, not only exceptional or magical equipment. Keep the painting legible as a small inventory/trading image and a larger inspection image; depict the authored item's identity rather than adding details solely because of rarity. This is an art direction, not evidence of complete generated coverage.

Single item centred on near-black background. No hands, no environment, no border, no frame, no bezel, no vignette border. Bold iconic silhouette — readable at small size. Loose gestural brushwork in secondary areas, precise rendering at defining detail. Materials rendered with clear texture: leather shows worn grain, iron shows hammer marks and light patina, wood shows split grain. Items are used but fully functional — surface wear only, no cracks, breaks, or structural damage. Magic items carry a restrained inner glow — unsettling, not triumphant. Rarity by colour temperature: common = raw iron and worn leather; uncommon = faint blue-silver edge sheen; rare = cold violet edge-light; legendary = deep amber aura with visible heat distortion. Items made from riftborn materials show two incompatible physical properties coexisting in the same surface. Render material impossibility as a precise observed fact, not as magic glow or distortion.

## Character Portraits

Use the classic Baldur's Gate-era oil-painted portrait tradition: modeled faces, visible painterly strokes, restrained rich colour, dramatic but readable light and atmospheric backgrounds. Provide distinct original identities suitable for player-character and party-member portrait selection. A selected painted identity is complementary to the animated 3D combat appearance, not a replacement for it. Do not imply the portrait selector or correspondence to 3D appearance is already implemented.

Bust portrait, subject centred, face occupying top half of frame. Bold illustrative treatment — subject is designed as well as depicted. Expression: serious and watchful, not smiling. Background is culture-specific but rendered loosely and atmospherically — subject in crisp focus, background is gestural suggestion. Kethara subjects: pragmatic stone-and-timber settlements. Verathi subjects: biome edges where two ecologies meet. Vethri subjects: minimal open terrain near a void boundary. Delhari subjects: structured interiors or transit camps. Sirathi subjects: sparse outposts that look newly built and already grieving. Costume is functional and worn — no ornate decoration unless the character is explicitly nobility. Strong chiaroscuro — face catches the warm light source, peripheral areas fall into atmospheric shadow. No white border, no frame, no bezel.

## Negative Prompts

white border, bezel, frame, vignette border, border frame, ornate border, decorative frame, margin, padding, edge fade, vignette, dark edges, grid lines, graph paper, grid paper, ruled lines, graph texture, grid overlay, squared paper, pixel art, isometric, pixelated, 8-bit, 16-bit, sprite, game tile, pixel graphics, photorealistic photography, 3D render, CGI, modern technology, modern clothing, industrial equipment, post-apocalyptic, sci-fi, electricity, mechanical devices, watermark, signature, text, UI elements, cartoon, chibi, anime, bright saturated colours, white or light background, duplicate subjects, smiling, lens flare, bloom, clean or pristine equipment, relief shading, elevation gradient, embossed, bevelled, hillshade, height shadow, drop shadow implying elevation, directional dramatic lighting
