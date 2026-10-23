# Quest outcomes and progression validation — 2026-10-11

## Delivery

The sponsor-approved [iteration](../plans/2026-10-11-quest-outcomes-progression.md) is implemented and enabled locally through `RULES.quests.iteration.enabled`. Newly composed offers use saved level, task tier and risk profiles. Existing boards and signature quests retain their content. Boards remain finite; renewal is deferred. Nothing committed or deployed.

| Offered level | Optional Investigation/Craft DC | Accepted urgent allowance | Specialist equipment grade |
| --- | ---: | ---: | --- |
| 1–3 | 12 | 3 long rests | Fine |
| 4–7 | 14 | 4 long rests | Great |
| 8–10 | 16 | 5 long rests | Heroic |

One commission pays 80 XP/20 gold × offered level × risk multiplier (routine 1, demanding 1.5, perilous 2). Boss work is perilous and labelled Deadly. Damaged recovery or specialist recovery without combat is demanding. Partial reporting pays half; extra salvage changes delivered stock rather than commission. Successful standing is risk-based +10/+15/+20. New accepted failure or abandonment applies −10 personal trust and −5 faction standing without additional spillover.

The saved offer level feeds actual first dungeon generation, ordinary dungeon encounters, forced dungeon encounters and boss construction. Only iteration-bound generation acquires a persistent encounter-level snapshot; ordinary dungeons keep their previous behavior. Generated layouts are not rewritten to suit a later offer. Incompatible already-generated combat destinations are withheld. New combat compositions also require every possible level-eligible boss to reach 75% of that level's deadly XP threshold using the existing boss XP multiplier. The floor rises from 75 at level 1 to 825 at level 5 and 2,100 at level 10. Weak upper-level boss sites therefore yield another supported composition instead of an under-level perilous job. No monster statistics, seeded boss draws or global encounter budgets were changed. This verifies increasing enemy-budget eligibility, not monotonic encounter difficulty or a balanced boss curve.

## Actual reusable outcomes

- `local_safety`: actual overworld encounter likelihood changes by ×0.75 within 12 tiles of the bound site; selected expiry changes it by ×1.25. Latest state for a site replaces its previous state. Overlapping effects select the strongest deviation instead of multiplying; configured limits apply. Safe zones stay safe, and unrelated locations are unchanged. Existing exact boss-slot clearance remains separate.
- `merchant_availability`: selected expiry reduces the named ordinary SKU's generated stock, retaining at least half. A later supply-restoration effect restores availability. Previously delivered finite shipments remain available and can mitigate scarcity; the effect does not delete all shop goods.
- `merchant_stock`: actual recovered goods become finite merchant stock. A specialist weapon consignment can instead unlock one real enchanted item at a bound blacksmith. It is a paid offer, not a free equipment reward. Saved generated properties, price and exhausted receipts prevent rerolls or replenishment on reload.
- `reveal_location`: supported evidence-sensitive reporting reveals a real nearby unknown dungeon/POI. The receipt, metadata discovery and tile exploration survive regeneration and saving. No invented destination or automatic knowledge loss is promised.
- Existing relation/faction effects change actual participant trust and culture standing. Recipes and activity prerequisites share the same generic resolution dispatch; effects are not selected through quest-ID branches.

Specialist prices use the actual merchant's mundane value plus a configurable Fine/Great/Heroic premium of 1,350/3,000/6,000, followed by normal relation/Influence pricing. Canonical equipment statistics come from the campaign-loaded item catalogue. These expensive optional offers have not passed whole-run affordability acceptance.

## Urgency and failure

Urgency is seeded and capped at 25% of every new-offer history prefix; it is not guaranteed to reach 25%. Unaccepted and ordinary offers have no countdown. Acceptance starts the saved world-clock allowance; one long rest advances the clock by one unit. Travel, retries and browser time do not advance this clock.

Required work completed before expiry stops the deadline during return for payment. Optional evidence/salvage does not hold that clock open. Pending handover is protected. Expiry is checked after long rest and before relevant actions/turn-in; partial effect application remains pending, retries once-only receipts and cannot be erased through abandonment. Completed/failed jobs cannot also receive a commission. Abandonment applies standing loss and removes undelivered custody without triggering the physical expiry effect.

Offers, NPC details and the journal show the level profile, optional DCs, deadline unit and declared consequences before acceptance. Exact enchanted variants can be equipped/unequipped without selecting another same-base item.

## Verification and limits

- Full suite: **1,439 tests in 128 files** pass with `npm test -- --maxWorkers=1 --testTimeout=30000`.
- Six integration browser fixtures pass at 1440×900 and 390×844: abandoned recovery, combat access and occupied damaged recovery/salvage. They exercise visible actions, stakes, completion, stock, captured victory, duplicate rejection and save/load, with zero page errors. Fixtures position the player directly, control Craft success and set actual combatants defeated before invoking the real victory handler. They are not naturally played journeys or combat win-rate trials.
- Actual outcome tests verify encounter probability changes, locality, replacement/overlap, named stock scarcity/restoration, finite enchanted purchase and persistent receipts. Lifecycle tests cover accepted-only clocks, exact expiry, interrupted consumers, abandonment bypass prevention, standing once, fulfilled return protection and ordinary-dungeon compatibility.
- [Balance review](2026-10-11-quest-iteration-balance.md): 31,680 exact live skill resolutions; 2,640 fixture compilation attempts across 22 compatible assignments and levels 1/5/10, with unsupported low-budget combat combinations withheld; 90 actual expiry trials; 100 noncompounding safety effects. A separate 150-cell dungeon-type/level census verifies the boss floor. These are conditional and synthetic-fixture measurements; real-world publication evidence is recorded separately in the balance report.
- The bounded public-path census visits 114 towns in three independent generated worlds at each of levels 1/5/10 (342 synthetic visits, not journeys). Composed combat offers number 53/53/30, specialist offers 9/9/6; composed-or-ordinary-Investigation availability remains 108/114 towns at each level. Higher-level combat eligibility narrows without collapsing overall opportunities in these three worlds.
- Independent data review: 132 compilations covering both outcome selectors at levels 1/5/10; four canonical subjects across eight campaign inheritance sets; 24 restricted-catalog checks; 15 real specialist receipts. It caught and verified fixes for campaign filtering and an information-publication closure error.
- Independent architecture review caught and verified fixes for equipped-instance selection, accidental freezing of unrelated dungeons and overdue-abandonment bypass. Generated enchanted pricing received a specific designer ruling.
- Web build and legal verification pass. Repository lint retains **175 existing errors**; broader lint retains **3,251**. Added regression tests and audit scripts have no lint errors. JSON syntax and scoped documentation links are verified separately.

The existing level-5 restricted weapon-only boss warning remains unresolved by this delivery. Full legal ability/resource policies across dungeon types, naturally played quest journeys, total reward economics and sponsor experience acceptance remain open. More gold does not establish combat fairness. Product tracking remains [#57](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/57), with related #39/#41 acceptance still open.
