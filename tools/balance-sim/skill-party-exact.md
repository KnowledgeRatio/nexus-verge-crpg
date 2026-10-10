# Skill party help, expertise, and retries: exact audit

2026-10-07. Exact audit rerun after the approved existing-content DC and secondary-attribute changes. Analysis harness makes no production changes.

Final-run provenance: `data/skillChallenges.json` SHA-256 `3a1ddbcae9b5f2efe430d25b2cbbe72f9ebc6f87e299c89e7f04ebabcd046af2`; resolver context `src/systems/SkillChallengeManager.js` SHA-256 `bf1d854e765e974b7b2fda237a26ff0de990a04b4a91750ab088833d73eeec46`; harness SHA-256 `604e912a07ebec1864febb4e382603ca6712a488ca130bc7bb55f596b6f32891`. Rerun when skill math changes.

Reproduce: `node tools/balance-sim/skill-party-exact.js > /tmp/skill-party-exact.json`.

## Method and limits

218,600 actual `SkillRegistry.rollCheck` resolutions, using live `SkillChallengeManager.getSkillCheckContext`, party modifier/cap, fatigue, and adjusted DC. Every normal d20 face is enumerated once; the disadvantage example enumerates all 400 ordered pairs. These are **exact probabilities**, with no sampling uncertainty: binomial Monte Carlo confidence intervals would be inappropriate. This is not an encounter win-rate study.

101 authored check definitions from `skillChallenges.json`, bandit negotiation, and settlement passive approaches; authored base DCs 10–18. Terrain/challenge DCs receive their existing level adjustment; social-tree/settlement DCs remain fixed. These coverage totals are a catalogue, not frequency-weighted experience. Other programmatic gameplay checks belong to the broader integration audit.

Three analytical Calling-themed attribute fixtures at levels 1/5/10, identical to the earlier `skill-challenge-balance.js` profiles. Each check is separately tested untrained/trained/expert. This does **not** imply any Calling can legally have expertise in every skill or these exact scores. Same-level matching assigned helpers are used; the trueParty cell adds the existing +1 synergy to one matching helper. It isolates arithmetic and assumes the synergy is already legitimately active.

## Results

Ranges are means across all 101 authored checks, minimum–maximum across the three attribute profiles. One and two same-level matching helpers produce identical results in every tested cell: the first reaches the player's proficiency-bonus cap.

| Level | Rank | Solo | One helper | Helper + trueParty | Guaranteed checks with trueParty |
|---|---|---:|---:|---:|---:|
| 1 | Untrained | 39.1–44.7% | 49.1–54.7% | 54.1–59.7% | 0 |
| 1 | Trained | 49.1–54.7% | 59.1–64.7% | 64.1–69.7% | 0 |
| 1 | Expert | 59.1–64.7% | 69.1–74.7% | 74.1–79.6% | 0–3 |
| 5 | Untrained | 36.5–42.0% | 51.5–57.0% | 56.5–62.0% | 0 |
| 5 | Trained | 51.5–57.0% | 66.5–72.0% | 71.5–77.0% | 0–3 |
| 5 | Expert | 66.5–72.0% | 81.5–86.6% | 86.2–90.6% | 15–35 |
| 10 | Untrained | 30.1–35.6% | 50.0–55.6% | 55.0–60.6% | 0 |
| 10 | Trained | 50.0–55.6% | 70.0–75.3% | 75.0–79.9% | 4–18 |
| 10 | Expert | 70.0–75.3% | 88.5–91.1% | 92.0–94.1% | 39–55 |

Away from ceiling/floor clipping, helper benefit is exactly +10/+15/+20 percentage points at levels 1/5/10; trueParty adds another +5 points. At level 10 all 101 passive-equivalent checks pass for the expert+helper fixture, in every profile. That is a warning about unchanging routine content, not proof that a legal party trivializes every adventure.

Fatigue example, Dedication-themed L5 trained Prowess/Finesse with one helper, authored base DC15 → adjusted DC17: rested modifier +10 succeeds 70%; tired modifier +9 succeeds 65%; staggering modifier +10 with disadvantage succeeds 49%. This is a synthetic diagnostic check, not added content. No exhaustion levels were included.

## Outcome-selected spot checks

Single checks have no rounds. Traces show median successful roll, failure/minimum roll, and maximum margin; full JSON includes fatigue traces as well.

- **L10 expert + helper + synergy, hidden treasure Composure/Finesse DC17, modifier +16, exact 100%:** median success 11+16=27; minimum 1+16=17 succeeds; maximum 20+16=36. There is no loss.
- **L10 same party, simplified bandit plea Presence/Empathy DC21, modifier +14, exact 70%:** median success 14+14=28; loss 1+14=15; maximum 20+14=34.
- **L1 untrained solo, locked door Composure/Finesse DC15, modifier +1, exact 35%:** median success 17+1=18; loss 1+1=2; maximum 20+1=21.

The live resolver treats natural 1/20 as critical metadata, **not automatic failure/success**: success is total ≥ DC. Do not add an invented 5–95% ceiling to these skill probabilities. Authored critical outcomes are a separate downstream concern.

## Repeat attempts

For independent unchanged attempts with no cumulative cost/lockout, probability of at least one success in k attempts is `1 - (1 - p)^k`; expected attempts until success is `1/p`. This is a conditional mathematical bound, not proof that every UI permits repeated attempts.

| Per-attempt probability | Within 3 | Within 5 | Expected attempts |
|---:|---:|---:|---:|
| 25% | 57.8125% | 76.2695% | 4 |
| 50% | 87.5% | 96.875% | 2 |
| 75% | 98.4375% | 99.9023% | 1.3333 |

Six definitions omit cooldowns: guard_patrol, market_haggle, pickpocket_attempt, warehouse_sneak, crop_trampling, forge_accident. **locked_door explicitly authors cooldown 0** and intentionally retains that exception. Fourteen have 5-minute cooldowns, twelve 10-minute cooldowns, eight 1-hour cooldowns. The repair uses `RULES.skillChallenges.defaultCooldownMs` (five minutes) for omitted values and persists attempts into `flags.skillChallengeAttempts`. This addresses missing pacing protection and reload reset, not unlimited eventual retries or repeated paid rewards. Per-object completion and consequence checks remain necessary wherever there is a real finite object identity.

## Recommendation handoff

No production numerical tuning recommended from this audit. The helper cap works; specialist success on ordinary tasks is compatible with skill identity. Ask Game Designer to judge easy specialist tasks by their intended stakes: information access, resource spending, noise, time, and alternative consequences. Prefer meaningful hard situations and costly repeated attempts over blanket higher DCs or a forced 5% failure chance.

Prioritize repeatability and reward-once integration checks, especially zero-cooldown service/obstacle paths. An unchanged failed action that can be retried free eventually ceases to be a decision. A repeatable service may be valid, but should have an explicit cost and reward policy.
