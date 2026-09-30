import * as THREE from '../../vendor/three/three.module.min.js';

/** Recolour an instance material while retaining the source texture's shading detail. */
export function applyCombatMaterialPalette(material, palette) {
    const previousCompile = material.onBeforeCompile;
    const previousKey = material.customProgramCacheKey();
    material.onBeforeCompile = shader => {
        previousCompile.call(material, shader);
        Object.assign(shader.uniforms, {
            combatPaletteShadow: { value: new THREE.Color(palette.shadow) },
            combatPaletteLight: { value: new THREE.Color(palette.light) },
            combatPaletteCurve: { value: palette.curve ?? 1 },
            combatPaletteStrength: { value: palette.strength ?? 1 },
            combatPaletteKeepWarm: { value: palette.keepWarmHighlights ? 1 : 0 }
        });
        const declarations = `uniform vec3 combatPaletteShadow;
uniform vec3 combatPaletteLight;
uniform float combatPaletteCurve;
uniform float combatPaletteStrength;
uniform float combatPaletteKeepWarm;
`;
        const fragment = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
vec3 combatOriginal = diffuseColor.rgb;
float combatLuma = dot(combatOriginal, vec3(0.2126, 0.7152, 0.0722));
float combatTone = pow(clamp(combatLuma, 0.0, 1.0), combatPaletteCurve);
vec3 combatRecoloured = mix(combatPaletteShadow, combatPaletteLight, combatTone);
float combatWarm = smoothstep(0.48, 0.65, combatOriginal.g / max(combatOriginal.r, 0.0001))
    * (1.0 - smoothstep(0.95, 1.05, combatOriginal.g / max(combatOriginal.r, 0.0001)))
    * smoothstep(1.3, 2.0, combatOriginal.g / max(combatOriginal.b, 0.0001))
    * smoothstep(0.06, 0.2, combatLuma);
diffuseColor.rgb = mix(combatOriginal, combatRecoloured,
    combatPaletteStrength * (1.0 - combatWarm * combatPaletteKeepWarm));`);
        shader.fragmentShader = `${declarations}${fragment}`;
    };
    material.customProgramCacheKey = () => `${previousKey}:combatPalette:v1`;
    material.needsUpdate = true;
}
