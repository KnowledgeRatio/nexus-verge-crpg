# Source & Void — Mechanical Expression

**Status:** Proposed — 2026-09-08. Awaiting ruling: **GitHub #36** (open-decision register).

Design response to `docs/world/COSMOLOGY.md` (authoritative canon). Covers four linked questions: the anti-Void item set, the boundary-failure cost, the `voidwoven` property, and whether Curiosity needs a mechanical expression.

**Analysis only. No `data/` or `src/` changes made.**

---

## 0. Source-availability note

The creative-direction brief (`source-void-direction.md`) referenced for this work **does not exist on disk** at the given scratchpad path or anywhere under `/private/tmp/claude-501/`. This proposal works from the direction as restated in the task brief: enforced separateness, boundary-failure over corruption meters, one desirable Void effect by L3–4, and the canonical scale rule. If the original document contains constraints not restated there, re-check sections 1–3 against it.

---

## 1. The governing design rule

The cosmology's whole problem is that players pattern-match Source=good / Void=evil within minutes. Prose cannot fix this; only mechanics can. One rule does most of the work:

> **Source-derived items deal no bonus damage of any kind. Void-derived effects cost nothing.**

This is deliberately the inverse of what a player expects. The "good" force gives you a strained, costly, defensive tool; the "bad" force gives you a free, pleasant one that nobody comments on. That asymmetry breaks the moral pattern-match harder than any amount of writing.

The corollary is stronger than "no radiant damage": **any** bonus-damage rider on a Source item re-imports holy-vs-unholy through the back door. A "separateness blast" is radiant with a new name. Damage is the wrong verb for this force entirely — the Source is explicitly "not a resource," and a damage rider is the mechanical grammar of a power source.

---

## 2. Question 1 — the anti-Void item set

### 2.1 Verdict on "enforced separateness"

**It survives, but only in one mechanical form: suppression of change.** It does not survive as anything offensive.

"Holding apart something that would otherwise stop being distinct" translates to exactly one thing this combat engine can express: *a named category of state change is prevented for a duration.* Everything else people will reach for — bonus damage, a damage type, an aura, a resistance — either reintroduces the power-source framing or is meaningless without a movement grid (ADR-014).

That is a narrower design space than the direction implies, and it should be treated as a feature. It gives Source items a single coherent mechanical identity (they *stop things happening*) that no other item family in the game has.

### 2.2 The mechanic: **Hold**

A Source-derived item lets you spend action economy plus **1 Slip** (§3) to place a `held` condition. While `held`, one named category of change cannot occur on the target.

Generic effect handler, ADR-010 compliant:

```json
{ "type": "holdBoundary", "category": "...", "target": "...", "duration": "...", "slipCost": 1 }
```

`category` is data-driven. Adding a new *item* using an existing category is JSON-only. Adding a new *category* is a genuinely new effect type and a legitimate code change — same precedent as `onHitSaveOrCondition`'s `saveType`/`dcContext` fields.

| `category` | Suppresses | Check site |
|---|---|---|
| `stackEscalation` | A stacking condition's `value` cannot increase | `Combatant.addCondition()` `stackBehavior === 'addValue'` branch (CombatManager.js ~3042) |
| `hpFloor` | Target cannot drop below 1 HP | `applyDamage()` (CombatManager.js:65) |
| `conditionApplication` | Next condition application is refused | `Combatant.addCondition()` entry |

This lands cleanly on existing infrastructure. `stackEscalation` in particular is the direct counter to the Void's already-implemented encounter signature — `voidPresence` is a `stackable` / `addValue` condition with `damageOnTurnStart`, dispatched generically via `applyConditionOnTurnStart` (CombatManager.js:381–412). The anti-Void item keys off **that condition's shape**, not off a `voidborn` creature tag. That is what makes it non-holy: it is boundary maintenance against a mechanic, not a damage type against a species.

### 2.3 Item replacements

Slot reality check — `Character.equipment` has `mainHand`, `offHand`, `armor`, `helmet`, `artifact`. There is **no accessory slot**. The plan's "Amulet" and "Charm" map to `artifact` (one slot, already exists) and a consumable.

| Old (CAMPAIGN_PLAN) | New | Slot | Rarity | Episode |
|---|---|---|---|---|
| Voidbane Dagger (+1d6 **radiant** vs Voidborn) | **Kept Edge** | mainHand | heroic | 3 |
| Purification Amulet (cleanses corruption) | **The Held Line** | artifact | heroic | 5 |
| Anti-Void Charm (necrotic resist, "vs void effects") | **Counted Stone** | consumable, 3 charges | great | 2 |

**Kept Edge** — dagger base, `bonus: +1`, `damage: 1d4`, `damageType: blood`, `finesse/light/thrown`.
Property `keptEdge`: `{ "type": "holdBoundary", "category": "stackEscalation", "target": "onHitDefender", "duration": "untilStartOfTurn", "slipCost": 0 }`
*On a hit, the target cannot increase any stacking condition it maintains until the start of your next turn.* Passive, free, no bonus damage.
Description register: "The edge has never needed restoring. Nobody can say what it's made of, and nobody has asked it twice." (COSMOLOGY's own worked example.)

**The Held Line** — artifact.
Property `heldLine`: `{ "type": "holdBoundary", "category": "hpFloor", "target": "ally", "duration": "untilStartOfTurn", "actionCost": "bonusAction", "slipCost": 1, "uses": 1, "recharge": "shortRest" }`
*Bonus Action: an ally cannot drop below 1 HP until the start of your next turn.* Must be spent **before** the hit — it is a prediction, not a safety net. Not healing, not a ward, no divine vocabulary.

**Counted Stone** — consumable, 3 charges, long-rest recharge.
Property `countedStone`: `{ "type": "holdBoundary", "category": "conditionApplication", "target": "self", "duration": "instant", "actionCost": "reaction", "slipCost": 0 }`
*Reaction: refuse one condition being applied to you.* Vaethori flavour — an administration runs on things being countable and distinct. Alt name for worldbuilder: **Tally Stone**.

### 2.4 Prerequisite gap

`CombatManager.getActiveEffect()` / `getActiveEffectSource()` hardcode `['mainHand', 'offHand', 'armor']` (CombatManager.js:2645, 2658). `main.js` `recalculateCombatStats()` does the same (main.js:9089). **The `artifact` and `helmet` slots are never scanned for item properties.** The Held Line cannot work until that list is widened. This is a small generic fix, not a new abstraction, but it is a hard blocker and it is not obvious from the data side.

---

## 3. Question 2 — the boundary-failure cost: **Slip**

### 3.1 Shape

| Field | Value |
|---|---|
| Storage | `character.slip` (integer, default 0) — persisted |
| Accrual | +1 per Hold placed with `slipCost: 1` |
| Effect per stack | **−1 to saving throws** |
| Threshold | At **4**: your next turn has no Action (Bonus Action and Reaction remain). Slip then resets to 0. |
| Clears | Short rest |
| Config | `RULES.boundary = { enabled: true, saveePenaltyPerStack: -1, actionLossThreshold: 4, clearsOn: 'shortRest' }` |

### 3.2 Why saving throws and action economy specifically

Not arbitrary. Both are thematically exact and both avoid collision with the existing attrition system.

- A **saving throw** is precisely "you, as a bounded distinct thing, resisting something." Degrading it is the literal mechanical statement of the fiction.
- **Losing your Action** is precisely "there was not a distinct enough you for the turn order to reach." It is also 5e's primary balance lever, so it caps the mechanic hard.
- **Fatigue already owns attack rolls and skill checks** (`RULES.fatigue.thresholds`: wearied −1 skills, tired −1 skills/−1 attacks, staggering disadvantage). Slip must not stack a second penalty onto the same numbers or both systems become illegible mush. Saves are untouched by fatigue — that is the clean lane.

### 3.3 Why this is not a corruption meter

The distinction is entirely structural, and three properties are load-bearing:

1. **It clears on a short rest.** It has no run-long trajectory. A corruption meter's whole moral function is that it accumulates across a run and describes an arc. Slip is encounter-scale pressure, like being out of breath.
2. **It has no cleansing interaction.** There is no shrine, no ritual, no NPC who removes it, no redemption path. The moment one exists, the mechanic becomes a corruption meter that afternoon.
3. **It attaches to the *Source* side, not the Void side.** The player pays for using the "good-looking" items. Nothing about the Void costs anything.

**These three are red lines, not implementation details.** Any later feature that softens one of them re-encodes the good/evil axis the cosmology exists to refuse.

### 3.4 Presentation

Not a bar. A bar reads as a meter filling toward a bad end — that is the corruption grammar in visual form. Display as **N discrete pips labelled "Held: 3"** — what you are currently holding, not how far gone you are. Frontend-dev call, but the framing is a canon requirement, not a style preference.

### 3.5 Cross-checks

| Concern | Assessment |
|---|---|
| **ADR-000** | `RULES.boundary.enabled: false` → Holds cost nothing, Slip never accrues, items still function. Clean disable. |
| **ADR-011** | `character.slip` is persisted state, not transient. Load via `savedData.slip ?? 0`. No migration, no failure on missing key. It must **not** live only on `Combatant` — that is rebuilt per encounter and would silently zero the cost between fights. |
| **Run length (L1–10)** | Cap 4, clears on short rest → self-limiting. No exposure at L1 (first Hold item is an Episode 3 reward). |
| **Rest economy** | The choice "eat the lost Action now, or burn one of my two short rests" is a genuine decision under the tavern-gated long rest. Good pillar fit (Meaningful Choices). |

---

## 4. Question 3 — `voidwoven`

### 4.1 The problem

Current: `{ "type": "modifyWeapon", "property": "damageBonus", "bonus": 2 }`, `minRarity: "mythic"`. Two faults: +2 damage frames the Void as a power source (canon: nothing draws power from either force), and mythic-gating means a player never sees it near L3–4.

### 4.2 Recommendation — ships today

```json
{ "type": "modifyWeapon", "property": "ignoreDisadvantage", "value": true }
```

*"Attacks with this weapon are never made with disadvantage."*

| Criterion | Assessment |
|---|---|
| Desirable | Yes, at every level. Disadvantage sources are numerous and live (`prone`, `sapped`, `harried`, `frightened`, cover). |
| Unmistakably reduction | It deletes an effect. It adds no number to anything. |
| Morally inert | Nobody moralises about not suffering disadvantage. It will never prompt a good/evil reading. |
| Bounded accuracy | **Safe by construction** — it cannot raise the +11 ceiling. It only prevents a downward modifier. |
| Canon fit | Exact. Encounter-scale Void = "things stop working as intended." The circumstance that would have imposed disadvantage stops working. Never retroactive unmaking. |
| Implementation | One generic call at the existing advantage/disadvantage computation in `CombatManager.attack()` (~lines 973–1032), matching the established `getActiveSlotEffect(attacker, weaponSlot, 'modifyWeapon', 'critRange')` pattern exactly. |

Also change: drop `minRarity: "mythic"` → allow `great` (reachable at L3–4 on a hard encounter given `levelBonus['1-3'] = 0`); raise `weight` 0.4 → ~0.8.

Narrower fallback if playtesting says it is too strong: *ignores disadvantage from conditions you are suffering* (excludes cover and range).

### 4.3 The option I am **not** recommending yet, and why

The most canon-elegant version is `{ "property": "damageType", "value": "resonant" }` — the weapon's damage stops being a *kind* of thing, so it can be neither resisted nor exploited. That is a perfect restatement of "a construct in which the Source was never a term."

**It is a no-op today.** Two findings:

- `RULES.combat.damageReductionSystem.enabled` is `false` — the entire resistance pipeline is inert (`resolveDamageModifier`, CombatManager.js:17 returns `'normal'` immediately).
- `RULES.combat.damageTypes.neutral: ['injury', 'resonant']` with its comment *"never resisted or exploited"* is **never read by any code**. `resolveDamageModifier` matches raw strings against monster lists. `resonant` is currently unresisted only incidentally, because no monster happens to list it — not because anything enforces it.

Flipping `damageReductionSystem.enabled` is a much larger balance event than this property change (with `immunityMultiplier: 0`, a typeless weapon becomes the only thing that can damage a fully-immune creature). Revisit this option when that flag is considered on its own merits; do not bundle them.

### 4.4 Disagreement: `voidwoven` cannot carry the L3–4 beat alone

The direction wants one desirable Void-derived effect landing **before the player's moral frame sets**. `voidwoven` is a *procedural drop property*. Even with `minRarity` removed it appears at random — **you cannot schedule a random drop.** Many runs will not see one before level 6.

If that beat matters — and the reasoning for it is sound — it needs guaranteed delivery: a fixed Episode 2 reward weapon carrying the `voidwoven` property. Fix the property *and* place one deterministically. This is a real hole in the direction as stated.

### 4.5 Adjacent note, out of scope

`wardbound` (+2 AC) and `absolute` (+2 AC) sit at the same mythic tier with the same "power from nowhere" framing. `wardbound`'s description reads Source-flavoured rather than Void-flavoured, so it is not the same canon violation — but the +2 AC values are a separate balance question worth a look.

---

## 5. Question 4 — Curiosity

**Recommendation: no mechanical change now. Record the constraint for whoever builds Curiosity under NVSystem.**

Reasons:

1. Per `.claude/rules/d5e-compliance.md`, Curiosity has **no NVSystem identity yet** — its INT+CON description is 5EClassic-only and explicitly "undecided." Designing a Source-interaction for a calling whose attribute pair is undecided is designing on sand.
2. Any mechanic expressing "Curiosity's method is the opposite of the Source" risks landing as "Curiosity is the anti-Source calling" — which is a faction alignment, and therefore the same failure mode as Source=good, just relocated.
3. The narrative resolution is complete and load-bearing on its own. Mechanics that restate settled narrative add cost without adding play.

### The constraint worth recording

> **Curiosity may not have a mechanic that grants information for free.**

Its discipline is *holding a thing apart to study it* — which costs an action, a resource, or a turn. A passive "you always know the enemy's remaining HP" would be Source-knowledge (no gap between knower and known) and would contradict the calling's own philosophy at the mechanical level.

This is not a restriction so much as a gift: it points Curiosity at *buying information at a price and then exploiting it*, which is directly the "information as currency" roguelike pillar and a strong, distinct build identity. Bind it into the future NVSystem Curiosity design as an input.

---

## 6. Balance assessment

| Level | Slip | Hold | Notes |
|---|---|---|---|
| **1** | No exposure | No exposure | First Hold item is an Episode 3 reward. Correct — L1 has no slack for a self-inflicted save penalty. |
| **5** | **Risk zone** | Kept Edge rider is dead vs. non-Voidborn | PB +3. NVSystem grants **one** save proficiency against a 3-slot pool, so non-proficient saves are already thin (+1/+2). Slip −2/−3 on those may make Hold a trap option rather than a choice. |
| **10** | Absorbable | Held Line ≈ a 4th-level spell effect | PB +4, proficient saves ~+7. Action loss at 4 is the real ceiling — it caps the practical budget at ~3 Holds per short-rest window, which is the right number. |

`voidwoven` as `ignoreDisadvantage`: DPR-neutral on any turn where disadvantage does not apply, roughly +3 to +5 effective when it does. Conditional, so low average impact — comparable to a strong feat rider, not to a flat +2 damage. Strictly safer for bounded accuracy than the property it replaces.

### Flagged for `balance-engineer` (do not ship without)

1. **Is Hold ever worth 1 Slip at L5** given NVSystem's single-save-proficiency model? This is the load-bearing question for the whole cost mechanic.
2. **Kept Edge as an Episode 3 boss reward** — a mainHand weapon whose rider is inert against most of the bestiary is inventory-slot tax in a roguelike. Consider generalising `stackEscalation` to *any* stacking debuff (poison/bleed DoTs), which makes it broadly useful without touching the anti-Void identity. Recommended regardless; simulation should confirm.
3. **`ignoreDisadvantage` frequency** across real encounter mixes — how often does disadvantage actually apply? Determines whether `great` rarity is correct.
4. Separately and later: **flipping `damageReductionSystem.enabled`**. Large blast radius, unrelated to this proposal, should not be bundled with it.

---

## 7. Roguelike fit

| Lens | Assessment |
|---|---|
| **Run variance** | Slip creates a per-encounter spend/conserve decision that resolves differently by encounter shape. `voidwoven` as a droppable property varies weapon identity between runs. |
| **Risk/reward** | Direct. Hold's value is highest exactly when a fight is going worst, which is also when the save penalty hurts most. Genuine tension, not a dominant line. |
| **Build identity** | Source items form the game's only "suppression" family — a recognisable playstyle within minutes of picking one up. |
| **Information as currency** | The Curiosity constraint (§5) is written specifically to serve this pillar. |
| **Compressed power curve** | Slip's cap-and-clear keeps the mechanic legible across L1–10 without needing rescaling at each tier. |

**Pillars served:** Authentic 5e (action economy and saves as the balance levers, SRD-clean), Meaningful Choices (spend/conserve, predictive Hold, eat-the-turn vs. burn-a-short-rest), Modifiable Foundation (single `RULES.boundary` flag, generic `holdBoundary` handler, JSON-authored items).

---

## 8. SRD compliance

Clean. No proprietary cosmology terms, no named planes, no energy taxonomy, no "the Weave." `hpFloor` is mechanically adjacent to Death Ward (SRD 5.2.1) but is not reproduced text. All vocabulary drawn from COSMOLOGY.md's approved register: *held, held apart, apart, distinct, edge, give, thread, Unheld*. No use of the forbidden set (divine/holy/blessed/sacred/radiance/purify/cleanse/transcendence/oneness).

Worth a `legal-reviewer` glance on item names only.

---

## 9. Handoff

| Agent | Work |
|---|---|
| `architect` | Widening the `['mainHand','offHand','armor']` slot scan to include `artifact`/`helmet` (§2.4); placement of `RULES.boundary`; confirm `character.slip` vs. Combatant condition as Slip's home (§3.5). |
| `backend-dev` | `holdBoundary` effect handler + three suppression check sites; Slip accrual, save penalty, action-loss hook, short-rest clear; `ignoreDisadvantage` check in `attack()`. |
| `data-agent` | `voidwoven` rewrite in `itemProperties.json`; three new `magicItems.json` entries + their properties; `campaignIds`; loot-table and episode-reward wiring (items must exist before tables reference them). |
| `worldbuilder` | Item names and descriptions against COSMOLOGY writing rules; "Counted Stone" vs. "Tally Stone"; the already-flagged Voidborn dialogue rewrite pass in `CAMPAIGN_PLAN.md`. |
| `balance-engineer` | The four items in §6. Blocking. |
| `frontend-dev` | "Held: N" pip display — pips, not a bar (§3.4). |
| `mechanics-master` | Confirm no existing consumer depends on `voidwoven`'s current `damageBonus` shape; verify the `applyConditionOnTurnStart` → `addCondition` stacking path is the correct interception point for `stackEscalation`. |

---

## 10. Open questions

1. Should Slip be visible to the player as a number, or only as its symptoms? A number is clearer; symptoms-only is more in register with a setting where nobody has good words for this. Leaning number, for playability.
2. Does Slip apply to companions who use Hold items, or only to the player? Party system implications (ADR-012).
3. Is `great` the right rarity floor for `voidwoven`, or should it be `fine` to guarantee earlier exposure? Ties to §4.4's guaranteed-drop question.
