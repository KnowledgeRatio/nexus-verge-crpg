# Nexus Verge — Image Generation Style Guide

This file is injected verbatim into AI image prompts. Each section is used for its matching asset type. Keep instructions direct and unambiguous — this is read by an image model, not a human.

---

## Art Style

Illustrative oil painting — gestural, bold, designed. Strong value contrast: peripheral areas dissolve into loose atmospheric shadow while focal subjects are rendered with precision. Concept art aesthetic, not fine art. Visible impasto brushwork throughout. Colour palette: earth tones as the base (ash grey, iron brown, deep slate) with lifted saturation at focal subjects — rich deep green, warm amber, cold slate-blue. No bright saturated fantasy palette, but not washed out. Single warm light source upper-left, cool atmospheric fill from opposite side. Every asset carries evidence of multiple origins: mismatched materials, two-climate details, rift-geometry seams. Equipment shows use — worn, repaired, improvised. Mood: desperate wonder, survival on a living frontier. No photo-realism. No anime. No modern technology. No industrial equipment.

## World Setting

Nexus Verge (called "the Verge" in common speech) is a convergence dimension — a plane that has been pulling matter, ecology, and peoples from other dimensions for ages. It is a living frontier with competing factions and improvised law. At the world's edges the Void advances: pure entropy, no intent, no hunger, just the slow erasure of ordered matter. Tone: desperate wonder, survival on a frontier that is still being mapped. All content is medieval-fantasy in material culture. No industrial equipment, no modern technology, no post-apocalyptic ruin.

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

Three-quarter view, creature fills 70% of frame. Bold readable silhouette — creature type and scale are immediately legible from shape. Background is painterly and atmospheric: aged stone, mist, or deep shadow. Peripheral background is gestural and unresolved; all rendering precision on the creature. Medieval-fantasy setting only: no modern technology, no industrial elements, no electric lighting. Creatures from other dimensions are biologically distinctive in precise ways — unusual proportions, fur adapted to a different climate, eyes built for different light. Render the distinctiveness as a specific physical observation, not exaggeration. No white border, no frame, no bezel.

## Item Icons

Single item centred on near-black background. No hands, no environment, no border, no frame, no bezel, no vignette border. Bold iconic silhouette — readable at small size. Loose gestural brushwork in secondary areas, precise rendering at defining detail. Materials rendered with clear texture: leather shows worn grain, iron shows hammer marks and light patina, wood shows split grain. Items are used but fully functional — surface wear only, no cracks, breaks, or structural damage. Magic items carry a restrained inner glow — unsettling, not triumphant. Rarity by colour temperature: common = raw iron and worn leather; uncommon = faint blue-silver edge sheen; rare = cold violet edge-light; legendary = deep amber aura with visible heat distortion. Items made from riftborn materials show two incompatible physical properties coexisting in the same surface. Render material impossibility as a precise observed fact, not as magic glow or distortion.

## Character Portraits

Bust portrait, subject centred, face occupying top half of frame. Bold illustrative treatment — subject is designed as well as depicted. Expression: serious and watchful, not smiling. Background is culture-specific but rendered loosely and atmospherically — subject in crisp focus, background is gestural suggestion. Kethara subjects: pragmatic stone-and-timber settlements. Verathi subjects: biome edges where two ecologies meet. Vethri subjects: minimal open terrain near a void boundary. Delhari subjects: structured interiors or transit camps. Sirathi subjects: sparse outposts that look newly built and already grieving. Costume is functional and worn — no ornate decoration unless the character is explicitly nobility. Strong chiaroscuro — face catches the warm light source, peripheral areas fall into atmospheric shadow. No white border, no frame, no bezel.

## Negative Prompts

white border, bezel, frame, vignette border, border frame, ornate border, decorative frame, margin, padding, edge fade, vignette, dark edges, grid lines, graph paper, grid paper, ruled lines, graph texture, grid overlay, squared paper, pixel art, isometric, pixelated, 8-bit, 16-bit, sprite, game tile, pixel graphics, photorealistic photography, 3D render, CGI, modern technology, modern clothing, industrial equipment, post-apocalyptic, sci-fi, electricity, mechanical devices, watermark, signature, text, UI elements, cartoon, chibi, anime, bright saturated colours, white or light background, duplicate subjects, smiling, lens flare, bloom, clean or pristine equipment, relief shading, elevation gradient, embossed, bevelled, hillshade, height shadow, drop shadow implying elevation, directional dramatic lighting
