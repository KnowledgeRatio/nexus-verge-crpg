/** Numerical asset gates, not an assertion of convincing animation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import console from 'node:console';
import { fileURLToPath, URL } from 'node:url';

const root = new URL('../../', import.meta.url);
function glb(relative) {
    const bytes = fs.readFileSync(new URL(relative, root));
    assert.equal(bytes.readUInt32LE(0), 0x46546c67);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    const length = bytes.readUInt32LE(12);
    return { json: JSON.parse(bytes.subarray(20, 20 + length)), binary: bytes.subarray(28 + length) };
}
const original = glb('data/graphics/combat/traveller-v1.glb');
const animated = glb('data/graphics/combat/traveller-animated.glb');
assert.deepEqual(animated.json.meshes, original.json.meshes, 'Retarget must preserve original geometry');
assert.deepEqual(animated.json.skins, original.json.skins, 'Retarget must preserve original skin');
assert.deepEqual(animated.json.nodes, original.json.nodes, 'Retarget must preserve rig and sockets');
assert.deepEqual(animated.binary.subarray(0, original.binary.length), original.binary,
    'Original accessor bytes must not change');
const required = ['Sword_Idle', 'Walk_Loop', 'Sword_Attack', 'Hit_Chest', 'Death01',
    'Sword_Regular_A', 'Sword_Regular_B', 'Sword_Block', 'Hit_Knockback', 'OverhandThrow',
    'Ranged_1H_Shoot', 'Ranged_2H_Shoot', 'Ranged_Bow_Shot', 'Spell_Simple_Shoot_Right'];
for (const name of required) assert.ok(animated.json.animations.some(a => a.name === name), name);
const stableNodes = new Set(['HeadJoint'].map(name =>
    animated.json.nodes.findIndex(node => node.name === name)));
for (const animation of animated.json.animations) {
    assert.equal(animation.channels.length, 17, '16 joint rotations plus root translation');
    for (const channel of animation.channels) {
        assert.ok(!stableNodes.has(channel.target.node), `${animation.name}: head uses runtime aim`);
        const sampler = animation.samplers[channel.sampler];
        const output = animated.json.accessors[sampler.output];
        const view = animated.json.bufferViews[output.bufferView];
        const dimensions = output.type === 'VEC4' ? 4 : 3;
        for (let i = 0; i < output.count; i++) {
            const values = Array.from({ length: dimensions }, (_, c) =>
                animated.binary.readFloatLE(view.byteOffset + (i * dimensions + c) * 4));
            assert.ok(values.every(Number.isFinite), `${animation.name}: finite track`);
            if (dimensions === 4) {
                assert.ok(Math.abs(Math.hypot(...values) - 1) < 1e-5,
                    `${animation.name}: normalized quaternion`);
            }
        }
    }
}
const report = JSON.parse(fs.readFileSync(fileURLToPath(
    new URL('./retarget_humanoid.report.json', import.meta.url))));
for (const [name, clip] of Object.entries(report.clips)) {
    assert.ok(clip.minimumSoleHeight >= .0019, `${name}: no sampled boot-sole penetration`);
}
for (const foot of report.clips.Sword_Idle.feet) {
    assert.ok(Math.max(...foot.rangeMetres) < .001, 'Sword guard feet remain planted within1 mm');
}
assert.ok(report.clips.Walk_Loop.maximumKneeFlexionDegrees > 50, 'Walk must articulate knees');
for (const name of ['Sword_Idle', 'Walk_Loop', 'Sword_Attack',
    'Pistol_Idle_Loop', 'Spell_Simple_Idle_Loop', 'Ranged_Bow_Idle', 'Melee_2H_Idle', 'Melee_Unarmed_Idle',
    'Idle_Shield_Loop']) {
    assert.ok(report.clips[name].loopEndpointMaximumJointAngleDegrees < 1,
        `${name}: matching loop/return endpoints`);
}
console.log('Retarget asset gates pass: preserved mesh/skin/sockets, valid quaternion tracks, ' +
    'planted guard feet, knee articulation, floor clearance and loop continuity. Visual review remains required.');
