# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

Une seule app Expo / React Native. Android d'abord (Google Play), iOS ensuite (App Store).
Chaque OS garde ses conventions natives (retour, gestes, feuilles, notifications) ;
l'identité du club est la même sur les deux.

## Stack

Délégué (« à toi de me guider »), contrainte : gratuit au maximum.
- App : Expo (React Native, TypeScript), build EAS.
- Données matchs : collecteur Python existant (lecture de ffhandball.fr) exécuté par
  GitHub Actions, publié en JSON statique (GitHub Pages).
- Notifications : Firebase Cloud Messaging (un sujet par équipe), envoyées par la GitHub Action
  après chaque collecte (offre gratuite).
- Rien n'existe encore : ni dépôt git, ni hébergement, ni compte Play Store.

## Users

- **Parents de jeunes joueurs** (U11 à U18) : veulent savoir où et quand joue leur enfant
  ce week-end, et le score dès la fin du match, sans fouiller le site fédéral.
- **Joueuses et joueurs** (seniors surtout) : résultats, classement de leur poule, buteurs.
- **Supporters et membres du club** : suivre toutes les équipes du club.
Usage typique : sur son téléphone, le samedi ou le dimanche, souvent dans une salle
ou en voiture, quelques secondes à la fois.

## Product Purpose

Suivre le club de Clamart Handball depuis son téléphone : les matchs du week-end,
les résultats, les classements et les buteurs de chaque équipe, et une notification quand une équipe suivie a joué. Remplace, pour le suivi au quotidien,
le site Clubeo et la navigation sur ffhandball.fr.

Succès : un parent ouvre l'app le samedi soir et voit immédiatement le score de l'équipe
de son enfant et son prochain match ; ou mieux, il a déjà reçu la notification.

## Positioning

C'est l'app *du club* : toutes les équipes de Clamart réunies (14 en 2026-2027, des U11
aux seniors, championnats et coupes), avec les buteurs et la forme de chaque équipe.
La FFHB montre les compétitions une par une ; Clubeo n'est pas pensé pour le mobile ni
pour les résultats en direct.

## Operating Context

- Les données viennent de ffhandball.fr (données publiques), lues par le collecteur
  existant : mise à jour chaque matin, et toutes les 30 min le samedi et le dimanche
  de ~14 h à ~23 h. Pas de score en direct pendant un match.
- Le week-end est le moment clé : plusieurs matchs d'équipes différentes, à domicile
  ou à l'extérieur (nom et adresse de la salle disponibles).
- Une saison = des championnats (départemental, régional) et des coupes, avec
  phases et poules qui changent en cours de saison.

## Capabilities and Constraints

Confirmé :
- Résultats du week-end, prochains matchs, calendrier par équipe.
- Classement de la poule, bilan, forme (V/N/D), place.
- Détail de match : score, mi-temps, salle, lien feuille de match FFHB, buteurs (seniors).
- Buteurs du club (seniors uniquement).
- Suivre une ou plusieurs équipes (favoris).
- Notifications push : résultats (et prochains matchs) des équipes suivies.
- Agenda .ics par équipe (déjà produit par le collecteur).

Hors périmètre (v1) :
- Actualités du club, articles, photos (écartées le 14/10/2026 ; à reconsidérer plus tard).

Non décidé :
- Nom définitif des équipes affichées (renommage possible dans config.json).

Contraintes :
- Budget nul hors frais de store (Google Play 25 $ une fois ; Apple 99 $/an, plus tard).
- Dépendance au format du site ffhandball.fr (balises `smartfire-component`).

## Brand Commitments

- Nom : **Clamart Handball**.
- Logo officiel : `assets/logo-clamart.png` (500×500, écusson rond : anneau rouge « CLAMART »,
  bandeau noir « 20 · 06 » et « HANDBALL », cœur blanc cerclé de bleu nuit avec un joueur
  en silhouette noire, sur fond rouge). Ne pas le redessiner ni le déformer.
- Couleurs officielles (relevées sur le logo) : rouge `#DB0000`, rouge écusson `#C21100`,
  noir `#000000`, bleu nuit `#142A3D`, crème `#FFFEF0`, blanc `#FFFFFF`.
- Lettrage du logo : capitales grotesques très larges et grasses, en crème.
- Fondé en 2006.
- Références de finition choisies (14/10/2026) : **FotMob** et **l'app officielle du PSG**.
  Leur niveau de soin est la barre ; l'app reste chaleureuse et simple, pas une copie.
- Langue : français uniquement.

## Evidence on Hand

- `club.json` réel (saison 2026-2027, généré le 13/10/2026) : 14 équipes, classements,
  20+ matchs par équipe, 42 buteurs. Source : collecteur du zip `clamart-handball.zip`.
- Agendas `.ics` par équipe + `club.ics`.
- Logo : `assets/logo-clamart.png`.
- Aucune photo, aucun partenaire fournis : ne pas en fabriquer.

## Product Principles

1. **Le week-end d'abord.** L'écran d'accueil répond à « qui joue, où, et quel score ? ».
2. **Mes équipes avant tout le club.** Les équipes suivies passent devant le reste.
3. **Toujours dire de quand datent les données.** Pas de faux direct ; heure de mise à jour visible.
4. **Les mineurs ne sont jamais nommés.** Statistiques individuelles seniors uniquement ;
   un joueur qui le demande est masqué.
5. **Zéro saisie pour que ça marche.** Tout arrive seul depuis la FFHB ; personne n'a rien à saisir.

## Accessibility & Inclusion

Public large (parents, grands-parents, enfants) : textes lisibles en extérieur et en salle,
tailles de police système respectées (Dynamic Type / échelle Android), contrastes AA,
cibles tactiles confortables, information jamais portée par la couleur seule
(V/N/D écrits, pas seulement colorés).
