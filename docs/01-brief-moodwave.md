# MOODWAVE — Brief du projet

> « La musique qui suit ton humeur. »

## 1. Concept
MOODWAVE est une application web musicale qui part d'une question simple :
**« Comment tu te sens maintenant ? »**
L'utilisateur choisit son humeur et l'application lui propose aussitôt une playlist adaptée.
Toute l'interface (couleurs, dégradés, animation de fond) change avec l'humeur choisie.

## 2. Fonctionnalité principale
**Le sélecteur d'humeur** : 5 humeurs → 1 playlist générée → l'interface prend les couleurs de l'humeur.

Fonctionnalités secondaires :
- lecteur audio complet : lecture / pause, précédent / suivant, barre de progression cliquable, volume, lecture aléatoire, répétition ;
- favoris (cœur) sauvegardés dans le navigateur (localStorage) ;
- « Mes playlists » : créer une playlist et y ajouter des morceaux ;
- recherche d'un titre ou d'un artiste dans la bibliothèque ;
- historique « Ton humeur cette semaine ».

## 3. Les 5 humeurs
| Humeur | Emoji | Couleurs (dégradé) | Ambiance musicale |
|---|---|---|---|
| Chill | 🌙 | #6C5CE7 → #00CEC9 | lent, doux, lo-fi |
| Motivé | ⚡ | #FF6B35 → #FF2E63 | rythmé, énergique |
| Concentré | 🎯 | #00B894 → #0984E3 | calme, instrumental |
| Mélancolique | 🌧️ | #4B6CB7 → #182848 | lent, mineur, nostalgique |
| Joyeux | ☀️ | #FDCB6E → #FF7675 | lumineux, dansant |

## 4. Identité visuelle
- **Fond** : bleu nuit profond `#0B0B12`, surfaces `#16161F`, bordures `#262633`
- **Texte** : blanc `#F5F5FA`, texte secondaire `#9A9AB0`
- **Couleur d'accent** : celle de l'humeur active (dégradé)
- **Typographie** : *Syne* (titres, caractère fort) + *DM Sans* (textes, lisible)
- **Style** : sombre, moderne, coins arrondis (16–24 px), effets de verre dépoli (glassmorphism), halo lumineux animé derrière le contenu aux couleurs de l'humeur
- **Logo** : le mot « MOODWAVE » en Syne gras, précédé d'une petite onde sinusoïdale en dégradé

## 5. Écrans
1. **Accueil** — salutation, « Comment tu te sens ? », 5 grandes cartes d'humeur, section « Récemment écoutés »
2. **Playlist d'humeur** — grand en-tête coloré (emoji, nom de l'humeur, nombre de titres, durée), bouton « Tout lire », liste des morceaux
3. **Lecteur** — grande pochette en dégradé, titre, artiste, barre de progression, contrôles, cœur
4. **Bibliothèque** — recherche + tous les morceaux + favoris
5. **Mes playlists** — liste des playlists créées + bouton « Nouvelle playlist »

## 6. Mise en page
- **Ordinateur (1440 px)** : barre latérale gauche (logo + navigation), contenu au centre, barre de lecture fixe en bas.
- **Mobile (390 px)** : en-tête en haut, contenu en une colonne, mini-lecteur au-dessus d'une barre d'onglets en bas (Accueil, Bibliothèque, Playlists). Le lecteur s'ouvre en plein écran.

## 7. Contenu audio
Les morceaux sont des **compositions originales générées par programme** pour le projet (aucun problème de droits d'auteur). 3 morceaux par humeur, 15 au total.
