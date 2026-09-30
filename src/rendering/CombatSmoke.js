import * as THREE from '../../vendor/three/three.module.min.js';

const MAX_LOBES = 8;

/** Local-space volume: authored lobes describe the silhouette, noise gives it moving edges. */
export function createCombatSmoke(spec) {
    if (!spec.lobes?.length || spec.lobes.length > MAX_LOBES) {
        throw new Error('Smoke volumes require one to eight silhouette lobes.');
    }
    const centers = Array.from({ length: MAX_LOBES }, (_, i) => new THREE.Vector3(...(spec.lobes[i]?.center || [0, 0, 0])));
    const radii = Array.from({ length: MAX_LOBES }, (_, i) => new THREE.Vector3(...(spec.lobes[i]?.radius || [1, 1, 1])));
    const motions = (spec.lobeMotion || []).map(motion => ({ ...motion,
        origin: new THREE.Vector3(...spec.lobes[motion.index].center),
        offsetVector: new THREE.Vector3(...motion.offset),
        baseRadius: new THREE.Vector3(...spec.lobes[motion.index].radius),
        targetRadius: new THREE.Vector3(...spec.lobes[motion.index].radius)
            .multiply(new THREE.Vector3(...(motion.radiusScale || [1, 1, 1])))
    }));
    const material = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.BackSide,
        uniforms: {
            time: { value: 0 },
            sceneDepth: { value: null }, hasDepth: { value: false },
            viewport: { value: new THREE.Vector2(1, 1) }, localFromClip: { value: new THREE.Matrix4() },
            centers: { value: centers }, radii: { value: radii }, count: { value: spec.lobes.length },
            ink: { value: new THREE.Color(spec.color || '#080c10') },
            rim: { value: new THREE.Color(spec.rim || '#71838b') },
            density: { value: spec.density ?? 7 }, opacity: { value: 1 }
        },
        vertexShader: `varying vec3 point;
            void main() { point = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
            varying vec3 point;
            uniform vec3 centers[8], radii[8], ink, rim;
            uniform float time, density, opacity;
            uniform int count;
            uniform sampler2D sceneDepth;
            uniform bool hasDepth;
            uniform vec2 viewport;
            uniform mat4 localFromClip;
            float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
            float noise(vec3 p) {
                vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
                return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
                               mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                           mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                               mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
            }
            float field(vec3 p) {
                vec3 drift = vec3(time*.045, -time*.13, time*.027);
                float n = noise(p*9.0 + drift)*.65 + noise(p*21.0 - drift*.7)*.35;
                float shape = 0.0;
                for (int i=0; i<8; i++) {
                    if (i >= count) break;
                    float d = length((p-centers[i])/radii[i]);
                    shape = max(shape, 1.0-d);
                }
                return smoothstep(-.08, .35, shape-(n-.35)*.55) * smoothstep(0.0,.12,shape);
            }
            void main() {
                vec2 uv=gl_FragCoord.xy/viewport;
                vec4 nearPoint=localFromClip*vec4(uv*2.0-1.0,-1.0,1.0);
                vec3 rayOrigin=nearPoint.xyz/nearPoint.w;
                vec3 ray = normalize(point-rayOrigin);
                vec3 safeRay = mix(vec3(-1),vec3(1),step(vec3(0),ray))*max(abs(ray),vec3(.00001));
                vec3 a = (vec3(-.5)-rayOrigin)/safeRay, b = (vec3(.5)-rayOrigin)/safeRay;
                vec3 lo=min(a,b), hi=max(a,b);
                float nearT=max(max(lo.x,lo.y),lo.z), farT=min(min(hi.x,hi.y),hi.z);
                nearT=max(nearT,0.0);
                if (hasDepth) {
                    float depth=texture2D(sceneDepth,uv).x;
                    vec4 stopPoint=localFromClip*vec4(uv*2.0-1.0,depth*2.0-1.0,1.0);
                    farT=min(farT,dot(stopPoint.xyz/stopPoint.w-rayOrigin,ray));
                }
                if (farT<=nearT) discard;
                float stepSize=(farT-nearT)/48.0;
                vec4 result=vec4(0);
                for (int i=0; i<48; i++) {
                    vec3 p=rayOrigin+ray*(nearT+(float(i)+.5)*stepSize);
                    float d=field(p), alpha=1.0-exp(-d*density*stepSize);
                    float edge=pow(1.0-d,3.0)*.3;
                    vec3 colour=mix(ink,rim,edge);
                    result.rgb+=(1.0-result.a)*alpha*colour;
                    result.a+=(1.0-result.a)*alpha;
                    if (result.a>.99) break;
                }
                if (result.a<.003) discard;
                gl_FragColor=vec4(result.rgb/max(result.a,.0001),result.a*opacity);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }`
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    mesh.name = 'SmokeVolume';
    mesh.scale.fromArray(spec.size);
    mesh.position.fromArray(spec.position);
    const inverse = new THREE.Matrix4();
    mesh.onBeforeRender = (renderer, _scene, camera) => {
        inverse.copy(mesh.matrixWorld).invert();
        material.uniforms.localFromClip.value.copy(inverse).multiply(camera.matrixWorld)
            .multiply(camera.projectionMatrixInverse);
        renderer?.getDrawingBufferSize(material.uniforms.viewport.value);
    };
    return {
        mesh,
        update(seconds, opacity = 1, reach = 0) {
            material.uniforms.time.value = seconds;
            material.uniforms.opacity.value = THREE.MathUtils.clamp(opacity, 0, 1);
            for (const motion of motions) {
                const progress = THREE.MathUtils.clamp(reach, 0, 1);
                centers[motion.index].copy(motion.origin).addScaledVector(motion.offsetVector, progress);
                radii[motion.index].copy(motion.baseRadius).lerp(motion.targetRadius, progress);
            }
        },
        dispose() {
            mesh.geometry.dispose();
            material.dispose();
        }
    };
}

/** Capture opaque depth only when volumes exist; no extra render pass for ordinary encounters. */
export class CombatSmokeDepth {
    constructor() {
        this.target = new THREE.WebGLRenderTarget(1, 1);
        this.target.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
        this.size = new THREE.Vector2();
    }

    render(renderer, scene, camera, volumes) {
        renderer.getDrawingBufferSize(this.size);
        this.target.setSize(this.size.x, this.size.y);
        const hidden = [];
        scene.traverse(node => {
            if (node.visible && node.material && [node.material].flat().some(material => material.transparent)) {
                hidden.push(node); node.visible = false;
            }
        });
        const previous = renderer.getRenderTarget(), shadowUpdate = renderer.shadowMap.autoUpdate;
        try {
            renderer.shadowMap.autoUpdate = false;
            renderer.setRenderTarget(this.target);
            renderer.render(scene, camera);
        } finally {
            renderer.setRenderTarget(previous);
            renderer.shadowMap.autoUpdate = shadowUpdate;
            hidden.forEach(node => {
                node.visible = true;
            });
        }
        for (const volume of volumes) {
            volume.mesh.material.depthTest = false;
            volume.mesh.material.uniforms.sceneDepth.value = this.target.depthTexture;
            volume.mesh.material.uniforms.hasDepth.value = true;
        }
    }

    dispose() {
        this.target.dispose();
    }
}
