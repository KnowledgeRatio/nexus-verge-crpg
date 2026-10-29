# Visual direction: painted identities and illustrated places

**Approved direction — 2026-10-23.** The sponsor requests classic Baldur's
Gate-style oil-painted portraits for every creature type, selectable portraits
for both player characters and party members, and oil-painted item images.
Detailed illustrated building interiors are retained. This records the accepted
medium and coverage intent; it does not claim a completed art library or new
selection controls.

| Surface | Approved treatment | Coverage/integration intent |
| --- | --- | --- |
| Player and party portraits | Original oil-painted faces/figures with strong identity, painterly texture and atmospheric backgrounds | Players can select portraits for their own character and party members. |
| Creature portraits | The same oil-painted family, with anatomy-appropriate framing and readable type identity | Cover every creature type, including non-humanoids and creatures using animated 3D combat models. |
| Items | Oil-painted object images, readable at icon and inspection sizes | Extend across the item catalogue, not only rare or magical equipment. |
| Building rooms and service-person layers | Existing detailed illustrated rooms and composited character images | Preserve the accepted illustrated-interior direction and first-person counter presentation. |
| Combat scene | Animated 3D combat alongside painted portrait UI | Portrait selection must remain available without abandoning animated 3D combat. |
| Terrain | Existing overhead field-atlas gouache and ink | The portrait medium does not replace terrain's distinct readability contract. |

The Baldur's Gate reference describes a classic CRPG painting tradition, not a
request to reproduce its characters, specific portraits, heraldry or UI frames.
Nexus Verge subjects retain their own anatomy, equipment, cultures and canon.
Art direction does not alter gameplay definitions or invent a rule that portrait
choice must change race, equipment, model or statistics.

## Implemented evidence and outstanding work

The [illustrated building interiors](building-interiors/README.md) already have
two room variants per supported building, actual named-NPC interactions and
separate character-image layers. Preserve those assets and flows.

The existing generator's
[`prompt-builder.js`](../../tools/image-gen/prompt-builder.js) has `portraits`,
`monsters` and `items` prompt routes. The updated
[style guide](../../tools/image-gen/style-guide.md) scopes oil painting to those
asset families while retaining the separate environment treatments. Generator
routes and written style rules do not establish generated coverage.

[`CharacterCreation.js`](../../src/ui/CharacterCreation.js) currently builds
avatar options from `combatScene.playerAppearances`, whose portrait paths point
to the existing traveller renders. This is evidence of an existing avatar path,
not fulfillment of the requested painted portrait library or party-member
selection. This documentation pass does not implement or verify those new flows.

Still to implement and verify: complete creature/item coverage; suitable player
and companion portrait choices; selection and persistence for both player and
party members; and presentation of those portraits alongside animated 3D combat.
Catalogue size, variants per subject, selector placement and exact save fields
are not decided here. No full-library generation is claimed or required by this
documentation-only pass.

## Canon and acceptance boundaries

[`WORLD.md`](../world/WORLD.md), [`COSMOLOGY.md`](../world/COSMOLOGY.md) and
[`TECHNOLOGY.md`](../world/TECHNOLOGY.md) remain authoritative. The image guide's
legacy universal-medieval and “pure entropy” shorthand must not override those
documents or authored subjects. This update clarifies medium scope without
rewriting world canon.

Review painted samples for recognizable identity and anatomy, consistent medium,
small-size legibility and compatibility with the illustrated rooms and animated
combat. Completion requires checking catalogue mappings and actual player/party
selection and save/load flows, not merely counting image files.

The sponsor-approved tavern audio remains a separate decision. The
[merchant, smith and great-hall sound briefs](building-interiors/soundscape-briefs.json)
record approved starting briefs and the original failed requests. Those requests
returned internal errors without usable media on 2026-10-23. The connector
subsequently returned usable generations on 2026-10-24. The sponsor then accepted
the three selected local soundscapes and signed off issue #59 that day. They
remain excluded from public builds; listening acceptance does not establish
release clearance or acceptance of the broader audio identity. Tavern audio is unchanged.
