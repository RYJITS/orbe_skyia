---
name: vague-violet
description: Crée une orbe plasma violet réactive à la voix utilisant du WebGL pur (Three.js + GLSL custom). La surface se déforme en temps réel selon les intonations vocales captées par le microphone.
---

# Créateur d'Orbe Vague Violet (WebGL + Voice Reactive)

## Quand utiliser ce skill
- L'utilisateur demande une orbe "réactive à la voix", "voice reactive", "qui réagit au son", ou "qui pulse avec le micro".
- Le rendu souhaité est une sphère 3D organique de type métal liquide violet/indigo avec des arêtes tranchantes qui se déforment en fonction des fréquences vocales.
- Aucun HUD/SVG — 100% WebGL pur.

## L'Architecture (Voice Reactive Liquid Metal)

### 1. Capture Audio (Web Audio API)
- `navigator.mediaDevices.getUserMedia({ audio: true })` pour accéder au microphone.
- `AnalyserNode` avec FFT 512, smoothing 0.8.
- Extraction de **3 bandes de fréquence** :
  - **Basses** (0–8% du spectre) → grosses vagues lentes
  - **Médiums** (8–35%) → détails moyens + shift couleur
  - **Aigus** (35–75%) → micro-crépitements rapides
- Lissage exponentiel (lerp factor 0.14) pour transitions fluides.

### 2. Géométrie (Three.js)
- `IcosahedronGeometry(1.6, 180)` — sphère extrêmement haute définition.
- Un seul `ShaderMaterial` custom (vertex + fragment GLSL).

### 3. Vertex Shader (Displacement)
- **Bruit Simplex 3D** (Ashima/Gustavson) classique.
- **FBM à ridges inversées** : `ridge = 1.0 - abs(noise)` puis `pow(ridge, 1.9)` — crée des arêtes tranchantes organiques.
- **Réactivité vocale** superposée :
  - Basses → `fbmSmooth(p * 0.7)` amplitude forte (0.60)
  - Médiums → `snoise(p * 2.8)` amplitude moyenne (0.35)
  - Aigus → `snoise(p * 6.0)` amplitude fine (0.20)
- **Normales recalculées** via dérivées partielles (epsilon = 0.004) pour un éclairage fidèle.

### 4. Fragment Shader (Éclairage)
- **Fresnel multicouche** : rim light (puissance 2.8) + edge fire (puissance 6.0).
- **3 lumières spéculaires** Phong avec puissances 80/50/35 pour l'effet "métal humide".
- **Palette de couleurs** :
  - Deep : `#04020B` (noir violet abyssal)
  - Mid : `#1E0F45` (indigo sombre)
  - Bright : `#8055FF` (violet vif — shift dynamique HSL sur la voix)
  - Spec : `#00F5FF` (cyan incandescent — shift sur les aigus)
- **Voice boost** : les couleurs bright/spec sont dynamiquement modifiées via `setHSL()` selon les bandes audio.

### 5. Éléments additionnels
- **Glow Shell** : BackSide sphere additive (opacity 0.03 → 0.18 sur la voix).
- **Halo de fond** : Plane avec radial gradient canvas texture, additive blending.
- **3000 particules orbitales** : distribution sphérique, vitesse + rayon réactifs au volume.

## Flux de travail (Workflow)
- [ ] Étape 1 : Copier `examples/voice_reactive_orb.html` comme base.
- [ ] Étape 2 : Ajuster la palette de couleurs (uniforms `uClrDeep`, `uClrMid`, `uClrBright`, `uClrSpec`).
- [ ] Étape 3 : Ajuster la sensibilité micro (facteurs d'amplitude dans le vertex shader).
- [ ] Étape 4 : Ajuster le nombre de particules et la tessellation si besoin de performance.
- [ ] Étape 5 : Tester avec le microphone pour valider la réactivité.

## Paramètres de référence
- *Tessellation* : 180 subdivisions (baisser à 120 si performances insuffisantes).
- *Vitesse de base* : 0.15 (lente, hypnotique).
- *Amplitude de base* : 0.40 (avant voix).
- *Lerp audio* : 0.14 (lissage doux mais réactif).

## Sauvegarde Validée
- Point de référence fonctionnel : `examples/voice_reactive_orb.html`.
