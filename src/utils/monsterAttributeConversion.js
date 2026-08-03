/**
 * Shared monster save-conversion helpers for the attribute-system remap
 * (docs/plans/2026-07-30-attribute-system-remap.md, decision #2 "Composure consolidation",
 * "NVSystem"-mode only).
 *
 * Saves live only on the three Inward attributes under the target system
 * (Vitality / Insight / Composure) — a monster's legacy `savingThrows` block
 * (data/monsters.json, keyed by str/dex/con/int/wis/cha bonus overrides) needs
 * converting: dex->insight and con->vitality are clean 1:1 renames; str-save and
 * int-save are retired entirely (not carried forward); wis+cha collapse onto a single
 * Composure save via averaging (decision #2 — average, not keep-higher).
 *
 * "Shim landmine" (plan, Architecture approach section): this module is the ONE shared
 * implementation of the wis+cha averaging math. It backs both the live monster-loader
 * shim (EncounterBuilder.js's `createEnemyFromMonster`) and is intended for reuse by the
 * future data-agent batch-convert script for the 46-monster ability-score conversion —
 * never reimplement this averaging independently, or the two will drift out of sync.
 */

/**
 * Average two legacy save bonus values that both collapse onto Composure (WIS + CHA).
 * If only one of the two is present on a given monster (the common real-data case today —
 * zombie has wis only, mage has wis only, no cha), returns it unchanged; there is nothing
 * to average. Returns undefined if neither is present.
 * @param {number} [wisSaveBonus]
 * @param {number} [chaSaveBonus]
 * @returns {number|undefined}
 */
export function averageComposureSaveBonus(wisSaveBonus, chaSaveBonus) {
    const values = [wisSaveBonus, chaSaveBonus].filter(v => typeof v === 'number');
    if (values.length === 0) {
        return undefined;
    }
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Convert a monster's legacy `savingThrows` block (data/monsters.json shape) into the
 * 'NVSystem'-mode shape. Only keys with a real source value are included — a monster
 * with no wis/cha entries produces no `composure` key, etc.
 * @param {Object} [savingThrows] - e.g. { wis: 4, cha: 5 } or { wis: 0 }
 * @returns {{ vitality?: number, insight?: number, composure?: number }}
 */
export function convertMonsterSavingThrows(savingThrows = {}) {
    const result = {};
    if (typeof savingThrows.con === 'number') {
        result.vitality = savingThrows.con;
    }
    if (typeof savingThrows.dex === 'number') {
        result.insight = savingThrows.dex;
    }
    const composure = averageComposureSaveBonus(savingThrows.wis, savingThrows.cha);
    if (composure !== undefined) {
        result.composure = composure;
    }
    return result;
}
