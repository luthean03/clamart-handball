# Clamart Handball — résultats, classements et buteurs

Site statique pour les membres et les supporters du club : prochains matchs, résultats,
classements de chaque équipe, buteurs, et agenda à ajouter à son téléphone.
Les données viennent de ffhandball.fr et sont mises à jour automatiquement.

```
config.json                 réglages du club (nom, couleurs, catégories avec stats joueurs)
collecteur/
  collecte.py               récupère les données sur ffhandball.fr -> site/data/
  ffhandball.py             bibliothèque de lecture du site FFHB
  cache/                    matchs déjà joués (téléchargés une seule fois)
site/
  index.html, style.css, app.js   le site (aucune compilation nécessaire)
  data/club.json            toutes les données affichées
  data/agenda/*.ics         un calendrier par équipe + club.ics
.github/workflows/mise-a-jour.yml  mise à jour automatique + publication
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
le samedi et le dimanche après-midi.

Nom de domaine du club (optionnel) : *Settings → Pages → Custom domain*.

## Tester sur son ordinateur

```bash
pip install -r collecteur/requirements.txt
python collecteur/collecte.py          # ~1 minute la première fois
python -m http.server -d site 8000     # puis ouvrir http://localhost:8000
```

Derrière un proxy d'entreprise (erreur `CERTIFICATE_VERIFY_FAILED`) :
installer `truststore` (déjà dans requirements.txt) ou définir
`FFHB_CA_BUNDLE=chemin/vers/certificats.pem`.

## Réglages (`config.json`)

- `site.couleur_principale`, `site.couleur_accent` : couleurs du site.
- `stats_joueurs.categories` : catégories dont les noms de joueurs et buts sont publiés.
  Par défaut `["seniors"]` uniquement : **les joueurs des équipes de jeunes (mineurs) ne
  sont jamais nommés**.
- `noms_equipes` : renommer une équipe (`"32542-clamart-handball-1": "Seniors Filles 1"`).
  Les identifiants sont visibles dans l'adresse des pages équipe (`#/equipe/<id>`).
- `club.motifs_nom_equipe` : texte qui identifie les équipes du club dans les noms FFHB
  (utile pour les ententes : ajouter par ex. `"ENT. CLAMART"`).

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

## Données et vie privée

- Source : ffhandball.fr (données publiques), citée en bas de chaque page.
- Aucun numéro de licence, aucun nom d'arbitre ou d'officiel n'est repris.
- Noms des joueurs : seniors uniquement (voir ci-dessus). À faire valider par le bureau
  de l'association ; un joueur qui le demande est retiré en ajoutant son nom à
  `stats_joueurs.joueurs_masques`.
- Le collecteur fait quelques dizaines de requêtes par passage, espacées d'une seconde.

## App mobile

L'app (`app/`) lit `site/data/club.json` publié sur GitHub Pages :
`https://<compte>.github.io/clamart-handball/data/club.json`.

Contrat de données : `version_schema` = 2. Chaque équipe FFHB porte un `collectif`
(ex. `seniors-m`) qui regroupe toutes ses compétitions ; la liste est dans `collectifs`.
L'id d'un collectif vient du nom construit depuis la FFHB : un renommage dans
`noms_equipes` change le nom affiché, pas l'id (les abonnés aux notifications ne le perdent pas).
Deux équipes de même nom ? Les séparer dans `config.json → collectifs`
(`"<equipe_id>": "<autre-id>"`, la valeur est mise en minuscules-tirets). Une surcharge vise
un `equipe_id`, qui change avec chaque nouvelle compétition ou phase : l'ajouter aussi pour
les nouveaux identifiants de l'équipe en cours de saison.

Tests du collecteur :

```bash
pip install -r collecteur/requirements-dev.txt
python -m pytest collecteur/tests -q
```
