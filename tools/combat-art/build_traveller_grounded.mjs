/** Grounded armed poses on the modular player rig, using the shared offline authoring path. */
import fs from 'node:fs';
import { glbDerivative } from './glb_derivative.mjs';
import { authorGroundedMotion } from './author_grounded_motion.mjs';
import { groundedHumanoidRequests } from './grounded_humanoid_profile.mjs';

const { data, append, finish } = glbDerivative('data/graphics/combat/traveller-modular.glb');
const config = JSON.parse(fs.readFileSync('data/combatScene.json'));
const motion = config.artAssets.models.traveller.motion;
const requests = groundedHumanoidRequests(motion);
await finish('TravellerGround', 'tools/combat-art/traveller-grounded-candidate.glb', model => {
    authorGroundedMotion(data, model, append, requests, {
        arms: ['ArmL', 'ArmR'], hands: ['GripL', 'GripR'], armPrefixes: ['Arm', 'Elbow', 'Grip'],
        recoveryPhase: .3, pitch: -.2
    });
}, animation => animation.name.startsWith('Ground_'));
