const m = JSON.parse(require('fs').readFileSync('data/monsters.json', 'utf8'));
const r = [];
m.monsters.forEach(mon => {
    (mon.actions || []).forEach(a => {
        if ('attackBonus' in a) r.push(mon.id + ':' + a.name);
    });
});
console.log(r.join('\n'));
console.log('Count:', r.length);
