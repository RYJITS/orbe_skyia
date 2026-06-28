# Orbe SkyIA - Prototype immersif d'interface IA

## Liens vers l'application
- Lien public: [https://orbe.skyia.net/](https://orbe.skyia.net/)
- GitHub: [https://github.com/RYJITS/orbe_skyia](https://github.com/RYJITS/orbe_skyia)

## A quoi sert le projet
Orbe SkyIA est un prototype qui matérialise l'assistant SkyIA sous la forme d'une orbe interactive en 3D, permettant une expérience utilisateur plus immersive que les interfaces textuelles classiques. L'application combine un noyau fonctionnel SkyIA avec une interface visuelle riche, intégrant des services externes (modèles IA, synthèse vocale, paiements) pour tester des scénarios d'interaction avancés. Le projet sert de banc d'essai pour évaluer l'impact de l'immersion visuelle et sonore sur l'engagement utilisateur, tout en fournissant un outil de démonstration pour les partenaires techniques.

## Fonctionnement de l'application ou du projet
L'application démarre un serveur Node.js qui initialise les services Firebase (Auth, Firestore) et prépare l'environnement d'exécution. Le frontend React, construit avec Vite, charge les composants principaux (orbe WebGL, interface de chat, tableaux de bord) et établit une connexion avec les services IA via OpenRouter ou l'API Google. Les interactions vocales sont gérées par la Web Speech API, tandis que les sauvegardes sont stockées localement ou synchronisées avec Firestore. Les crédits sont vérifiés via Stripe, et les rapports de session sont générés dynamiquement en PDF. L'orbe 3D réagit aux messages de l'IA et aux actions utilisateur, créant une boucle de feedback visuel.

## Comment le projet a ete construit
Le projet a été conçu comme un laboratoire d'innovation pour les interfaces IA, avec une architecture modulaire séparant clairement les responsabilités : frontend (React + Three.js), backend (Node.js + Firebase), services externes (IA, voix, paiements) et gestion d'état (React Context). Les choix clés incluent l'utilisation de Three.js pour le rendu 3D afin de garantir une expérience fluide, l'intégration de Firebase pour une gestion centralisée des utilisateurs et des sessions, et l'adoption de TypeScript pour une robustesse accrue. L'interface a été pensée pour être intuitive malgré sa complexité, avec des effets visuels (CRT, arrière-plan) servant à renforcer l'immersion sans distraire de la fonction principale. La sécurité a été renforcée via des règles Firestore strictes et des mécanismes d'auto-réparation pour les documents utilisateurs.

## Installation et utilisation
### Installation
[object Object]

### Utilisation
Après installation, l'application est accessible via un navigateur à l'adresse `http://localhost:5173` (mode développement). L'utilisateur peut se connecter via Google ou email, puis interagir avec l'orbe SkyIA en mode conversationnel ou jeu. Les fonctionnalités incluent la sélection de modèles IA, l'activation de la voix pour les entrées/sorties, la sauvegarde de sessions, l'achat de crédits, et la consultation de rapports. L'interface propose des effets visuels dynamiques (lignes CRT, arrière-plan défilant) pour renforcer l'immersion. Pour une expérience complète, il est recommandé d'utiliser un navigateur moderne (Chrome, Firefox) avec WebGL activé.

## Fonctions disponibles dans l'application
- Rendu 3D temps réel de l'orbe SkyIA avec réactions aux messages
- Sélection dynamique de modèles IA parmi une liste de fournisseurs (OpenRouter)
- Reconnaissance vocale et synthèse vocale via Web Speech API
- Sauvegarde et restauration de sessions (localStorage ou Firestore)
- Gestion des crédits utilisateur avec intégration Stripe
- Génération de rapports de session en PDF
- Tableau de bord de statistiques utilisateur (victoires, défaites, crédits consommés)
- Interface de configuration pour personnaliser l'expérience
- Effets visuels immersifs (CRT, arrière-plan défilant)
- Gestion des profils utilisateur avec synchronisation Firestore

## Outils, IA et moteurs en arriere-plan
- Vite (outil de build et serveur de développement)
- React (bibliothèque frontend)
- Three.js (rendu 3D WebGL)
- Firebase (Auth, Firestore, Functions)
- OpenRouter (accès aux modèles IA)
- Stripe (gestion des paiements)
- Web Speech API (reconnaissance et synthèse vocale)
- jspdf (génération de PDF)
- Recharts (visualisation de données)
- Tailwind CSS (styling)

## Automatisations integrees
- Warm-up automatique du backend au démarrage
- Découverte dynamique des modèles IA disponibles via OpenRouter
- Sauvegarde automatique des sessions utilisateur
- Génération automatique de rapports de session
- Vérification des crédits utilisateur avant interaction IA
- Synchronisation des profils utilisateur avec Firestore
- Tests de sécurité et de compatibilité au build

## Captures d'ecran
![Capture 1 - Orbe skyia](docs/captures/05-orbe-skyia-2026-06-25_03-17-04-desktop.png)

![Capture 2 - Orbe skyia](docs/captures/05-orbe-skyia-2026-06-25_03-17-04-mobile.png)

## Mises a jour
- [object Object]
- [object Object]
- [object Object]
- [object Object]
- Correction des règles de sécurité Firestore pour éviter les erreurs de permission lors de l'écriture des profils utilisateurs
- Ajout d'un mécanisme d'auto-réparation pour les documents utilisateurs incomplets
- Optimisation des performances du rendu WebGL avec Three.js
- Mise à jour des dépendances pour compatibilité avec React 19 et TypeScript 5.8
- Documentation complète des procédures de maintenance et de débogage

> Fichier genere par l'orchestrateur pour le hub Site Ma Methode.
