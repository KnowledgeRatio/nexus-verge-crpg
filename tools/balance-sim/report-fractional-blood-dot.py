"""Report the actual production-fork simulation; no damage formula implementation."""
import json,statistics,math,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[2]
out=root/'results-fractional'
main=json.loads((out/'fractional-blood-dot.json').read_text())
rows=main['cells']
def pct(value): return f'{value*100:.2f}%'
def average(cells,key): return statistics.mean(c['means'][key] for c in cells)
def paired(a,b,index=0):
    differences=[x[index]-y[index] for x,y in zip(a['pairedOutcomes'],b['pairedOutcomes'])]
    mean=statistics.mean(differences);margin=1.96*statistics.stdev(differences)/math.sqrt(len(differences))
    return mean,mean-margin,mean+margin
for file,expected in main['testedSourceHashes'].items():
    assert hashlib.sha256((root/file).read_bytes()).hexdigest()==expected,file+' changed after tested run'
focused=[]
for directory in ['results-fractional-focused-l1','results-fractional-focused-l10']:
    batch=json.loads((root/directory/'fractional-blood-dot.json').read_text())
    assert batch['testedSourceHashes']==main['testedSourceHashes'],'focused source version differs'
    focused+=batch['cells']
fixtures=json.loads((out/'resolver-fixtures.json').read_text())['fixtures']
total_fights=sum(c['trials'] for c in rows+focused)
immune_timeouts=round(sum(c['means']['timeoutCount']*c['trials'] for c in rows if c['defense']=='immune'))
new_res=[c for c in rows if c['cohort']=='defenseSensitivity' and c['defense']=='resistant' and c['split']==1]
old_res=[c for c in rows if c['cohort']=='legacyResistance']
lines=['# Fractional blood DoT — actual feature-fork simulation','',
    '**Result:** 80/20 immediate/deferred remains the conservative prototype. The real fractional implementation preserves tiny-hit bleeding and removes the old whole-HP resistance floor. Increasing delayed share generally allows more enemy actions and loses more pending damage before combat ends. This is scoped quantitative evidence, not full-game or deployment acceptance.','',
    f"Final runs: **{total_fights:,} fights** — {len(rows)} cells × {main['trials']} trials, plus {len(focused)} focused cells × {focused[0]['trials']:,}. {len(fixtures)} deterministic real-resolver/lifecycle fixtures passed. Superseded instrumentation runs and smoke trials are excluded from that count. All raw/scheduled damage reconciliation and finite nonnegative HP assertions passed.",'',
    'Reference source: KnowledgeRatio/nexus-verge-crpg, main-beta-quests, SHA 7c4e16ca738774617e7bc0f022594165e2e1a4cf. Tested code is the actual local production feature fork, with six SHA256 source hashes embedded in each result JSON. The report verifies those hashes still match the working files. No generated simulation-only CombatManager or replacement scheduler is used.','',
    '## Tested implementation','',
    '- RULES.combat.damageOverTime.enabled remains false by default. The harness deliberately enables it; 100/0 uses the same new precision and is the fair split control. Legacy integer flag-off controls are separate.',
    '- 1,000 units per HP. Each eligible landed blood weapon packet is partitioned once after hit/crit/relevant reductions. Independent three-target-start tranches preserve raw budget and do not refresh earlier schedules. Typed defenses are evaluated on each occurrence. No new minimum-one damage rule, damage premium, or blood-to-neutral conversion; authored monsters retain their existing minimum-hit floor.',
    '- Mitigation rounds to the nearest 0.001 HP per component. This is documented quantization, not a hidden fractional carry. A raw 1 hit at 80/20 under half resistance delivers 0.501 rather than exact 0.500; each component error is at most 0.0005 HP. Cumulative error can scale with component count.',
    '- Actual CombatManager.startTurn/endTurn drives the queue, including lethal-tick advancement. Runtime wrappers only observe real resolver/condition-removal outcomes. A target killed by its tick does not take its action or receive an extra externally scheduled tick.',
    '- Healing and temporary HP numerical fixtures use the real edited paths. Applied tranches survive source defeat; cleanse cancels remaining damage; target defeat clears its pending tranches. Bleeding-condition immunity suppresses the deferred share rather than converting it to immediate damage. Blood damage immunity suppresses the deferred application and permits no blood damage.','',
    '## Encounter scope','',
    'Current Dedication Prowess-oriented melee builds at levels 1/5/10, dagger and sword, solo and two-character party. The companion is a constructed equal-level Character. Short targets: goblin/gnoll/bugbear; durable targets: gnoll/ogre/veteran, respectively. Party cases use two authored enemies. Average authored HP, normal difficulty, no inflated stat blocks. Actual enemy multiattack runs; players use the currently implemented one attack/action. No proposed Extra Attack or fictional Calling kits.','',
    'Controlled lowest-current-HP targeting, no cover, consumables, selected tactics, spells, reactions or advanced build passives. Test-only semantic-role RNG creates reproducible paired encounters; live combat remains unseeded. Numeric raw1/2 fixtures call the actual weapon resolver rather than pretending a selected high-Prowess build naturally rolls that low.','',
    '396 cells: 120 default-defense fractional cases, 24 legacy integer controls, 180 enabled-defense sensitivity cases (half resistance, double vulnerability, immunity), 12 legacy-resistance controls, and 60 player-only offense diagnostics.','',
    '## Main matchup means','',
    'Equal-weight descriptive averages across 24 matchups per split; they are not a pooled population confidence interval. Each individual cell has a Wilson 95% win interval in JSON/CSV.','',
    '| Immediate/deferred | Mean win rate | Enemy actions/fight | Observed rounds | Remaining party HP | Pending player raw lost/fight |',
    '|---|---:|---:|---:|---:|---:|']
for split in [1,.8,.7,.6,.5]:
    cells=[r for r in rows if r['cohort']=='main' and r['split']==split]
    lines.append(f"| {round(split*100)}/{round((1-split)*100)} | {pct(statistics.mean(c['winRate'] for c in cells))} | {average(cells,'enemyTurns'):.3f} | {average(cells,'rounds'):.3f} | {pct(average(cells,'partyHP'))} | {average(cells,'playerPendingLost'):.3f} |")
lines+=['','Observed rounds are the maximum actor-start count, keeping legacy skipped-index round counters from distorting comparisons. Actions, starts, damage, defeat and advancement still execute through the real manager.','',
    'All tested nonimmune eligible partial-blood hits produced a nonzero deferred tranche on both sides. The 100/0 control intentionally has no bleed. The 24 default-defense 100/0 fractional cells exactly match their legacy controls’ paired wins, enemy actions, observed rounds, remaining HP and timeout outcomes.','',
    '## Focused difficult matchups','',
    'Sword, two-character party versus two durable enemies; 1,000 trials per split at each level. Wilson win intervals are marginal intervals. Paired delta intervals use per-trial outcome differences under semantic-role test RNG; interpret them as evidence for these scripted matchups. Overlapping marginal intervals trigger the skill’s conservative warning against asserting an independent win-rate difference; paired estimates are shown separately.','',
    '| Level/opponent | Split | Win rate | Wilson 95% interval | Paired win delta vs fractional instant, 95% interval | Enemy actions |',
    '|---|---|---:|---|---|---:|']
for level in [1,10]:
    batch=[c for c in focused if c['level']==level];baseline=next(c for c in batch if c['split']==1)
    for c in batch:
        mean,lo,hi=paired(c,baseline);a,b=c['winCI95']
        lines.append(f"| L{level}/{c['monster']} | {round(c['split']*100)}/{round((1-c['split'])*100)} | {pct(c['winRate'])} | {pct(a)}–{pct(b)} | {mean*100:+.2f} pp [{lo*100:+.2f}, {hi*100:+.2f}] | {c['means']['enemyTurns']:.3f} |")
    c80=next(c for c in batch if c['split']==.8);c70=next(c for c in batch if c['split']==.7)
    mean,lo,hi=paired(c70,c80)
    em,el,eh=paired(c70,c80,1)
    lines += ['',f'L{level}, 70/30 minus 80/20: paired win delta {mean*100:+.2f} pp, 95% [{lo*100:+.2f}, {hi*100:+.2f}]; enemy-action delta {em:+.3f}, 95% [{el:+.3f}, {eh:+.3f}].','']
lines+=['## Offense and defense diagnostics','',
    'The player-only diagnostic deliberately leaves enemy damage instant, isolating the weapon user’s timing penalty. It is not proposed live asymmetry. Across 12 solo matchups, means are:','',
    '| Split | Win rate | Enemy actions | Remaining player HP |','|---|---:|---:|---:|']
for split in[1,.8,.7,.6,.5]:
    cells=[r for r in rows if r['cohort']=='offensivePenaltyDiagnostic' and r['split']==split]
    lines.append(f"| {round(split*100)}/{round((1-split)*100)} | {pct(statistics.mean(c['winRate'] for c in cells))} | {average(cells,'enemyTurns'):.3f} | {pct(average(cells,'partyHP'))} |")
lines+=['',f"Enabled-defense sensitivity changes enemy blood resistance/vulnerability/immunity using the real typed resolver. These are authored diagnostic overrides, separate from default resistance-off balance. Fractional instant against half resistance averages {pct(statistics.mean(c['winRate'] for c in new_res))} wins versus {pct(statistics.mean(c['winRate'] for c in old_res))} for the old integer floor across the same 12 matchups; that is a descriptive control change, not proof of a universal buff magnitude. Removing whole-HP floors changes instant damage too.",'',
    f'No default-defense, legacy, player-only or focused matchup reached the turn cap. There were **{immune_timeouts:,} capped fights, all in immunity-only diagnostics**: a policy that keeps attacking blood-immune targets with blood cannot win; some characters survived the 30-start limit. Do not count those caps as successful encounters or claim zero timeouts for the entire sensitivity matrix.','',
    '## Deterministic fixtures and limits','',
    'Nineteen fixtures cover raw1/2 under normal, half, double and zero multipliers; three independent schedules; cleanse; condition immunity; source/target defeat; temporary HP; fractional healing; neutral injury resistance behavior; and actual startTurn lethal-tick queue advancement. Full observed values are in resolver-fixtures.json. The 12-damage 50/50 illustration yields ticks 2,4,6,4,2 after three successive hits through the real scheduler.','',
    'Guarantee is conditional on a positive eligible weapon-base budget large enough for the configured unit precision and an eligible target. Tested positive integer base packets of 1 HP and above now bleed. No artificial minimum weapon damage is added: a zero/nonpositive base does not bleed, and an immediate paid rider does not create a deferred base budget. A hypothetical sub-unit/future fractional weapon packet needs its own authoring rule; immunity and cleansing intentionally prevent damage.','',
    'Defeat, tiny damage, healing and queue behavior are exercised here; save/load, player UI flows, all rider combinations, arbitrary future multipliers and comprehensive Calling build balance require their separate implementation checks. HP attribution across simultaneous tick components uses their share of the resolver’s total final damage; total HP loss is the engine result. Raw potential instant-finisher counts do not imply defense-adjusted guaranteed kills.','',
    '**Untested utility:** a positive periodic damage event can trigger a concentration save even when damage is tiny; the current concentration floor is DC 10. Simultaneous tranches are delivered as one tick event, preventing per-tranche multiplication, but added turn-start saves can make bleeding disproportionately useful against concentrating casters. This melee-only matrix does not price that utility or full control/spell interactions. Do not add a raw damage premium before those tests.','',
    'Recommendation: retain 80/20 as the feature-on prototype with the feature OFF by default. 70/30 supplies more delayed identity but no demonstrated offsetting payoff in these encounters. Do not infer an automatic damage premium, declare global balance, or activate resistances from this matrix alone.','',
    '## Integration validation','',
    'The coordinating agent verified the implementation against the complete reference checkout: 1,235/1,235 tests passed across 106 files using `npm test -- --testTimeout 10000`, versus baseline 1,212/1,212. A resource-heavy existing Goblin rendering test exceeded its default 5-second timeout during the latest full run; the explicit 10-second test limit resolved that timing failure. The 205 existing standard-lint errors match baseline signatures; no new errors were introduced. The new harness was autofixed and has zero lint errors. Git whitespace checks passed. Desktop/mobile DOM rendering fixtures passed; complete visual acceptance remains outstanding, including an existing mobile overlay issue. The feature stays disabled by default and has not been activated for a campaign. These checks are separate from the headless encounter evidence above.','',
    '## Reproduction','', '```bash',
    'DOT_TRIALS=300 node tools/balance-sim/fractional-blood-dot.js',
    'DOT_TRIALS=1000 DOT_FOCUSED=1 DOT_FOCUS_LEVEL=1 DOT_OUTPUT=results-fractional-focused-l1 node tools/balance-sim/fractional-blood-dot.js',
    'DOT_TRIALS=1000 DOT_FOCUSED=1 DOT_OUTPUT=results-fractional-focused-l10 node tools/balance-sim/fractional-blood-dot.js',
    'python tools/balance-sim/report-fractional-blood-dot.py', '```', '',
    'Artifacts: fractional-blood-dot.csv contains the compact 396-cell summary; JSON contains all confidence intervals, budget/cancellation and HP metrics, paired outcomes and selected engine-roll traces. Focused outputs are in results-fractional-focused-l1 and results-fractional-focused-l10. Representative traces are also collected in representative-traces.md. Audio presentation is disabled; an Audio API fallback log is expected under Node.','']
(out/'README.md').write_text('\n'.join(lines))
traces=['# Representative actual feature-fork traces','','Actual engine roll messages, HP events, and real scheduler processing. Selected median-length win, a loss if present, and largest remaining-HP margin.','']
for c in focused:
    if c['split'] not in[1,.8,.7]:continue
    traces += [f"## L{c['level']} {c['monster']}, sword party2, {round(c['split']*100)}/{round((1-c['split'])*100)}",'',
        f"Win {pct(c['winRate'])}, Wilson95% {pct(c['winCI95'][0])}–{pct(c['winCI95'][1])}",'']
    for name,trace in c['traces'].items():
        if trace: traces += [f'### {name}','','```text',*trace,'```','']
(out/'representative-traces.md').write_text('\n'.join(traces))
print('Wrote results-fractional/README.md and representative-traces.md; tested source hashes verified')
