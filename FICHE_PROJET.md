# Orbe SkyIA

## Liens vers l'application
- Lien public: https://orbe.skyia.net/
- GitHub: https://github.com/RYJITS/orbe_skyia

## A quoi sert le projet
Orbe SkyIA est une version experimentale et immersive de SkyIA. L'utilisateur interagit avec une presence visuelle en forme d'orbe, choisit des modeles, lance des modes chat ou jeu, utilise la voix et peut sauvegarder ses sessions.

## Fonctionnement de l'application ou du projet
L'application demarre un noyau SkyIA, prepare le backend, charge les modeles disponibles, gere les protocoles de partie, puis route les messages vers les services IA. Les composants gerent le profil, les sauvegardes, le magasin, les rapports, l'installation et le rendu WebGL de l'orbe. Les services audio ajoutent reconnaissance vocale, analyse micro, filtres, synthese vocale et visualisation.

## Comment le projet a ete construit
Le projet a ete concu comme laboratoire d'experience IA: meme logique de jugement et de modeles que SkyIA, mais avec une interface plus expressive. La partie visuelle, la voix, les credits et les sauvegardes servent a tester ce qui peut rendre l'assistant plus present et engageant.

## Fonctions disponibles dans l'application
- Discuter avec SkyIA en mode immersif
- Choisir des modeles et protocoles
- Utiliser un mode chat ou jeu
- Activer la voix et la synthese vocale
- Sauvegarder et reprendre une session
- Consulter des rapports de fin de partie
- Gerer profil, credits et magasin
- Explorer des modeles OpenRouter

## Outils, IA et moteurs en arriere-plan
- Gemini
- Gemini Live
- OpenRouter model discovery
- Firebase/Firestore
- Fonctions cloud Firebase
- Stripe checkout
- Web Speech API
- Proxy TTS
- Analyse micro et filtres audio
- Orbe WebGL

## Automatisations integrees
- Warm-up du backend au demarrage
- Decouverte des modeles OpenRouter
- Chargement et filtrage des modeles
- Sauvegarde locale et Firestore des sessions
- Statistiques de parties via fonctions cloud
- Gestion des credits et codes promo
- Checkout Stripe
- Export PDF de rapports
- Filtres audio et TTS automatises
- Tests de securite et de composants

## Captures d'ecran
![Capture 1 - Orbe skyia](docs/captures/05-orbe-skyia-2026-06-25_03-17-04-desktop.png)

![Capture 2 - Orbe skyia](docs/captures/05-orbe-skyia-2026-06-25_03-17-04-mobile.png)

## Mises a jour
- Fiche actualisee depuis le registre orchestrateur et le catalogue projet.

> Fichier genere par l'orchestrateur pour le hub Site Ma Methode.
