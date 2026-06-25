# Orbe SkyIA

Prototype immersif SkyIA avec orbe WebGL, chat/jeu, voix Voxtral, sauvegardes locales et proxy Mistral cote serveur.

## Runtime

- Frontend: React + Vite
- Serveur Hostinger/Node: `server.cjs`
- IA: API officielle Mistral via `/api/chat`
- Voix: Voxtral via `/api/speech`, profil par defaut femme francaise rapide et agressive
- Cle serveur requise: `MISTRAL_API_KEY`
- Stockage app: localStorage pour profil, credits, sauvegardes et stats
- Build: Vite 8 avec chunks optimises et PDF charge a la demande

## Lancer en local

```powershell
cd "D:\00_Cerveau_IA\Projet\05_Orbe_skyia"
npm install
npm run check
npm test -- --run
npm run build
$env:PORT="4175"; npm start
```

URL locale: `http://localhost:4175`

## Variables

Le serveur lit `MISTRAL_API_KEY` depuis l'environnement Hostinger. En local, il peut aussi lire `D:\00_Cerveau_IA\API\env.Local`.

Voix Voxtral optionnelle: `SKYIA_VOXTRAL_VOICE_ID` permet de forcer une voix precise. Sans variable, le serveur choisit d'abord une voix francaise agressive; le preset actuel est `Marie - Angry`.

## Notes

Firebase, Gemini et les Cloud Functions ont ete retires du runtime principal. Le paiement Stripe Firebase est neutralise tant qu'un endpoint Stripe Hostinger dedie n'est pas configure.

Les anciens fichiers Firebase/Gemini/debug et rapports obsoletes sont archives dans `_archive/2026-06-16-nettoyage-hostinger-mistral`. Le runtime actif est audite avec `npm audit` sans vulnerabilite connue.
