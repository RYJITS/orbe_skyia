import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { OrbSettings, ThemeSettings, OrbMode } from '../types';

interface ThreeOrbProps {
    activeVolume: number;
    aiSpeaking: boolean;
    isRecording: boolean;
    theme?: 'plasma' | 'aether';
    settings?: ThemeSettings;
    previewMode?: OrbMode | null;
}

// ==========================================
// UTILS: SIMPLEX NOISE (GLSL)
// ==========================================
const simplexNoiseGLSL = `
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec3 p0 = vec3(b0.xy, h.x);
        vec3 p1 = vec3(b0.zw, h.y);
        vec3 p2 = vec3(b1.xy, h.z);
        vec3 p3 = vec3(b1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
`;

// ==========================================
// THEME: PLASMA (VISCERAL)
// ==========================================
const plasmaShader = {
    vertexShader: `
        varying vec3 vNorm;
        varying vec3 vWorldPos;
        varying float vVoiceHeat;
        uniform float uTime;
        uniform float uIntensity;
        uniform float uWaviness;
        ${simplexNoiseGLSL}

        vec3 displace(vec3 p) {
            float t = uTime * 0.15;
            float val = 0.0, amp = 0.5, f = 1.3 * uWaviness;
            for(int i=0; i<5; i++){
                float n = snoise(p * f + t);
                float ridge = 1.0 - abs(n);
                val += amp * pow(ridge, 1.9);
                f *= 2.15; amp *= 0.45;
            }
            float ridgeNoise = val;
            
            float voice = uIntensity * 1.8 * snoise(p * 1.5 * uWaviness + t);
            float totalDisp = ridgeNoise * 0.45 + voice;
            return p + normalize(p) * totalDisp;
        }

        void main() {
            vec3 pos = position;
            vec3 dPos = displace(pos);
            vVoiceHeat = uIntensity;
            
            float eps = 0.005;
            vec3 tang = normalize(cross(normal, vec3(0.0,1.0,0.0)));
            if(length(tang)<0.1) tang = normalize(cross(normal, vec3(1.0,0.0,0.0)));
            vec3 bitan = cross(normal, tang);
            vec3 pA = displace(pos + tang * eps);
            vec3 pB = displace(pos + bitan * eps);
            vNorm = normalMatrix * normalize(cross(pA - dPos, pB - dPos));
            
            vWorldPos = (modelMatrix * vec4(dPos, 1.0)).xyz;
            gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uBrightness;
        varying vec3 vNorm;
        varying vec3 vWorldPos;
        varying float vVoiceHeat;

        void main() {
            vec3 V = normalize(cameraPosition - vWorldPos);
            vec3 N = normalize(vNorm);
            float fres = clamp(dot(V, N), 0.0, 1.0);
            float rim = pow(1.0 - fres, 2.5);
            
            vec3 baseCol = uColor * 0.2;
            vec3 brightCol = mix(uColor, vec3(1.0), 0.7);
            
            vec3 col = mix(baseCol, brightCol, rim * (1.2 + vVoiceHeat * 3.0));
            col += brightCol * rim * (0.8 + uIntensity * 2.5);
            
            // Specular highlights
            vec3 L1 = normalize(vec3(1.0, 1.5, 2.0));
            vec3 H1 = normalize(L1 + V);
            float s1 = pow(max(dot(N, H1), 0.0), 40.0);
            col += vec3(0.9, 0.95, 1.0) * s1 * (2.0 + uIntensity * 4.0) * uBrightness;
            
            gl_FragColor = vec4(col * uBrightness, 1.0);
        }
    `
};

// ==========================================
// THEME: AETHER (FUTURISTIC)
// ==========================================
const aetherCoreShader = {
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        uniform float uTime;
        uniform float uIntensity;
        uniform float uWaviness;
        ${simplexNoiseGLSL}

        void main() {
            vNormal = normalize(normalMatrix * normal);
            vec3 pos = position;
            float n = snoise(pos * (1.8 * uWaviness) + uTime * 0.4);
            pos += normal * n * (0.1 + uIntensity * 0.5);
            vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uBrightness;
        uniform float uTime;

        void main() {
            vec3 V = normalize(cameraPosition - vWorldPos);
            float fres = pow(1.0 - dot(vNormal, V), 3.0);
            
            // Volumetric energy patterns
            float pulse = 0.5 + 0.5 * sin(uTime * 2.0 + length(vWorldPos) * 1.5);
            vec3 color = mix(uColor, vec3(0.0, 1.0, 1.0), fres * 0.8);
            color = mix(color, vec3(1.0), fres * uIntensity * 0.5);
            
            float alpha = (0.3 + uIntensity * 0.4) * (fres + 0.5);
            gl_FragColor = vec4(color * uBrightness * (1.0 + fres * 2.0), clamp(alpha, 0.0, 1.0));
        }
    `
};

const futuristicRingShader = {
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uColor;
        uniform float uSpeed;

        void main() {
            vec2 uv = vUv - 0.5;
            float r = length(uv);
            
            // Neon segments
            float angle = atan(uv.y, uv.x);
            float s = step(0.1, abs(r - 0.35));
            float segments = step(0.6, sin(angle * 8.0 + uTime * uSpeed));
            float ring = smoothstep(0.015, 0.0, abs(r - 0.35));
            
            vec3 col = uColor * ring * (0.5 + segments);
            col *= (1.0 + uIntensity * 2.0);
            gl_FragColor = vec4(col, ring * (0.3 + segments * 0.7) * (0.4 + uIntensity * 0.6));
        }
    `
};

// ==========================================
// COMPONENTS
// ==========================================

const PlasmaOrb: React.FC<{ uniforms: any, coreSize?: number }> = ({ uniforms, coreSize = 1.0 }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state, delta) => {
        if (!meshRef.current) return;
        meshRef.current.rotation.y += delta * 0.2;
    });

    return (
        <group scale={coreSize}>
            <mesh ref={meshRef}>
                <icosahedronGeometry args={[1.6, 64]} />
                <shaderMaterial
                    uniforms={uniforms}
                    vertexShader={plasmaShader.vertexShader}
                    fragmentShader={plasmaShader.fragmentShader}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {/* Inner Heat Glow */}
            <mesh scale={0.7}>
                <icosahedronGeometry args={[1.6, 32]} />
                <shaderMaterial
                    uniforms={uniforms}
                    vertexShader={plasmaShader.vertexShader}
                    fragmentShader={plasmaShader.fragmentShader}
                    transparent
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>
        </group>
    );
};

const OrbitalRing: React.FC<{ radius: number, speed: number, rotation: [number, number, number], uniforms: any }> = ({ radius, speed, rotation, uniforms }) => {
    const ref = useRef<THREE.Group>(null);
    const ringUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uColor: { value: new THREE.Color() },
        uSpeed: { value: speed }
    }), [speed]);

    useFrame((state, delta) => {
        if (!ref.current) return;
        ref.current.rotation.z += delta * speed * 0.5;
        ringUniforms.uTime.value = state.clock.elapsedTime;
        ringUniforms.uIntensity.value = uniforms.uIntensity.value;
        ringUniforms.uColor.value.copy(uniforms.uColor.value);
    });

    return (
        <group ref={ref} rotation={rotation}>
            <mesh scale={radius * 5}>
                <planeGeometry args={[1, 1]} />
                <shaderMaterial
                    uniforms={ringUniforms}
                    vertexShader={futuristicRingShader.vertexShader}
                    fragmentShader={futuristicRingShader.fragmentShader}
                    transparent
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
};

const AetherOrb: React.FC<{ uniforms: any, coreSize?: number }> = ({ uniforms, coreSize = 1.0 }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const pointsRef = useRef<THREE.Points>(null);

    const particles = useMemo(() => {
        const count = 400;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const phi = Math.acos(-1 + (2 * i) / count);
            const theta = Math.sqrt(count * Math.PI) * phi;
            const r = 2.5 + Math.random() * 0.5;
            pos[i * 3] = r * Math.cos(theta) * Math.sin(phi);
            pos[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
            pos[i * 3 + 2] = r * Math.cos(phi);
        }
        return pos;
    }, []);

    useFrame((state, delta) => {
        if (!meshRef.current || !pointsRef.current) return;
        meshRef.current.rotation.y += delta * 0.15;
        pointsRef.current.rotation.y -= delta * 0.1;
        pointsRef.current.scale.setScalar(1 + uniforms.uIntensity.value * 0.2);
    });

    return (
        <group scale={coreSize}>
            {/* Neural Core */}
            <mesh ref={meshRef}>
                <icosahedronGeometry args={[1.5, 48]} />
                <shaderMaterial
                    uniforms={uniforms}
                    vertexShader={aetherCoreShader.vertexShader}
                    fragmentShader={aetherCoreShader.fragmentShader}
                    transparent
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>
            
            {/* Starfield Particles */}
            <points ref={pointsRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={particles.length / 3}
                        array={particles}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={0.05}
                    color={uniforms.uColor.value}
                    transparent
                    blending={THREE.AdditiveBlending}
                    opacity={0.6}
                    sizeAttenuation
                />
            </points>

            {/* Futuristic Orbital System */}
            <OrbitalRing radius={1.2} speed={1.5} rotation={[Math.PI / 2.5, 0, 0]} uniforms={uniforms} />
            <OrbitalRing radius={1.4} speed={-0.8} rotation={[Math.PI / -3, 0.5, 0]} uniforms={uniforms} />
        </group>
    );
};

// ==========================================
// DEFAULTS
// ==========================================

const defaultOrbSettings: OrbSettings = {
    amplitude: 1.0,
    density: 1250,
    speed: 0.3,
    size: 2.2,
    bloom: 0.8,
    opacity: 0.8,
    contrast: 1.0,
    brightness: 1.0,
    coreSize: 0.65,
    waviness: 0.6,
    lightPos: { x: 5, y: 5, z: 5 },
    color: '#00d2ff'
};

const defaultThemeSettings: ThemeSettings = {
    idle: defaultOrbSettings,
    user: { ...defaultOrbSettings, color: '#2892B8', amplitude: 1.6 },
    ai: { ...defaultOrbSettings, color: '#ff4400', amplitude: 2.2 }
};

// ==========================================
// CORE RENDERER
// ==========================================

const OrbContent: React.FC<ThreeOrbProps> = ({ activeVolume, aiSpeaking, isRecording, theme = 'plasma', settings = defaultThemeSettings, previewMode = null }) => {
    const groupRef = useRef<THREE.Group>(null);
    const currentColor = useRef(new THREE.Color('#00d2ff'));
    const targetIntensity = useRef(0);
    
    const currentSettings = useRef<OrbSettings>({ ...defaultOrbSettings });
    const mode: OrbMode = previewMode || (aiSpeaking ? 'ai' : (isRecording ? 'user' : 'idle'));

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uIntensity: { value: 0.1 },
        uColor: { value: new THREE.Color('#00d2ff') },
        uOpacity: { value: 1.0 },
        uBrightness: { value: 1.0 },
        uWaviness: { value: 1.0 }
    }), []);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        const sMap = settings as ThemeSettings;
        const target = sMap[mode] || defaultOrbSettings;

        // Smooth interpolation
        const lerpFactor = delta * 4;
        currentSettings.current.amplitude = THREE.MathUtils.lerp(currentSettings.current.amplitude, target.amplitude, lerpFactor);
        currentSettings.current.speed = THREE.MathUtils.lerp(currentSettings.current.speed, target.speed, lerpFactor);
        currentSettings.current.size = THREE.MathUtils.lerp(currentSettings.current.size, target.size, lerpFactor);
        currentSettings.current.opacity = THREE.MathUtils.lerp(currentSettings.current.opacity, target.opacity, lerpFactor);
        currentSettings.current.brightness = THREE.MathUtils.lerp(currentSettings.current.brightness, target.brightness, lerpFactor);
        currentSettings.current.coreSize = THREE.MathUtils.lerp(currentSettings.current.coreSize, target.coreSize, lerpFactor);
        currentSettings.current.waviness = THREE.MathUtils.lerp(currentSettings.current.waviness, target.waviness, lerpFactor);

        const tColor = new THREE.Color(target.color);
        currentColor.current.lerp(tColor, lerpFactor);
        uniforms.uColor.value.copy(currentColor.current);

        const s = currentSettings.current;
        uniforms.uTime.value = state.clock.elapsedTime * (s.speed / 0.3);
        uniforms.uOpacity.value = s.opacity;
        uniforms.uBrightness.value = s.brightness;
        uniforms.uWaviness.value = s.waviness;

        const baseRipple = (aiSpeaking || isRecording) ? 0.2 : 0.05;
        targetIntensity.current = (baseRipple + activeVolume * 1.5) * s.amplitude;
        uniforms.uIntensity.value = THREE.MathUtils.lerp(uniforms.uIntensity.value, targetIntensity.current, delta * 8);

        const targetScale = (aiSpeaking || isRecording) ? 1.0 + (activeVolume * 0.3 * s.amplitude) : 0.95;
        groupRef.current.scale.setScalar(targetScale * (s.size / 2.0));
    });

    return (
        <group ref={groupRef}>
            {theme === 'plasma' && <PlasmaOrb uniforms={uniforms} coreSize={currentSettings.current.coreSize} />}
            {theme === 'aether' && <AetherOrb uniforms={uniforms} coreSize={currentSettings.current.coreSize} />}
        </group>
    );
};

const ThreeOrb: React.FC<ThreeOrbProps> = (props) => {
    const themeSettings = props.settings || defaultThemeSettings;
    const mode: OrbMode = props.previewMode || (props.aiSpeaking ? 'ai' : (props.isRecording ? 'user' : 'idle'));
    const active = themeSettings[mode] || defaultOrbSettings;

    return (
        <div className="absolute inset-0 w-full h-full z-0 cursor-pointer pointer-events-none -translate-y-16 md:translate-y-0">
            <Canvas 
                gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }} 
                camera={{ position: [0, 0, 10], fov: 45 }}
                dpr={[1, 2]}
            >
                <ambientLight intensity={0.4} />
                <pointLight position={[active.lightPos.x, active.lightPos.y, active.lightPos.z]} intensity={1.5} color={active.color} />
                <OrbContent {...props} settings={themeSettings} />
                <EffectComposer enableNormalPass={false}>
                    <Bloom luminanceThreshold={0.4} intensity={active.bloom} radius={0.6} />
                </EffectComposer>
            </Canvas>
        </div>
    );
};

export default ThreeOrb;
