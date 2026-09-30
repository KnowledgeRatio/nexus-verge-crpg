import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { Group, AnimationMixer, Vector3 } from '../../vendor/three/three.module.min.js';
import { planContact } from '../../src/rendering/CombatContact.js';

it('places the feeding proboscis at human torso height and surface without overlapping bodies', async () => {
    const config = JSON.parse(readFileSync(new URL('../../data/combatScene.json', import.meta.url)));
    const bytes = readFileSync(new URL('../../data/graphics/combat/stirge-v1.glb', import.meta.url));
    const gltf = await new GLTFLoader().parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const appearance = config.appearances.stirge, spec = config.artAssets.models.stirge;
    const source = { id: 'stirge', x: 3, z: 0, radius: appearance.contact.bodyRadius, reach: appearance.contact.reach };
    const target = { id: 'hero', x: 0, z: 0, radius: config.contact.bodyRadius, reach: config.contact.reach };
    const path = planContact(source, target, [source, target], config.contact);
    const destination = path.at(-1);
    const body = new Group(); body.position.set(destination.x, 0, destination.z);
    body.rotation.y = Math.atan2(-destination.x, -destination.z);
    gltf.scene.rotation.set(...spec.modelRotation); body.add(gltf.scene);
    const mixer = new AnimationMixer(gltf.scene);
    mixer.clipAction(gltf.animations.find(clip => clip.name === 'Stirge_Feed')).play();
    mixer.setTime(.3); body.updateMatrixWorld(true);
    const tip = gltf.scene.getObjectByName('StirgeContact').getWorldPosition(new Vector3());
    expect(Math.hypot(tip.x, tip.z)).toBeLessThan(.25);
    expect(tip.y).toBeGreaterThan(1.05);
    expect(tip.y).toBeLessThan(1.5);
    expect(Math.hypot(destination.x, destination.z)).toBeGreaterThan(source.radius + target.radius);
});
