---
name: designing-plasma-orb
description: Creates a highly detailed, abstract, visceral, voice-reactive plasma orb using advanced WebGL 3D displacement shaders. Focuses on organic, fluid motion and high-fidelity energy effects without HUD overlays.
---

# Créateur d'Orbe Plasma Viscéral (WebGL Shader Pur & Réactif)

## Quand utiliser ce skill
- Le système demande une orbe "fluide", "organique", "vivante", "réactive à la voix", ou partage la référence "dribbble liquid metal".
- Le but est d'obtenir une sphère 3D avec des crêtes prononcées, se comportant comme du plasma dense ou du métal liquide en fusion.
- AUCUN élément d'interface (HUD), texte ou anneau technologique n'est souhaité. L'esthétique est purement abstraite et sensorielle.

## L'Architecture (Voice-Reactive Visceral Shader)
Pour reproduire ce rendu organique exceptionnel :
1. **Moteur Audio (Web Audio API)** : Analyse en temps réel des fréquences (Basses, Mediums, Aigus) et du volume global pour piloter les paramètres du shader.
2. **Vertex Displacement (Crêtes & Chaleur)** :
    - Déplacement basé sur un bruit fractal FBM (Ridged Noise) : `ridge = pow(1.0 - abs(noise), 1.9)`.
    - Injection de "chaleur vocale" (Voice Heat) : les fréquences audio déforment physiquement la géométrie et augmentent localement l'amplitude des crêtes.
3. **Fragment Shader (Rendu Physique Abstrait)** :
    - **Fresnel / Rim Lighting** : Illumination satinée des bords.
    - **Multi-point Specular** : Triple source de lumière spéculaire pour un aspect "métal mouillé".
    - **Dynamic Color Shift** : Les fréquences hautes (Aigus) injectent du cyan et du blanc incandescent, tandis que les basses pulsent l'opacité et l'éclat global.
4. **Calques de Profondeur** :
    - **Noyau (Main Orb)** : La sphère principale avec le shader complexe.
    - **Glow Shell** : Une seconde sphère additive, translucide et réactive au volume, créant une aura de chaleur.
    - **Background Halo** : Un plan texturé en arrière-plan pour diffuser la lumière.
    - **Particules Orbitales** : Des milliers de points réactifs gravitant autour du noyau.

## Flux de travail (Workflow)
- [ ] Étape 1 : Mettre en place le moteur audio (`AudioContext` + `AnalyserNode`) avec un prompt d'activation utilisateur.
- [ ] Étape 2 : Initialiser la scène Three.js avec une `IcosahedronGeometry` (détail ~180).
- [ ] Étape 3 : Implémenter le `ShaderMaterial` avec les fonctions de bruit Simplex 3D et les calculs de normales par différences finies.
- [ ] Étape 4 : Lier les données audio aux `uniforms` du shader dans la boucle `animate`.
- [ ] Étape 5 : Ajouter les couches de polish (Glow shell, Halo, Particules).

## Paramètres de Référence
- *Vitesse de base* : Lente et hypnotique (`uTime * 0.15`).
- *Contraste de crête* : `pow(ridge, 1.9)` pour des arêtes tranchantes.
- *Réactivité* : Lisser les données audio via un lerp constant (~0.14) pour éviter les saccades visuelles.

## Sauvegarde Validée
- Point de référence fonctionnel : `examples/liquid_plasma_orb.html`.
