---
version: 1
slug: "app-src-app-tabs-index-tsx"
primary_target: "app/src/app/(tabs)/index.tsx"
related_targets: ["app/src/app/(tabs)/matchs.tsx"]
---

# App Clamart Handball — écrans principaux

Mode : **Operate** (on vient vérifier un score, un horaire, un classement).
Portée : toute l'app mobile (Accueil, Matchs, Équipes + fiche équipe, fiche match, Buteurs,
premier lancement, Réglages). Plateforme adaptive : Android d'abord (Material 3), iOS ensuite.

Public et tâche : parents, joueurs, supporters ; samedi soir / dimanche, quelques secondes.
Voir le score de *mon* équipe et son prochain match en moins de 3 s ; sinon, la notification.

Références de finition : FotMob, app officielle du PSG.

## Direction contract

THESIS: Une app de club chaleureuse qui parle comme un bénévole au bord du terrain : chaque
résultat est dit en une phrase simple. Refuse l'app de scores sombre à néon et la grille de
cartes interchangeables ; l'onglet Matchs garde pourtant la rigueur d'une app de scores.

OWN-WORLD: Fond crème chaud (dérivé du crème `#FFFEF0` du logo), cartes blanches à grands
rayons, ombres douces décalées. Texte noir chaud ; bleu nuit `#142A3D` pour scores et titres ;
rouge `#DB0000` réservé à l'actionnable (bouton plein, onglet actif, cloche suivre). Police
arrondie humaniste (Nunito), chiffres tabulaires. Sombre : fond bleu nuit, cartes `#1E3549`.
L'écusson officiel en tête d'Accueil, jamais redessiné.

STORY: J'ouvre, on me dit bonsoir et de quand datent les données ; mes équipes d'abord,
chacune avec son dernier résultat en phrase ou son prochain match ; puis tout le club. Je
comprends en un coup d'œil, j'ajoute le match à mon agenda ou je lance l'itinéraire.

FIRST VIEWPORT: Barre d'état ; écusson 44 dp + « Bonsoir ! » + « Week-end du 10–11 oct. · mis à
jour 22:40 ». Cartes « Mes équipes » pleine largeur : catégorie, phrase-résultat en titre,
score bleu nuit à droite, salle/place, pastille de forme, action rouge. Liste « Tout le club »
compacte en dessous. Barre de navigation Material 4 onglets : Accueil, Matchs, Équipes, Buteurs.
Onglet Matchs : pastilles de jours, groupes par catégorie, lignes équipe/score façon FotMob.

FORM: Fusion de l'app grand public chaleureuse (challenger catalogue, 1re carte challenger) et
du standard des apps de scores (onglet Matchs), choisie par l'utilisateur ; seed 8a06d43e.
Signature : le résultat raconté en une phrase, sur l'Accueil et dans les notifications.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Décisions ouvertes
- Nom affiché des équipes (renommage via config.json).
- Onglet Classements séparé : non en v1 (classement dans la fiche équipe).
