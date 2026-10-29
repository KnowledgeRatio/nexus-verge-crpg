# Settlement soundscape variety

2026-10-24. Implemented locally at the sponsor's request: independent mixtures
for buildings and exterior sets for different settlement sizes. The new takes
are candidates for listening, not approved soundscapes or public release.

## Delivered behavior

The local catalogue has two mixes for each tavern, merchant, smithy and great
hall, and two exterior mixes each for village, town and city. Ten new generated
30-second takes supplement the four accepted mixes without replacing their files.
Exterior briefs vary implied occupancy/activity rather than merely volume:
quiet lane/workyard, town market/workcourt and city street/market. These are
authored intentions, not verified listening judgments.

`SettlementSoundscapes.js` loads campaign-filtered pools once and chooses stable
mix IDs with a separate seeded stream, independent of room/person artwork and
gameplay RNG. World metadata pins the soundscape catalogue version; settlement
receipts retain exterior and per-building choices across save/load. Missing keys
are filled through ordinary world/load/entry paths. Missing/private saved IDs
are preserved when unavailable, with a compatible available fallback for playback.
Manual mix changes are temporary to the mounted view and do not rewrite receipts.

`SettlementAmbience.js` reuses the opt-in `BuildingAmbience` controls in the square.
Every entry starts muted. Exterior sound stops when entering a building, leaving,
opening a hostile/restricted view or hiding the tab; returning does not autoplay.
Indoor/outdoor playback is disposed at the scene boundary. Existing master/music
gain applies in the game; no independent global ambience bus, automatic crossfade
or dialogue ducking is added. Failure exposes retry without blocking services.
`RULES.settlementSoundscapes.enabled` gates the new selection/exterior path.

## Audition

Open [the local study](http://127.0.0.1:8781/settlement-study.html) with private
audio files present. Select **village**, **town** or **city**, keep **Visit** on
the square and press **Enable ambience**. Use **Sound** to compare its two takes
and **Ambience level** for gain. Select a building to compare its two room mixes
with **Room level**. Switching a playing mix keeps playback enabled; changing
views resets playback to muted. The preview server's availability is local to
the review session, not a deployed service.

Compare several loops at comparable perceived level on headphones and speakers.
Population, room perspective, repeated hooks, intelligible phantom speech, seams
and fatigue require listening. Successful decode/playback, RMS figures and the
provider's loop flag cannot establish acoustic acceptance.

## Assets and publication boundary

The [brief](../art/building-interiors/soundscape-variants-brief.md) and
[generation manifest](../art/building-interiors/soundscape-variants-generation-manifest.json)
record ten connected ElevenLabs `eleven_text_to_sound_v2` generations, 30-second
requests, `loop: true` and `prompt_influence: 0.65`, plus original MP3, decoded WAV
and constant-gain output provenance. Outputs use versioned `settlement-*-v2.wav`
paths under ignored `data/audio/local/`. Provider-reported total generation cost
is 18.18 US cents ($0.1818); it is not an invoice reconciliation or entitlement
claim. No new licence ruling is made here.

All new mixes are `localOnly`. Build processing strips private mixes from both
catalogues and excludes ignored audio binaries. The previously accepted tavern
mix remains available in the public catalogue; private saved IDs are not erased
when that public package is loaded. The accepted merchant/smith/hall mixes retain
their existing private status. Source metadata and provenance do not authorize
standalone audio distribution or public release.

## Validation and limits

Coordinating agents report 38 backend and 13 frontend focused tests passing.
`tests/systems/settlementSoundscapes.test.js` exercises real `SaveManager`
serialization/deserialization for sound receipts; no browser save roundtrip is
claimed for this slice.
All ten candidates completed; hashes of all 75 pre-existing checked files remain
unchanged. The generation manifest retains technical measurements and reported
costs, separate from listening judgments.

`npm run build:web` passed. Inspection of the packaged catalogues confirmed all
three exterior arrays empty, every private interior mix removed, and accepted
`tavern-inhabited-v1` retained. Private city audio was absent from the package.
The [browser record](../art/building-interiors/soundscape-variety-validation.json)
covers all fourteen mixes: actual decode/playback, loop-boundary seek, active
switching, level zero, mute/re-enable; all three exteriors stop at doorways and
return muted, all four rooms stop on exit, tab hiding stops playback and hostile
views remove exterior controls. Checks at 375/667/1440px had no horizontal overflow
or page errors. The harness disabled optional 3D scenery after initial headless
interaction timeouts; this is audio/lifecycle validation, not a
combined 3D performance verdict or listening approval.

A final focused rerun passed 12 tests in three files. Legal verification passed
all 12 checks. New audio files passed scoped ESLint; the broader touched-file
scope retained 35 existing `SettlementUI` errors and 24 warnings after fixing
one newly exposed comment indentation error; HEAD baseline has 35 errors/22 warnings.
Repository lint reported 170 errors/1,255 warnings and broad lint 3,246 errors/
2,500 warnings before that one-error correction. These are not clean lint results.
The complete suite was interrupted after repeated long-running failures in
`CombatKobold`, `GoblinCandidate`, `GroundedHumanoids` and `CombatWolf` (five failed
tests) stalled progress. The fallback excluding `tests/rendering/**` was also
interrupted after slow failures in `webMediaPromotion` and `noHealingPotions`.
Only names/durations were captured for those failures, without diagnostic
assertions sufficient to establish a root cause. Neither broad run passed.
The 51 agent-run focused checks, final 12-test rerun, browser coverage, build and
legal verification establish scoped evidence; complete regression validation
remains incomplete.

Source inspection traced selection, receipt persistence, UI lifecycle, selector
overrides and build stripping. Local documentation links and whitespace checks passed.
No acoustic approval is inferred and no deployment or commit is claimed.
