# Plan 1 — Dépôt et données (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Installer le collecteur FFHB existant dans le dépôt `E:\MobileApp`, lui faire produire le contrat de données v2 (`collectifs`, `version_schema`) attendu par l'app, et le publier en ligne sur GitHub Pages.

**Architecture:** Le dépôt `E:\MobileApp` devient le dépôt `clamart-handball`. Le collecteur Python du template (`clamart-handball.zip`) y est importé tel quel ; on ajoute un module pur `collecteur/collectifs.py` et une fonction `assembler()` extraite de `collecte.main()`, tous deux testés avec pytest sur les vraies données du 13/10/2026. GitHub Actions exécute les tests puis la collecte, et publie `site/` sur GitHub Pages.

**Tech Stack:** Python 3.12, requests, beautifulsoup4, truststore, pytest 8, GitHub Actions, GitHub Pages.

**Spec:** [docs/superpowers/specs/2026-10-14-clamart-handball-app-design.md](../specs/2026-10-14-clamart-handball-app-design.md) (§2, §3, §8 étape 1)

## Global Constraints

- Noms et buts des joueurs publiés uniquement pour `stats_joueurs.categories` (`["seniors"]`) ; mineurs jamais nommés ; `joueurs_masques` respecté.
- Aucun numéro de licence, nom d'arbitre ou d'officiel.
- Requêtes FFHB espacées d'au moins 1 s (`ffhandball.DELAI`) ; jamais de requête FFHB dans les tests.
- `version_schema` vaut exactement `2`.
- Un id de collectif = slug du nom affiché (`[a-z0-9-]+`), stable toute la saison, utilisable tel quel dans un nom de sujet FCM (`resultats-<id>`, `rappels-<id>`).
- Tout le texte visible et les messages sont en français.
- Budget : uniquement des offres gratuites (dépôt public GitHub, Actions, Pages).

## Review Focus

1. **Deux équipes différentes avec le même nom affiché** (ex. deux « U11 Mixte » sans numéro) : elles fusionneraient dans un seul collectif. Attendu : la surcharge `config.json → collectifs` les sépare. Test : `test_surcharge_separe_deux_equipes` (Task 2).
2. **Renommage via `noms_equipes`** : le collectif suit le nom affiché après renommage. Test : `test_collectif_suit_le_nom_affiche` (Task 2).
3. **Collecte vide (FFHB injoignable)** : `club.json` existant ne doit pas être écrasé par un fichier sans équipes (comportement existant de `main()`, à préserver). Test : `test_assembler_refuse_liste_vide` (Task 2).
4. **Noms avec accents ou caractères spéciaux** (« Équipe », « U11 F 2 (filles) ») : l'id reste `[a-z0-9-]+`. Test : `test_ids_valides_pour_sujets_fcm` (Task 2).
5. **Régression des agrégats existants** : `buteurs_club` recalculé par `assembler()` doit être identique à celui publié. Test : `test_assembler_conserve_les_buteurs` (Task 2).

---

## File Structure

```
E:\MobileApp\                     (= dépôt clamart-handball)
  config.json                     importé du zip, + clés "collectifs" et "notifications"
  README.md                       importé du zip, section « App mobile » ajoutée
  .gitignore                      fusion de l'existant et du zip
  .github/workflows/mise-a-jour.yml   importé, + étape tests
  collecteur/
    ffhandball.py, collecte.py, cache/, requirements.txt   importés
    collectifs.py                 NOUVEAU : regroupement pur des équipes en collectifs
    requirements-dev.txt          NOUVEAU : pytest
    tests/
      conftest.py                 NOUVEAU : chemin d'import + fixture des données réelles
      fixtures/club-2026-10-13-v1.json   copie de site/data/club.json du zip (données v1 figées)
      test_existant.py            NOUVEAU : tests de caractérisation des fonctions existantes
      test_collectifs.py          NOUVEAU
      test_assembler.py           NOUVEAU
  partage/
    fixtures/club-2026-10-13.json NOUVEAU : mêmes données au format v2 (utilisées par l'app)
  site/                           importé (index.html, app.js, style.css, data/)
```

---

### Task 1: Importer le template et poser les tests de caractérisation

**Files:**
- Create (copie depuis le zip) : `config.json`, `README.md`, `.github/workflows/mise-a-jour.yml`, `collecteur/**`, `site/**`
- Modify: `.gitignore`
- Create: `collecteur/requirements-dev.txt`, `collecteur/tests/conftest.py`, `collecteur/tests/fixtures/club-2026-10-13-v1.json`, `collecteur/tests/test_existant.py`

**Interfaces:**
- Consumes: rien.
- Produces: fixture pytest `club_v1` (dict, contenu de `club-2026-10-13-v1.json`) ; `import collecte` et `import ffhandball` utilisables depuis les tests.

- [ ] **Step 1: Extraire le zip dans un dossier temporaire, puis copier dans le dépôt**

Le zip contient un dossier racine `clamart-handball/`. On copie son contenu (pas le dossier lui-même) à la racine de `E:\MobileApp`, sans écraser `.gitignore`.

```bash
mkdir -p "$TEMP/ch-import" && unzip -oq "/c/Users/LPS11/Downloads/clamart-handball.zip" -d "$TEMP/ch-import"
cd "$TEMP/ch-import/clamart-handball"
cp -r config.json README.md collecteur site /e/MobileApp/
mkdir -p /e/MobileApp/.github && cp -r .github/workflows /e/MobileApp/.github/
cat .gitignore
```

Expected: le `.gitignore` du zip affiche `__pycache__/`, `*.pyc`, `.venv/`, `.DS_Store`.

- [ ] **Step 2: Fusionner `.gitignore`**

Remplacer `E:\MobileApp\.gitignore` par :

```gitignore
# Python
__pycache__/
*.pyc
.venv/
.pytest_cache/
# Node / Expo
node_modules/
.expo/
dist/
*.log
# Secrets et machines
.env*
!.env.example
.DS_Store
# Impeccable
.impeccable/config.local.json
.impeccable/mocks/decision/src/
```

- [ ] **Step 3: Installer l'environnement Python**

`collecteur/requirements-dev.txt` :

```text
-r requirements.txt
pytest>=8
```

```bash
cd /e/MobileApp
python -m venv .venv
.venv/Scripts/python -m pip install -r collecteur/requirements-dev.txt
```

Expected: `Successfully installed ... pytest-8.x ...`

- [ ] **Step 4: Figer les données réelles comme fixture**

```bash
cd /e/MobileApp
mkdir -p collecteur/tests/fixtures
cp site/data/club.json collecteur/tests/fixtures/club-2026-10-13-v1.json
```

`collecteur/tests/conftest.py` :

```python
"""Configuration pytest : rend `collecte` et `ffhandball` importables, fournit les données réelles."""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

import pytest

COLLECTEUR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COLLECTEUR))

FIXTURES = Path(__file__).resolve().parent / "fixtures"
_CLUB_V1 = json.loads((FIXTURES / "club-2026-10-13-v1.json").read_text(encoding="utf-8"))


@pytest.fixture
def club_v1() -> dict:
    """club.json réel du 13/10/2026 (format v1, sans collectifs). Copie neuve à chaque test."""
    return copy.deepcopy(_CLUB_V1)
```

- [ ] **Step 5: Écrire les tests de caractérisation**

Ils figent le comportement existant dont dépend la suite (noms, catégories, genres). `collecteur/tests/test_existant.py` :

```python
"""Caractérisation du collecteur existant : ces tests doivent passer AVANT toute modification."""
import collecte


def test_categorie_de():
    assert collecte.categorie_de("+16 ANS FEMININES - DIVISION 1 TERRITORIALE 92-75") == "seniors"
    assert collecte.categorie_de("U18 MASCULINS") == "U18"
    assert collecte.categorie_de("-13 FEMININES DELAYAGE") == "U13"


def test_genre_equipe_filles_prime_sur_mixte():
    assert collecte.genre_equipe("U11 MIXTES", "CLAMART HANDBALL 2 (FILLES)") == "F"
    assert collecte.genre_equipe("U11 MIXTES", "CLAMART HANDBALL 1") == "Mixte"


def test_detail_de():
    assert collecte.detail_de("+16 ANS FEMININES - DIVISION 1 TERRITORIALE 92-75") == "D1 territoriale"
    assert collecte.detail_de("COUPE DE FRANCE DEPARTEMENTALE FEMININE") == "Coupe de France départementale"


def test_fixture_reelle(club_v1):
    assert club_v1["saison"] == "2026-2027"
    assert len(club_v1["equipes"]) == 14
    noms = [e["nom"] for e in club_v1["equipes"]]
    assert noms.count("Seniors M") == 3
    assert "collectif" not in club_v1["equipes"][0]
```

- [ ] **Step 6: Lancer les tests**

Run: `.venv/Scripts/python -m pytest collecteur/tests -v`
Expected: 4 tests PASS. Si `test_categorie_de` ou `test_detail_de` échoue, c'est que la chaîne d'exemple ne correspond pas au code importé : lire la fonction dans `collecteur/collecte.py`, corriger **l'attendu du test** pour refléter le comportement réel (on caractérise, on ne change pas le code), relancer.

- [ ] **Step 7: Commit**

```bash
cd /e/MobileApp
git add .gitignore config.json README.md .github collecteur site
git commit -m "Importe le collecteur FFHB et le site du template, avec tests de caractérisation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Collectifs et contrat de données v2

**Files:**
- Create: `collecteur/collectifs.py`, `collecteur/tests/test_collectifs.py`, `collecteur/tests/test_assembler.py`, `partage/fixtures/club-2026-10-13.json`
- Modify: `collecteur/collecte.py` (fin de fichier : `main()` et nouvelle fonction `assembler()`), `config.json`

**Interfaces:**
- Consumes: fixture `club_v1` (Task 1).
- Produces:
  - `collectifs.slug(texte: str) -> str`
  - `collectifs.construire_collectifs(equipes: list[dict], surcharges: dict[str, str] | None = None) -> list[dict]` — ajoute `equipe["collectif"]` à chaque équipe (mutation) et renvoie `[{"id", "nom", "categorie", "genre", "equipes": [equipe_id, ...]}]` dans l'ordre de première apparition.
  - `collecte.VERSION_SCHEMA = 2`
  - `collecte.assembler(equipes: list[dict], maintenant: datetime, annees: str, erreurs: list[str]) -> dict` — le contenu complet de `club.json`, lève `ValueError` si `equipes` est vide.
  - Fichier `partage/fixtures/club-2026-10-13.json` (format v2) — consommé par le Plan 2.

- [ ] **Step 1: Écrire les tests des collectifs**

`collecteur/tests/test_collectifs.py` :

```python
import re

from collectifs import construire_collectifs, slug

ATTENDUS = ["seniors-f-1", "seniors-f-1b", "seniors-m", "u18-f", "u18-m", "u15-m",
            "u13-f", "u13-m", "u11-f-2", "u11-mixte-1", "u11-mixte-3"]


def test_slug():
    assert slug("Seniors F 1") == "seniors-f-1"
    assert slug("U11 Mixte 1") == "u11-mixte-1"
    assert slug("Équipe Réserve (filles)") == "equipe-reserve-filles"


def test_onze_collectifs_dans_l_ordre(club_v1):
    collectifs = construire_collectifs(club_v1["equipes"])
    assert [c["id"] for c in collectifs] == ATTENDUS


def test_seniors_m_regroupe_trois_competitions(club_v1):
    collectifs = {c["id"]: c for c in construire_collectifs(club_v1["equipes"])}
    sm = collectifs["seniors-m"]
    assert sm["equipes"] == ["32546-clamart-handball", "33403-clamart-handball", "33244-clamart-handball"]
    assert (sm["nom"], sm["categorie"], sm["genre"]) == ("Seniors M", "seniors", "M")


def test_chaque_equipe_porte_son_collectif(club_v1):
    construire_collectifs(club_v1["equipes"])
    par_id = {e["id"]: e["collectif"] for e in club_v1["equipes"]}
    assert par_id["32542-clamart-handball-1"] == "seniors-f-1"
    assert par_id["33243-clamart-handball-1"] == "seniors-f-1"
    assert all(e.get("collectif") for e in club_v1["equipes"])


def test_surcharge_separe_deux_equipes(club_v1):
    collectifs = construire_collectifs(club_v1["equipes"], {"33403-clamart-handball": "seniors-m-region"})
    ids = {c["id"]: c for c in collectifs}
    assert ids["seniors-m"]["equipes"] == ["32546-clamart-handball", "33244-clamart-handball"]
    assert ids["seniors-m-region"]["equipes"] == ["33403-clamart-handball"]
    assert ids["seniors-m-region"]["nom"] == "Seniors M"


def test_collectif_suit_le_nom_affiche(club_v1):
    for e in club_v1["equipes"]:
        if e["nom"] == "Seniors F 1":
            e["nom"] = "Seniors Filles 1"       # effet de config.json → noms_equipes
    ids = [c["id"] for c in construire_collectifs(club_v1["equipes"])]
    assert "seniors-filles-1" in ids and "seniors-f-1" not in ids


def test_ids_valides_pour_sujets_fcm(club_v1):
    club_v1["equipes"][0]["nom"] = "Équipe d'été (filles) !"
    for c in construire_collectifs(club_v1["equipes"]):
        assert re.fullmatch(r"[a-z0-9-]+", c["id"]), c["id"]
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `.venv/Scripts/python -m pytest collecteur/tests/test_collectifs.py -v`
Expected: FAIL, `ModuleNotFoundError: No module named 'collectifs'`

- [ ] **Step 3: Implémenter `collecteur/collectifs.py`**

```python
"""
Collectifs : une équipe du club, toutes compétitions confondues.

La FFHB donne un identifiant par (compétition, équipe) et il change avec les phases.
« Seniors M » existe ainsi en départemental, régional et Coupe de France. L'app suit
un collectif, identifié par le slug de son nom affiché, stable toute la saison et
utilisable tel quel dans un nom de sujet de notification (FCM).
"""
from __future__ import annotations

import re
import unicodedata


def slug(texte: str) -> str:
    """'Seniors F 1' -> 'seniors-f-1' (minuscules ASCII, chiffres et tirets)."""
    ascii_ = unicodedata.normalize("NFKD", texte or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_.lower()).strip("-")


def construire_collectifs(equipes: list[dict], surcharges: dict[str, str] | None = None) -> list[dict]:
    """Ajoute equipe['collectif'] à chaque équipe et renvoie les collectifs (ordre d'apparition).

    surcharges : {equipe_id: collectif_id} pour séparer deux équipes de même nom.
    """
    surcharges = surcharges or {}
    collectifs: dict[str, dict] = {}
    for equipe in equipes:
        cid = surcharges.get(equipe["id"]) or slug(equipe["nom"])
        equipe["collectif"] = cid
        collectif = collectifs.setdefault(cid, {
            "id": cid, "nom": equipe["nom"], "categorie": equipe["categorie"],
            "genre": equipe["genre"], "equipes": [],
        })
        collectif["equipes"].append(equipe["id"])
    return list(collectifs.values())
```

- [ ] **Step 4: Lancer les tests**

Run: `.venv/Scripts/python -m pytest collecteur/tests/test_collectifs.py -v`
Expected: 7 PASS.

- [ ] **Step 5: Écrire les tests de `assembler()`**

`collecteur/tests/test_assembler.py` :

```python
from datetime import datetime, timezone

import pytest

import collecte

MAINTENANT = datetime(2026, 10, 13, 14, 41, 53, tzinfo=timezone.utc)


def _equipes_sans_collectif(club):
    for e in club["equipes"]:
        e.pop("collectif", None)
    return club["equipes"]


def test_assembler_contrat_v2(club_v1):
    donnees = collecte.assembler(_equipes_sans_collectif(club_v1), MAINTENANT, "2026-2027", [])
    assert donnees["version_schema"] == 2
    assert list(donnees)[0] == "version_schema"
    assert donnees["saison"] == "2026-2027"
    assert donnees["mis_a_jour"] == "2026-10-13T14:41:53+00:00"
    assert len(donnees["collectifs"]) == 11
    assert all(e["collectif"] for e in donnees["equipes"])
    assert donnees["erreurs"] == []


def test_assembler_conserve_les_buteurs(club_v1):
    attendus = club_v1["buteurs_club"]
    donnees = collecte.assembler(_equipes_sans_collectif(club_v1), MAINTENANT, "2026-2027", [])
    assert donnees["buteurs_club"] == attendus


def test_assembler_refuse_liste_vide():
    with pytest.raises(ValueError):
        collecte.assembler([], MAINTENANT, "2026-2027", [])


def test_surcharges_lues_dans_la_config():
    assert isinstance(collecte.SURCHARGES_COLLECTIFS, dict)
    assert "commentaire" not in collecte.SURCHARGES_COLLECTIFS
```

- [ ] **Step 6: Lancer pour vérifier l'échec**

Run: `.venv/Scripts/python -m pytest collecteur/tests/test_assembler.py -v`
Expected: FAIL, `AttributeError: module 'collecte' has no attribute 'assembler'`

- [ ] **Step 7: Modifier `config.json`**

Ajouter ces deux clés à l'objet racine (après `"noms_equipes"`) :

```json
  "collectifs": {
    "commentaire": "Optionnel : forcer le collectif d'une équipe. Clé = equipe_id, valeur = id de collectif (minuscules, chiffres, tirets)."
  },
  "notifications": {
    "fuseau": "Europe/Paris",
    "max_par_passage": 40,
    "rappels_a_partir_de": "16:30"
  }
```

- [ ] **Step 8: Modifier `collecteur/collecte.py`**

a) Sous `import ffhandball as ff  # noqa: E402`, ajouter :

```python
from collectifs import construire_collectifs  # noqa: E402
```

b) Sous la ligne `MASQUES = {...}`, ajouter :

```python
SURCHARGES_COLLECTIFS = {k: v for k, v in CONFIG.get("collectifs", {}).items() if k != "commentaire"}
VERSION_SCHEMA = 2
```

c) Ajouter cette fonction juste avant `def main() -> int:` :

```python
def assembler(equipes: list[dict], maintenant: datetime, annees: str, erreurs: list[str]) -> dict:
    """Contenu complet de club.json (contrat v2). Les équipes reçoivent leur 'collectif'."""
    if not equipes:
        raise ValueError("aucune équipe : club.json ne doit pas être remplacé")
    collectifs = construire_collectifs(equipes, SURCHARGES_COLLECTIFS)
    return {
        "version_schema": VERSION_SCHEMA,
        "club": {"nom": CONFIG["club"]["nom"], "id_ffhb": CLUB_ID},
        "site": CONFIG.get("site", {}),
        "saison": annees,
        "mis_a_jour": maintenant.isoformat(timespec="seconds"),
        "source": "https://www.ffhandball.fr",
        "collectifs": collectifs,
        "equipes": equipes,
        "buteurs_club": stats_club(equipes),
        "erreurs": erreurs,
    }
```

d) Dans `main()`, remplacer tout le bloc `donnees = { ... }` (de `donnees = {` jusqu'à l'accolade fermante avant `SORTIE.mkdir`) par :

```python
    donnees = assembler(equipes, maintenant, annees, ERREURS)
```

- [ ] **Step 9: Lancer toute la suite**

Run: `.venv/Scripts/python -m pytest collecteur/tests -v`
Expected: 15 PASS.

- [ ] **Step 10: Produire la fixture v2 partagée avec l'app**

```bash
cd /e/MobileApp
mkdir -p partage/fixtures
.venv/Scripts/python -c "import json,sys; sys.path.insert(0,'collecteur'); import collecte; from datetime import datetime; d=json.load(open('collecteur/tests/fixtures/club-2026-10-13-v1.json',encoding='utf-8')); v2=collecte.assembler(d['equipes'], datetime.fromisoformat(d['mis_a_jour']), d['saison'], d['erreurs']); open('partage/fixtures/club-2026-10-13.json','w',encoding='utf-8').write(json.dumps(v2, ensure_ascii=False, indent=1))"
.venv/Scripts/python -c "import json; d=json.load(open('partage/fixtures/club-2026-10-13.json',encoding='utf-8')); print(d['version_schema'], len(d['collectifs']), d['mis_a_jour'])"
```

Expected: `2 11 2026-10-13T14:41:53+00:00`

- [ ] **Step 11: Commit**

```bash
git add collecteur/collectifs.py collecteur/collecte.py collecteur/tests config.json partage
git commit -m "Collecteur : collectifs et contrat de données v2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Tests dans le workflow, collecte réelle et mise en ligne

**Files:**
- Modify: `.github/workflows/mise-a-jour.yml`, `README.md`

**Interfaces:**
- Consumes: `collecteur/tests` (Tasks 1–2).
- Produces: l'URL publique des données, notée `URL_DONNEES` = `https://<compte GitHub>.github.io/clamart-handball/data/club.json`, consommée par le Plan 2 (Task 1, `app.json → extra.urlDonnees`).

- [ ] **Step 1: Ajouter l'étape de tests au workflow**

Dans `.github/workflows/mise-a-jour.yml`, remplacer l'étape `Installer les dépendances` par :

```yaml
      - name: Installer les dépendances
        run: pip install -r collecteur/requirements-dev.txt

      - name: Tests du collecteur
        run: python -m pytest collecteur/tests -q
```

et remplacer `cache-dependency-path: collecteur/requirements.txt` par :

```yaml
          cache-dependency-path: |
            collecteur/requirements.txt
            collecteur/requirements-dev.txt
```

- [ ] **Step 2: Collecte réelle en local**

Run: `.venv/Scripts/python collecteur/collecte.py`
Expected (≈ 1 min, stderr) : une ligne `OK : 14 équipes, ... matchs, 0 erreur(s), ... s` (le nombre d'équipes peut évoluer avec la saison). En cas de `CERTIFICATE_VERIFY_FAILED` derrière un proxy d'entreprise : définir `FFHB_CA_BUNDLE` (voir README) ou lancer depuis un autre réseau.

Vérifier :

```bash
.venv/Scripts/python -c "import json; d=json.load(open('site/data/club.json',encoding='utf-8')); print(d['version_schema'], len(d['collectifs']), d['mis_a_jour'])"
```

Expected: `2 <≈11> <date du jour>`

- [ ] **Step 3: Documenter l'app dans le README**

Ajouter à la fin de `README.md` :

````markdown
## App mobile

L'app (`app/`) lit `site/data/club.json` publié sur GitHub Pages :
`https://<compte>.github.io/clamart-handball/data/club.json`.

Contrat de données : `version_schema` = 2. Chaque équipe FFHB porte un `collectif`
(ex. `seniors-m`) qui regroupe toutes ses compétitions ; la liste est dans `collectifs`.
Deux équipes de même nom ? Les séparer dans `config.json → collectifs`
(`"<equipe_id>": "<autre-id>"`).

Tests du collecteur :

```bash
pip install -r collecteur/requirements-dev.txt
python -m pytest collecteur/tests -q
```
````

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/mise-a-jour.yml README.md site/data collecteur/cache
git commit -m "Workflow : tests avant collecte ; données v2 ; doc de l'app

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Création du compte et du dépôt GitHub (action de l'utilisateur, guidée)**

L'agent ne crée pas de compte et ne saisit aucun mot de passe. Guider l'utilisateur :
1. Sur github.com, créer un compte (idéalement au nom du club) ou se connecter.
2. *New repository* → nom `clamart-handball`, **Public**, sans README ni .gitignore → *Create*.
3. Communiquer à l'agent le nom du compte (`<compte>`).

- [ ] **Step 6: Pousser le dépôt**

```bash
cd /e/MobileApp
git remote add origin https://github.com/<compte>/clamart-handball.git
git push -u origin main
```

Expected: Git Credential Manager ouvre une fenêtre de connexion GitHub **que l'utilisateur valide lui-même** ; puis `branch 'main' set up to track 'origin/main'`.

- [ ] **Step 7: Activer Pages et Actions (action de l'utilisateur, guidée)**

Dans le dépôt GitHub :
1. *Settings → Pages → Build and deployment → Source : GitHub Actions*.
2. *Settings → Actions → General → Workflow permissions → Read and write permissions → Save*.
3. *Actions → Mise à jour des résultats → Run workflow*.

- [ ] **Step 8: Vérifier la publication**

Après 2–3 minutes (workflow vert, étapes « Tests du collecteur » et « Récupérer les données » réussies) :

```bash
curl -s https://<compte>.github.io/clamart-handball/data/club.json | python -c "import json,sys; d=json.load(sys.stdin); print(d['version_schema'], len(d['collectifs']), d['mis_a_jour'])"
```

Expected: `2 <≈11> <date du passage>`. Noter l'URL exacte : c'est `URL_DONNEES` pour le Plan 2.
