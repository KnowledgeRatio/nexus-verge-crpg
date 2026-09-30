/** Original lower tusks and hammered shoulder plates on the shared anatomical rig. */
import { ConeGeometry, SphereGeometry } from '../../vendor/three/three.module.min.js';

export function addOrcFeatures(data, { append, skin, inverse }) {
    const tooth = data.materials.push({ name: 'Orc worn ivory',
        pbrMetallicRoughness: { baseColorFactor: [.55, .49, .34, 1], metallicFactor: 0, roughnessFactor: .8 } }) - 1;
    const iron = data.materials.push({ name: 'Orc hammered iron',
        pbrMetallicRoughness: { baseColorFactor: [.12, .13, .12, 1], metallicFactor: .65, roughnessFactor: .75 } }) - 1;
    function attach(name, jointName, geometry, material) {
        const joint = data.nodes.findIndex(node => node.name === jointName);
        geometry.applyMatrix4(inverse[skin.joints.indexOf(joint)]);
        const flat = geometry.toNonIndexed();
        const mesh = data.meshes.push({ name, primitives: [{ material, attributes: {
            POSITION: append([...flat.attributes.position.array]), NORMAL: append([...flat.attributes.normal.array])
        } }] }) - 1;
        const node = data.nodes.push({ name, mesh }) - 1;
        (data.nodes[joint].children ||= []).push(node);
        flat.dispose(); geometry.dispose();
    }
    for (const sign of [-1, 1]) {
        attach(`OrcTusk${sign}`, 'Head', new ConeGeometry(.012, .065, 8)
            .rotateX(.2).rotateZ(-sign * .16).translate(sign * .046, 1.64, .105), tooth);
        // Shallow caps retain clearance around the upper arm in the shared swings.
        attach(`OrcShoulder${sign}`, sign > 0 ? 'upperarm_l' : 'upperarm_r',
            new SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI * .55)
                .scale(.13, .065, .14).translate(sign * .26, 1.46, -.025), iron);
    }
}
