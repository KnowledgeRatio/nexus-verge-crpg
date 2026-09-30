/** GLB editing and grounding shared by authored character and creature derivatives. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { Texture, AnimationMixer, LoopOnce, Box3 } from '../../vendor/three/three.module.min.js';

export function glbDerivative(sourcePath = 'data/graphics/combat/traveller-modular.glb') {
    const source = fs.readFileSync(sourcePath);
    const length = source.readUInt32LE(12), data = JSON.parse(source.subarray(20, 20 + length));
    const binary = source.subarray(28 + length), chunks = [binary]; let offset = binary.length;
    function append(values, type = 'VEC3', componentType = 5126) {
        const Type = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[componentType];
        const bytes = Buffer.from(new Type(values).buffer), padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4);
        bytes.copy(padded);
        const bufferView = data.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length }) - 1;
        chunks.push(padded); offset += padded.length;
        const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[type];
        return data.accessors.push({ bufferView, componentType, type, count: values.length / width,
            min: Array.from({ length: width }, (_, axis) => values.reduce((min, value, i) => i % width === axis ? Math.min(min, value) : min, Infinity)),
            max: Array.from({ length: width }, (_, axis) => values.reduce((max, value, i) => i % width === axis ? Math.max(max, value) : max, -Infinity)) }) - 1;
    }
    function read(index) {
        const a = data.accessors[index], view = data.bufferViews[a.bufferView];
        const size = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
        const method = { 5121: 'readUInt8', 5123: 'readUInt16LE', 5125: 'readUInt32LE', 5126: 'readFloatLE' }[a.componentType];
        const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
        return Array.from({ length: a.count * width }, (_, i) => binary[method]((view.byteOffset || 0) +
            (a.byteOffset || 0) + Math.floor(i / width) * (view.byteStride || width * size) + i % width * size));
    }
    async function finish(groundName, output, prepareMotion, shouldGround = () => true) {
        globalThis.ProgressEvent ??= class ProgressEvent {};
        data.buffers[0].byteLength = offset;
        const inspect = JSON.parse(JSON.stringify(data));
        inspect.buffers[0].uri = 'data:application/octet-stream;base64,' + Buffer.concat(chunks).toString('base64');
        let model = await new GLTFLoader().register(() => ({ name: 'authoring-textures',
            loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(JSON.stringify(inspect), '');
        if (prepareMotion) {
            await prepareMotion(model);
            data.buffers[0].byteLength = offset;
            const animated = JSON.parse(JSON.stringify(data));
            animated.buffers[0].uri = 'data:application/octet-stream;base64,' + Buffer.concat(chunks).toString('base64');
            model = await new GLTFLoader().register(() => ({ name: 'authoring-textures',
                loadTexture: () => Promise.resolve(new Texture()) })).parseAsync(JSON.stringify(animated), '');
        }
        const mixer = new AnimationMixer(model.scene), scene = data.scenes[data.scene || 0];
        const ground = data.nodes.push({ name: groundName, children: scene.nodes }) - 1; scene.nodes = [ground];
        for (const animation of data.animations) {
            if (!shouldGround(animation)) { continue; }
            const clip = model.animations.find(candidate => candidate.name === animation.name);
            mixer.stopAllAction(); mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play().clampWhenFinished = true;
            const count = Math.ceil(clip.duration * 60), times = [], positions = [];
            for (let frame = 0; frame <= count; frame++) {
                const time = clip.duration * frame / count;
                mixer.setTime(time); model.scene.updateMatrixWorld(true);
                times.push(time); positions.push(0, .004 - new Box3().setFromObject(model.scene, true).min.y, 0);
            }
            const sampler = animation.samplers.push({ input: append(times, 'SCALAR'), output: append(positions), interpolation: 'LINEAR' }) - 1;
            animation.channels.push({ sampler, target: { node: ground, path: 'translation' } });
        }
        data.buffers[0].byteLength = offset;
        const encoded = Buffer.from(JSON.stringify(data)), json = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32); encoded.copy(json);
        const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
        header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + offset, 8);
        header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
        binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
        fs.writeFileSync(output, Buffer.concat([header, json, binHeader, ...chunks]));
    }
    return { data, read, append, finish };
}
