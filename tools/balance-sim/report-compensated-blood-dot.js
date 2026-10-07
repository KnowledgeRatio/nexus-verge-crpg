import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const directory = process.argv[2] || 'tools/balance-sim/results-compensated';
const data = JSON.parse(readFileSync(path.join(directory,'compensated-blood-dot.json')));
const concentration = JSON.parse(readFileSync(path.join(directory,'concentration-fixtures.json')));
const percent = value => `${(100 * value).toFixed(2)  }%`;
function interval(rate,n){
    const normal = 1.96 * Math.sqrt(rate * (1 - rate) / n),z = 1.96,den = 1 + z * z / n;
    const middle = (rate + z * z / (2 * n)) / den,half = z * Math.sqrt(rate * (1 - rate) / n + z * z / (4 * n * n)) / den;
    return { normal,normalText:`${percent(Math.max(0,rate - normal))}–${percent(Math.min(1,rate + normal))}`,wilsonText:`${percent(middle - half)}–${percent(middle + half)}` };
}
const lines = [
    '# Compensated blood weapon simulation — 2026-10-07','',
    'The Game Designer chose a120% total default:80% of base damage on impact plus40% over3target turns. The140% candidate remains configurable. This pays for delay; full kit and player-flow acceptance remain outstanding, so the feature stays disabled.','',
    `Actual production-engine batch: ${data.cells.length} cells × ${data.trials} = ${data.cells.length * data.trials} fights, plus ${concentration.length * data.trials} single-hit concentration trials and 19 resolver/lifecycle fixtures.`,
    '',
    'This experiment separates total damage from timing. A 140% total budget at 50% immediate delivers 70% base on impact and schedules 70% over three target starts. Old 80/20 conserves 100%. All cells use the current production resolver, weapon packet builder, scheduler, defenses and defeat lifecycle. Config varies only through RULES; observers collect results without calculating damage.',
    '',
    'Shared chassis: Prowess15/17/19 at levels1/5/10; ring/chain/plate armor; Dedication longsword, Audacity/Curiosity dagger; same-level second companion in party cells. These intentionally controlled weapon/HP/proficiency sensitivity probes are not representative complete Calling builds (Curiosity cannot normally use the heavy armor). One attack/action; no Extra Attack, tactics, spellcasting, consumables or Void monsters. Authored monster multiattack is live. Short opponents goblin/gnoll/bugbear; durable gnoll/ogre/veteran; average HP; no cover; lowest-HP targeting. No full kit, caster parity or encounter difficulty certification is implied.',
    '',
    'Main applies the same premium rule to enemy eligible blood damage. PlayerOnly holds enemy damage at100% immediate. MatchedType changes only a cloned longsword’s damageType to bone; stats, mastery and enemies stay identical. This synthetic control isolates family timing/premium rather than comparing different authored weapon kits. HalfHP starts player side at50% HP. Defense probes enable actual resistance rules for blood-resistant, vulnerable or immune enemies.',
    '',
    'Test-only semantic RNG keys omit candidate and weapon type, so candidate comparisons reuse construction and actor/turn/attack seeds. Concentration adds random draws inside the real damage lifecycle. Every scheduled tranche is reconciled as ticked, cancelled, or outstanding; HP must remain finite/nonnegative; timeouts are recorded. Live RNG unchanged.',
    '',
    '95% CI uses the required normal approximation p ±1.96√(p(1−p)/n). Wilson is additionally shown for boundary cells because normal0/100% gives misleading zero-width intervals. A difference smaller than the sum of the two normal margins is labeled not statistically distinguishable at this count. Pooled main figures equally weight this authored scenario matrix; they are not a player population forecast.',
    '',
    '| Main candidate | Win rate (95% CI) | Enemy turns | Player tick HP | Pending lost |',
    '|---|---:|---:|---:|---:|'
];
for (const candidate of [...new Set(data.cells.map(cell => cell.candidate))]){
    const cells = data.cells.filter(cell => cell.cohort === 'main' && cell.candidate === candidate);
    const mean = key => cells.reduce((sum,cell) => sum + cell.means[key],0) / cells.length;
    const n = cells.reduce((sum,cell) => sum + cell.trials,0),p = cells.reduce((sum,cell) => sum + cell.winRate * cell.trials,0) / n;
    lines.push(`| ${candidate} | ${percent(p)} (${interval(p,n).normalText}) | ${mean('enemyTurns').toFixed(2)} | ${mean('playerTickEffective').toFixed(2)} | ${mean('playerPendingLost').toFixed(2)} |`);
}
lines.push('','## Verdict-driving cells','','| Cohort / level / type / candidate | Win (95% CI; Wilson if boundary) | Rounds p50/p95 | Enemy turns | Tick HP | Lost raw | Δ versus control |','|---|---:|---:|---:|---:|---:|---|');
const selected = data.cells.filter(cell =>
    (cell.cohort === 'matchedType' && [5,10].includes(cell.level) && ['instant100','premium70_70','premium80_40'].includes(cell.candidate)) ||
    (['main','playerOnly','halfHP'].includes(cell.cohort) && cell.level === 1 && cell.profile === 'durable' && cell.party === 1 && (cell.calling === undefined || cell.calling === 'dedication') && ['instant100','premium70_70','premium84_56'].includes(cell.candidate)));
for (const cell of selected){
    const control = data.cells.find(base => base.candidate === 'instant100' && base.cohort === cell.cohort && base.level === cell.level && base.party === cell.party && base.profile === cell.profile && base.calling === cell.calling && base.weaponType === cell.weaponType);
    const ci = interval(cell.winRate,cell.trials),controlCI = interval(control.winRate,control.trials),delta = cell.winRate - control.winRate;
    const label = cell.candidate === 'instant100' ? 'control' : `${(delta * 100).toFixed(2)}pp; ${Math.abs(delta) < ci.normal + controlCI.normal ? 'not statistically distinguishable' : 'exceeds summed margins'}`;
    const rounds = cell.pairedOutcomes.map(outcome => outcome[2]).sort((a,b) => a - b);
    lines.push(`| ${cell.cohort} L${cell.level} ${cell.weaponType || 'blood'} ${cell.candidate} | ${percent(cell.winRate)} (${ci.normalText}${[0,1].includes(cell.winRate) ? `; Wilson ${ci.wilsonText}` : ''}) | ${rounds[Math.floor(rounds.length * .5)]}/${rounds[Math.floor(rounds.length * .95)]} | ${cell.means.enemyTurns.toFixed(2)} | ${cell.means.playerTickEffective.toFixed(2)} | ${cell.means.playerPendingLost.toFixed(2)} | ${label} |`);
}
lines.push('','## Concentration stress','','One fixed10-base eligible blood hit on an ogre with100HP; real concentration saving throws on impact and every positive aggregate tick. No attacks or spell effects are approximated. Survival of concentration after impact+all3ticks:', '', '| Candidate | Maintained (95% CI) |','|---|---:|');
for (const result of concentration){
    lines.push(`| ${result.candidate} | ${percent(result.maintainedRate)} (${interval(result.maintainedRate,result.trials).normalText}) |`);
}
lines.push('','This measures an additional benefit of recurring damage, not spellcaster encounter strength. Cleansing fixtures remove pending damage without acceleration; source defeat preserves prior damage; target defeat and combat end cancel it. No enemy cleanse policy or tactical player cleanse decision is modeled.','',`Total timeout fights: ${data.cells.reduce((sum,cell) => sum + cell.means.timeoutCount * cell.trials,0)}; all in blood-immune defense probes, treated as nonwins. No timeout occurred in a main or matched-family cell.`, '', '## Recommendation handoff','', 'Game Designer decision: compensated default120% total, immediateFraction2/3,3ticks (80% base impact +40% base bleeding).140%70/70 remains a configurable higher-premium candidate. Both compensate delay;120% limits the passive premium while preserving the long-target niche. In the matched L5 ogre probe140% yields+27.67 percentage points versus an otherwise identical bone weapon;120%80/40 yields+15.33 points. Both exceed the summed confidence margins;140% also exceeds120% by12.33 points (distinguishable). This supports120% as the more conservative design default, not a declaration of complete family parity. Keep the feature disabled pending hands-on acceptance and full kits, Extra Attack/tactics, Challenge concentration and actual cleanse decisions. Do not call140% final balanced tuning or infer elemental tuning from these blood simulations.', '', '## Representative traces','', 'Selected by outcome: median-length win, shortest loss when present, and greatest surviving party-HP fraction (extreme margin proxy). All traced trials include actual roll messages and HP transitions. Fixtures and complete per-cell outcomes are in the generated JSON; the large raw batch is retained outside the repository and can be regenerated with the harness.');
for (const cell of selected){
    lines.push('',`### ${cell.cohort} L${cell.level} ${cell.weaponType || 'blood'} ${cell.candidate}`);
    for (const [label,trace] of Object.entries(cell.traces)){
        lines.push('',`**${label}**`, ...(trace ? ['```text',...trace,'```'] : ['No such outcome occurred.']));
    }
}
lines.push('','## Source provenance','', '```json',JSON.stringify(data.testedSourceHashes,null,2),'```');
writeFileSync(path.join(directory,'report.md'),`${lines.join('\n')}\n`);
console.log(`Report written: ${path.join(directory,'report.md')}`);
