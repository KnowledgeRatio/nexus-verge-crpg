# Encounter-scoped character loading

The main combat UI, visual study and playable encounter study now pass their
initial presentation roster to `CombatScene`. `encounterArtConfig` resolves the
distinct appearance assets and narrows `characterModels` for that scene without
mutating the shared catalogue. The selected environment is still included.
Player colour/clothing variants share one traveller model download.

Previously every configured character asset loaded in every encounter. At this
change the seven registered character GLBs total 12,870,868 bytes on disk. A
humanoid-only encounter needs 1,793,716 character bytes; traveller plus zombies
needs 3,528,624. These are uncompressed file sizes excluding scenery, runtime
modules and browser cache effects, not measured transfer-time improvements.

An explicit empty roster no longer accidentally loads the whole catalogue.
Callers omitting a roster retain the previous configured preload behaviour.
An encounter adding a previously absent body mid-fight would need incremental
loading before presentation; this change does not implement summoning mechanics.
Existing asset failure/card fallback behaviour remains intact.

Validation: 989 tests pass, including actual loader-call selection, shared-body
deduplication, catalogue immutability and empty-roster handling. Runtime lint has
no errors (existing warnings remain). Browser network checks exercise switching
between humanoids, wolves, zombies and skeletons and executing creature attacks.
