const NEIGHBOURS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
const key = p => `${p.q},${p.r}`;
const distance = (a, b) => Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r),
    Math.abs(a.q + a.r - b.q - b.r));

export function engagementPartners(combatants) {
    const living = new Map(combatants.filter(c => c.hp > 0).map(c => [c.id, c]));
    const links = new Map(combatants.map(c => [c.id, new Set()]));
    for (const c of living.values()) {
        for (const id of c.engagedWith || []) {
            if (living.has(id) && id !== c.id) {
                links.get(c.id).add(id);
                links.get(id).add(c.id);
            }
        }
    }
    return links;
}

function nearestFree(origin, occupied, score = p => distance(p, origin), minimumR = -Infinity) {
    for (let radius = 0; ; radius++) {
        const candidates = [];
        for (let q = origin.q - radius; q <= origin.q + radius; q++) {
            for (let r = origin.r - radius; r <= origin.r + radius; r++) {
                const p = { q, r };
                if (p.r >= minimumR && distance(p, origin) === radius && !occupied.has(key(p))) {
                    candidates.push(p);
                }
            }
        }
        if (candidates.length) {
            return candidates.sort((a, b) => score(a) - score(b))[0];
        }
    }
}

export class CombatSceneLayout {
    constructor(spacing, homeColumn = 1) {
        this.spacing = spacing;
        this.homeColumn = homeColumn;
        this.homes = new Map();
        this.positions = new Map();
        this.signature = '';
        this.previouslyEngaged = new Set();
        this.minimumR = null;
    }

    world(p) {
        return { x: this.spacing * (p.q + p.r / 2), z: this.spacing * Math.sqrt(3) / 2 * p.r };
    }

    update(combatants, approach = null) {
        const links = engagementPartners(combatants);
        const signature = JSON.stringify(combatants.map(c => [c.id, c.hp > 0, [...links.get(c.id)].sort()]));
        if (signature === this.signature) {
            return this.positions;
        }
        this.signature = signature;
        const occupiedHomes = new Set([...this.homes.values()].map(key));
        const teamCounts = { ally: 0, enemy: 0 };
        for (const c of combatants) {
            const team = c.team === 'enemy' ? 'enemy' : 'ally';
            const index = teamCounts[team]++;
            if (!this.homes.has(c.id)) {
                const r = (index % 2 ? -1 : 1) * Math.ceil(index / 2);
                const q = (team === 'enemy' ? this.homeColumn : -this.homeColumn) - Math.round(r / 2);
                const home = nearestFree({ q, r }, occupiedHomes, undefined, this.minimumR ?? -Infinity);
                this.homes.set(c.id, home);
                occupiedHomes.add(key(home));
            }
        }
        // The scenery stays fixed for an encounter. Keep all subsequent staging in
        // front of its initial rear rank, including crowded engagement formations.
        if (this.homes.size) {
            this.minimumR ??= Math.min(...[...this.homes.values()].map(p => p.r));
        }
        const available = (origin, occupied, score) => nearestFree(origin, occupied, score, this.minimumR);
        const next = new Map();
        const occupied = new Set();
        const place = (id, p) => {
            next.set(id, p);
            occupied.add(key(p));
        };
        // An attack creates a directed approach, not a mutual charge to a group centre.
        // Preserve every other actor's position, including the defender's existing partners.
        if (approach && approach.sourceId !== approach.targetId &&
            links.get(approach.sourceId)?.has(approach.targetId)) {
            for (const c of combatants) {
                if (c.id !== approach.sourceId) {
                    place(c.id, this.positions.get(c.id) || this.homes.get(c.id));
                }
            }
            const old = this.positions.get(approach.sourceId) || this.homes.get(approach.sourceId);
            const target = next.get(approach.targetId);
            place(approach.sourceId, available(target, occupied, p => distance(p, old)));
            this.positions = next;
            this.previouslyEngaged = new Set(combatants.filter(c => links.get(c.id).size).map(c => c.id));
            return next;
        }
        // Fallen actors stay where they fell; never route a corpse back to its home.
        for (const c of combatants.filter(actor => actor.hp <= 0)) {
            place(c.id, this.positions.get(c.id) || this.homes.get(c.id));
        }
        // Reserve retreat destinations before placing engaged groups.
        for (const c of combatants) {
            if (!next.has(c.id) && !links.get(c.id).size) {
                place(c.id, available(this.homes.get(c.id), occupied));
            }
        }
        const ranked = combatants.filter(c => links.get(c.id).size)
            .sort((a, b) => links.get(b.id).size - links.get(a.id).size ||
                Number(a.team === 'enemy') - Number(b.team === 'enemy') || a.id.localeCompare(b.id));
        for (const root of ranked) {
            if (next.has(root.id)) {
                continue;
            }
            const component = new Set([root.id]);
            for (const id of component) {
                links.get(id).forEach(other => component.add(other));
            }
            const homes = [...component].map(id => this.homes.get(id));
            const centre = {
                q: Math.round(homes.reduce((sum, p) => sum + p.q, 0) / homes.length) || 0,
                r: Math.round(homes.reduce((sum, p) => sum + p.r, 0) / homes.length) || 0
            };
            const anchor = this.previouslyEngaged.has(root.id) ? this.positions.get(root.id) : centre;
            place(root.id, available(anchor, occupied));
            const queue = [root.id];
            for (let i = 0; i < queue.length; i++) {
                const parent = queue[i];
                for (const id of [...links.get(parent)].sort()) {
                    if (next.has(id)) {
                        continue;
                    }
                    const neighbours = [...links.get(id)].filter(other => next.has(other));
                    const old = this.positions.get(id) || this.homes.get(id);
                    const score = p => neighbours.reduce((sum, other) => sum + distance(p, next.get(other)), 0) * 10 +
                        distance(p, old);
                    place(id, available(next.get(parent), occupied, score));
                    queue.push(id);
                }
            }
        }
        this.positions = next;
        this.previouslyEngaged = new Set(ranked.map(c => c.id));
        return next;
    }
}

export function planSceneMoves(current, targets, immobile = new Set(), minimumR = -Infinity) {
    const positions = new Map([...current].map(([id, p]) => [id, { ...p }]));
    const moves = [];
    const pending = new Set([...targets.keys()].filter(id =>
        positions.has(id) && key(positions.get(id)) !== key(targets.get(id))));
    while (pending.size) {
        const occupied = new Set([...positions.values()].map(key));
        let id;
        let destination;
        let path;
        for (const candidate of pending) {
            if (occupied.has(key(targets.get(candidate)))) {
                continue;
            }
            const blocked = new Set([...positions].filter(([other]) => other !== candidate).map(([, p]) => key(p)));
            path = findScenePath(positions.get(candidate), targets.get(candidate), blocked, minimumR);
            if (path) {
                id = candidate;
                destination = targets.get(candidate);
                break;
            }
        }
        if (!path) {
            // Vacate an outside actor to open a corridor, including a surrounded retreat or a swap.
            const obstructionCells = new Set([...pending].flatMap(candidate =>
                (findScenePath(positions.get(candidate), targets.get(candidate), new Set(), minimumR) || [])
                    .slice(1).map(key)));
            const candidates = [...positions].filter(([id, p]) => !immobile.has(id) && obstructionCells.has(key(p)));
            for (const [candidate, cell] of candidates) {
                const staging = { q: Math.max(...[...positions.values(), ...targets.values()].map(p => p.q)) + 2,
                    r: cell.r };
                const blocked = new Set([...positions].filter(([other]) => other !== candidate).map(([, p]) => key(p)));
                path = findScenePath(cell, staging, blocked, minimumR);
                if (path) {
                    id = candidate;
                    destination = staging;
                    break;
                }
            }
            if (!path) {
                throw new Error('Unable to arrange combat presentation without intersecting actors');
            }
            pending.add(id);
        }
        moves.push({ id, path });
        positions.set(id, destination);
        if (key(destination) === key(targets.get(id))) {
            pending.delete(id);
        }
    }
    return moves;
}

function findScenePath(start, goal, blocked, minimumR) {
    const bound = Math.max(Math.abs(start.q), Math.abs(start.r), Math.abs(goal.q), Math.abs(goal.r),
        ...[...blocked].flatMap(cell => cell.split(',').map(Number).map(Math.abs))) + 3;
    const queue = [start];
    const previous = new Map([[key(start), null]]);
    for (let i = 0; i < queue.length; i++) {
        const p = queue[i];
        if (key(p) === key(goal)) {
            const path = [];
            for (let point = p; point; point = previous.get(key(point))) {
                path.unshift(point);
            }
            return path;
        }
        const neighbours = NEIGHBOURS.map(([q, r]) => ({ q: p.q + q, r: p.r + r }))
            .sort((a, b) => distance(a, goal) - distance(b, goal));
        for (const n of neighbours) {
            if (n.r >= minimumR && Math.abs(n.q) <= bound && Math.abs(n.r) <= bound &&
                !blocked.has(key(n)) && !previous.has(key(n))) {
                previous.set(key(n), p);
                queue.push(n);
            }
        }
    }
    return null;
}
