import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../src/systems/AudioManager.js', () => ({ default: { play: vi.fn() } }));
import Player from '../../src/systems/Player.js';
import QuestGenerator from '../../src/systems/QuestGenerator.js';
import QuestManager from '../../src/systems/QuestManager.js';
import SkillChallengeManager from '../../src/systems/SkillChallengeManager.js';
import { gameState } from '../../src/core/GameState.js';
import { skillRegistry } from '../../src/systems/SkillRegistry.js';
import { Character } from '../../src/systems/Character.js';

const data = path => JSON.parse(readFileSync(new URL(`../../data/${path}.json`, import.meta.url), 'utf8'));

describe('signature bandit conversation retains its authored completion path', () => {
    let state;
    let definitions;
    let quest;
    let manager;
    let challenges;
    let player;
    beforeEach(async () => {
        state = gameState.data;
        definitions = skillRegistry.definitions;
        skillRegistry.setDefinitions(data('skills').skills);
        gameState.reset();
        gameState.set('character', new Character({ name: 'Knight', class: data('classes').classes.find(c => c.id === 'dedication'),
            species: {}, background: {}, baseAbilities: { prowess: 15, intuition: 13, resilience: 15,
                composure: 10, intellect: 10, presence: 10 } }));
        gameState.set('world.metadata', { features: [{ type: 'dungeon', x: 4, y: 7, name: 'Bandit Camp',
            questHook: { namedBossId: 'bandit', nearestSettlementId: '2,3', distanceTiles: 5 } }] });
        gameState.set('quests', { available: [], active: [], completed: [], failed: [] });
        const generator = new QuestGenerator('signature');
        generator.questData = { questComposition: null, proceduralBundles: [] };
        generator.monsterData = data('monsters');
        manager = new QuestManager(generator);
        challenges = new SkillChallengeManager();
        challenges.challenges.set('bandit_negotiation', data('skillChallenges/bandit-negotiation'));
        vi.spyOn(challenges, 'renderChallenge').mockImplementation(() => {});
        vi.spyOn(challenges, 'closeChallenge').mockImplementation(() => {
            challenges.challengeActive = false;
        });
        vi.stubGlobal('document', { addEventListener: vi.fn() });
        vi.stubGlobal('window', { game: { questManager: manager }, skillChallengeManager: challenges, dispatchEvent: vi.fn() });
        player = new Player({}, {});
        player.x = 4;
        player.y = 7;
        quest = (await generator.generateQuestsForSettlement({ id: '2,3', x: 2, y: 3, name: 'Town', settlementType: 'town' }, 1))
            .find(offer => offer.type === 'social');
        expect(quest).toBeDefined();
        gameState.set('quests.active', [{ ...quest, status: 'active' }]);
        quest = gameState.get('quests.active')[0];
    });

    afterEach(() => {
        gameState.data = state;
        skillRegistry.setDefinitions(definitions);
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it.each(['peaceful_opportunists', 'bribe_accepted'])('keeps %s progression through the real approach and controller', async outcome => {
        await player.approachBanditCamp();
        expect(challenges.currentChallenge.id).toBe('bandit_negotiation');
        expect(challenges.currentChallenge.context.questId).toBe(quest.id);
        challenges.endChallenge(outcome);
        expect(quest.objectives.every(objective => objective.completed)).toBe(true);
        expect(quest.status).toBe('ready_to_turn_in');
        expect(manager.completeQuest(quest.id).success).toBe(true);
    });

    it('walking away grants no social completion', async () => {
        await player.approachBanditCamp();
        challenges.endChallenge('walked_away');
        expect(quest.objectives.find(objective => objective.type === 'social_challenge').completed).toBe(false);
        expect(manager.completeQuest(quest.id).success).toBe(false);
    });
});
