import { iconCatalogue, iconAliases } from './iconCatalogue.js';

// Only this boundary knows historical glyphs; saved objects never need to be rewritten.
const legacyIcons = new Map([
    [0x1fa78, 'condition.bleeding'], [0x1f631, 'condition.frightened'],
    [0x1f53b, 'condition.prone'], [0x1f624, 'condition.taunted'],
    [0x1f4ab, 'condition.sapped'], [0x1f40c, 'condition.slowed'],
    [0x1f4a8, 'condition.pushed'], [0x1f3af, 'condition.vexed'],
    [0x1f4a2, 'condition.debuff'], [0x2728, 'condition.buff'],
    [0x1f311, 'condition.debuff'], [0x26a1, 'action.react'],
    [0x1f6e1, 'equipment.shield'], [0x2694, 'equipment.weapons'],
    [0x1f5e1, 'equipment.dagger'], [0x1f3f9, 'equipment.bow'],
    [0x1fa93, 'equipment.axe'], [0x1f44a, 'action.unarmed'],
    [0x1f441, 'action.perception'], [0x1f30a, 'terrain.water'],
    [0x1f64f, 'action.heal'], [0x2764, 'resource.health'],
    [0x26a0, 'outcome.warning'], [0x2705, 'outcome.success'],
    [0x274c, 'outcome.failure'], [0x1f4dc, 'navigation.journal'],
    [0x1f392, 'navigation.inventory'], [0x1f4b0, 'resource.gold'],
    [0x1f3d8, 'map.settlement'], [0x26e9, 'map.sanctuary'],
    [0x1f573, 'map.dungeon'], [0x1f3db, 'map.ruins'],
    [0x1f6d5, 'map.temple'], [0x26ea, 'map.sanctuary'],
    [0x26fa, 'map.camp'], [0x1f5fc, 'map.tower'],
    [0x1f3e1, 'map.house'], [0x2663, 'map.tree'], [0x2660, 'map.mushroom'],
    [0x2692, 'map.rebuilding'], [0x1f480, 'map.boss'], [0x2620, 'map.boss'],
    [0x1f4e6, 'object.chest'], [0x1f525, 'object.brazier'],
    [0x1f9ea, 'equipment.potion'], [0x1f527, 'system.settings']
]);

const paths = new Map();
const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function iconId(value, fallback = 'outcome.warning') {
    if (typeof value === 'string') {
        if (Object.hasOwn(iconCatalogue, value)) {
            return value;
        }
        if (Object.hasOwn(iconAliases, value)) {
            return iconAliases[value];
        }
        const legacy = legacyIcons.get(value.codePointAt(0));
        if (legacy) {
            return iconAliases[legacy] || legacy;
        }
    }
    return fallback === null ? null : (iconAliases[fallback] || fallback);
}

export function iconMarkup(id, { label, className = '' } = {}) {
    const resolved = iconId(id);
    const spec = iconCatalogue[resolved] || iconCatalogue['outcome.warning'];
    const accessibility = label ? `role="img" aria-label="${escape(label)}"` : 'aria-hidden="true"';
    const silhouette = spec.silhouette ? `<path d="${spec.silhouette}" fill="currentColor" fill-rule="evenodd"/>` : '';
    return `<svg class="nv-icon ${escape(className)}" data-symbol="${escape(resolved)}" viewBox="0 0 32 32" ${accessibility} focusable="false">${silhouette}<path d="${spec.path}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function setIcon(element, id, options = {}) {
    if (element) {
        element.innerHTML = iconMarkup(id, options);
    }
}

export function hydrateIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach(element => {
        setIcon(element, element.dataset.icon);
    });
}

export function conditionIconId(condition) {
    if (!condition?.icon) {
        return null;
    }
    const semantic = `condition.${condition.type}`;
    const typed = iconId(semantic, null);
    if (typed) {
        return typed;
    }
    if (!condition.icon) {
        return null;
    }
    return iconId(condition.icon, condition.isBuff ? 'condition.buff' : 'condition.debuff');
}

export function conditionMarkup(condition) {
    const id = conditionIconId(condition);
    return id ? iconMarkup(id) : '';
}

export function drawIcon(ctx, id, x, y, size, color = '#f3e9d2') {
    const resolved = iconId(id, null);
    if (!resolved) {
        return false;
    }
    if (!paths.has(resolved)) {
        const spec = iconCatalogue[resolved];
        paths.set(resolved, {
            outline: new globalThis.Path2D(spec.path),
            silhouette: spec.silhouette ? new globalThis.Path2D(spec.silhouette) : null
        });
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 32, size / 32);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const geometry = paths.get(resolved);
    if (geometry.silhouette) {
        ctx.fill(geometry.silhouette, 'evenodd');
    }
    ctx.stroke(geometry.outline);
    ctx.restore();
    return true;
}
