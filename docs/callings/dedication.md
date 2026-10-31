# Dedication

**This doc describes only what is currently implemented.** For proposed/future changes, see `docs/plans/` — nothing from an in-progress design conversation belongs here until it actually ships. Full identity pass verified against code/data on 2026-08-07; rest recovery and level-three confirmation verified in scope on 2026-10-13. This is not a new full-calling audit.

## Player reference page

The character sheet (`C`) has **Character** and **Dedication pathways** pages. The latter compares Exemplar and Oath through levels 1–10, with ability cards, auras, vows, the six creation Fighting Styles and the shared practice pool. For a Dedication character it marks the current level, selected path and confirmed learned choices; browsing changes no selections.

[The standalone Field Codex](../../dedication.html) uses the same renderer and JSON catalogues, with a **Print / Save as PDF** button. Serve it through the local/game web server so its modules and data can load. It does not load a saved character. Extra Attack and Exemplar's second Action Surge use are marked **Not yet available**, reflecting the gaps below. Implementation is local; desktop/mobile navigation, layout and printed output remain visually unverified.

## Identity & Narrative

Dedication is the martial calling — the fighter archetype. A character with a personal well of resolve to draw on (Steady Nerve's self-heal-or-dodge choice, level 1), a burst of extraordinary effort once per short rest (Action Surge, level 2), unshakeable resolve against a failed save (Indomitable, level 2), and from level 3 onward, a named resource — **Resolve** — that fuels everything else the calling does.

The two specializations chosen at level 3 diverge in kind, not just degree:

- **Exemplar** — a centurion/vanguard archetype. Leads by tactics and lived combat experience, not command authority; first into a fight, not the one directing it from behind. Not about topping the damage or HP charts specifically — about controlling the flow of a fight and making the outcome feel inevitable. Mechanically expressed as a curated kit: which of the calling's 8 **tactics** (renamed from "maneuvers") a character knows is a real build choice made across three separate level-ups (3, 7, 9), not a fixed loadout. Two additional passive traits compound this identity: **Grace Under Pressure** (a target already suffering a tactic-inflicted condition has disadvantage on saves against the Exemplar's next tactic against it — the fight degrades in the Exemplar's favor the longer it runs) and **Vanguard** (bonus accuracy and damage on the first tactic-attack against a target that wasn't yet engaged with anyone — rewards being first into contact, not sustained toughness).
- **Oath** — where this game's Paladins come from. Power derived from the strength of a conviction, not a technique list — narratively the *reason* for the oath is player flavor only, with no mechanical sub-branching (deliberately, to avoid designing sub-specializations before the calling itself has more than two). Defense, protection, and support-primary, with real burst damage as a secondary strength via Sworn Strike — Cleric and Paladin read as one sliding scale in this game's fiction, and Oath sits on the physical/martial end of it while keeping a real slice of the Cleric side (Aid the Vulnerable's heal-or-cure is that slice made mechanical). Oath's later ability choices are called **Vows**, not tactics — each one is a specific commitment within the larger Oath, selected at levels 5, 7 and 9. Its two foundational abilities are automatically granted at level 3.

## Mechanical Identity Pillars

- **Resolve** is the calling's signature resource: a short-rest-recharging pool that both specializations spend on their signature abilities, unlocked at level 3.
- **Exemplar's replayability lever is kit curation** (which tactics you know, chosen across 3 level-ups) reinforced by **Grace Under Pressure**, which rewards diversifying rather than repeating the same tactic. **Oath's replayability lever is resource-spend tension plus a build-defining lean choice** — pick 1 of 3 Auras at level 3 (a permanent, exclusive commitment, closer in weight to Exemplar's whole level-3 pick than to a single tactic) that sets a burst/tank/support direction, then pick 1 of 5 Vows at each of levels 5/7/9 (3 of 5 ever known). The two specs are deliberately asymmetric in shape, not mirrors of each other with different flavor text — Exemplar curates a kit of similar-weight interchangeable tools; Oath makes a smaller number of heavier, distinct commitments.
- **Concentration exists in this codebase for the first time via Challenge** (see Oath below) — the formula (`floor((Resilience mod + Composure mod)/2)`) was designed during the 2026-08 attribute remap but had zero live callers until this. It is not yet a general system other content can lean on casually; see Known Implementation Gaps.
- Attribute identity: **Prowess + Resilience** under the live default `NVSystem` attribute system (`RULES.attributes.system`), the 1:1 rename of the legacy **STR + CON** identity under the `5EClassic` fallback system. See `.claude/rules/d5e-compliance.md`'s Attribute Systems section — both systems are live, switched by config, not a one-way migration. Dedication is the only calling with a settled NVSystem identity today; Curiosity and Audacity do not have one yet.
- Save proficiency under NVSystem: Resilience-save only (one proficiency, not two — the legacy STR-save/CON-save both collapse onto Resilience).

Both short and long rests restore Resolve to its maximum through the player rest controls, including saved/restored plain characters. `Character` rest methods and `RestManager` share resource-only recovery in `src/systems/restRecovery.js`; eligible ability uses and equipment charges recharge according to their definitions. Base Calling abilities are eligible by class/level/specialization without requiring `selectedAbilities`; tactics and vows remain restricted to known choices. Long rests also recover resources marked for long-rest recharge. Healing, rest eligibility, supplies and world time remain the callers' responsibility. The local 2026-10-13 repair is covered by ordinary-created-character, restored-character and callback checks; hands-on browser acceptance remains open.

Queued on-hit tactics spend their authored Resolve cost once when the attack hits; an unaffordable tactic cannot apply, and a miss spends no tactic Resolve. Reaction eligibility includes automatic abilities such as Indomitable by class, level and specialization without requiring selected IDs, while preserving known tactic/vow choices and availability checks. These combat paths were repaired locally on 2026-10-13; restored-character and reaction-callback regressions verify them, while hands-on reaction acceptance remains open.

Condition immunity blocks the control part of a tactic, not its valid damage or Resolve cost. For example, a frightened-immune enemy still takes Menacing Attack's extra damage but is not frightened. An immune control effect does not consume the one-shot Exposed benefit or start concentration. The same rule applies to Oath's condition effects; no Calling data or costs changed in the local 2026-10-18 repair.

## Progression (implemented)

Source: `data/levelProgression.json` (`progressionByClass.dedication`), `data/abilities.json`, `data/traits.json` and character creation. `data/callingProgression.json` contains authored grants but has no runtime consumer; its entries alone do not establish live progression.

Level-three confirmation requires the chosen specialization, attribute increase and branch selections: three tactics for Exemplar, or one aura for Oath. The scalar specialization validation is repaired locally; incomplete selections remain blocked. Actual confirmation and saved progression consumers are covered by regression checks, without implying a played level-1-to-10 campaign.

| Level | Content |
|---|---|
| 1 | Steady Nerve (auto: bonus action, 1/short rest, choose Heal [1d8 + level + CON/Resilience mod] or Dodge [disadvantage on attacks against you until your next turn]). Choose 1 of 6 Fighting Styles and 3 weapon masteries at character creation. The +1 attribute choice applies to confirmed level-ups, not an additional level-1 creation grant. |
| 2 | Action Surge (auto: free action, 1 extra action, 1/short rest). **Indomitable** (auto, both specs: reaction, reroll one failed saving throw, 1/short rest, free). No practice choice at this level — moved to 4/6/8, see below. ASI +1. |
| 3 | Resolve resource unlocked. Specialization choice: **Exemplar** (pick 3 of 8 tactics + **Grace Under Pressure** trait auto-granted) or **Oath** (Sworn Strike + Aid the Vulnerable auto-granted, no selection, **plus choose 1 of 3 Auras** — a new required `trait`-type choice). ASI +1. |
| 4 | Practice choice (optional — `required: false`; see practices note below). ASI +1. |
| 5 | Exemplar only: **Vanguard** trait auto-granted. Oath only: **choose 1 of 5 Vows** (optional `vow`-type choice — pool: Challenge, Reprisal, Intervene, Bolster, Conviction). ASI +1. Extra Attack is authored but not active; see gaps below. |
| 6 | Practice choice (optional). ASI +1. |
| 7 | Exemplar only: learn 1 additional tactic (optional choice, from the 5 not picked at level 3); tactic die becomes 1d8. Oath only: learn 1 additional Vow (optional choice). ASI +1. |
| 8 | Practice choice (optional). ASI +1. |
| 9 | Exemplar only: optionally learn 1 additional tactic — up to 5 of 8 known; tactic die becomes 1d10. Oath only: optionally learn 1 additional Vow — up to 3 of 5 known. ASI +1. |
| 10 | Exemplar tactic die becomes 1d12. ASI +1. Exemplar's second Action Surge use is authored but not active; no additional Oath choice is configured. |

**Practices note:** `data/practices.json` currently defines five shared practices: Forgecraft (`forgecraft`), Hearthcraft (`hearthcraft`), Trading (`trading`), Wordcraft (`wordcraft`) and Foraging (`foraging`). All have `callings: null`; none is Dedication-exclusive. The level 4/6/8 selections are optional and draw from the eligible shared pool. Catalogue and choice availability do not establish that every practice's described effect has been verified in play.

## Specializations (implemented)

### Exemplar
Chosen at level 3. Picks 3 of 8 tactics initially (see roster below), then may learn 1 more at each of levels 7 and 9 (up to 5 of 8 known by end of progression). Tactic die scales with level: 1d6 from level 3, 1d8 at 7, 1d10 at 9, 1d12 at 10 — implemented by `EffectDispatcher.resolveTacticDieSides()` and `Character.getTacticDie()`. Both hardcode the same thresholds authored in `levelProgression.json`; neither reads that table. The 1d10@9/1d12@10 step was added after a balance pass found the original 3-step table (1d6→1d8@7→1d10@10) under-closed a real DPR gap against Oath at the top of the arc — see Known Implementation Gaps for the table's duplication-in-triplicate note.

Two passive **traits** (`data/traits.json`, not `abilities.json`), both auto-granted via `specializationFeatures.exemplar.autoGrantTraits`, no selection:
- **Grace Under Pressure** (level 3, `traits.json` id `grace_under_pressure`) — a target already suffering a condition inflicted by one of the Exemplar's tactics has disadvantage on its save against the Exemplar's next tactic used against it. One-shot per qualifying use.
- **Vanguard** (level 5, `traits.json` id `vanguard`) — +1 to the attack roll and +1d4 damage on the first tactic-attack against a target that wasn't engaged with anyone when the Exemplar engaged them. Melee only (implementation judgement call).

### Oath
Chosen at level 3. Auto-grants two Resolve-fueled abilities, no selection:
- **Sworn Strike** — on a melee hit, spend 1-3 Resolve, deal 1d8 resonant damage per Resolve spent (+1d8 bonus vs. undead/fiend), once per turn (hard-gated in code, not just by cost). A vulnerability-based rework of the undead/fiend bonus (via `damageVulnerabilities` on monster data instead of a hardcoded bonus) was designed but explicitly **not implemented** — `RULES.combat.damageReductionSystem.enabled` is `false` by default (tied to itemization readiness, a separate call), and separately, on-hit damage handlers bypass that system entirely regardless of the flag. The hardcoded bonus stays as the live mechanic.
- **Aid the Vulnerable** — bonus action, spend 1-3 Resolve to heal self for (Resolve spent × CON/Resilience mod) + level HP, or spend 1 Resolve to cure one curable condition.

**Choose 1 of 3 Auras at level 3** (permanent passive traits, `data/traits.json`, `specialization: "oath"`, `tier: 3`, granted via a `trait`-type level-up choice — the first real data ever to exercise `LevelUpManager.renderTraitChoice()`, which previously existed in code but had never been used):
- **Aura of Exposure** (id `aura_of_exposure`) — enemies engaged with the Oath are Exposed: -1 AC, flat, unconditional, for as long as the engagement lasts.
- **Aura of Sanctuary** (id `aura_of_sanctuary`) — the Oath and allies engaged with the same enemy as the Oath gain +1 AC.
- **Aura of Mercy** (id `aura_of_mercy`) — the Oath and allies gain +1 to saving throws, flat (not attribute-scaled — an earlier draft scaled to the Oath's own Composure modifier and was found anti-synergistic with Dedication's Prowess+Resilience identity).

All three are deliberately flat and unconditional, on the same footing mathematically — an earlier design pass had asymmetric shapes (a damage bonus vs. an AC bonus) and simulation found a 20-30 percentage-point win-rate gap between leans under pressure; putting all three in the same currency (AC/saves, always-on) was the fix.

**Vow pool — pick 1 at each of levels 5, 7, 9 (3 of 5 ever known).** The first choice pool ever built from two data sources — 4 real abilities plus one trait (Conviction), merged by `LevelUpManager.renderVowChoice()`:
- **Challenge** (`abilities.json`) — bonus action, 1 Resolve, target one enemy, Composure save or the target becomes **Taunted** — a **concentration** effect (the Oath must maintain concentration; taking damage triggers a save using the formula above, failure ends it; this is the first live use of concentration in the game). While Taunted: attacking anyone but the Oath = disadvantage on that attack; attacking the Oath anyway = attacker gets `tauntBacklash` (-1 AC until its next turn). No reroll-on-failed-concentration-save interop with Indomitable yet — deliberate scope limit, see Known Implementation Gaps.
- **Reprisal** (`abilities.json`) — reaction, 1 Resolve, triggers when an enemy *hits* an ally other than the Oath (hit-only, not attack-only — no pre-roll interrupt exists in this engine). Free weapon attack against the attacker, no bonus damage die.
- **Intervene** (`abilities.json`) — reaction, when an ally near the Oath would be dropped to 0 HP by a hit, spend 1-3 Resolve via an in-modal picker: reduces the ally's damage from that hit by (Resolve spent) × 1d8, and the Oath takes that same reduced amount instead — both capped at the hit's original damage, so spending more Resolve always helps and never just costs the Oath more for nothing (an earlier draft had this backwards).
- **Bolster** (`abilities.json`) — bonus action, 1 Resolve, grants an engaged ally the **Inspired** condition: advantage on their next attack roll before the start of the Oath's next turn. Targets the first engaged companion found — no multi-ally picker exists (same accepted limitation as Rally's ally option).
- **Conviction** (`traits.json`, not `abilities.json` — a passive wearing a `tags: ["vow"]` label for pool-selection purposes, same "trait, not ability" pattern as Grace Under Pressure/Vanguard) — when Sworn Strike reduces a target to 0 HP, the Oath regains 1 Resolve. Tracked in both `character.knownVows` (pool bookkeeping) and `character.selectedTraits` (the field its actual mechanical check reads) — deliberate dual-bookkeeping, not a bug.

## Full Ability/Trait Roster (implemented)

Sources: `data/abilities.json` (`abilities.dedication`), `data/traits.json`. All Resolve costs are 1 unless noted.

| Ability/Trait | Spec | Trigger | Effect |
|---|---|---|---|
| Precision Strike | Exemplar | Before an attack roll | Add tactic die to the attack roll |
| Trip Attack | Exemplar | On hit | +tactic die damage; target saves (Resilience) or Prone |
| Riposte | Exemplar | Reaction, after an enemy misses you in melee | Free counter-attack, +tactic die damage |
| Menacing Attack | Exemplar | On hit | +tactic die damage; target saves (Composure) or Frightened until end of their next turn |
| Pushing Attack | Exemplar | On hit | +tactic die damage; target saves (Resilience) or Pushed (non-grid substitute for a physical push, logged in ADR-014's table) |
| Rally | Exemplar | Bonus action | Choice: gain temp HP = tactic die + CON/Resilience mod, self or an engaged companion |
| Parry | Exemplar | Reaction, after being hit by a melee attack | Reduce the damage by tactic die + CON/Resilience mod |
| Disarming Attack | Exemplar | On hit | +tactic die damage; target saves (Resilience) or -2 to attack rolls until start of their next turn |
| Grace Under Pressure (trait) | Exemplar | Passive | Disadvantage on the next tactic-save vs. an already-conditioned target |
| Vanguard (trait) | Exemplar | Passive | +1 attack/+1d4 damage on first tactic-attack vs. an unengaged target |
| Indomitable | Both specs | Reaction, after failing a saving throw | Reroll the save, must use the new result. 1/short rest, free |
| Sworn Strike | Oath | On melee hit, 1-3 Resolve | 1d8 resonant damage per Resolve (+1d8 vs. undead/fiend), once/turn |
| Aid the Vulnerable | Oath | Bonus action, 1-3 Resolve | Heal or cure a condition |
| Challenge | Oath | Bonus action, 1 Resolve | Taunt (concentration) — see Oath above |
| Reprisal | Oath | Reaction (on ally hit) | Free counter-attack, no bonus die |
| Intervene | Oath | Reaction (variable Resolve) | Redirect ally damage onto self |
| Bolster | Oath | Bonus action, 1 Resolve | Grant an ally Inspired (advantage, next attack) |
| Aura of Exposure (trait) | Oath | Passive, 1-of-3 aura pick | Engaged enemies: -1 AC |
| Aura of Sanctuary (trait) | Oath | Passive, 1-of-3 aura pick | Self + allies engaged with same enemy: +1 AC |
| Aura of Mercy (trait) | Oath | Passive, 1-of-3 aura pick | Self + allies: +1 saves |
| Conviction (trait) | Oath | Passive | Regain 1 Resolve when Sworn Strike kills |

## Known Implementation Gaps

Verified against code as of 2026-08-07. Fixed since the last version of this doc:

- **`promptReaction()` crashed for every real player character.** Its eligibility check did `character.abilities.filter(...)`, but `character.abilities` is always the six-score stat bag, never an array — **Riposte, Parry, and Indomitable had never functioned in live play**, regardless of whether a character knew them. Same failure shape (wrong-field lookup) as the earlier `_findKnownAbility` bug, never applied here until now. Fixed.
- **Riposte consumed the reactor's Action instead of their Reaction** (a mismatched option name, `shouldConsumeAction` passed but `consumeAction` read). Fixed.
- **The Resolve gate silently no-opped instead of blocking** — Riposte/Parry would still consume a Reaction at 0 Resolve for zero effect. Fixed — insufficient Resolve now excludes the reaction from being offered at all.
- Menacing Attack's saveType, Pushing Attack's ADR-014 logging, the `_findKnownAbility`/`knownTactics` dispatch gap, the tactic-picker incorrectly offering Grace Under Pressure/Vanguard as pickable tactics, and `Character.toJSON()` never serializing `selectedAbilities` — all fixed in earlier sessions, see git history for detail if needed.
- **`toggleChoiceSelection()` didn't enforce radio exclusivity** for single-select (`count: 1`) level-up choices — a native radio click could visually change the selection while `currentSelections` silently kept the first pick. Fixed — `count === 1` choices now clear sibling selections and replace the stored value, matching the radio UI. Covered by a dedicated regression test.

Remaining gaps:

- **Extra Attack is authored but not wired into player attack counts.** The level-5 entry in `classes.json` and `callingProgression.json` does not currently grant a second attack per Attack action. The Field Codex labels it unavailable rather than promising a live benefit.
- **Resolve's formula has two sources of truth.** `RULES.callingResources.resolve.formula` in `rulesEngine.js` is dead; `Character.calculateMaxResolve()` independently hardcodes the real formula. Numerically consistent today, an ADR-015 hygiene issue, not a live bug.
- **`ability.scaling` blocks are still unwired for Action Surge specifically** (its level-10 entry, 2 uses/short rest, requires Exemplar) — data-only, no code path merges the per-level override. Relevant to the still-undesigned capstone work. (Correction: tactic-die-by-level scaling is *not* in this same state — it was already live on two hardcoded paths; this doc just hadn't caught up.)
- **Tactic die's level table exists in three places that must agree** (`levelProgression.json`, `EffectDispatcher.resolveTacticDieSides()`, `Character.getTacticDie()`) instead of one source of truth — minor ADR-010 concern, not yet consolidated, flagged for a future `refactor-engineer` pass.
- **No death-save/dying state exists for the player.** `CombatManager.handleDefeat()` ends combat immediately and unconditionally at 0 HP.
- **Concentration is not yet a general system.** Challenge is its only user. No reroll-on-failed-concentration-save interop with Indomitable (deliberate scope limit — needs the game's three separate saving-throw implementations unified first, a separate piece of recommended work). No manual "end concentration early" UI (not needed yet with only one concentration source).
- **The five authored practices are shared**; no Dedication-exclusive practice is defined. The reference's practice catalogue does not establish verification of every described practice effect.
- The undead/fiend vulnerability rework for Sworn Strike (see Oath above) — designed, deliberately not implemented, blocked on a separate itemization-readiness flag.
