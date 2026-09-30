/** Package anatomical candidates with shared, unchanged CC0 surface textures. */
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { compactSkinnedBuffers } from './compact_skinned_glb.mjs';

const source = 'tools/combat-art/sources/quaternius-base-characters/';
const destination = 'data/graphics/combat/';
fs.mkdirSync(destination + 'textures', { recursive: true });
const requested = process.argv.slice(2);
for (const id of requested.length ? requested : ['ghoul', 'ghast']) {
    const giant = Object.hasOwn(JSON.parse(fs.readFileSync('tools/combat-art/giantBodySpecs.json')), id);
    const clawed = Object.hasOwn(JSON.parse(fs.readFileSync('tools/combat-art/clawedBodySpecs.json')), id);
    if (!clawed && !giant) { throw new Error(`Unknown anatomical model ${id}`); }
    const data = JSON.parse(fs.readFileSync(`tools/combat-art/${id}${giant ? '' : '-anatomical'}-candidate.gltf`));
    const keep = new Set(giant ? ['Sword_Idle', 'Walk_Loop', 'Sword_Attack', 'OverhandThrow', 'Hit_Chest', 'Death01',
        'Hit_Knockback', 'LayToIdle'] :
        ['Crouch_Idle_Loop', 'Crouch_Fwd_Loop', 'Corpse_Bite', 'Corpse_Claw', 'Corpse_Death', 'Corpse_Hit']);
    if (giant) {
        const spec = JSON.parse(fs.readFileSync('tools/combat-art/giantBodySpecs.json'))[id];
        for (const name of spec.extraClips || []) { keep.add(name); }
    }
    for (const node of data.nodes) {
        if (node.name === 'GiantClub') { delete node.mesh; }
    }
    data.animations = data.animations.filter(clip => keep.has(clip.name));
    for (const material of data.materials) {
        if (material.name === 'MI_Hair_1') {
            delete material.normalTexture;
            delete material.pbrMetallicRoughness.baseColorTexture;
            material.pbrMetallicRoughness.baseColorFactor = [.025, .025, .022, 1];
        }
    }
    const slots = [];
    for (const material of data.materials) {
        for (const object of [material, material.pbrMetallicRoughness]) {
            for (const [key, value] of Object.entries(object || {})) {
                if (key.endsWith('Texture') && value?.index !== undefined) { slots.push(value); }
            }
        }
    }
    const textureIds = [...new Set(slots.map(slot => slot.index))];
    const textureMap = new Map(textureIds.map((index, next) => [index, next]));
    slots.forEach(slot => { slot.index = textureMap.get(slot.index); });
    const textures = textureIds.map(index => data.textures[index]);
    const imageIds = [...new Set(textures.map(texture => texture.source))];
    const imageMap = new Map(imageIds.map((index, next) => [index, next]));
    const images = imageIds.map(index => {
        const image = data.images[index];
        if (image.uri?.startsWith('data:image/png;base64,')) {
            const filename = `${id}-authored-${index}.png`;
            fs.writeFileSync(destination + 'textures/' + filename, Buffer.from(image.uri.split(',')[1], 'base64'));
            return { name: image.name, uri: 'textures/' + filename };
        }
        if (!image.uri || image.uri.includes('/') || image.bufferView !== undefined) {
            throw new Error('Expected an unchanged local source PNG');
        }
        const filename = `anatomical-${image.uri}`;
        fs.copyFileSync(source + image.uri, destination + 'textures/' + filename);
        return { ...image, uri: 'textures/' + filename };
    });
    textures.forEach(texture => { texture.source = imageMap.get(texture.source); });
    data.textures = textures;
    // Images are external/shared, so no image bytes participate in buffer compaction.
    delete data.images;
    const chunks = []; let offset = 0;
    data.buffers.forEach((buffer, index) => {
        const bytes = Buffer.from(buffer.uri.split(',')[1], 'base64');
        const padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4); bytes.copy(padded);
        for (const view of data.bufferViews.filter(view => view.buffer === index)) {
            view.buffer = 0; view.byteOffset = (view.byteOffset || 0) + offset;
        }
        chunks.push(padded); offset += padded.length;
    });
    const binary = compactSkinnedBuffers(data, Buffer.concat(chunks));
    data.images = images;
    const encoded = Buffer.from(JSON.stringify(data));
    const json = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32); encoded.copy(json);
    const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
    header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + binary.length, 8);
    header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
    binHeader.writeUInt32LE(binary.length); binHeader.writeUInt32LE(0x004e4942, 4);
    fs.writeFileSync(destination + `${id}-v1.glb`, Buffer.concat([header, json, binHeader, binary]));
}
