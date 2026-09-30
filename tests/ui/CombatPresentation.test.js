import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('../../src/systems/AudioManager.js', () => ({ default: {
    play: vi.fn(), playCombatRelease: vi.fn(), playCombatSound: vi.fn(), playHealSound: vi.fn()
} }));
import audioManager from '../../src/systems/AudioManager.js';
import { CombatSceneUI } from '../../src/ui/CombatSceneUI.js';
import { combatPresentationSnapshot, combatSceneConfig, combatActionVisual } from '../../src/ui/CombatPresentation.js';

const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));
const config = read('combatScene');
const data = { items: read('items').weapons, monsters: read('monsters').monsters };

function actor(id, team, weaponId = 'longsword') {
    return { id, team, hp: 20, character: { monsterId: team === 'enemy' ? 'bandit' : undefined,
        species: { size: 'medium' }, equipment: { mainHand: { id: weaponId } } },
    toJSON() {
        return { id, team, name: id, hp: this.hp, maxHP: 20,
            isDowned: Boolean(this.isDowned), engagedWith: [] };
    } };
}

function view() {
    const source = actor('source', 'player');
    const target = actor('target', 'enemy');
    const manager = { active: true, round: 1, combatants: [source, target], getCurrentCombatant: () => source };
    const scene = { update: vi.fn(), action: vi.fn(), feedback: vi.fn(), isBusy: () => false,
        finishPresentation: vi.fn(), stop: vi.fn(), dispose: vi.fn() };
    const ui = Object.assign(Object.create(CombatSceneUI.prototype), {
        config, data, scene, getManager: () => manager, mobile: { matches: false }, enabled: true,
        skip: {}, generation: 0, endCallbacks: [], refresh: vi.fn(), onBusy: vi.fn(),
        onPresented: vi.fn(), onFloatingText: vi.fn()
    });
    ui.state = ui.snapshot().state;
    ui.displayed = ui.snapshot().state;
    return { ui, manager, source, target, scene };
}

describe('Main-game combat presentation', () => {
    it('distinguishes a javelin throw from a melee stab without changing the equipped model', () => {
        const melee = combatActionVisual(config, { weaponId: 'javelin', kind: 'melee' }, 'ogre');
        const ranged = combatActionVisual(config, { weaponId: 'javelin', kind: 'ranged' }, 'ogre');
        expect(melee.action).toBe('meleeStab1h');
        expect(ranged.action).toBe('javelinThrow');
        expect(ranged.motion).toBe('throw');
        expect(melee.model).toBe('spear'); expect(ranged.model).toBe('spear');
    });
    it('admits a canonical Ogre with its own greatclub timing without changing other wielders', () => {
        const source = actor('ogre', 'enemy', 'greatclub');
        source.character.monsterId = 'ogre';
        source.character.species.size = 'large';
        const snapshot = combatPresentationSnapshot({ combatants: [source], getCurrentCombatant: () => source }, config, data);
        expect(snapshot.reason).toBe('');
        expect(snapshot.state.combatants[0].appearance).toBe('ogre');
        expect(snapshot.state.combatants[0].weaponAction).toBe('ogreClub');
        expect(combatActionVisual(config, { weaponId: 'greatclub', kind: 'melee' }, 'traveller').action).toBe('meleeChop2h');
    });
    beforeEach(() => vi.stubGlobal('document', { hidden: false }));
    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    it('maps actual equipment and per-attack weapon overrides without changing the character', () => {
        const { manager, source } = view();
        const first = combatPresentationSnapshot(manager, config, data);
        const offhand = combatPresentationSnapshot(manager, config, data, new Map([['source', 'handCrossbow']]));
        expect(first.state.combatants[0].weaponModel).toBe('sword');
        expect(offhand.state.combatants[0].weaponModel).toBe('sidearm');
        expect(offhand.state.combatants[0].weaponAction).toBe('firearm');
        expect(source.character.equipment.mainHand.id).toBe('longsword');
        expect(combatPresentationSnapshot(manager, config, data).state.combatants[0].weaponModel).toBe('sword');
        source.character.equipment.mainHand = { id: 'greatsword' };
        expect(combatPresentationSnapshot(manager, config, data).state.combatants[0])
            .toMatchObject({ weaponMount: 'sword2h', weaponAction: 'meleeSlice2h' });
    });

    it('selects a dungeon composition from encounter context without mutating the base scene', () => {
        const dungeon = combatSceneConfig(config, { context: 'dungeon', dungeonTypeId: 'tomb' });
        expect(dungeon.activeScene).toBe('dungeon');
        expect(dungeon.artAssets.environment).toBe('dungeon');
        expect(dungeon.props).not.toBe(config.props);
        expect(dungeon.palette.sky).not.toBe(config.palette.sky);
        expect(dungeon.lighting.keyIntensity).toBeLessThan(config.lighting.keyIntensity);
        expect(dungeon.lighting.lanternIntensity).toBeGreaterThan(config.lighting.lanternIntensity);
        expect(dungeon.lighting.lanternDecay).toBe(config.lighting.lanternDecay);
        expect(config.artAssets.environment).toBe('waystation');
        expect(combatSceneConfig(config, { context: 'overworld', terrainId: 'grassland' }).activeScene)
            .toBe('grassland');
        const settlement = combatSceneConfig(config, { context: 'ambush' });
        expect(settlement.activeScene).toBe('settlement');
        expect(settlement.artAssets.environment).toBe('settlement');
        expect(settlement.props).not.toBe(config.props);
        expect(settlement.lighting).toEqual(config.lighting);
    });

    it.each(Object.entries(config.sceneSelection.dungeonTerrains))(
        'maps dungeon terrain %s to scene %s for random and boss encounters', (terrainId, sceneId) => {
            for (const isBossFight of [false, true]) {
                const scene = combatSceneConfig(config, { context: 'dungeon', terrainId, isBossFight });
                expect(scene.activeScene).toBe(sceneId);
                expect(scene.artAssets.environment).toBe(config.sceneVariants[sceneId].artEnvironment);
            }
        });

    it('selects woodland from forest metadata while preserving dungeon and settlement precedence', () => {
        expect(combatSceneConfig(config, { context: 'overworld', terrainId: 'forest' }).activeScene)
            .toBe('woodland');
        expect(combatSceneConfig(config, { context: 'dungeon', terrainId: 'forest' }).activeScene)
            .toBe('dungeon');
        expect(combatSceneConfig(config, { context: 'ambush', terrainId: 'forest' }).activeScene)
            .toBe('settlement');
        expect(combatSceneConfig(config, { sceneId: 'woodland' }).lighting.lanternIntensity).toBe(0);
        expect(combatSceneConfig(config, { terrainId: 'unknown' }).activeScene).toBe('waystation');
    });

    it.each(Object.entries(config.sceneSelection.terrains).filter(([, scene]) => typeof scene === 'string'))(
        'maps terrain %s to scene %s', (terrainId, sceneId) => {
            const scene = combatSceneConfig(config, { context: 'overworld', terrainId });
            expect(scene.activeScene).toBe(sceneId);
            expect(scene.artAssets.environment).toBe(sceneId);
            expect(scene.artAssets.models[sceneId]).toBeDefined();
            expect(combatSceneConfig(config, { context: 'ambush', terrainId }).activeScene).toBe('settlement');
        });

    it('keeps location scenery stable and makes every configured forest variant reachable', () => {
        const selected = new Set();
        for (let x = 0; x < 30; x++) {
            const context = { terrainId: 'forest', scenerySeed: JSON.stringify(['test-world', { x, y: 4 }]) };
            const first = combatSceneConfig(config, context).activeScene;
            selected.add(first);
            expect(combatSceneConfig(config, JSON.parse(JSON.stringify(context))).activeScene).toBe(first);
            expect(combatSceneConfig(config, { ...context, context: 'dungeon' }).activeScene).toBe('dungeon');
            expect(combatSceneConfig(config, { ...context, sceneId: 'woodlandGlade' }).activeScene).toBe('woodlandGlade');
        }
        expect([...selected].sort()).toEqual([...config.sceneSelection.terrains.forest].sort());
    });

    it('maps a shield independently of the main-hand weapon and clears it on unequip', () => {
        const { ui, source } = view();
        source.character.equipment.offHand = { id: 'shield', type: 'shield' };
        expect(ui.snapshot().state.combatants[0]).toMatchObject({ weaponModel: 'sword', offHandModel: 'roundShield' });
        source.character.equipment.offHand = null;
        expect(ui.snapshot().state.combatants[0].offHandModel).toBeUndefined();
    });

    it('keeps both equipped weapons throughout an off-hand attack', async () => {
        const { ui, source, scene } = view();
        source.character.equipment.offHand = { id: 'dagger', type: 'weapon' };
        ui.beginAction({ sourceId: 'source', targetId: 'target', kind: 'melee', weaponId: 'dagger', weaponSlot: 'offHand' });
        ui.feedback({ combatantId: 'target', text: '-2', type: 'damage' });
        await ui.completeAction();
        for (const [state] of scene.update.mock.calls) {
            expect(state.combatants[0]).toMatchObject({ weaponModel: 'sword', offHandModel: 'dagger' });
        }
        expect(scene.action).toHaveBeenCalledWith(expect.objectContaining({ weaponSlot: 'offHand' }));
    });

    it.each(['shortbow', 'lightCrossbow', 'greatsword', 'quarterstaff'])(
        'retains equipped %s and its grip throughout a structured spell', async weaponId => {
            const { ui, source, scene } = view();
            source.character.equipment.mainHand = { id: weaponId };
            const before = ui.snapshot().state.combatants[0];
            ui.beginAction({ sourceId: 'source', targetId: 'target', kind: 'spell' });
            ui.feedback({ combatantId: 'target', text: '-2', type: 'damage' });
            await ui.completeAction();
            for (const [state] of scene.update.mock.calls) {
                const actor = state.combatants.find(entry => entry.id === 'source');
                expect(actor.weaponModel).toBe(before.weaponModel);
                expect(actor.weaponMount).toBe(before.weaponMount);
                expect(actor.weaponAction).toBe(before.weaponAction);
            }
            expect(scene.action).toHaveBeenCalledWith(expect.objectContaining({ kind: 'spell', motion: 'spell' }));
            expect(source.character.equipment.mainHand.id).toBe(weaponId);
        });

    it('constructs the renderer with the resolved encounter scene', () => {
        const { ui } = view();
        ui.stage = {};
        ui.config = combatSceneConfig(config, { context: 'dungeon' });
        class Scene {
            constructor(stage, sceneConfig) {
                Object.assign(this, { stage, config: sceneConfig });
            }
        }
        const scene = ui.createScene(Scene);
        expect(scene.stage).toBe(ui.stage);
        expect(scene.config.activeScene).toBe('dungeon');
        expect(scene.config.artAssets.environment).toBe('dungeon');
    });

    it('uses cards for an unsupported creature', () => {
        const { manager, target } = view();
        target.character.monsterId = 'youngWhiteDragon';
        const unavailable = { ...config,
            monsterAppearance: { ...config.monsterAppearance, youngWhiteDragon: undefined } };
        expect(combatPresentationSnapshot(manager, unavailable, data).reason).toContain('creatures');
    });

    it.each(config.playerAppearances)('uses saved player outfit $id without changing equipped weapons', option => {
        const { manager, source } = view();
        const before = combatPresentationSnapshot(manager, config, data).state.combatants[0];
        source.character.combatAppearance = { avatarId: option.id };
        const after = combatPresentationSnapshot(manager, config, data).state.combatants[0];
        expect(after.appearance).toBe(option.id);
        expect(after.weaponModel).toBe(before.weaponModel);
        expect(after.weaponMount).toBe(before.weaponMount);
    });

    it('falls back safely for old saves or unavailable player appearance IDs', () => {
        const { manager, source } = view();
        for (const appearance of [null, { avatarId: 'missing' }, { avatarId: 'giantSpider' }]) {
            source.character.combatAppearance = appearance;
            expect(combatPresentationSnapshot(manager, config, data).state.combatants[0].appearance)
                .toBe(config.teamAppearance.player);
        }
    });

    it('resolves independent saved part choices without leaking them to other actors', () => {
        const { manager, source } = view();
        source.character.combatAppearance = { avatarId: 'travellerOchre',
            parts: { hair: 'grey', legs: 'olive', neckwear: 'none', skin: 'missing' } };
        const [player, enemy] = combatPresentationSnapshot(manager, config, data).state.combatants;
        expect(player.appearance).toBe('travellerOchre');
        expect(player.appearanceParts.materialTints).toEqual({ 'Dark brown hair': '#b2aaa0',
            'Charcoal trousers': '#677052' });
        expect(player.appearanceParts.hiddenMaterials).toEqual(['Blue grey scarf']);
        expect(enemy.appearanceParts).toBeUndefined();
    });

    it('uses the dedicated goblin derivative of the shared rig', () => {
        const { manager, target } = view();
        target.character.monsterId = 'goblin';
        const snapshot = combatPresentationSnapshot(manager, config, data);
        expect(snapshot.reason).toBe('');
        expect(snapshot.state.combatants.find(entry => entry.id === 'target').appearance).toBe('goblin');
    });

    it('selects reusable humanoid variants from canonical monster IDs', () => {
        const { manager, target } = view();
        target.character.monsterId = 'orc';
        expect(combatPresentationSnapshot(manager, config, data).state.combatants[1].appearance).toBe('orc');
        target.character.monsterId = 'mage';
        expect(combatPresentationSnapshot(manager, config, data).state.combatants[1].appearance).toBe('raiderAsh');
    });

    it('keeps downed allies in the scene for the terminal pose', () => {
        const { manager, source } = view();
        source.isDowned = true;
        source.hp = 0;
        const snapshot = combatPresentationSnapshot(manager, config, data);
        expect(snapshot.reason).toBe('');
        expect(snapshot.state.combatants.find(actor => actor.id === source.id))
            .toMatchObject({ hp: 0, isDowned: true });
    });

    it('uses the unarmed humanoid guard and strike for empty hands', async () => {
        const { ui, manager, source, scene } = view();
        source.character.equipment.mainHand = null;
        const snapshot = combatPresentationSnapshot(manager, config, data);
        expect(snapshot.reason).toBe('');
        expect(snapshot.state.combatants[0]).toMatchObject({ weaponModel: 'unarmed', twoHanded: false });
        ui.beginAction({ sourceId: 'source', targetId: 'target', kind: 'melee' });
        ui.feedback({ combatantId: 'target', type: 'miss', text: 'MISS' });
        await ui.completeAction();
        expect(scene.action).toHaveBeenCalledWith(expect.objectContaining({ kind: 'melee', motion: 'unarmed' }));
        expect(ui.enabled).toBe(true);
    });

    it('uses cards for an unknown equipped weapon instead of pretending it is unarmed', () => {
        const { manager, source } = view();
        source.character.equipment.mainHand = { id: 'missing-weapon-art' };
        expect(combatPresentationSnapshot(manager, config, data).reason).toContain('weapon');
        const { ui } = view();
        ui.beginAction({ sourceId: 'source', targetId: 'target', kind: 'melee', weaponId: 'missing-weapon-art' });
        expect(ui.enabled).toBe(false);
    });

    it('holds health, sounds and the end screen until the corresponding presentation', async () => {
        const { ui, target, scene } = view();
        let release;
        const animation = new Promise(resolve => {
            release = resolve;
        });
        ui.waitForScene = () => animation;
        ui.beginAction({ sourceId: 'source', targetId: 'target', kind: 'melee', weaponId: 'longsword' });
        expect(ui.record.event).toMatchObject({ kind: 'meleeSlice1h', motion: 'meleeSlice1h' });
        ui.feedback({ combatantId: 'target', text: '-20', type: 'damage' });
        ui.audio('playCombatRelease', [{ weaponId: 'longsword' }]);
        ui.audio('playCombatSound', [{ hit: true }]);
        ui.audio('play', ['death']);
        target.hp = 0;
        const endScreen = vi.fn();
        ui.afterPlayback(endScreen);
        const done = ui.completeAction();
        expect(scene.update.mock.calls[0][0].combatants[1].hp).toBe(20);
        expect(ui.onPresented).not.toHaveBeenCalled();
        expect(audioManager.playCombatRelease).not.toHaveBeenCalled();
        expect(audioManager.playCombatSound).not.toHaveBeenCalled();
        expect(endScreen).not.toHaveBeenCalled();
        scene.action.mock.calls[0][0].onRelease();
        expect(audioManager.playCombatRelease).toHaveBeenCalledExactlyOnceWith({ weaponId: 'longsword' });
        scene.action.mock.calls[0][0].onImpact();
        expect(audioManager.playCombatSound).toHaveBeenCalledOnce();
        expect(audioManager.play).not.toHaveBeenCalled();
        release();
        await done;
        expect(ui.displayed.combatants[1].hp).toBe(0);
        expect(audioManager.play).toHaveBeenCalledExactlyOnceWith('death');
        expect(audioManager.playCombatRelease).toHaveBeenCalledTimes(1);
        expect(endScreen).toHaveBeenCalledOnce();
        expect(ui.isBusy()).toBe(false);
    });

    it('settles cues once if the player switches to cards before impact', async () => {
        const { ui, scene } = view();
        let release;
        ui.waitForScene = () => new Promise(resolve => {
            release = resolve;
        });
        ui.beginAction({ sourceId: 'source', targetId: 'target', kind: 'ranged', weaponId: 'lightCrossbow' });
        expect(ui.record.event).toMatchObject({ kind: 'firearm', motion: 'longarm' });
        ui.feedback({ combatantId: 'target', text: 'MISS', type: 'miss' });
        ui.audio('playCombatSound', [{ hit: false }]);
        const done = ui.completeAction();
        expect(scene.action.mock.calls[0][0]).toMatchObject({ kind: 'firearm', motion: 'longarm' });
        ui.useCards();
        scene.action.mock.calls[0][0].onImpact();
        release();
        await done;
        expect(audioManager.playCombatSound).toHaveBeenCalledOnce();
        expect(ui.enabled).toBe(false);
        expect(ui.isBusy()).toBe(false);
    });

    it('accepts structured spells and captures secondary targets for the resolved action', () => {
        const { ui } = view();
        ui.beginAction({ sourceId: 'source', targetId: 'target', kind: 'spell' });
        expect(ui.record.event).toMatchObject({ kind: 'spell', motion: 'spell' });
        ui.record = null;
        ui.beginAction({ sourceId: 'source', targetId: 'target', kind: 'melee', weaponId: 'longsword' });
        ui.feedback({ combatantId: 'source', text: '+5', type: 'healing' });
        expect(ui.enabled).toBe(true);
        expect(ui.record.feedback).toEqual([{ combatantId: 'source', text: '+5', type: 'healing' }]);
        expect(ui.onFloatingText).not.toHaveBeenCalled();
    });

    it('shows the triggering miss before a reaction attack without replaying the original swing', async () => {
        const { ui, scene, source } = view();
        ui.beginAction({ sourceId: 'source', targetId: 'target', kind: 'melee', weaponId: 'longsword' });
        ui.feedback({ combatantId: 'target', text: 'MISS', type: 'miss' });

        ui.beginAction({ sourceId: 'target', targetId: 'source', kind: 'melee', weaponId: 'longsword' });
        source.hp = 16;
        ui.feedback({ combatantId: 'source', text: '-4', type: 'damage' });
        expect(ui.actionStack).toHaveLength(1);
        expect(ui.record.event).toMatchObject({ sourceId: 'target', targetId: 'source' });

        await ui.completeAction();
        expect(ui.record.event).toMatchObject({ sourceId: 'source', targetId: 'target' });
        expect(ui.enabled).toBe(true);
        await ui.completeAction();

        expect(scene.action).toHaveBeenNthCalledWith(1, expect.objectContaining({
            sourceId: 'source', targetId: 'target', feedback: expect.objectContaining({ type: 'miss' })
        }));
        expect(scene.action).toHaveBeenNthCalledWith(2, expect.objectContaining({
            sourceId: 'target', targetId: 'source'
        }));
        expect(scene.action).toHaveBeenCalledTimes(2);
        expect(scene.update.mock.calls.slice(0, 3).map(([state]) =>
            state.combatants.find(actor => actor.id === 'source').hp)).toEqual([20, 20, 20]);
        expect(ui.displayed.combatants.find(actor => actor.id === 'source').hp).toBe(16);
        expect(ui.record).toBeNull();
        expect(ui.isBusy()).toBe(false);
    });

    it('presents multi-target spells together and preserves additional status feedback', async () => {
        const { ui, scene } = view();
        ui.beginAction({ sourceId: 'source', targetId: 'target', kind: 'spell' });
        ui.feedback({ combatantId: 'target', type: 'damage', text: '-4' });
        ui.feedback({ combatantId: 'source', type: 'healing', text: '+2' });
        ui.feedback({ combatantId: 'source', type: 'buff', text: 'WARD' });
        await ui.completeAction();
        expect(scene.action).toHaveBeenCalledOnce();
        expect(scene.action).toHaveBeenCalledWith(expect.objectContaining({
            secondaryFeedback: [{ combatantId: 'source', type: 'healing', text: '+2' }]
        }));
        expect(scene.feedback).toHaveBeenCalledExactlyOnceWith({ combatantId: 'source', type: 'buff', text: 'WARD' });
    });

    it('shows a post-reaction rider without adding a second triggering attack', async () => {
        const { ui, scene, target } = view();
        ui.beginAction({ sourceId: 'source', targetId: 'target', kind: 'melee', weaponId: 'longsword' });
        ui.feedback({ combatantId: 'target', text: 'MISS', type: 'miss' });
        ui.beginAction({ sourceId: 'target', targetId: 'source', kind: 'melee', weaponId: 'longsword' });
        ui.feedback({ combatantId: 'source', text: 'MISS', type: 'miss' });
        await ui.completeAction();
        target.hp = 18;
        ui.feedback({ combatantId: 'target', text: '-2 GRAZE', type: 'damage' });
        await ui.completeAction();
        expect(scene.action).toHaveBeenCalledTimes(2);
        expect(scene.feedback).toHaveBeenCalledWith(expect.objectContaining({
            combatantId: 'target', text: '-2 GRAZE'
        }));
        expect(ui.displayed.combatants.find(actor => actor.id === 'target').hp).toBe(18);
        expect(ui.enabled).toBe(true);
    });

    it('settles both trigger and reaction sounds once when switching to cards before playback', async () => {
        const { ui } = view();
        ui.beginAction({ sourceId: 'source', targetId: 'target', kind: 'melee', weaponId: 'longsword' });
        ui.feedback({ combatantId: 'target', text: 'MISS', type: 'miss' });
        ui.audio('playCombatSound', [{ hit: false }]);
        ui.beginAction({ sourceId: 'target', targetId: 'source', kind: 'melee', weaponId: 'longsword' });
        ui.feedback({ combatantId: 'source', text: '-4', type: 'damage' });
        ui.audio('playCombatSound', [{ hit: true }]);
        ui.useCards();
        await ui.completeAction();
        ui.useCards();
        expect(audioManager.playCombatSound).toHaveBeenCalledTimes(2);
        expect(ui.isBusy()).toBe(false);
    });

    it('presents structured healing feedback without leaving the 3D scene', async () => {
        const { ui, scene } = view();
        ui.effectQueue = [];
        ui.feedback({ sourceId: 'source', combatantId: 'source', text: '+5 HP', type: 'healing' });
        await ui.effectPlayback;
        expect(scene.action).toHaveBeenCalledWith(expect.objectContaining({
            sourceId: 'source', targetId: 'source', kind: 'healing',
            feedback: expect.objectContaining({ text: '+5 HP', type: 'healing' })
        }));
        expect(ui.enabled).toBe(true);
        expect(ui.onFloatingText).not.toHaveBeenCalled();
        expect(ui.isBusy()).toBe(false);
    });

    it.each(['dodge', 'extraAction'])('shows %s feedback without inventing a spell cast', async effectType => {
        const { ui, scene } = view();
        ui.effectQueue = [];
        const event = { sourceId: 'source', combatantId: 'source', text: 'READY', type: 'buff', effectType };
        ui.feedback(event);
        await ui.effectPlayback;
        expect(scene.feedback).toHaveBeenCalledExactlyOnceWith(event);
        expect(scene.action).not.toHaveBeenCalled();
        expect(ui.enabled).toBe(true);
        expect(ui.isBusy()).toBe(false);
    });

    it('presents structured turn damage as a recipient reaction without a fabricated cast', async () => {
        const { ui, scene } = view();
        ui.effectQueue = [];
        ui.feedback({ sourceId: 'source', combatantId: 'target', text: '-3', type: 'damage' });
        await ui.effectPlayback;
        expect(scene.feedback).toHaveBeenCalledWith(expect.objectContaining({
            combatantId: 'target', text: '-3', type: 'damage'
        }));
        expect(scene.action).not.toHaveBeenCalled();
        expect(ui.enabled).toBe(true);
    });

    it('releases controls and shows cards if the renderer fails', async () => {
        const { ui, scene } = view();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        scene.update.mockImplementation(() => {
            throw new Error('renderer lost');
        });
        ui.beginAction({ sourceId: 'source', targetId: 'target', kind: 'melee', weaponId: 'longsword' });
        ui.feedback({ combatantId: 'target', text: 'MISS', type: 'miss' });
        ui.audio('playCombatSound', [{ hit: false }]);
        await ui.completeAction();
        expect(ui.scene).toBeNull();
        expect(ui.isBusy()).toBe(false);
        expect(ui.onPresented).toHaveBeenCalled();
        expect(audioManager.playCombatSound).toHaveBeenCalledOnce();
    });
});
