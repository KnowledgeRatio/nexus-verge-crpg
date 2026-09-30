# Dedication: level 1–10 completion plan

**Status:** proposal for sponsor and game-design review, 2026-09-29. No capstone rules below are implemented or balance approved.

## Player outcome

A Dedication character can play from level 1 to 10 with all advertised features working. Exemplar should feel like a fighter who shapes a battle through a chosen tactic kit; Oath should feel like a sworn protector who must choose when to spend Resolve on damage, aid, or defense. Reaching level 10 should change decisions in combat for either specialization. Future specializations are outside this tranche, but the shared calling feature must be usable by one when it arrives.

This plan covers the **two existing specializations** and follows [capstone issue #24](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/24): one shared Dedication capstone plus one for Exemplar and one for Oath. The recommended shape is to grant the shared feature and the chosen specialization feature automatically at level 10. That is a proposed design decision, not an existing rule.

For this tranche, that decision would replace the historical draft's separate level-9 and level-10 capstone choice trees. The live level-9 tactic/Vow choice stays intact. Product Owner and Game Designer should lock this shape before implementation; the user remains the final decision-maker.

## Verified baseline and gaps

The executable progression is in `data/levelProgression.json`, `data/abilities.json`, `data/traits.json`, and the runtime systems, rather than the older `docs/designjams/2026-02-26-dedication-progression.md` draft.

| Level | Intended player experience | Current gap |
| --- | --- | --- |
| 1 | Fighting Style, Steady Nerve, and three chosen weapon masteries | These have player creation and combat paths. Test the complete flow. |
| 2 | Action Surge and Indomitable | Indomitable is displayed but not added to known abilities, so a normally levelled character cannot offer its reaction. |
| 3 | Resolve and a specialization; Exemplar chooses three tactics and gains Grace Under Pressure; Oath gains Sworn Strike and Aid the Vulnerable and chooses an aura | The main specialization paths exist. Confirm choices, combat use, rest, and restoration through normal play. |
| 4 | Practice choice and fourth weapon mastery | Practice choice exists. The extra mastery has data but no level-up choice/grant path. |
| 5 | Extra Attack; Exemplar gains Vanguard, Oath chooses a Vow | Extra Attack is declared but combat still spends one Action for each weapon attack. This changes every high-level balance baseline. |
| 6–9 | Practices at 6/8; an additional tactic or Vow at 7/9 | Exercise all choices and verify the selected features in combat and after save/load. |
| 10 | Fifth mastery, larger Exemplar tactic die, shared and specialization capstones | The d12 tactic die works. The fifth mastery has no level-up path. Progression otherwise grants only the usual +1 attribute. Exemplar's two-uses-per-short-rest Action Surge scaling exists in data but is not read by the use gate. |

The class reference at `docs/callings/dedication.md` says only two Practices exist, while `data/practices.json` now has five universal Practices. `data/classes.json` also contains older feature descriptions that disagree with live ability data. Reconcile player-facing text after the mechanics and capstone rules are settled.

## Recommended sequence

### 1. Repair the existing progression

- Add a generic base-calling ability grant so level 2 actually grants Indomitable. Confirm its reaction is available after a failed save, consumes the reaction and short-rest use correctly, and survives save/load.
- Implement two weapon attacks **within one Attack action** at level 5. Keep Action Surge as an additional Action; granting a second general Action for Extra Attack would multiply other actions too. Use one authoritative progression value, and test weapon mastery, tactic, Sworn Strike's once-per-turn limit, off-hand attacks, and companions against the new attack loop.
- Add level-up choices or grants for Dedication's fourth and fifth weapon masteries at levels 4 and 10, consistent with its existing level 1 mastery picker. Verify the fifth choice does not crowd out the capstone presentation.
- Decide explicitly whether this tranche covers player Dedication only or fully levelled Dedication companions. Generated companions currently lack the player specialization/ability loadout and have a much narrower combat panel; do not claim parity from player tests.

### 2. Lock the level 10 design

Prototype these three **house-rule concepts**, then set exact values after the repaired level 5–10 combat baseline is measured:

| Feature | Proposed effect | Decision and implementation questions |
| --- | --- | --- |
| Shared: **Defiant Renewal** | Once per short rest, at the start of a turn below half HP, choose to regain 2 Resolve, up to the normal maximum. | Offer it only when Resolve is below maximum; define whether a character already below half HP at combat start qualifies. Persist the short-rest use. Grant by calling and level so a future subclass receives it. |
| Exemplar: **Perfected Form** | Once per turn, reroll one tactic die and keep the higher result. Once per short rest, the first tactic used during Action Surge costs no Resolve. | Define whether reaction tactics qualify, when the reroll is offered, and how the free use resets. A keep-higher d12 reroll raises its average from 6.5 to about 8.49, so test this persistent bonus carefully. Keep the L10 d12 die already in place. |
| Oath: **Oath Made Manifest** | Aid the Vulnerable can target self or one ally. Once per short rest, spend a bonus action to strengthen the chosen level-3 aura from magnitude 1 to 2 for two rounds. | Define ally targeting, whose two turns determine duration, and exact coverage for all three auras. Test each aura separately: enemy AC, shared-engagement AC, and party saves are not equal-value benefits. Measure party-size scaling and bonus-action competition with Aid, Challenge, and Bolster. |

Other ideas to compare during design, rather than silently importing from the old draft: an Exemplar tactic-chain reward for affecting a target already under a tactic condition; an Oath once-per-rest rescue before a lethal hit resolves; or a shared last-stand choice that trades a later cost for immediate Resolve. The rescue needs a pre-defeat reaction path because the player currently loses immediately at 0 HP. Avoid combining a third attack per Action with a second Action Surge use until simulation shows it is safe: after Extra Attack, that combination increases an ordinary Attack action from two to three attacks and a Surge turn from four to six.

The existing `actionSurge.scaling` entry promises an Exemplar second use at level 10. The design decision must either adopt that as the Exemplar feature and wire use-limit resolution, or remove the promise from data and UI when a different Exemplar capstone is chosen. Do not leave a described but inactive benefit. If any level-based scaling remains, resolve it through a shared effective-ability path rather than a special case for this ability.

The Presence attribute assignment for Sworn Strike is already locked, but its actual mechanic is still open in [issue #15](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/15). Decide that formula before final Oath balance. Keep the damage-type copy in sync with the live taxonomy.

### 3. Implement, balance, and accept

- Represent grants, costs, triggers, targeting, and durations in data where existing generic handlers support them. Add a reusable effect primitive only where needed; avoid checks keyed to these capstone IDs. Keep Resolve and other balance values in `src/core/rulesEngine.js` where configurable values belong.
- Run real-engine combat batches at levels 1, 5, and 10 for both specializations, varying tactic/Vow/aura picks, party size, short-rest cadence, and relevant enemy types. Check win rate, damage and healing distributions, burst turns, action use, Resolve per fight, and possible refund/refill loops. Fix the level 5 baseline before using these results to set capstone numbers.
- Walk two actual player characters from creation through level 10. Verify every level-up screen, feature use, rest reset, save/load as a plain object, and combat presentation on desktop and compact input. Confirm a level 10 player can explain when each capstone is useful without reading data files.
- Update `docs/callings/dedication.md` only after mechanics ship. Reconcile stale `data/classes.json` descriptions and the five-Practice count. Keep the historical design jam marked as historical rather than rewriting it as current implementation.

## Follow-on work

[Issue #25](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/25) covers two Dedication-exclusive Practices. The current five universal Practices make levels 4/6/8 functional, but these levels still need hands-on choice-quality testing. Design the exclusive pair as the next content pass if players lack appealing alternatives; this does not block repairing Extra Attack or Indomitable. A third Dedication specialization belongs to a later scope and should inherit the shared capstone through generic grants.

## Acceptance gate

The calling is complete for this tranche when a normally created Exemplar and Oath each reach level 10 with all listed grants available; Extra Attack grants exactly two attacks within one Attack action; Indomitable and all five mastery choices are obtainable; both level 10 capstones change a real decision; costs, reactions, short rests, and save/load behave consistently; quantitative balance has no clear outlier or resource loop; and hands-on play confirms the level 1, 5, and 10 experience.
