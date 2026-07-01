# Worldbuilding Expansion — Cultures, Technology, Gods, Apex Competition
*Captured: 2026-07-01*

Four threads added to existing canon (`docs/world/`). None are net-new cultures except where noted — priority was folding into what's already written.

---

## 1. Verathi Civic Rewrite (Hellenic analog — folded, not net-new)

Deeper rewrite, not additive. Verathi shift from "misty memory-keeper" toward **philosopher-citizens who govern by open debate and assembly**.

- Each threshold settlement holds its own **Convocation** — fragmented, poleis-like, no central Verathi authority. Governance by rough consensus through rhetoric, not vote-counting or hierarchy.
- Political philosophy made explicit: their "stewards, not owners" ethos becomes a civic doctrine — legitimacy through persuasion, not administration.
- **Retcon that deepens existing friction:** Vaethoran Stoicism is a systemized, codified descendant of older Verathi ethical debate. This is *why* Verathi hold "considerable contempt" for Vaethoran law (already written in PEOPLES.md) — they see it as a living tradition calcified into dead procedure.
- Keep unchanged: existing name pool (Aerindel, Carveth, etc.), the measured/allusive dialogue voice, biome-edge settlement pattern. The oracular register survives the rewrite — philosophers referencing deep time sound the same as archivists doing it.

## 2. Technology — Anachronistic, Multiversal, No Tech Ceiling

**Correction from initial framing:** no pre-industrial ceiling. The whole premise of Aevorn is convergence — fragments of countless dimensions at *any* tech level fall in and take root, the same way biomes, peoples, and creatures do. Magic and technology are intertwined and mutually anachronistic by design; that's the point, not a risk to manage.

- Technology isn't a local linear progression — it's scavenging and reuse, following the same logic as riftborn materials: artifacts arrive from origin-worlds at wildly different tech levels, most can't be locally reproduced or fully understood.
- Texture stays majority medieval-fantasy-frontier; anachronistic tech intrudes rarely and startlingly (a working power source in a ruin, a device that isn't a crossbow) rather than saturating the setting.
- **Cultural takes** (same pattern as Unmooring-cause and Voidborn dialogue variation):
  - **Delhari** — most likely to arrive *with* working out-of-place tech from their origin-world; over-explain it the way they over-explain the Void.
  - **Vaethori** — institutionally contains and studies anachronistic tech (classified imperial R&D) rather than deploying it broadly. Order and predictability over advantage — reinforces their administrative identity.
  - **Kethara** — pragmatic scavengers. If it works, it gets jury-rigged into the wall without ceremony.
  - **Verathi** — treat it as data about the nature of convergence itself; study, don't exploit.
  - **Sirathi** — personal. Debris of a lost home's technology, arriving as grief-tech.
  - **Vethri** — wary of complex tech specifically because Voidborn propagate toward *structure and complexity* — added technology may be an added attractant. Practical basis for their minimalism, not just aesthetic.
- **Resource competition tie-in:** anachronistic tech relics become a third contested resource category alongside riftborn materials and null-flux (see §4).

## 3. Gods — Rare Tangible Traces

Gods passed through Aevorn like everything else that converges here — arrived, didn't stay, destination unconfirmed. Never confirmed as fact; always a contested theory, matching how the History doc already treats the Unmooring's cause.

- Slots into the existing unresolved thread in `HISTORY.md` §I ("something already here before the Convergence") as a live candidate explanation, not a resolution.
- **Godsign relics** are the tangible evidence: existing legendary items reflavored, not a new item category. Traits: resist appraisal/identification, don't degrade, occasionally respond faintly near Void-adjacent conditions.
- Per-culture takes:
  - **Vaethori** — officially agnostic (empire doesn't establish religion), but soldiers privately keep votive godsign tokens — a quiet contradiction of the official Stoic line.
  - **Sirathi** — most devotional; for people who watched a world end, "even the gods left" lands hardest, and godsign relics function as the last tangible link to a lost home.
  - **Kethara** — folk-superstition register: "the old gods spooked and ran, same as everyone eventually does out here."
  - **Delhari** — open academic question, cataloguing artifacts, no consensus.
  - **Vethri** — quietly track a theory that gods left via the same boundary mechanics the Void itself uses. Say little about it, as always.
  - **Verathi** — a minority position (controversial even among them) holds that the gods and the "something already here" pre-Convergence presence are the same thing.
- No mechanical footprint: no pantheon, no divine-caster class (none of the three Callings are divine casters). Lore/flavor only.

## 4. The Wrought — Apex Competition, Regionally Variable

**Umbrella term for playable/humanoid races: "the Wrought."** Built on existing Void Spawn flavor text ("moves toward the warmth") — the Wrought are those who *shape*, contrasted with Voidborn (unmade, unraveling) and riftborn fauna (adapted but unconscious, shaped by environment rather than will). Replaces the earlier "Weftborn/Woven/Convergent-kin" proposals, which described arrival rather than what's humanoid-specific.

- **Frontier regions:** apex riftborn megafauna hold ecological dominance — larger, older, or better-adapted than anything the Wrought evolved defenses against. New tier in `CREATURES.md`, parallel to the Voidborn table: indifferent, not evil (a bear doesn't hate you, it just doesn't recognize your claim).
- **Contested/urban-adjacent regions:** rival sapient societies compete politically for the same riftborn materials, tech relics, and territory — not predation, resource contention. Gives ecological grounding to friction that currently reads as purely cultural (Verathi/Vaethori tension, Delhari opportunism).
- **Sociological read:** Vaethoran infrastructure-obsession (roads, forts, garrisons) is partly compensation — administrative order substituting for ecological dominance they don't actually have.
- **Psychological read:** normalized frontier vigilance, not monster-of-the-week horror. Walls and boundary-markers are just how the Wrought live here — unremarkable, not exoticized.

---

## Implementation Scope

Narrative/canon only — no rules-engine or mechanical changes required for any of the four threads.

| File | Change |
|---|---|
| `docs/world/PEOPLES.md` | Rewrite Verathi section; add "the Wrought" as umbrella term in intro; small cross-reference addition to Vaethori section (Stoicism's Verathi origin) |
| `docs/world/HISTORY.md` | Add gods/departure theory to §I and Open Threads |
| `docs/world/CREATURES.md` | Add Apex Riftborn tier (frontier megafauna) + rival-sapient competition note (contested regions); adopt "the Wrought" terminology |
| `docs/world/WORLD.md` | Add technology framing (anachronistic/multiversal, no ceiling) |
| `docs/world/TECHNOLOGY.md` *(new)* | Full tech framework + per-culture takes |
| `docs/world/GODS.md` *(new)* | Full gods lore + per-culture takes |
| `data/cultures.json` | Update Verathi `etymology`; add "the Wrought" to top-level `description` |
| `data/magicItems.json` | Reflavor 1-2 existing legendary items as godsign relics (description/lore text only, no stat changes) |

Handoff: `worldbuilder` subagent for all writes above.

---

## 5. Civics — Governance & Social Structure (addendum, same session)

New file `docs/world/CIVICS.md`. Per-culture governance model, building on what PEOPLES.md already establishes:

- **Verathi** — Convocation model already fully specified in PEOPLES.md; civics doc expands on how differing settlement rulings coexist (neither is "wrong," only differently argued) and that "citizenship" doesn't exist as a status — standing is earned per-debate, not held.
- **Vaethori** — formal imperial administration: Colonial Governor appointed from the home empire, provincial structure (e.g. the already-named "Tertian Province"), appointed magistrates, census and tribute collection, standing garrison/legion system, codified law applied uniformly regardless of local culture. Note the bureaucracy/lived-identity gap: a Kethara townsperson may be a "Vaethoran provincial subject" on a census scroll while remaining culturally Kethara in every practical sense.
- **Kethara** — informal town councils, authority earned by having built something, not inherited; disputes settled practically/by whoever's positioned to fix the problem.
- **Vethri** — near-silent consensus; deference to whoever has the clearest read on void-state risk, not to rank; settlements small enough that governance barely needs formal shape.
- **Delhari** — no native governance in Aevorn; operate as guests under host law (Kethara custom or Vaethoran code depending on territory) while pursuing their objective.
- **Sirathi** — mutual-aid bonded by shared loss; authority accrues to whoever best organizes survival and memory-keeping, obligation-based rather than rule-based.

## 6. Diplomacy — Inter-Culture Relations (addendum, same session)

New file `docs/world/DIPLOMACY.md`. All 15 pairwise relationships. Verathi–Vaethori is already fully written in PEOPLES.md (the tensest pair) — diplomacy doc should reference rather than duplicate it. Seed notes for the rest, to be expanded in the worldbuilder's voice, not invented fresh:

- **Vaethori–Kethara** — transactional/mutual dependency. Kethara resent tribute ("Tax-bringers") but rely on Vaethoran roads and protection; Vaethora needs Kethara settlements to administer.
- **Vaethori–Vethri** — friction over infrastructure ("the Loud Order") — Vaethoran road/fort-building near Void-adjacent land is a constant, low-grade irritant to Vethri conservation-of-everything values.
- **Vaethori–Delhari** — regulated tolerance ("the Compact") — Delhari operate under permit/license in imperial territory; low-cost intelligence gain for Vaethora, legitimacy for Delhari.
- **Vaethori–Sirathi** — the empire's "protection and belonging" pitch is most genuinely tested here — formal resettlement/citizenship offered in exchange for loyalty and legion labor; can read as patronizing as easily as generous.
- **Kethara–Verathi** — old-timer/elder respect, no political friction; Verathi don't seek authority over Kethara towns.
- **Kethara–Delhari** — low-friction host/guest; Delhari money and knowledge are welcome, their condescension is mildly tiresome.
- **Kethara–Sirathi** — unexpectedly compatible — Kethara's unsentimental "so what are you going to do about it" pragmatism suits Sirathi better than pity would.
- **Kethara–Vethri** — rare contact, functional respect — Kethara trust Vethri's void-judgment even when they find them unsettling.
- **Vethri–Sirathi** — the closest bond of any pair. Shared unsentimental relationship to loss, void-adjacent settlements already skew toward both together (PEOPLES.md).
- **Vethri–Delhari** — mutual mild irritation — Delhari want to study Vethri as research subjects; Vethri's edited-down minimalism gives them almost nothing to work with.
- **Vethri–Verathi** — mutual regard between the two oldest/most calibrated cultures; different methods (debate everything vs. say almost nothing), same seriousness about the Void.
- **Verathi–Delhari** — low-temperature disdain — Verathi have watched scholars arrive with frameworks "that don't quite map" for eons; mostly amused, not threatened.
- **Verathi–Sirathi** — genuinely sympathetic — archiving fragmented memory is the Verathi's whole civic function, so preserving what Sirathi lost is a natural, organic role for them.
- **Delhari–Sirathi** — uncomfortable — Delhari theorists treating Unmooring survivor accounts as research data can read as exploiting trauma; Sirathi patience has a limit here.

**Cross-cutting note:** where apex-riftborn or contested-resource pressure (CREATURES.md "Contested Ground") is high, normal cultural friction can be temporarily overridden by pragmatic cross-culture cooperation — shared threat outweighs standing tension. Worth a short closing note in the diplomacy doc.

Handoff: `worldbuilder` subagent (resume same session/memory).
