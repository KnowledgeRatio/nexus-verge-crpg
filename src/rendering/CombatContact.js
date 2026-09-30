// Presentation-only routing. Positions never enter the combat rules or saved state.
const length = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);

export function segmentClear(a, b, obstacles) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const squared = dx * dx + dz * dz;
    return obstacles.every(obstacle => {
        const t = squared ? Math.max(0, Math.min(1,
            ((obstacle.x - a.x) * dx + (obstacle.z - a.z) * dz) / squared)) : 0;
        return Math.hypot(a.x + dx * t - obstacle.x, a.z + dz * t - obstacle.z) >= obstacle.radius;
    });
}

export function pathLength(path) {
    return path.slice(1).reduce((total, point, index) => total + length(path[index], point), 0);
}

export function sampleContactPath(path, fraction) {
    if (fraction <= 0) {
        return { ...path[0] };
    }
    if (fraction >= 1) {
        return { ...path.at(-1) };
    }
    let remaining = pathLength(path) * Math.max(0, Math.min(1, fraction));
    for (let index = 1; index < path.length; index++) {
        const a = path[index - 1];
        const b = path[index];
        const distance = length(a, b);
        if (remaining <= distance && distance > 0) {
            const t = remaining / distance;
            return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
        }
        remaining -= distance;
    }
    return { ...path.at(-1) };
}

/** Route one actor to striking reach, avoiding every other actor's body clearance. */
export function planContact(source, target, actors, settings, minimumZ = -Infinity) {
    const obstacles = actors.filter(actor => actor.id !== source.id).map(actor => ({
        ...actor, radius: source.radius + actor.radius + settings.clearance
    }));
    const reach = Math.max(source.reach + target.radius,
        source.radius + target.radius + settings.clearance * 2);
    const angle = Math.atan2(source.z - target.z, source.x - target.x);
    const points = [{ x: source.x, z: source.z }];
    const goals = new Set();
    for (let index = 0; index < settings.samples; index++) {
        const theta = angle + index * Math.PI * 2 / settings.samples;
        const point = { x: target.x + Math.cos(theta) * reach, z: target.z + Math.sin(theta) * reach };
        if (point.z >= minimumZ && segmentClear(point, point, obstacles)) {
            goals.add(points.length);
            points.push(point);
        }
    }
    // Circumscribed polygons keep connecting edges outside each clearance circle.
    for (const obstacle of obstacles) {
        const radius = (obstacle.radius + settings.clearance) / Math.cos(Math.PI / settings.samples);
        for (let index = 0; index < settings.samples; index++) {
            const theta = index * Math.PI * 2 / settings.samples;
            const point = { x: obstacle.x + Math.cos(theta) * radius, z: obstacle.z + Math.sin(theta) * radius };
            if (point.z >= minimumZ && segmentClear(point, point, obstacles)) {
                points.push(point);
            }
        }
    }
    const costs = points.map(() => Infinity);
    const parents = new Map();
    const visited = new Set();
    costs[0] = 0;
    while (visited.size < points.length) {
        let current = -1;
        for (let index = 0; index < points.length; index++) {
            if (!visited.has(index) && Number.isFinite(costs[index]) &&
                (current < 0 || costs[index] < costs[current])) {
                current = index;
            }
        }
        if (current < 0) {
            return null;
        }
        if (goals.has(current)) {
            const path = [];
            for (let index = current; index !== undefined; index = parents.get(index)) {
                path.unshift(points[index]);
            }
            return path;
        }
        visited.add(current);
        for (let next = 0; next < points.length; next++) {
            const cost = costs[current] + length(points[current], points[next]);
            if (!visited.has(next) && cost < costs[next] && segmentClear(points[current], points[next], obstacles)) {
                costs[next] = cost;
                parents.set(next, current);
            }
        }
    }
    return null;
}
