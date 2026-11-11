# MOODWAVE : comprendre le code (préparation de l'oral)

Ce document explique **comment l'application fonctionne**, fichier par fichier, avec des questions que le jury peut poser.

---

## 1. Vue d'ensemble

```
application musicale/
├── index.html      → la STRUCTURE (ce qu'il y a sur la page)
├── style.css       → l'APPARENCE (couleurs, tailles, mise en page, responsive)
├── script.js       → le COMPORTEMENT (clics, lecture audio, playlists…)
├── assets/
│   └── favicon.svg → l'icône de l'onglet
└── docs/           → brief, prompts Figma, ce document
```

Aucune bibliothèque externe (pas de React, pas de jQuery) : c'est du **HTML / CSS / JavaScript « vanilla »**. Les polices *Syne* et *DM Sans* viennent de Google Fonts, et **les chansons viennent de l'API iTunes d'Apple** (vraies chansons, vraies pochettes, extraits officiels de 30 secondes).

**Le principe :** le HTML contient le squelette vide. Au chargement, `script.js` *remplit* les listes (humeurs, morceaux, playlists) à partir des données, et réagit aux clics.

---

## 2. index.html : la structure

| Bloc | Rôle |
|---|---|
| `<svg>` avec des `<symbol>` | Une « bibliothèque » d'icônes dessinées une seule fois. On les réutilise partout avec `<use href="#i-play">`. |
| `.glow` | Le halo lumineux flou en arrière-plan (aux couleurs de l'humeur). |
| `.sidebar` | Barre latérale (ordinateur) : logo, navigation, « Tes espaces », carte « À ton rythme ». |
| `.topbar` | En-tête mobile (logo + avatar), caché sur ordinateur. |
| `<main>` | Les 4 sections : **Accueil, Rechercher, Ma bibliothèque, Mes playlists**. Une seule est visible à la fois (attribut `hidden`). |
| `.player` | La barre de lecture en bas (devient un mini-lecteur sur mobile). |
| `.tabbar` | La barre d'onglets mobile. |
| `.full` | Le lecteur plein écran (ouvert en cliquant sur la pochette). |
| `.menu`, `.toast` | Le menu contextuel « ⋯ » et les petites notifications. |
| `<audio>` | L'élément HTML5 qui lit réellement les extraits audio. Il est invisible : nos boutons le pilotent. |

**Accessibilité :** les boutons icônes ont un `aria-label` (lu par les lecteurs d'écran), les cartes d'humeur sont un `role="radiogroup"` (un seul choix possible), la langue est déclarée (`lang="fr"`).

---

## 3. style.css : l'apparence

### Les variables CSS : le cœur du changement de couleurs
```css
:root {
  --c1: #6C5CE7;   /* couleur 1 de l'humeur */
  --c2: #00CEC9;   /* couleur 2 de l'humeur */
  --accent: color-mix(in srgb, var(--c1) 42%, #fff);  /* la lavande des boutons */
}
```
Tous les éléments colorés utilisent `var(--c1)`, `var(--c2)` ou `var(--accent)`. **Quand le JavaScript change `--c1` et `--c2`, toute l'interface change de couleur d'un coup** : halo, boutons, cœurs, barre de progression. `color-mix()` calcule automatiquement une version claire de la couleur.

### La mise en page avec CSS Grid
```css
.app {
  display: grid;
  grid-template-columns: var(--sidebar) 1fr;   /* barre latérale | contenu */
  grid-template-rows: 1fr var(--player);       /* contenu | lecteur */
  grid-template-areas: "side main" "player player";
}
```
On dessine la page comme un tableau : la barre latérale à gauche, le contenu à droite, le lecteur sur toute la largeur en bas.

### Le responsive avec les media queries
- `@media (max-width: 1180px)` : tablette / petit écran → 3 cartes d'humeur par ligne.
- `@media (max-width: 860px)` : **mobile** → on cache la barre latérale, on affiche l'en-tête et les onglets, les cartes passent en grille 2 colonnes, le lecteur devient un mini-lecteur.

### Les effets visuels
- **Glassmorphism** : `backdrop-filter: blur(24px)` floute ce qu'il y a derrière (barre latérale, lecteur).
- **Animations** : `@keyframes float` (halo qui bouge), `@keyframes eq` (égaliseur du morceau en cours), `fadeUp` (apparition des sections).
- `@media (prefers-reduced-motion: reduce)` coupe les animations pour les personnes qui le demandent dans leur système.

---

## 4. script.js : le comportement

### 4.1 Les données
- `MOODS` : les 5 humeurs (nom, emoji, couleurs, phrases) et, pour chacune, la liste des **identifiants de 6 vraies chansons** du catalogue Apple Music.
- `SUGGESTIONS` : les idées proposées sous la barre de recherche.
- Les chansons elles-mêmes sont chargées depuis l'API (voir partie 5).

### 4.2 L'état (`state`)
Un seul objet qui contient tout ce qui peut changer : humeur active, bibliothèque, playlists, résultats de recherche, file de lecture (`queue`), position (`index`), aléatoire, répétition…
> **Règle :** on modifie `state`, puis on appelle une fonction `render…()` qui redessine l'interface à partir de `state`.

### 4.3 La sauvegarde : `localStorage`
```js
store.set('library', state.library);       // enregistre dans le navigateur
store.get('library', []);                  // relit (ou valeur par défaut)
```
Bibliothèque, playlists, humeur et volume **restent enregistrés même après fermeture du navigateur**. Les `try/catch` évitent un plantage si le stockage est bloqué (navigation privée).

### 4.4 La fonctionnalité principale : `selectMood()`
```js
function selectMood(moodId) {
  state.mood = moodId;            // 1. on mémorise l'humeur
  store.set('mood', moodId);      // 2. on la sauvegarde
  applyMoodTheme(moodId);         // 3. on change les couleurs (variables CSS)
  renderMoods();                  // 4. on redessine les cartes (carte active)
  renderMoodPlaylist();           // 5. on affiche la playlist de cette humeur
}
```

### 4.5 Le lecteur audio
| Fonction | Ce qu'elle fait |
|---|---|
| `playQueue(liste, départ)` | Met une liste en file d'attente et lance la lecture. |
| `loadTrack()` | Charge l'extrait (`audio.src = chanson.preview`) et met à jour l'affichage. |
| `togglePlay()` | `audio.play()` ou `audio.pause()`. |
| `next()` / `prev()` | Morceau suivant / précédent (gère l'aléatoire et la répétition). |
| `updateProgress()` | Appelée par l'événement `timeupdate` (~4 fois par seconde) : avance la barre et le temps. |
| `seekTo()` | Quand on déplace la barre : `audio.currentTime = …`. |

Événements utilisés sur `<audio>` : `play`, `pause`, `timeupdate`, `loadedmetadata`, `ended` (passe au suivant automatiquement), `error`.

**Bonus :** l'API **Media Session** permet de contrôler la musique depuis l'écran verrouillé du téléphone ou les touches multimédia du clavier. Raccourcis : **Espace** = lecture/pause, **Maj + →/←** = suivant/précédent, **Échap** = fermer.

### 4.6 La délégation d'événements
Au lieu de mettre un écouteur sur chacune des chansons affichées, on en met **un seul sur la liste** :
```js
ol.addEventListener('click', e => {
  const row = e.target.closest('.track');            // quelle ligne a été cliquée ?
  const btn = e.target.closest('[data-action]');      // un bouton précis (＋, ⋯) ?
  …
});
```
C'est plus performant, et ça marche même pour les lignes créées après coup.

### 4.7 La navigation par l'adresse (`#accueil`, `#bibliotheque`…)
`route()` lit `location.hash`, affiche la bonne section et cache les autres. L'événement `hashchange` relance `route()`. Résultat : **le bouton « retour » du navigateur fonctionne** et on peut partager un lien direct vers une section.

### 4.8 La sécurité
`escapeHTML()` protège les noms de playlists saisis par l'utilisateur avant de les insérer dans la page : un nom comme `<script>` reste du simple texte (protection contre les failles **XSS**).

---

## 5. Les vraies chansons : l'API iTunes

L'application interroge l'**API publique iTunes Search** d'Apple (gratuite, sans clé, autorisée depuis un navigateur).

| Besoin | Requête |
|---|---|
| Rechercher | `https://itunes.apple.com/search?term=burna+boy&entity=song&country=FR` |
| Charger des titres précis (playlists d'humeur) | `https://itunes.apple.com/lookup?id=1532252603,1294891012&country=FR` |

```js
async function searchSongs(term) {
  const data = await apiGet('search', { term, media: 'music', entity: 'song', limit: 30 });
  return data.results.filter(r => r.kind === 'song' && r.previewUrl).map(toTrack);
}
```
- `fetch()` envoie la requête, `await` attend la réponse sans bloquer la page (programmation **asynchrone**).
- `toTrack()` transforme chaque résultat en objet simple : titre, artiste, album, pochette (agrandie en 600×600), extrait audio, durée, lien Apple Music.
- **JSONP de secours** : si `fetch` est bloqué, on charge la réponse comme un `<script>` (technique classique qui contourne les restrictions CORS).
- **Anti-surcharge (debounce)** : la recherche part 350 ms après la dernière frappe, pas à chaque lettre. Un « ticket » (`searchRequest`) ignore les réponses d'anciennes recherches arrivées en retard.
- **Pourquoi des extraits de 30 secondes ?** Diffuser des chansons entières exige des licences (c'est ce que paient Spotify ou Deezer). L'API fournit légalement des extraits officiels, et un lien permet d'écouter le titre en entier sur Apple Music.

**La bibliothèque** : `state.library` contient les identifiants des chansons ajoutées avec ＋, et `state.known` garde leurs informations. Les deux sont sauvegardés dans `localStorage`, donc la bibliothèque reste là après fermeture du navigateur.

---

## 6. Fidélité à la maquette Figma

| Élément de la maquette | Où dans le code |
|---|---|
| Barre latérale « Explorer / Tes espaces / À ton rythme » | `.sidebar` + `renderPlaylists()` |
| Pastille « Un peu de calme, beaucoup de son » | `.pill`, texte changeant selon l'humeur |
| 5 cartes en dégradé + coche sur l'active | `renderMoods()` + `.mood-card.active` |
| Tableau # / Titre / Artiste / ⏱ | `.tracks-head` + `trackRow()` |
| Bouton lavande « Tout lire » | `.btn-accent` (couleur `--accent`) |
| Pochettes | vraies pochettes (`<img>`) chargées depuis l'API |
| Mobile : grille 2 colonnes + « Une humeur. Ton moment à toi. » | media query 860px + `.moods-note` |
| Mini-lecteur + 4 onglets | `.player` et `.tabbar` (mobile) |
| Lecteur plein écran (badge, vague, titre sur la pochette) | `.full`, `#full-cover` |

---

## 7. Questions probables du jury

**« Quelle est la fonctionnalité principale ? »**
Le sélecteur d'humeur : un clic → la playlist correspondante s'affiche et toute l'interface prend les couleurs de l'humeur (variables CSS modifiées en JavaScript).

**« Comment l'interface change-t-elle de couleur ? »**
`applyMoodTheme()` fait `document.documentElement.style.setProperty('--c1', couleur)`. Tout le CSS utilise `var(--c1)`, donc tout se met à jour.

**« Comment les données restent-elles après rechargement ? »**
Grâce à `localStorage`, une mémoire clé/valeur du navigateur. On y stocke du JSON (`JSON.stringify` / `JSON.parse`).

**« Comment est fait le responsive ? »**
Avec des media queries (`max-width: 860px`) qui réorganisent la grille, cachent la barre latérale et affichent la barre d'onglets.

**« Pourquoi `closest()` ? »**
Pour la délégation d'événements : depuis l'élément cliqué (par exemple l'icône), on remonte jusqu'à la ligne du morceau.

**« Comment passe-t-on au morceau suivant automatiquement ? »**
L'élément `<audio>` déclenche l'événement `ended`, et on appelle `next(true)`.

**« D'où viennent les chansons ? »**
De l'API iTunes d'Apple : une requête `fetch` renvoie du JSON (titres, artistes, pochettes, extraits). On lit l'extrait avec l'élément `<audio>`.

**« Pourquoi seulement 30 secondes ? »**
Les chansons complètes sont protégées par le droit d'auteur : seules les plateformes qui paient des licences peuvent les diffuser. L'API donne des extraits officiels, et on renvoie vers Apple Music pour l'écoute complète.

**« Comment avez-vous utilisé l'IA ? »**
1. L'agent IA de Figma a généré la maquette à partir de nos prompts (voir `02-prompt-figma.md`).
2. Une IA a généré le code à partir de la maquette. Ensuite, nous avons vérifié la fidélité, testé chaque fonction, contrôlé la console (0 erreur) et l'affichage mobile.

---

## 8. Tester en local
Double-clique sur `index.html` : l'application s'ouvre dans le navigateur. Ouvre la console (F12 → Console) : aucune erreur ne doit apparaître.

## 9. Répartition possible pour l'oral (équipe)
- **Personne 1** : le concept, l'identité visuelle et la maquette Figma.
- **Personne 2** : le HTML et le CSS (structure, variables, responsive).
- **Personne 3** : le JavaScript (humeurs, API iTunes et recherche, lecteur audio, localStorage).
- **Personne 4** : le déploiement Vercel et la démonstration en direct.
