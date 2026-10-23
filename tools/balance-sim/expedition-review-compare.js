/** Compare archived diagnosis and repaired live-engine executions; no tuning. */
import fs from 'node:fs';

const load = name => JSON.parse(fs.readFileSync(new URL(`./${name}`, import.meta.url)));
const before = load('expedition-review.before-repairs.json');
const after = load('expedition-review.after-repairs.results.json');
const beforeDungeon = load('expedition-review-dungeon.before-repairs.json');
const afterDungeon = load('expedition-review-dungeon.after-repairs.results.json');

function counts(rows) {
    return {
        trials: rows.length,
        returned: rows.filter(row => row.success).length,
        dead: rows.filter(row => row.dead).length,
        alivePlannerStops: rows.filter(row => !row.dead && !row.success).length,
        fights: rows.reduce((sum, row) => sum + row.combats.length, 0),
        provisionCluesSeen: rows.reduce((sum, row) => sum + row.seenProvisionSites, 0),
        provisionAttempts: rows.reduce((sum, row) => sum + row.attempts, 0),
        suppliesEarned: rows.reduce((sum, row) => sum + row.suppliesEarned, 0),
        shortRests: rows.reduce((sum, row) => sum + row.shortRests, 0)
    };
}

const levels = [1, 5, 10].map(level => {
    const select = result => result.rows.filter(row => row.level === level && !row.trained);
    const oldCell = before.cells.find(cell => cell.level === level && !cell.trained);
    const newCell = after.cells.find(cell => cell.level === level && !cell.trained);
    const delta = newCell.returnRate.rate - oldCell.returnRate.rate;
    const sumMargins = newCell.returnRate.waldMargin + oldCell.returnRate.waldMargin;
    return {
        level,
        before: counts(select(before)),
        after: counts(select(after)),
        beforeReturnCI: oldCell.returnRate,
        afterReturnCI: newCell.returnRate,
        delta,
        sumMargins,
        exceedsSumMargins: Math.abs(delta) > sumMargins,
        inference: 'Descriptive only: repeated worlds, paired trials and changed RNG consumption preclude independent-trial causal attribution.'
    };
});

function dungeonCounts(rows) {
    const pilots = rows.map(row => row.events?.find(event => event.event === 'dungeonPilot')).filter(Boolean);
    return {
        trials: rows.length,
        harnessErrors: rows.filter(row => row.error).length,
        returned: rows.filter(row => row.success).length,
        actualDeaths: rows.filter(row => row.dead).length,
        pilotEvents: pilots,
        turnIns: rows.flatMap(row => row.events || []).filter(event => event.event === 'questTurnIn')
    };
}

const result = {
    levels,
    totals: { before: counts(before.rows), after: counts(after.rows) },
    dungeon: { before: dungeonCounts(beforeDungeon), after: dungeonCounts(afterDungeon) },
    limits: 'Same seeds, trial policy, gear and stat snapshots. Repairs alter combat rolls consumed and downstream encounters; this compares journey behavior, not identical encounter sequences. Overland cells stop at dungeon entrances and contain no quest commission. The separate 27 dungeon pilots cannot establish completion-rate balance.'
};
fs.writeFileSync(new URL('./expedition-review-comparison.results.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ levels, totals: result.totals }, null, 2));
