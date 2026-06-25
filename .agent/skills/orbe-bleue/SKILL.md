---
name: orbe-bleue
description: Crée une orbe bleue complexe basée sur Three.js et SVG pur. À utiliser pour générer des noyaux d'énergie bleus de très haute-fidélité.
---

# Créateur d'Orbe Bleue (Hybride WebGL/SVG)

## Quand utiliser ce skill
- Le système demande une orbe bleue (ou d'énergie) poussée visuellement.
- Le rendu final doit conserver le rendu chaotique vaporeux du plasma avec beaucoup de profondeur, de petites particules et des interfaces mathématiques (HUD).

## Flux de travail (Workflow)
- [ ] Étape 1 : Analyser la demande de modifications (couleurs, rotation, types de filtres SVG, taille et opacité du shader GLSL).
- [ ] Étape 2 : Copier/Créer la structure HTML de base, basée sur `examples/plasma_orb_template.html`.
- [ ] Étape 3 : Ajuster les constantes du shader WebGL au besoin (vitesse `pulseSpeed`, dégradés).
- [ ] Étape 4 : Ajuster l'interface vectorielle superposée (le `SVG` hud-overlay).

## Implémentation technique de référence
Cette orbe est constituée de deux couches maîtresses :
1.  **WebGL via Three.js (Fond & Volume)** :
    *   Un cœur stellaire incandescent (sphère simple avec `MeshBasicMaterial`).
    *   Deux "coquilles" nébuleuses fluides (`ShaderMaterial`) gérées par un *Fragment Shader* utilisant le bruit Simplex 3D (FBM) et l'effet Fresnel.
    *   Un système d'astéroïdes/particules en rotation orbitale (`THREE.Points`).
    *   Tout est rendu via `THREE.AdditiveBlending` sur un fond transparent pour s'additionner à la couleur CSS.
2.  **SVG (Net & Rigide)** :
    *   Placé en absolue par-dessus le canvas (`z-index: 2`).
    *   Contient de magnifiques formules mathématiques et runes projetées sur des chemins circulaires vectoriels (`<textPath>`).
    *   Ces `<g>` SVG sont animés uniquement en CSS `@keyframes spinCW` et `spinCCW`.

## Ressources
-   `examples/plasma_orb_template.html` est l'état stable validé de l'orbe bleue. Toujours l'utiliser comme point de sauvegarde/reprise.
