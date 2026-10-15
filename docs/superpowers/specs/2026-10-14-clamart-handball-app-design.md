# App mobile Clamart Handball — spec de conception

Date : 14/10/2026 · Statut : à relire · Références : [PRODUCT.md](../../../PRODUCT.md),
contrat de direction visuelle : [.impeccable/surfaces/app-src-app-tabs-index-tsx.md](../../../.impeccable/surfaces/app-src-app-tabs-index-tsx.md)

## 1. Objectif

Une app mobile pour suivre les équipes du Clamart Handball : résultats du week-end, prochains
matchs, classements, buteurs, et une notification quand une équipe suivie a joué.
Android d'abord (Google Play), iOS ensuite. Gratuit à faire tourner (seuls frais : Google Play
25 $ une fois ; Apple 99 $/an plus tard).

**Succès :** le samedi soir, un parent ouvre l'app et voit en moins de 3 secondes le score de
l'équipe de son enfant et son prochain match — ou il a déjà reçu la notification.

### Hors périmètre (v1)
Actualités / articles / photos du club · score en direct pendant le match · comptes
utilisateurs · publication iOS · widgets · boutique, inscriptions, partenaires.

## 2. Architecture

```
ffhandball.fr ──lecture──▶ collecteur (Python) ──▶ data/club.json ──▶ GitHub Pages ──▶ app
                           GitHub Actions             │
                                                      └──▶ notifieur (Python) ──▶ FCM ──▶ téléphones
```

Un seul dépôt GitHub public **`clamart-handball`** (de préférence au nom du club) :

```
clamart-handball/
  config.json                 réglages du club (existant, étendu §3.3)
  collecteur/                 existant : ffhandball.py, collecte.py, cache/
    notifieur.py              NOUVEAU : détecte les nouveaux résultats, envoie les push
    etat/notifications.json   NOUVEAU : registre des notifications déjà envoyées
    tests/                    NOUVEAU : pytest
  site/                       existant : petit site web de secours + data/ publiée
    confidentialite.html      NOUVEAU : politique de confidentialité (exigée par Google Play)
  app/                        NOUVEAU : l'app Expo
  .github/workflows/mise-a-jour.yml   existant, étendu (§4.4)
```

Pas de serveur, pas de base de données, pas de compte utilisateur. Les équipes suivies sont
stockées sur le téléphone. Les notifications passent par **Firebase Cloud Messaging (FCM)
avec un « sujet » (topic) par équipe** : le téléphone s'abonne au sujet ; le notifieur publie
sur le sujet. Aucune liste de téléphones à stocker.

### Comptes à créer (guidés pas à pas pendant l'implémentation)
1. GitHub (compte du club) — dépôt + Actions + Pages.
2. Firebase (compte Google) — projet `clamart-handball`, app Android `fr.clamarthandball.app`,
   fichier `google-services.json`, compte de service pour l'envoi (secret GitHub).
3. Expo (gratuit) — builds EAS.
4. Google Play Console (25 $) — au moment de la publication.

## 3. Données

### 3.1 Contrat existant (`club.json`, produit par `collecte.py`)
Conservé tel quel : `club`, `site`, `saison`, `mis_a_jour` (ISO UTC), `source`,
`equipes[]` (id, nom, competition, detail, niveau, categorie, genre, poule, url_ffhb,
stats_joueurs, classement[], matchs[], bilan, forme, place, nb_equipes), `buteurs_club[]`,
`erreurs[]`. Un match : id, date (ISO avec fuseau, ou `null` si non programmé), journee,
domicile, adversaire, score_nous/score_eux, mt_nous/mt_eux, resultat (`V`/`N`/`D`/`null`),
url_ffhb, feuille_de_match, salle {nom, adresse}, buteurs[] (seniors uniquement).

### 3.2 Ajouts au contrat
Problème : une même équipe joue plusieurs compétitions (« Seniors M » existe en départemental,
régional et Coupe de France, avec trois `id` différents), et l'`id` change quand une phase
change. On ne peut donc pas suivre un `id`.

- **`collectifs[]`** (racine) : l'unité que l'on suit.
  `{ "id": "seniors-m", "nom": "Seniors M", "categorie": "seniors", "genre": "M",
     "equipes": ["32546-clamart-handball", "33403-clamart-handball", "33244-clamart-handball"] }`
  `id` = slug du nom affiché ; stable toute la saison.
- **`equipes[].collectif`** : l'id du collectif de rattachement.
- **`version_schema`** : `2` (l'app refuse proprement un schéma inconnu, §5.6).

Le regroupement se fait par le nom construit depuis les libellés FFHB (**avant** `noms_equipes` :
un renommage change le nom affiché, jamais l'id, pour ne désabonner personne), surchargeable par
`config.json → collectifs` (§3.3) si deux équipes distinctes portent le même nom.

### 3.3 Ajouts à `config.json`
```json
"collectifs": { "commentaire": "Optionnel : forcer le collectif d'une équipe (equipe_id → id de collectif)." },
"notifications": { "fuseau": "Europe/Paris", "max_par_passage": 40, "rappels_a_partir_de": "16:30" }
```

### 3.4 Règles de confidentialité (inchangées, rappelées)
Noms et buts des joueurs : catégories `stats_joueurs.categories` uniquement (seniors).
Mineurs jamais nommés, ni dans l'app ni dans les notifications. `joueurs_masques` respecté.
Aucun numéro de licence, arbitre ou officiel.

## 4. Notifieur

### 4.1 Rôle
Après chaque collecte, comparer l'état publié et le registre, puis envoyer :
- **Résultat** — un match d'un collectif passe à `resultat ≠ null` → sujet `resultats-<collectif>`.
- **Rappel la veille** (option côté app, désactivée par défaut) — match programmé le
  lendemain (heure de Paris) → sujet `rappels-<collectif>`, envoyé par le premier passage
  à partir de 16 h 30 heure de Paris (`rappels_a_partir_de`).

### 4.2 Textes
- Résultat, façon banderole (choix de l'utilisateur du 15/10/2026 : pas de phrase, juste le score) :
  titre = équipe à domicile à gauche, score au centre, équipe à l'extérieur à droite —
  `Clamart 32 – 22 Ent. Suresnes / Nanterre` (à l'extérieur : `Paris SC 1D 17 – 20 Clamart`) ;
  corps = catégorie · compétition — `Seniors F 1 · D1 territoriale`.
  Données : `{type:"resultat", collectif, equipe_id, match_id}`.
  Image (Android « grande image ») : banderole 1024 × 512 dessinée par le serveur — écusson de
  l'équipe qui reçoit à gauche, score au centre, écusson de l'autre équipe à droite, en-tête
  catégorie · compétition ; écusson FFHB de l'adversaire (`logo_adversaire`) ou ses initiales.
  Publiée sur GitHub Pages (`site/notifs/`) avant l'envoi, purgée après 60 jours.
- Rappel : titre `Demain 16:15 · Seniors F 1`, corps `Contre Cellois HB · Gymnase Victor Hugo
  (extérieur)`. Données : `{type:"rappel", collectif, equipe_id, match_id}`.
- Jamais de nom de joueur dans une notification.

### 4.3 Fiabilité
- **Registre** `collecteur/etat/notifications.json` : clés `resultat:<match_id>` et
  `rappel:<match_id>` avec la date d'envoi. Une clé n'est écrite qu'après un envoi réussi →
  pas de doublon, réessai automatique au passage suivant. Entrées purgées après 60 jours.
- **Premier déploiement** : registre absent → tous les résultats existants sont marqués
  « déjà envoyés » sans rien envoyer (pas de rafale de vieux scores).
- **Fenêtre** : un résultat n'est notifié que si le match date de moins de 3 jours.
- **Plafond** : `max_par_passage` messages ; au-delà, le reste part au passage suivant.
- **Sans secret** `FIREBASE_SERVICE_ACCOUNT` ou avec `--essai` : n'envoie rien, affiche ce
  qui serait envoyé (utilisé en test et en local).
- Envoi via l'API FCM HTTP v1 (`google-auth` pour le jeton OAuth).

### 4.4 Workflow GitHub Actions (extension de l'existant)
Trois jobs successifs : collecte (+ images des notifications) → publication Pages → envoi des
notifications (l'image doit être en ligne avant l'envoi).
Horaires (UTC) : existant (5:15 tous les jours ; */30 12–21 h sam. et dim.) **+ 15:45
tous les jours** (16 h 45 à Paris en hiver, 17 h 45 en été) pour les rappels et les matchs
de semaine. Étapes : collecte → notifieur → commit de `site/data`, `collecteur/cache`,
`collecteur/etat` → publication Pages. Un échec du notifieur ne bloque pas la publication.

## 5. App mobile

### 5.1 Pile technique
- **Expo** (dernier SDK stable), **TypeScript**, **expo-router** (fichiers sous `app/src/app/`).
- **react-native-paper** (Material 3) : barre de navigation, chips, boutons segmentés,
  snackbars, dialogues — thémé aux couleurs du club (§6).
- **@react-native-firebase/app + messaging** (nécessite un *development build* EAS, pas Expo Go).
- **@tanstack/react-query** + persistance AsyncStorage : cache hors ligne de `club.json`.
- **expo-calendar** (ajouter un match à l'agenda), **expo-web-browser** (feuille de match,
  page FFHB), `Linking` (itinéraire vers l'adresse de la salle).
- **@expo-google-fonts/nunito**.
- Identifiant Android : `fr.clamarthandball.app` · schéma de lien : `clamart://`.
- URL des données : variable `EXPO_PUBLIC_DATA_URL` (ex. `https://<compte>.github.io/clamart-handball/data/club.json`).

### 5.2 Écrans
| Route | Écran | Contenu |
|---|---|---|
| `(tabs)/index` | **Accueil** | Écusson, salutation selon l'heure, « Week-end du … · mis à jour HH:MM ». Une carte par collectif suivi : phrase-résultat du dernier match du week-end **ou** prochain match (jour, heure, salle, dom./ext.), score, place/nb équipes, forme (5 derniers V/N/D), action « Ajouter à l'agenda » (match à venir) ou « Voir le match ». Puis « Tout le club ce week-end » : liste compacte de tous les matchs. |
| `(tabs)/matchs` | **Matchs** | Pastilles de jours ayant des matchs (fenêtre glissante, aujourd'hui pré-sélectionné ou prochain jour de match). Filtre segmenté *Mes équipes / Tout le club*. Groupes par catégorie (Seniors, U18…U11). Ligne façon FotMob : heure ou « Fin », deux lignes équipe, scores à droite, gagnant en gras, Clamart repéré par l'écusson. |
| `(tabs)/equipes` | **Équipes** | Collectifs groupés par catégorie, avec place et forme ; cloche « suivre » sur chaque ligne. |
| `equipe/[collectif]` | **Fiche équipe** | En-tête (nom, compétitions, place), cloche suivre. Vues segmentées : **Matchs** (saison complète, toutes compétitions), **Classement** (poule par poule, ligne Clamart surlignée), **Buteurs** (seniors uniquement ; vue absente sinon). Lien « Agenda de l'équipe (.ics) » à copier. |
| `match/[id]` | **Fiche match** | Phrase-résultat, score final et mi-temps, date/heure, compétition et journée, salle + bouton **Itinéraire**, bouton **Feuille de match** (si dispo), **Voir sur ffhandball.fr**, buteurs Clamart (seniors). Avant le match : Ajouter à l'agenda. |
| `(tabs)/buteurs` | **Buteurs** | Classement club (seniors) : rang, joueur, équipe(s), buts, matchs, moyenne, record. |
| `bienvenue` | **Premier lancement** | « Quelles équipes suivez-vous ? » (chips par catégorie, plusieurs choix, « Passer » possible) → explication puis demande d'autorisation des notifications (Android 13+). |
| `reglages` | **Réglages** (icône en haut de l'Accueil) | Équipes suivies ; notifications de résultats (on/off global) ; **rappel la veille (off par défaut)** ; données : dernière mise à jour, source FFHB ; politique de confidentialité ; version. |

Navigation : barre Material 3 en bas, 4 onglets (Accueil, Matchs, Équipes, Buteurs) ;
retour système Android respecté partout ; affichage bord à bord avec les insets.

### 5.3 Suivre une équipe
- Suivre = enregistrer l'id du collectif localement **et** s'abonner à `resultats-<id>`
  (et à `rappels-<id>` si l'option rappel est active). Ne plus suivre = se désabonner.
- Changer l'option rappel = (dés)abonner tous les sujets `rappels-*` des collectifs suivis.
- Au démarrage, l'app ré-applique les abonnements (idempotent) pour réparer un état perdu.
- Si un collectif suivi disparaît des données (fin de saison), il est retiré avec un
  message discret dans Réglages.

### 5.4 Notifications reçues
Appui sur une notification → ouverture de `match/[match_id]`. App au premier plan →
snackbar « Seniors F 1 : victoire 32–22 » avec action « Voir ».

### 5.5 Rafraîchissement
Au lancement et au retour au premier plan si les données ont plus de 5 min ; tirer pour
rafraîchir sur Accueil et Matchs ; à la réception d'une notification. Affichage immédiat du
cache, mise à jour en arrière-plan.

### 5.6 États et cas limites
- **Chargement initial sans cache** : squelettes de cartes (pas de spinner plein écran).
- **Hors ligne / erreur réseau** : données en cache + bandeau « Hors ligne · données du sam. 10 à 22:40 ».
- **Données anciennes** (`mis_a_jour` > 36 h en période de compétition) : mention discrète
  « Les résultats n'ont pas été mis à jour depuis … ».
- **Schéma inconnu** (`version_schema` > supporté) : message « Mettez l'app à jour » + lien Play Store.
- **Score pas encore publié** (match passé, `resultat` null) : « Score pas encore publié ».
- **Match non programmé** (`date` null) : « Date à venir », rangé en fin de calendrier.
- **Pas de match ce week-end** : « Pas de match ce week-end · prochain : sam. 17 à 18:00 ».
- **Aucune équipe suivie** : l'Accueil invite à en choisir (lien vers la sélection).
- **Trêve / fin de saison** : Accueil affiche le prochain match connu, sinon « Fin de saison ».
- **Poule sans classement** (coupe) : vue Classement absente ; poule à 2 équipes affichée telle quelle.
- **Noms longs** (ex. « ASSOCIATION SPORTIVE ST-CYR/FONTENAY HANDBALL 78 ») : 2 lignes max puis ellipse.
- **Volumes** : 14 équipes / ~11 collectifs, 0 à 14 matchs par week-end, ~20 matchs par équipe.

### 5.7 Accessibilité
Respect de l'échelle de police système (pas de tailles figées), contrastes AA en clair et en
sombre, cibles ≥ 48 dp, résultat jamais porté par la seule couleur (V/N/D écrits), libellés
lecteur d'écran (« Clamart 32, Suresnes Nanterre 22, victoire »), animations réduites si
l'option système est active.

## 6. Design

### 6.1 Direction
Fusion choisie par l'utilisateur : **app grand public chaleureuse** (Accueil, fiches) +
**standard des apps de scores** (onglet Matchs). Références de finition : FotMob, app du PSG.
Contrat complet : [surface brief](../../../.impeccable/surfaces/app-src-app-tabs-index-tsx.md) ;
maquettes de référence : `.impeccable/mocks/decision/challenger-warm.html` et `canon.html`.

- Couleurs : fond crème chaud, cartes blanches à grands rayons, texte noir chaud ;
  bleu nuit `#142A3D` scores et titres ; rouge `#DB0000` réservé à l'actionnable.
  Thème sombre complet (fond bleu nuit). Couleurs d'état V/N/D sobres et toujours doublées
  d'un texte. Couleurs exprimées en rôles Material 3 (primary, surface, …), jamais en dur.
- Police : Nunito (titres et texte), chiffres tabulaires pour les scores.
- Logo : `assets/logo-clamart.png` tel quel (icône d'app : écusson sur fond rouge `#DB0000`).

### 6.2 Signature : le résultat en une phrase
Fonction pure `phraseResultat(match, contexte)` partagée app / notifieur (règles identiques,
testées des deux côtés) :
- `Victoire contre X` / `Défaite contre X` / `Match nul contre X`.
- Écart de 1 but : `Victoire d'un but contre X`, `Défaite d'un but contre X`.
- Série : `3e victoire de suite` en sous-titre quand la série ≥ 3.
- **Jamais de vocabulaire dévalorisant** (« lourde défaite », « écrasé ») : ce sont souvent
  des enfants. Pas d'adjectif sur les défaites.

### 6.3 Fin de chantier design
Selon le contrat : revue de finition sur émulateur Android (clair, sombre, police 1,3×),
puis rédaction de `DESIGN.md` depuis l'app construite.

## 7. Tests

- **Collecteur / notifieur (pytest)** : construction des `collectifs` sur le vrai
  `club.json` ; notifieur sur paires « avant / après » fabriquées depuis les données réelles
  (nouveau résultat, doublon, premier déploiement, fenêtre de 3 jours, plafond, rappel du
  lendemain avec fuseau Paris, mode essai sans secret). Jamais de vraie requête FFHB/FCM.
- **App (Jest + React Native Testing Library)** : `phraseResultat`, regroupement par
  week-end/jour (fuseau Paris), sélecteurs (mes équipes, prochain match), rendu des écrans
  avec le vrai `club.json` en fixture, chaque état du §5.6.
- **Manuel** : émulateur Android (clair, sombre, police 1,3×), réception d'une vraie
  notification de test via le mode d'envoi manuel du workflow.

## 8. Livraison par étapes

1. **Dépôt et données** : dépôt GitHub, collecteur étendu (`collectifs`, `version_schema`),
   Pages en ligne, tests.
2. **App en lecture** : tous les écrans du §5.2 sauf notifications, hors ligne, thème,
   premier lancement ; build de développement sur émulateur.
3. **Notifications** : projet Firebase, notifieur + registre + workflow, abonnements dans
   l'app, ouverture du match depuis la notification, option rappel.
4. **Publication Android** : icône, écran de démarrage, politique de confidentialité,
   fiche Play Store, formulaire « sécurité des données » (identifiant d'appareil FCM, aucune
   donnée personnelle), test interne puis production.
5. **iOS** (plus tard) : compte Apple, APNs dans Firebase, ajustements HIG.

## 9. Risques

- **Changement du site FFHB** : le collecteur casse ; le workflow échoue et prévient par
  e-mail, l'app garde les dernières données. Seul point fragile structurel.
- **Pause des workflows GitHub** après 60 jours sans activité (été) : relance manuelle
  documentée ; les commits de données comptent comme activité.
- **Délai des résultats** : ils dépendent de la saisie de la feuille de match par les clubs
  sur la FFHB ; l'app ne promet jamais de direct et affiche toujours l'heure de mise à jour.
- **Topics FCM** : pas d'accusé de réception par appareil ; acceptable pour ce besoin.
