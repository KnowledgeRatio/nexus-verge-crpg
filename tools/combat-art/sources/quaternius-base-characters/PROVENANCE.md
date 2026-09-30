# Universal Base Characters — retained adult source

Creator: Quaternius. Retrieved 2026-09-26 from the free Standard download:
https://quaternius.itch.io/universal-base-characters
Creator page: https://quaternius.com/packs/universalbasecharacters.html

The creator pages and unchanged `License_Standard.txt` identify this pack as
CC0 1.0 Universal. No purchase or paid Source-tier file was obtained. The Standard
archive contains superhero-proportioned adult male/female bases, not all six
body types advertised across the full pack.

Archive: `Universal Base Characters[Standard].zip`, retained temporarily outside
the repository. SHA-256:
`fdbf1804c90dfc1ea03e992bff7da2dfd1a79318e13270a660180f9308455f40`.

Retained unchanged: `Base Characters/Godot - UE/Superhero_Male_FullBody.gltf`, its
`.bin` and seven referenced eye/hair/body textures. The female base and other
pack content have not been imported. The GLTF references two normal maps with
`_png.png` suffixes not present in the archive; the inspection builder corrects
those references to the corresponding retained `.png` filenames without altering
the source GLTF or images.

All 65 joint names match the retained CC0 Universal Animation Library 1 source.
Rest rotations and bone lengths differ, so `prepare_base_body.mjs` adjusts
animation rotations and translation deltas to the destination rest pose and leg
length. `anatomical-base-candidate.gltf` retains original external textures and
six adapted clips. This is authoring evidence, not a registered runtime asset or
approved change to player appearance.
