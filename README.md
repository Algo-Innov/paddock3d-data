# Paddock 3D · mise à jour automatique des données (gratuit)

Objectif : l'application récupère un petit fichier de saison mis à jour toute seule après chaque Grand Prix, sans intervention.

Chaîne : **F1DB** (base ouverte, CC BY 4.0, mise à jour par ses mainteneurs après chaque course) → **GitHub Actions** (planifié, gratuit) → fichiers JSON publiés dans le dépôt → **jsDelivr** (CDN gratuit) → application.

## Mise en place (une seule fois, ≈ 10 minutes)

1. Créer un compte GitHub (gratuit) si besoin, puis sur ce PC : `gh auth login`.
2. Créer un dépôt **public** `paddock3d-data` (public = jsDelivr gratuit et sans limite utile).
3. Copier dans ce dépôt :
   - `.github/workflows/update.yml` (ce dossier)
   - `scripts/build.mjs` (ce dossier)
4. Pousser. L'action tourne tous les lundis à 07:00 UTC et peut être lancée à la main (onglet Actions → Run workflow).
5. Les fichiers sont ensuite servis à l'adresse :
   `https://cdn.jsdelivr.net/gh/<compte>/paddock3d-data@main/data/schedule.json` (idem drivers, constructors, lastresults, winners, sprints, histoire).

## Côté application

`championnat.html` et `histoire.html` chargent d'abord la copie embarquée (hors ligne), puis tentent une fois par semaine le CDN ; si la version en ligne est plus récente (`MRData.built`), elle est mise en cache local et affichée.

## Licence

F1DB : CC BY 4.0 → mention « Données : F1DB (CC BY 4.0) » dans la page Licences (déjà en place). jsDelivr : gratuit pour les dépôts publics, usage commercial autorisé.
