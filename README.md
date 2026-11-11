# MOODWAVE — La musique qui suit ton humeur

Projet JS L3 CPD ISM 2026-2027 — application web musicale (projet d'équipe).

**Fonctionnalité principale :** choisir son humeur (Chill, Motivé, Concentré, Mélancolique, Joyeux) → l'application affiche une playlist de **vraies chansons** adaptée, et toute l'interface prend les couleurs de l'humeur.

## Fonctionnalités
- Sélecteur d'humeur avec changement de thème en direct et playlists de vraies chansons
- **Barre de recherche** dans tout le catalogue musical (titres, artistes, albums) grâce à l'API iTunes d'Apple
- **Ma bibliothèque** : ajouter / retirer une chanson avec ＋ / ✓, filtre, lecture de toute la bibliothèque
- Playlists personnelles (créer, remplir, supprimer), file d'attente
- Lecteur complet (lecture/pause, précédent/suivant, aléatoire, répétition, volume) + lecteur plein écran
- Vraies pochettes, extraits officiels de 30 secondes, lien « Écouter en entier sur Apple Music »
- Sauvegarde dans le navigateur (localStorage), responsive ordinateur / tablette / mobile

## Technologies
HTML5, CSS3 (variables, Grid, media queries, color-mix), JavaScript vanilla (fetch, async/await, JSONP de secours), API publique iTunes Search d'Apple (sans clé). Maquette Figma générée avec l'agent IA de Figma, code généré avec une IA puis vérifié et testé.

## Structure
- `index.html`, `style.css`, `script.js` — l'application
- `docs/` — brief, prompts Figma, explication du code

## Liens
- Maquette Figma : https://www.figma.com/design/fNIzfE9lFnBda0fm5tLm70/MOODWAVE-%E2%80%93-Maquette
- Application (Vercel) : https://moodwave-ism.vercel.app

## Google Sheets (à renseigner)
| Nom du projet | Lien Figma | Lien Vercel |
|---|---|---|
| MOODWAVE | https://www.figma.com/design/fNIzfE9lFnBda0fm5tLm70/MOODWAVE-%E2%80%93-Maquette | https://moodwave-ism.vercel.app |

## Mettre à jour le site
Sur vercel.com → projet → glisser le dossier du projet sur la page (« drop your project anywhere on this page »).
