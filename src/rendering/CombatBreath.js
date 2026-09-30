import * as THREE from '../../vendor/three/three.module.min.js';

/** A directed stream to a resolved recipient; this does not imply area damage. */
export function createCombatBreath(spec) {
    const material = new THREE.ShaderMaterial({
        uniforms: { tint: { value: new THREE.Color(spec.color) },
            opacity: { value: spec.opacity } },
        vertexShader: `varying vec3 viewNormal;
varying vec3 viewPoint;
void main() {
    vec4 point = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    viewPoint = point.xyz;
    viewNormal = normalMatrix * normal;
    gl_Position = projectionMatrix * point;
}`,
        fragmentShader: `uniform vec3 tint;
uniform float opacity;
varying vec3 viewNormal;
varying vec3 viewPoint;
void main() {
    float facing = abs(dot(normalize(viewNormal), normalize(-viewPoint)));
    gl_FragColor = vec4(tint, opacity * pow(facing, 3.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}`,
        transparent: true, depthWrite: false
    });
    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), material, spec.particles);
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return mesh;
}

export function updateCombatBreath(mesh, origin, destination, elapsed, spec) {
    const direction = destination.clone().sub(origin);
    const length = direction.length();
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize());
    const transform = new THREE.Object3D();
    for (let i = 0; i < mesh.count; i++) {
        const emittedAt = i / (mesh.count - 1) * spec.emissionSeconds;
        const age = (elapsed - emittedAt) / spec.travelSeconds;
        const visible = age >= 0 && age <= 1;
        const progress = Math.max(0, Math.min(1, age));
        const radius = spec.radius * (0.35 + 0.65 * progress);
        const angle = i * 2.399963;
        transform.position.set(Math.cos(angle) * radius * progress,
            Math.sin(angle) * radius * progress, progress * length);
        transform.scale.setScalar(visible ? radius * Math.min(1, age * 12, (1 - age) * 12) : 0);
        transform.updateMatrix();
        mesh.setMatrixAt(i, transform.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
}
