# Illustrated skill challenges

**Status:** Implemented locally; desktop/mobile visual acceptance remains pending
because browser access could not be obtained. See the [coverage and validation](../art/skill-challenges/README.md).

**Goal:** Give skill encounters the tactile illustrated atmosphere of settlement interiors and clearer narrative approaches while preserving procedural generation and consequences.

**Architecture:** Optional presentation metadata lives on existing challenge definitions. One generic renderer mounts scene art in choice, confirmation and result modals. It does not roll, select encounters, write saves or change rewards. A rules flag disables the artwork. Existing checks and branching remain authoritative.

**Implementation:**
1. Test image mounting, missing-art fallback, stale image cleanup and disabled presentation.
2. Add the generic renderer and responsive modal styles; integrate all three shared prompt surfaces.
3. Add generated environment illustrations to compatible authored encounters. Keep unillustrated encounters functional rather than assigning a contradictory image.
4. Enrich existing encounter setups, approach descriptions and stage transitions without adding mechanics or unsupported lore.
5. Verify data/mechanical equivalence, existing skill integration, full tests, lint and build; inspect desktop/mobile prompts and fallback.
6. Complete the documentation handoff with asset provenance, coverage and validation limits.

No Git history or publication actions are authorized. No new random draws or save fields are needed: presentation follows the challenge already selected by the procedural systems. A larger conversation-tree expansion is outside this modest pass.

## Complete catalogue rollout

Sponsor requests continued coverage after the first 14 definitions. Add authored
scene metadata to all 41 definitions and the separate social tree. Use focused
vignettes for NPC interactions, avoiding fixed NPC identities. Provide indoor,
outdoor and snow variants through one generic context matcher, carrying the same
context across prompts and results. Preserve checks, rewards, RNG and saves.

Test variant fallback and social event metadata before implementation. Retain
generated PNG originals under the art documentation; encode full-resolution JPEG
delivery copies and extend the existing root image build allowlist accordingly.
Verify complete coverage, shipped paths, mechanics equivalence, relevant tests,
build size and scene inspection; complete the documentation handoff.
