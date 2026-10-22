# Clamart Handball — l'app du club

L'application officielle du club Clamart Handball, d'abord pour Android. Elle affiche les résultats,
les matchs à venir, les classements, les joueurs de chaque match, envoie des notifications
(résultats, rappels) et propose les calendriers des équipes. Les données sont collectées
automatiquement sur ffhandball.fr et publiées sur GitHub Pages, avec la page vitrine du club.

## Comment ça marche

- Le collecteur (Python, lancé par GitHub Actions) lit ffhandball.fr et écrit `site/data/club.json`,
  les calendriers `.ics` et les images de notifications dans `site/`.
- GitHub Pages publie `site/`. L'app lit `club.json` et les calendriers depuis cette adresse.
- Après chaque collecte, les notifications Firebase (FCM) partent vers les téléphones abonnés.

## Structure du dépôt

```
app/                        application mobile (Expo / React Native, Android)
collecteur/                 collecte, agendas, images et notifications (Python)
  collecte.py               récupère les données sur ffhandball.fr -> site/data/
  ffhandball.py             bibliothèque de lecture du site FFHB
  notifieur.py              notifications FCM après chaque collecte
  cache/                    matchs déjà joués (téléchargés une seule fois)
  tests/                    tests pytest
site/                       site publié sur GitHub Pages
  index.html                page vitrine (statique, sans compilation)
  assets/                   police, logo et captures d'écran de la page
  data/club.json            toutes les données lues par l'app
  data/agenda/*.ics         un calendrier par équipe, club.ics, un par collectif
  data/agenda/match/*.ics   un calendrier par match à venir
  notifs/                   images des banderoles de notification
partage/                    cas de test partagés (app et collecteur)
config.json                 réglages du club (nom, couleurs, équipes, joueurs masqués)
assets/                     logo du club ; pictogramme handball (assets/pictogramme-handball.svg), fourni par le responsable du club
.github/workflows/          mise-à-jour.yml : collecte, notifications, publication
```

## Mise en ligne (une seule fois, ~15 minutes)

1. Créer un compte sur [github.com](https://github.com) (gratuit), idéalement au nom du club.
2. Créer un dépôt **public** (ex. `clamart-handball`) et y envoyer ce dossier
   (bouton *Add file → Upload files*, ou `git push`).
3. Dans le dépôt : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
4. Dans le dépôt : **Settings → Actions → General → Workflow permissions →
   Read and write permissions**, puis *Save*.
5. Onglet **Actions → Mise à jour des résultats → Run workflow**.
   Au bout de 2 à 3 minutes, le site est en ligne à l'adresse
   `https://<compte>.github.io/clamart-handball/` (affichée dans le résumé du workflow).

Ensuite, tout est automatique : mise à jour chaque matin, et toutes les 30 minutes
le samedi et le dimanche après-midi. Nom de domaine du club (optionnel) :
*Settings → Pages → Custom domain*.

## Lancer l'app en développement

Prérequis : Node.js, JDK 17, Android Studio (SDK Android et un émulateur ou un téléphone en débogage USB).

```bash
cd app
npm install
npx expo run:android      # build de développement, JDK 17 requis
npx expo start --dev-client
```

Le build exige `app/google-services.json` (fichier Firebase de l'app Android). Ce fichier est fourni
par le mainteneur du projet et n'est **jamais commité** (il est dans `.gitignore`).
`JAVA_HOME` doit pointer vers un JDK 17 (sous Windows, le dossier `jbr` d'Android Studio convient).

Expo Go ne charge pas l'app : les notifications utilisent Firebase en natif, il faut donc
le build de développement installé sur le téléphone ou l'émulateur.

## Lancer la collecte en local

```bash
python -m venv .venv
.venv/Scripts/activate              # Windows ; sous macOS/Linux : source .venv/bin/activate
pip install -r collecteur/requirements.txt
python collecteur/collecte.py       # ~1 minute la première fois
python -m http.server -d site 8000  # puis ouvrir http://localhost:8000
```

Derrière un proxy d'entreprise (erreur `CERTIFICATE_VERIFY_FAILED`) :
le paquet `truststore` (dans requirements.txt) suffit, ou définir
`FFHB_CA_BUNDLE=chemin/vers/certificats.pem`.

Pour tester les notifications sans rien envoyer : `python collecteur/notifieur.py --essai`.
Sans le secret `FIREBASE_SERVICE_ACCOUNT`, le notifieur tourne d'ailleurs en mode essai.

## Tests

```bash
pip install -r collecteur/requirements-dev.txt
pytest collecteur/tests

cd app && npm test && npm run typecheck
```

## Réglages (`config.json`)

- `site.couleur_principale`, `site.couleur_accent` : couleurs transmises à l'app dans `club.json`.
- `club.motifs_nom_equipe` : texte qui identifie les équipes du club dans les noms FFHB
  (utile pour les ententes : ajouter par ex. `"ENT. CLAMART"`).
- `noms_equipes` : renommer une équipe, par exemple
  `"32542-clamart-handball-1": "Seniors Filles 1"`. Les identifiants figurent dans `site/data/club.json`.
- `stats_joueurs.joueurs_masques` : joueurs à ne jamais afficher, tels qu'écrits sur le site
  (ex. `"Marie DUPONT"`). Tout joueur, ou son représentant légal s'il est mineur, peut le demander
  via le formulaire de contact du club ; le nom disparaît à la mise à jour suivante.
- `collectifs` : forcer le collectif d'une équipe (voir ci-dessous).

Contrat de données : `version_schema` = 3. Chaque équipe FFHB porte un `collectif`
(ex. `seniors-m`) qui regroupe toutes ses compétitions ; la liste est dans `collectifs`.
L'id d'un collectif vient du nom construit depuis la FFHB : un renommage dans
`noms_equipes` change le nom affiché, pas l'id (les abonnés aux notifications ne le perdent pas).
Deux équipes de même nom ? Les séparer dans `config.json → collectifs`
(`"<equipe_id>": "<autre-id>"`, la valeur est mise en minuscules-tirets). Une surcharge vise
un `equipe_id`, qui change avec chaque nouvelle compétition ou phase : l'ajouter aussi pour
les nouveaux identifiants de l'équipe en cours de saison.

## Notifications

Après chaque collecte, `collecteur/notifieur.py` envoie une notification aux téléphones abonnés
au sujet `resultats-<équipe>` quand un résultat est publié, et (rappel la veille, option de l'app)
au sujet `rappels-<équipe>` à partir de 16 h 30. Le registre `collecteur/etat/notifications.json`
évite les doublons. Les notifications ne nomment jamais un joueur.

Mise en place (une fois) : projet Firebase, app Android `fr.clamarthandball.app`, fichier
`app/google-services.json`, compte de service → secret GitHub `FIREBASE_SERVICE_ACCOUNT`
(contenu JSON complet).

### Notifications de test

*Actions → Mise à jour des résultats → Run workflow*, puis renseigner `test_sujet`
(ex. `seniors-f-1`) : une notification de test part sur ce collectif.

## Données et vie privée

- Source : ffhandball.fr (données publiques), citée en bas de chaque page.
- Aucun numéro de licence, aucun nom d'arbitre ou d'officiel n'est repris.
- Les joueurs de la feuille de match sont collectés par match, sous la forme initiale + nom
  et nombre de buts. Seuls ceux qui ont marqué sont affichés ; les joueurs masqués sont exclus.
  Un joueur qui le demande est retiré en ajoutant son nom à `stats_joueurs.joueurs_masques`.
- Le détail et l'exercice des droits sont dans la politique de confidentialité :
  https://luthean03.github.io/clamart-handball/confidentialite.html
- Le collecteur fait quelques dizaines de requêtes par passage, espacées d'une seconde.

## Si quelque chose ne marche pas

- **Le workflow échoue** : GitHub envoie un e-mail. Le site reste en ligne avec les
  dernières données ; la date « Dernière mise à jour » en bas de page l'indique.
- **Une équipe manque** : vérifier qu'elle apparaît en cherchant « Clamart » sur
  ffhandball.fr (recherche par club), puis relancer le workflow.
- **Le site FFHB a changé** : le collecteur s'appuie sur les données intégrées aux pages
  (balises `smartfire-component`). Une refonte du site FFHB peut nécessiter une adaptation
  de `collecteur/ffhandball.py`.
- GitHub met en pause les workflows planifiés d'un dépôt sans activité pendant 60 jours ;
  les mises à jour automatiques comptent comme activité, mais en cas de pause un simple
  *Run workflow* relance tout.
