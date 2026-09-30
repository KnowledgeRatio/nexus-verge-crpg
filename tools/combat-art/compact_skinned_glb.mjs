/** Keep only buffers reachable from a mesh, skin or animation in an untextured authored GLB. */
import { Buffer } from 'node:buffer';

export function compactSkinnedBuffers(data, binary) {
    if (data.images?.length) { throw new Error('Textured GLBs need image-aware buffer compaction'); }
    const referenced = new Set();
    for (const mesh of data.meshes) {
        for (const primitive of mesh.primitives) {
            Object.values(primitive.attributes).forEach(index => referenced.add(index));
            if (primitive.indices !== undefined) { referenced.add(primitive.indices); }
            for (const target of primitive.targets || []) {
                Object.values(target).forEach(index => referenced.add(index));
            }
        }
    }
    for (const skin of data.skins) {
        if (skin.inverseBindMatrices !== undefined) { referenced.add(skin.inverseBindMatrices); }
    }
    for (const animation of data.animations) {
        for (const sampler of animation.samplers) { referenced.add(sampler.input); referenced.add(sampler.output); }
    }
    const accessors = [...referenced].map(index => data.accessors[index]);
    if (accessors.some(accessor => accessor.sparse)) { throw new Error('Sparse accessor compaction is unsupported'); }
    const ids = new Map([...referenced].map((old, next) => [old, next]));
    for (const mesh of data.meshes) {
        for (const primitive of mesh.primitives) {
            for (const attributes of [primitive.attributes, ...(primitive.targets || [])]) {
                for (const key of Object.keys(attributes)) { attributes[key] = ids.get(attributes[key]); }
            }
            if (primitive.indices !== undefined) { primitive.indices = ids.get(primitive.indices); }
        }
    }
    for (const skin of data.skins) {
        if (skin.inverseBindMatrices !== undefined) { skin.inverseBindMatrices = ids.get(skin.inverseBindMatrices); }
    }
    for (const animation of data.animations) {
        for (const sampler of animation.samplers) {
            sampler.input = ids.get(sampler.input); sampler.output = ids.get(sampler.output);
        }
    }
    const views = [], chunks = [], viewIds = new Map();
    let offset = 0;
    for (const accessor of accessors) {
        const old = accessor.bufferView;
        if (!viewIds.has(old)) {
            const view = data.bufferViews[old], begin = view.byteOffset || 0;
            const bytes = Buffer.alloc(Math.ceil(view.byteLength / 4) * 4);
            binary.copy(bytes, 0, begin, begin + view.byteLength);
            viewIds.set(old, views.length);
            views.push({ ...view, buffer: 0, byteOffset: offset });
            chunks.push(bytes); offset += bytes.length;
        }
        accessor.bufferView = viewIds.get(old);
    }
    data.accessors = accessors; data.bufferViews = views; data.buffers = [{ byteLength: offset }];
    return Buffer.concat(chunks);
}
