# Brouillon contenu fiche - Orbe SkyIA - Prototype immersif d'interface IA

## Resume
Prototype expérimental transformant l'assistant SkyIA en une expérience visuelle et interactive via une orbe WebGL, intégrant voix, sauvegardes et statistiques.

## A quoi sert le projet
Fournir un laboratoire d'innovation pour concevoir une interface IA plus expressive, immersive et mémorable que les assistants textuels traditionnels, tout en testant des fonctionnalités avancées comme la reconnaissance vocale, la synthèse vocale et la gestion de sessions persistantes.

## Fonctionnement
L'application démarre un serveur Node.js qui initialise les services Firebase (Auth, Firestore) et prépare l'environnement d'exécution. Le frontend React, construit avec Vite, charge les composants principaux (orbe WebGL, interface de chat, tableaux de bord) et établit une connexion avec les services IA via OpenRouter ou l'API Google. Les interactions vocales sont gérées par la Web Speech API, tandis que les sauvegardes sont stockées localement ou synchronisées avec Firestore. Les crédits sont vérifiés via Stripe, et les rapports de session sont générés dynamiquement en PDF. L'orbe 3D réagit aux messages de l'IA et aux actions utilisateur, créant une boucle de feedback visuel.

## Construction
Le projet a été conçu comme un laboratoire d'innovation pour les interfaces IA, avec une architecture modulaire séparant clairement les responsabilités : frontend (React + Three.js), backend (Node.js + Firebase), services externes (IA, voix, paiements) et gestion d'état (React Context). Les choix clés incluent l'utilisation de Three.js pour le rendu 3D afin de garantir une expérience fluide, l'intégration de Firebase pour une gestion centralisée des utilisateurs et des sessions, et l'adoption de TypeScript pour une robustesse accrue. L'interface a été pensée pour être intuitive malgré sa complexité, avec des effets visuels (CRT, arrière-plan) servant à renforcer l'immersion sans distraire de la fonction principale. La sécurité a été renforcée via des règles Firestore strictes et des mécanismes d'auto-réparation pour les documents utilisateurs.

## Installation
[object Object]

## Utilisation
Après installation, l'application est accessible via un navigateur à l'adresse `http://localhost:5173` (mode développement). L'utilisateur peut se connecter via Google ou email, puis interagir avec l'orbe SkyIA en mode conversationnel ou jeu. Les fonctionnalités incluent la sélection de modèles IA, l'activation de la voix pour les entrées/sorties, la sauvegarde de sessions, l'achat de crédits, et la consultation de rapports. L'interface propose des effets visuels dynamiques (lignes CRT, arrière-plan défilant) pour renforcer l'immersion. Pour une expérience complète, il est recommandé d'utiliser un navigateur moderne (Chrome, Firefox) avec WebGL activé.

## Fonctions
- Visualisation interactive de l'assistant IA sous forme d'orbe WebGL
- Sélection de modèles IA parmi une liste de fournisseurs (OpenRouter)
- Mode conversationnel immersif avec gestion de contexte
- Intégration de la voix (reconnaissance et synthèse) via Web Speech API
- Système de sauvegarde et de restauration de sessions locales ou cloud
- Gestion des crédits et achats via Stripe
- Génération de rapports de session exportables en PDF
- Tableau de bord de statistiques utilisateur
- Interface de configuration et de personnalisation
- Effets visuels dynamiques (CRT, arrière-plan défilant)
