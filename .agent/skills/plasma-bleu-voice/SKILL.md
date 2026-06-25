---
name: plasma-bleu-voice
description: Crée une orbe plasma bleue volumétrique réactive à la voix utilisant Three.js + GLSL custom. L'orbe est translucide avec des filaments d'énergie internes visibles, des anneaux orbitaux runiques, et un noyau central lumineux. La surface et l'énergie interne réagissent en temps réel aux intonations vocales.
---

# Créateur d'Orbe Plasma Bleue Volumétrique (WebGL + Voice Reactive)

## Quand utiliser ce skill
- L'utilisateur demande une **orbe bleue** / **plasma bleu** / **energy orb** réactive à la voix.
- Le style visuel souhaité ressemble à une sphère d'énergie translucide avec des filaments plasma internes, un noyau blanc-cyan central, et des anneaux orbitaux (style arcanique/futuriste).
- 100% WebGL (Three.js + GLSL custom), aucun SVG/HUD.

## L'Architecture (Volumetric Plasma Orb)

### 1. Capture Audio (Web Audio API)
- `navigator.mediaDevices.getUserMedia({ audio: true })` pour le microphone.
- `AnalyserNode` avec FFT 2048, smoothing 0.82.
- **3 bandes de fréquence** :
  - **Basses** (0–8%) → grosses déformations de surface + pulse des anneaux
  - **Médiums** (8–35%) → variation plasma interne + détails de surface
  - **Aigus** (35–70%) → micro-crépitements + finesse des filaments
- Lissage exponentiel (lerp 0.12).

### 2. Approche Volumétrique (CLEF du style)
L'orbe n'est **PAS** une sphère opaque. Elle est constituée de **couches translucides superposées** :

| Couche | Géométrie | Rayon | Alpha | Rôle |
|--------|-----------|-------|-------|------|
| Inner plasma | IcosahedronGeometry(0.7, 48) | 0.7 | 0.05–0.45 | Plasma chaotique interne + vortex |
| Outer shell | IcosahedronGeometry(1.0, 64) | 1.0 | 0.05–0.75 | Coque plasma principale avec filaments |
| Core center | IcosahedronGeometry(0.08, 8) | 0.08 | MeshBasic | Point central brillant |
| Core glow | Sprite (CanvasTexture gradient) | 1.2 | Additive | Halo central radial |
| Atmospheric haze | IcosahedronGeometry(1.6, 16) | 1.6 | BackSide | Fresnel atmosphérique subtil |

**IMPORTANT** : Toutes les couches plasma utilisent :
- `transparent: true, depthWrite: false`
- `side: THREE.DoubleSide`
- `blending: THREE.AdditiveBlending`

### 3. Vertex Shader (Displacement)
- **Simplex Noise 3D** (Ashima/Gustavson) + **FBM** 4 octaves.
- **3 couches de displacement** :
  - FBM basse fréquence (p*2.0) × 0.15 → forme organique lente
  - Snoise moyenne fréquence (p*3.5) × 0.08 → détails
  - Snoise haute fréquence (p*5.5) × 0.04 → micro-texture
- Chaque couche est modulée par sa bande audio respective.

### 4. Fragment Shader (Coloration Plasma)
- **Palette de couleurs** :
  - Void : `(0.0, 0.01, 0.04)` — noir absolu
  - Deep blue : `(0.0, 0.05, 0.15)`
  - Mid blue : `(0.0, 0.12, 0.35)`
  - Cyan : `(0.0, 0.35, 0.55)`
  - Bright cyan : `(0.1, 0.6, 0.85)`
  - Hot white : `(0.6, 0.85, 1.0)` — pour le core uniquement
- **Méthode de coloration** : `mix()` exclusivement, **JAMAIS** `+=` pour les couleurs.
  Cela empêche la saturation blanche.
- **Alpha variable** : `alpha = 0.15 + fresnel*0.55 + tendrils*0.2 + pi*0.15`
  Les bords sont lumineux, le centre est plus transparent → effet volumétrique.
- **Clamp final** : `col = clamp(col, 0.0, 1.0)` en sécurité.

### 5. Anneaux Orbitaux (4 anneaux)
- `TorusGeometry` avec shaders custom.
- Motifs segmentés + symboles runiques (boucle de `sin()` avec fréquences variées).
- Chaque anneau a un tilt (rotation X/Z) et une vitesse différente.
- Réactifs aux basses et médiums.

### 6. Éléments Additionnels
- **400 particules orbitales** : distribution sphérique, taille réactive au volume.
- **Éclairs procéduraux** : CatmullRomCurve3 + TubeGeometry, spawn rate réactif à la voix.
- **Sprite de glow central** : CanvasTexture avec gradient radial cyan→transparent.

### 7. Post-Processing
- **ACES Filmic Tone Mapping** (exposure 1.0).
- **UnrealBloomPass** : strength 0.6–1.2 (dynamique), radius 0.6, threshold 0.35.
- **IMPORTANT** : Ne **JAMAIS** utiliser `NoToneMapping` avec des couleurs additives — cela cause le blowout blanc.

## Flux de travail
- [ ] Étape 1 : Copier `examples/blue_plasma_voice_orb.html` comme base.
- [ ] Étape 2 : Ajuster la palette de couleurs si besoin (modifier les `vec3` dans le fragment shader).
- [ ] Étape 3 : Ajuster la taille (camera.position.z et rayons des géométries).
- [ ] Étape 4 : Ajuster le bloom (strength, radius, threshold).
- [ ] Étape 5 : Tester avec le microphone.

## Paramètres de référence
- *Camera Z* : 5.0 (orbe occupe ~40% du viewport).
- *Shell subdivisions* : 64 (outer), 48 (inner).
- *Bloom* : strength 0.6–1.2, radius 0.6, threshold 0.35.
- *Vitesse rotation* : 0.08 rad/s (shell), 0.12 rad/s (inner, sens inverse).
- *Lerp audio* : 0.12.

## Sauvegarde Validée
- Point de référence fonctionnel : `examples/blue_plasma_voice_orb.html`.
