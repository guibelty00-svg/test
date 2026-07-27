# Classement Top 3 des mini-jeux

Cette version ajoute un classement en ligne pour :
- Street Run
- Launch Control
- ADV Circuit
- Pit Stop
- Garage Memory

Routes utilisées :
- `POST /api/scores`
- `GET /api/leaderboard?game=street&limit=3`

Le serveur conserve uniquement le meilleur résultat de chaque pseudo pour chaque jeu.
Pour Launch Control, Pit Stop et Garage Memory, le résultat le plus bas est le meilleur.
