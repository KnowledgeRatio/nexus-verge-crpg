/** Author a continuous skinned spirit surface; no runtime meshing or dependency. */
import { Vector3 } from '../../vendor/three/three.module.min.js';

export function spiritSurface(jointIndex, { trailing = false, includeHead = true, gaunt = false } = {}) {
    const shapes = [];
    const mass = (center, scale, bone) => shapes.push({ bone, distance: p =>
        (Math.hypot(...p.map((v, i) => (v - center[i]) / scale[i])) - 1) * Math.min(...scale) });
    const limb = (a, b, ra, rb, bone) => {
        const delta = b.map((v, i) => v - a[i]), length2 = delta.reduce((sum, v) => sum + v * v, 0);
        shapes.push({ bone, distance: p => {
            const t = Math.max(0, Math.min(1, p.reduce((sum, v, i) => sum + (v - a[i]) * delta[i], 0) / length2));
            return Math.hypot(...p.map((v, i) => v - a[i] - t * delta[i])) - (ra + t * (rb - ra));
        } });
    };
    mass([0, 1.26, 0], gaunt ? [.155, .28, .075] : [.19, .28, .105], 'Spine');
    mass([0, .99, 0], gaunt ? [.14, .17, .075] : [.165, .17, .09], 'Traveller');
    if (includeHead) {
        limb([0, 1.44, 0], [0, 1.62, 0], .058, .05, 'HeadJoint');
        mass([0, 1.70, .006], [.082, .115, .073], 'HeadJoint');
    }
    if (trailing) {
        limb([0, .98, 0], [.025, .55, -.025], .15, .085, 'Traveller');
        limb([.025, .55, -.025], [-.02, .24, -.08], .085, .035, 'Traveller');
        limb([-.02, .24, -.08], [.035, .055, -.12], .035, .004, 'Traveller');
    }
    for (const sign of [-1, 1]) {
        const side = sign < 0 ? 'L' : 'R';
        if (!trailing) {
            limb([sign * .115, .95, 0], [sign * .14, .51, .01], .085, .055, `Leg.${side}`);
            limb([sign * .14, .51, .01], [sign * .14, .09, .01], .055, .032, `Knee.${side}`);
            mass([sign * .14, .055, .075], [.043, .045, .11], `Foot.${side}`);
        }
        limb([sign * (gaunt ? .185 : .225), 1.40, 0], [sign * .315, 1.12, .035],
            gaunt ? .048 : .065, gaunt ? .035 : .041, `Arm.${side}`);
        limb([sign * .315, 1.12, .035], [sign * .30, .93, .13], gaunt ? .033 : .041, .025, `Elbow.${side}`);
        mass([sign * .30, .885, .15], [.035, .074, .025], `Grip.${side}`);
    }
    // Smooth union removes internal overlapping surfaces that become bright under alpha blending.
    const blend = .018;
    const field = p => {
        let value = Infinity;
        for (const shape of shapes) {
            const next = shape.distance(p), h = Math.max(blend - Math.abs(value - next), 0) / blend;
            value = Math.min(value, next) - h * h * blend / 4;
        }
        return value;
    };
    const normal = p => {
        const epsilon = .0003;
        return new Vector3(...p.map((_, axis) => {
            const a = p.slice(), b = p.slice(); a[axis] += epsilon; b[axis] -= epsilon;
            return field(a) - field(b);
        })).normalize();
    };
    const skin = p => {
        const distances = new Map();
        for (const shape of shapes) {
            distances.set(shape.bone, Math.min(distances.get(shape.bone) ?? Infinity, shape.distance(p)));
        }
        const nearest = [...distances].sort((a, b) => a[1] - b[1]).slice(0, 4);
        const weights = nearest.map(([, d]) => Math.exp(-(d - nearest[0][1]) / .018));
        const total = weights.reduce((sum, value) => sum + value, 0);
        return { weights: weights.map(w => w / total), joints: nearest.map(([bone]) => jointIndex(bone)) };
    };
    const positions = [], normals = [], weights = [], joints = [];
    function triangle(a, b, c) {
        const points = [a, b, c], center = a.map((v, i) => (v + b[i] + c[i]) / 3);
        const cross = new Vector3(...b).sub(new Vector3(...a)).cross(new Vector3(...c).sub(new Vector3(...a)));
        if (cross.lengthSq() < 1e-18) { return; }
        if (cross.dot(normal(center)) < 0) { points.reverse(); }
        for (const point of points) {
            positions.push(...point); normals.push(...normal(point).toArray());
            const bind = skin(point); weights.push(...bind.weights); joints.push(...bind.joints);
        }
    }
    const step = .02, origin = [-.44, -.04, -.18], size = [44, 96, 26];
    const samples = new Map();
    const sample = (x, y, z) => {
        const key = `${x},${y},${z}`;
        if (!samples.has(key)) {
            const p = [x, y, z].map((v, i) => origin[i] + v * step);
            samples.set(key, { p, d: field(p) });
        }
        return samples.get(key);
    };
    const corners = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
        [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
    const tetrahedra = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6],
        [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];
    const intersect = (a, b) => a.p.map((v, i) => v + (b.p[i] - v) * a.d / (a.d - b.d));
    for (let x = 0; x < size[0]; x++) {
        for (let y = 0; y < size[1]; y++) {
            for (let z = 0; z < size[2]; z++) {
                const cube = corners.map(([dx, dy, dz]) => sample(x + dx, y + dy, z + dz));
                if (cube.every(c => c.d < 0) || cube.every(c => c.d >= 0)) { continue; }
                for (const indices of tetrahedra) {
                    const inside = indices.map(i => cube[i]).filter(v => v.d < 0);
                    const outside = indices.map(i => cube[i]).filter(v => v.d >= 0);
                    if (!inside.length || !outside.length) { continue; }
                    if (inside.length === 1) {
                        triangle(...outside.map(v => intersect(inside[0], v)));
                    } else if (inside.length === 3) {
                        triangle(...inside.map(v => intersect(outside[0], v)));
                    } else {
                        const a = intersect(inside[0], outside[0]), b = intersect(inside[0], outside[1]);
                        const c = intersect(inside[1], outside[0]), d = intersect(inside[1], outside[1]);
                        triangle(a, b, c); triangle(b, d, c);
                    }
                }
            }
        }
    }
    return { positions, normals, weights, joints };
}
