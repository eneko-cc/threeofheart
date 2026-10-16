# Three of Heart

L'app à deux de Toni et Ju : restos, activités, événements, films, séries et petites choses à faire, sur une liste et sur une carte de Paris, avec une note en cœurs pour chacun.

## Installer sur iPhone

1. Ouvrir https://eneko-cc.github.io/threeofheart/ dans **Safari**.
2. Bouton Partager, puis **Sur l'écran d'accueil**.

## Ce qu'il y a dedans

- React + Vite + TypeScript, en PWA (vite-plugin-pwa) : plein écran, icône, hors ligne.
- Carte : MapLibre avec les tuiles gratuites d'[OpenFreeMap](https://openfreemap.org), recolorées aux couleurs de l'app.
- Recherche d'adresses : [Photon](https://photon.komoot.io) (OpenStreetMap), sans clé.
- Affiches de films et séries : Wikipédia, sans clé.
- Hébergement : GitHub Pages, mis à jour à chaque push sur `main`.
- Données : sur le téléphone pour l'instant (localStorage). La synchro entre les deux téléphones passera par Supabase.

## Développer

```sh
npm install
npm run dev
```
