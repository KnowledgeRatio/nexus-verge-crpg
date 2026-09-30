/** Measure an imported rig across complete clips; results are evidence, not visual acceptance. */
import fs from 'node:fs';
import process from 'node:process';
import console from 'node:console';
import { createHash } from 'node:crypto';
import { AnimationMixer, Box3, LoopOnce, Vector3 } from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';

const sourcePath = process.argv[2];
if (!sourcePath) {
    throw new Error('Usage: node tools/combat-art/audit_creature.mjs path/to/embedded.gltf');
}
const bytes = fs.readFileSync(sourcePath);
const json = JSON.parse(bytes.toString('utf8'));
if ((json.buffers || []).some(buffer => !buffer.uri?.startsWith('data:')) || json.images?.length) {
    throw new Error('This offline audit accepts embedded-buffer glTF with no image dependencies.');
}
globalThis.ProgressEvent ??= class ProgressEvent {
    constructor(type, properties) {
        this.type = type;
        Object.assign(this, properties);
    }
};
const asset = await new GLTFLoader().parseAsync(bytes.toString('utf8'), '');
const model = asset.scene;
const mixer = new AnimationMixer(model);
const rest = new Box3().setFromObject(model, true);
const sampleRate = 30;
const clips = [];
for (const clip of asset.animations) {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.reset().setLoop(LoopOnce, 1).play();
    action.clampWhenFinished = true;
    const envelope = new Box3();
    const samples = Math.max(1, Math.ceil(clip.duration * sampleRate));
    let lowestSurface = Infinity;
    let highestLowestSurface = -Infinity;
    for (let index = 0; index <= samples; index++) {
        mixer.setTime(index / samples * clip.duration);
        model.updateMatrixWorld(true);
        // Precise bounds evaluate skinned vertices; cached mesh bounds describe only one pose.
        const bounds = new Box3().setFromObject(model, true);
        envelope.union(bounds);
        lowestSurface = Math.min(lowestSurface, bounds.min.y);
        highestLowestSurface = Math.max(highestLowestSurface, bounds.min.y);
    }
    clips.push({ name: clip.name, seconds: clip.duration, samples: samples + 1,
        minimum: envelope.min.toArray(), maximum: envelope.max.toArray(),
        lowestSurface, highestLowestSurface });
}
console.log(JSON.stringify({ sourcePath, sha256: createHash('sha256').update(bytes).digest('hex'),
    units: 'Uncalibrated source units; do not treat as metres.', sampleRate,
    interpretation: 'Bounds include tails/ears and air phases. They do not prove planted-foot stability or contact quality.',
    rest: { minimum: rest.min.toArray(), maximum: rest.max.toArray(), size: rest.getSize(new Vector3()).toArray() },
    clips }, null, 2));
