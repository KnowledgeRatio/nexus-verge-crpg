/**
 * Tests for LevelUpManager.renderTacticChoice() (2026-08-05 maneuver->tactic rename bug fixes):
 *   - Bug 1: the tactic filter must key off the `tactic` tag, not just `specialization === 'exemplar'`,
 *     otherwise the Exemplar-only passives Exposed (L3) and Vanguard's Charge (L5) — which are never
 *     added to `knownTactics` because they're auto-granted through a different path — wrongly show up
 *     as selectable tactics at levels 7/9.
 *   - Bug 2: getElementById calls must use the current `tactic*` DOM IDs, not the stale `maneuver*` ones,
 *     or `section`/`list` resolve to null and the picker silently renders nothing.
 *
 * The project has no jsdom/happy-dom environment (vitest.config.js uses environment: 'node'), so
 * `document` is stubbed just enough to observe what LevelUpManager queries and writes — mirrors the
 * stub pattern in tests/ui/SettlementUI.skillToAbility.test.js.
 */

import { describe, it, expect } from 'vitest';
import LevelUpManager from '../../src/systems/LevelUpManager.js';
import abilitiesData from '../../data/abilities.json' with { type: 'json' };

function makeDocumentStub() {
    const elements = {
        tacticChoiceSection: { style: {} },
        tacticChoiceList: { innerHTML: '' },
        tacticChoiceCount: { textContent: '' }
    };
    return {
        elements,
        document: {
            getElementById: (id) => elements[id] || null
        }
    };
}

describe('LevelUpManager.renderTacticChoice — tactic filter and DOM IDs', () => {
    it('resolves the tactic* DOM elements (not null) and lists only tagged tactics, excluding Exposed/Vanguard\'s Charge at level 9', () => {
        const { elements, document: documentStub } = makeDocumentStub();
        globalThis.document = documentStub;

        const manager = new LevelUpManager();
        manager.abilitiesData = abilitiesData;

        const character = {
            level: 9,
            pendingLevelUp: { newLevel: 9 },
            knownTactics: ['precisionStrike', 'tripAttack', 'riposte']
        };

        manager.renderTacticChoice(character, { count: 1, required: true });

        // Bug 2: elements were actually found (not null) — proven by countSpan being written.
        expect(elements.tacticChoiceCount.textContent).toBe('Choose 1 — Required');

        // Bug 1: rendered list excludes exposed/vanguardsCharge and only includes real tactics
        // not yet known, gated by level.
        expect(elements.tacticChoiceList.innerHTML).not.toContain('Exposed');
        expect(elements.tacticChoiceList.innerHTML).not.toContain('Vanguard');
        expect(elements.tacticChoiceList.innerHTML).toContain('Menacing Attack');
        expect(elements.tacticChoiceList.innerHTML).toContain('Pushing Attack');
        expect(elements.tacticChoiceList.innerHTML).toContain('Rally');
        expect(elements.tacticChoiceList.innerHTML).toContain('Parry');
        expect(elements.tacticChoiceList.innerHTML).toContain('Disarming Attack');
        expect(elements.tacticChoiceList.innerHTML).not.toContain('Precision Strike'); // already known
    });
});
