# Illustrated building interior generation briefs

2026-10-23. Sponsor direction: return to the preferred illustrated room with separate character images; provide distinct variants for each supported building. Preserve a first-person encounter, especially facing a merchant across a counter. Audio is unchanged in this pass.

These are creative briefs and composition constraints, not a claim of exact submitted prompts or successful generation. The generating agent records actual requests, outputs and processing below. New assets remain candidates until inspected in their composited room.

## Shared visual and composition direction

Use `data/graphics/tavern-interior-v1.png` as the visual reference: high-detail photographic illustration, tactile worn timber and stone, believable amber practical lighting balanced by cool daylight, repaired cloth and restrained material colour. This follows the sponsor's specific interior preference; it does not redefine the whole game's older illustrative-oil-painting guide.

The setting remains a living frontier with improvised practical interiors and material evidence of use. Do not add royal institutions, named cultures, cult symbols, technological spectacle, Source power sources or evil-Void decoration. Chief means an approachable local authority in this image brief, not a new assertion about government or rank. No generated readable signs, lettering, UI, watermarks or people in backgrounds.

For merchant, blacksmith and great hall, use an eye-level first-person view across the service counter or working reception table. Put its horizontal rear/top edge at approximately **65% of image height**. Reserve the central **25% of image width**, centred at **50%**, for a separate waist-up character whose lower crop ends at that edge. Keep the surface and background behind the character visually quiet enough for a face to read. Side props must not cover the eventual hands or face. Avoid a bird's-eye room, dollhouse, throne-room panorama or dramatic camera tilt.

Use the same composition contract across both variants so one transparent character remains plausible. Vary construction, arrangement and light source rather than recolouring the same room. Keep both lighting setups compatible with warm diffuse light on the character from the left/front and a subtle cool fill.

## Background briefs

| Candidate | Distinct room direction | Composition constraints |
| --- | --- | --- |
| Tavern v2 | A different inhabited-use common room built from patched plaster, dark salvaged beams and rough stone; low shelves of mixed pottery, draped worn textiles, different table arrangement and smaller hearth surround | Preserve original bar-left/hearth-right layout and the original character placement zones. Central aisle, foreground table edges and cool rear windows maintain depth. No baked people; no service counter spanning the frame. |
| Merchant v1 | Compact timber-and-plaster supply shop; rough shelving, folded cloth, rope, sacks and ceramic storage around a plain worn counter; warm lamp light with a small cool side window | Counter edge at 65%; clear centre for merchant; tangible practical stock without implying every depicted prop is a tradable item. |
| Merchant v2 | Wider stone-vaulted storeroom shop with timber shelving, stacked wooden chests, baskets and travel supplies; broader cool daylight and restrained amber practical light | Same eye-level counter/character contract; distinguish architecture and storage arrangement, not only colour. |
| Blacksmith v1 | Intimate soot-darkened stone workshop with a forge at rear left, worn repair tools, plain unfinished ironwork and a scarred service bench; warm forge glow remains behind the interaction plane | Counter/bench edge at 65%; centre clear. No active sparks, smoke curtain or hot metal in the character area. |
| Blacksmith v2 | Timber-roofed smithy with cool daylight from the side, smaller rear-right forge, repaired bellows and practical iron stock; dark work surfaces and a differently arranged tool wall | Same counter/character geometry; keep warm front-left character light plausible through a separate small practical lamp or reflected light. |
| Great hall v1 | Stone-and-timber civic common room, a substantial working reception table, records and folded maps set to the sides, modest repaired banners and lateral hearth warmth | Face the local authority directly across the table; edge at 65%. No throne, crown, grand royal dais, invented heraldry or guards. |
| Great hall v2 | Long beam-roofed communal hall, narrow cool rear windows, benches beyond the reception table, a restrained textile and practical storage; less stone and a different depth arrangement | Same centred encounter and 65% table edge; readable intimacy despite the larger room. No court spectacle. |

## Transparent character briefs

Each image contains one anonymous adult visual stand-in on a genuinely transparent background. Frontal or lightly three-quarter pose with attention towards the player, natural proportions, warm diffuse front-left light, restrained cool fill, and a calm attentive expression. Frame waist-up with elbows and hands inside the image, ending cleanly at the waist for placement behind the counter. No furniture, shadow plane, background, text, halo or prop extending beyond the frame.

- **Merchant:** practical layered linen and wool, worn apron or waistcoat, one modest folded cloth or small accounting object held near waist. Looks ready to listen, not a caricature of greed. No coin piles or invented insignia.
- **Blacksmith:** used leather apron over practical sleeves, subtly soot-marked forearms, relaxed hands near waist, physically credible craftworker. No raised hammer, oversized weapon, active forging pose or sparks: this is the service conversation.
- **Chief:** experienced local organiser in functional worn clothing with a modest better-kept outer layer. Straight but approachable posture, hands relaxed near waist. Authority comes from presence and care, not crown, jewels, fantasy armour or a royal sceptre.

These assets must not introduce names, dialogue, new services or permanent claims about a generated NPC's identity. Existing game data remains authoritative.

## Composite acceptance

Inspect both variants with their actual character overlay, not only the generated images. Character scale, crop and lighting should make the person appear behind the counter rather than floating in front of it. The surface must meet the waist naturally, hands must remain plausible, and the head must not cover the main light fixture. A visitor should immediately understand who they are facing and what kind of building they entered.

On a narrow screen, keep the face and interaction readable without destroying the first-person relationship. Verify that background crop does not move the counter away from the character. Keep actual NPC names and services accessible independently of art loading.

Compare variants side by side for meaningful architectural and prop-layout differences. Reject incidental people, malformed foreground objects, illegible text-like marks and an empty space that looks reserved for a pasted portrait. Preserve the original tavern's accepted audio.

## Generation provenance

[`generation-manifest.json`](generation-manifest.json) records the generating agent's exact submitted prompts, built-in OpenAI image generation tool, generation date, reference inputs, selected output paths, transparency settings and generated source filenames. Use that manifest for actual requests rather than treating the creative briefs above as verbatim prompts. Runtime presentation and any processing are documented in [`README.md`](README.md). Successful generation remains separate from visual acceptance; provenance does not establish licence clearance or exclusive rights.

Initial brief: seven background candidates and three transparent character candidates. Subsequent inspection is recorded separately below; final batch size, exact generation provenance and selected assets are supplied by the generating agent.

## Initial background inspection

The seven workspace background candidates were visually inspected after generation. The figures were still pending, so this is background composition review rather than final composite acceptance. Approximate counter rear-edge heights at the image centre are below; estimates are visual, within roughly one percentage point. Per-variant overlay placement must follow the actual edge rather than blindly using the requested 65%.

| Workspace candidate | Observed rear edge | Inspection finding |
| --- | --- | --- |
| `merchant-interior-v1.png` | 62% | Clear central overlay space; practical stock and warm side lamps. |
| `merchant-interior-v2.png` | 64.5% | Distinct wider shelf arrangement and arched side window; counter centre clear. |
| `blacksmith-interior-v1.png` | 66% | Forge and anvil left; clear central aisle behind counter. |
| `blacksmith-interior-v2.png` | 73% | Useful reversed forge/daylight arrangement; lower-than-requested edge requires adjusted overlay placement. |
| `greathall-interior-v1.png` | 64% | Records and noticeboard distinguish civic use; verify chief overlaps central chair back plausibly. |
| Current `greathall-interior-v2.png` | 75% | Regenerated as a distinct records/council room with shelves, map, benches and narrow windows. Clear central chair/table placement; the earlier tavern-like candidate and its 68% estimate are superseded. |
| `tavern-interior-v2.png` | Left bar approximately 39% | Retains original slot layout and hearth position; variation is modest, mainly textiles and timber detail. |

All seven inspected backgrounds were free of baked-in people, and their centre spaces remained usable for overlays. Those observations do not certify generated fine detail or anatomy. Reinspect any regenerated candidate and replace the relevant provisional finding with its actual result.

Initial merchant, blacksmith and great-hall v1 composites were also inspected. Merchant and chief meet their counters naturally; the chief overlays the chair back without an obvious furniture intersection. The initial smith capture had a small gap between the waist crop and counter, requiring the final 66% alignment check. These early captures do not establish mobile or all-variant acceptance.

## Final composite review

All sixteen `{merchant,blacksmith,greathall,tavern}-v{1,2}-{desktop,mobile}.png` captures in this directory were visually inspected after the placement adjustments. The smith v1 waist gap is resolved. Both variants of merchant, smith and chief meet their counter edges without an obvious floating crop or furniture intersection. On mobile, faces and arms remain within the scene, the first-person counter relationship is preserved, and named buttons remain readable. The regenerated hall v2 reads as a civic records room and the chief obscures its chair back naturally.

The counter-room variants meet the bounded creative target for this pass; no material placement or anatomy defect requiring another generation was found in these captures. Tavern mobile deliberately retains separate person cards below the room. Desktop tavern cutouts retain a minor limitation: the right patron overlaps the foreground bench edge, and ground-contact shading is less convincing than the background. Tavern v2 remains a modest room variation rather than a substantially different layout. These limitations do not require changing the accepted audio or expanding this counter-room pass.

This is visual review of the captured composites, not proof of dynamic interaction, accessibility behaviour, source-image exclusivity or sponsor acceptance. Functional validation is recorded separately in the implementation report.
