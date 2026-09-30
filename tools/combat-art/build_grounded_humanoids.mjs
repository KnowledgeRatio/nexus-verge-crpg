/** Add grounded action coverage without replacing the creatures' original geometry or clips. */
import fs from 'node:fs';
import { glbDerivative } from './glb_derivative.mjs';
import { authorGroundedMotion } from './author_grounded_motion.mjs';
import { groundedHumanoidRequests, groundedHumanoidProfile } from './grounded_humanoid_profile.mjs';

const specs = JSON.parse(fs.readFileSync('tools/combat-art/groundedHumanoidSpecs.json'));
const config = JSON.parse(fs.readFileSync('data/combatScene.json'));
for (const [id, spec] of Object.entries(specs)) {
    const { data, append, finish } = glbDerivative(spec.source);
    const motion = config.artAssets.models[id].motion;
    await finish(`${id}Grounded`, `tools/combat-art/${id}-grounded-candidate.glb`, model => {
        authorGroundedMotion(data, model, append, groundedHumanoidRequests(motion), {
            arms: ['ArmL', 'ArmR'], hands: ['GripL', 'GripR'], armPrefixes: ['Arm', 'Elbow', 'Grip'],
            recoveryPhase: .3, pitch: -.2, idleSource: motion.idle.clip,
            morphNodes: spec.morphNodes, torsoPitch: spec.torsoPitch, tail: spec.tail
        });
    }, animation => animation.name.startsWith('Ground_'));
    fs.writeFileSync(`tools/combat-art/${id}-grounded-motion.json`,
        JSON.stringify(groundedHumanoidProfile(motion), null, 2) + '\n');
}
