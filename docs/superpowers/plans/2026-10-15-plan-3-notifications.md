# Plan 3 — Notifications (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Envoyer une notification quand une équipe suivie a joué (et, en option désactivée par défaut, un rappel la veille du match), et l'ouvrir sur la fiche du match dans l'app.

**Architecture:** Côté serveur, un module Python `collecteur/notifieur.py` exécuté par GitHub Actions juste après la collecte : il calcule les messages à partir de `site/data/club.json` et d'un registre `collecteur/etat/notifications.json`, puis les envoie par l'API FCM HTTP v1 sur des **sujets** (`resultats-<collectif>`, `rappels-<collectif>`). Côté app, le téléphone s'abonne aux sujets des équipes suivies via `@react-native-firebase/messaging` (ce qui impose désormais un *development build*, plus Expo Go), demande l'autorisation Android 13+, affiche les notifications reçues au premier plan et ouvre la fiche match quand on touche une notification. Toute la logique (messages, registre, sujets attendus, liens) est en fonctions pures testées.

**Tech Stack:** Python 3.12 (google-auth, requests, tzdata, pytest), GitHub Actions, Firebase Cloud Messaging HTTP v1 ; Expo SDK 57, @react-native-firebase/app + messaging 26.4.0, expo-dev-client, zustand, react-native-paper, Jest + RNTL 13.

**Spec:** [docs/superpowers/specs/2026-10-14-clamart-handball-app-design.md](../specs/2026-10-14-clamart-handball-app-design.md) (§4, §5.3, §5.4, §5.2 Réglages et premier lancement, §7, §8 étape 3). Décisions du Plan 2 : [2026-10-14-plan-2-journal-execution.md](2026-10-14-plan-2-journal-execution.md).

**Prérequis :** Plans 1 et 2 fusionnés dans `main` (la PR `plan-2-app`) ; données en ligne sur `https://luthean03.github.io/clamart-handball/data/club.json`.

## Global Constraints

- Sujets FCM : `resultats-<collectif>` et `rappels-<collectif>`, `<collectif>` = id de collectif `[a-z0-9-]+`.
- Rappel la veille : **désactivé par défaut** ; notifications de résultats activées par défaut pour une équipe suivie (si Android l'autorise).
- Textes résultat, façon banderole (choix de l'utilisateur, 15/10/2026 — pas de phrase) : titre = `<domicile> <score domicile> – <score extérieur> <extérieur>`, Clamart écrit « Clamart », l'adversaire via `nom_lisible` (ex. `Clamart 32 – 22 Ent. Suresnes / Nanterre`, à l'extérieur `Paris SC 1D 17 – 20 Clamart`) ; corps = `<équipe> · <compétition>` (ex. `Seniors F 1 · D1 territoriale`). Rappel : titre `Demain 16:15 · <équipe>`, corps `Contre <adversaire> · <salle> (domicile|extérieur)` (sans salle : `Contre <adversaire> · domicile|extérieur`). Données : `{type, collectif, equipe_id, match_id}` (chaînes).
- **Jamais de nom de joueur** dans une notification ; jamais d'adjectif dévalorisant.
- Registre : clé `resultat:<collectif>:<match_id>` ou `rappel:<collectif>:<match_id>` → horodatage ISO de l'envoi ; écrite **seulement après un envoi réussi** ; entrées de plus de 60 jours purgées ; registre absent = premier déploiement : les résultats de la fenêtre sont marqués sans rien envoyer.
- Résultat notifié seulement si le match date de moins de 3 jours ; au plus `max_par_passage` (40) messages par passage ; rappels seulement à partir de `rappels_a_partir_de` (16:30) heure de Paris, pour les matchs du lendemain (date de Paris).
- Sans secret `FIREBASE_SERVICE_ACCOUNT` ou avec `--essai` : rien n'est envoyé, rien n'est écrit, le passage réussit.
- Secrets : le compte de service n'existe que dans les secrets GitHub ; `app/google-services.json` n'est jamais commité ; dossiers natifs `app/android/` et `app/ios/` générés (CNG), jamais commités.
- App : à partir de ce plan, un *development build* est nécessaire (Expo Go ne charge pas Firebase). Autorisation `POST_NOTIFICATIONS` demandée à l'exécution sur Android 13+.
- Toutes les règles du Plan 2 restent : français, couleurs du thème, cibles ≥ 48 dp (`CONTENU_BOUTON`, IconButton 48×48), état dérivé, mineurs jamais nommés, aucun contournement de la configuration npm (`npx expo install` échoue ici : `npm install <paquet>@<version de node_modules/expo/bundledNativeModules.json>`).

## Review Focus

1. **Échec FCM ponctuel sur un message** (HTTP 500, délai dépassé) : les autres messages partent, celui-ci n'entre pas au registre et repart au passage suivant. Test : `test_un_echec_n_empeche_pas_les_autres` (Task 3).
2. **Secret absent** (dépôt forké, Firebase pas encore configuré) : mode essai, registre inchangé, code de sortie 0. Test : `test_main_sans_secret_ne_touche_pas_au_registre` (Task 3).
3. **Changement d'heure** (fin de l'heure d'été le dim. 25 oct. 2026) et match juste après minuit : le « lendemain » est calculé en heure de Paris. Test : `test_rappel_le_jour_du_changement_d_heure` (Task 2).
4. **Autorisation refusée dans Android** : les réglages l'indiquent et proposent d'ouvrir les réglages système ; rien ne plante. Test : `notifications bloquées` (Task 7).
5. **Notification touchée pour un match absent du cache ou en double (derby Clamart contre Clamart)** : la fiche montre le bon côté (équipe passée dans le lien) ou « Match introuvable ». Tests : `matchParId préfère l'équipe du lien` et `lien de notification` (Task 8).

---

## File Structure

```
collecteur/
  textes.py                 NOUVEAU : nom_lisible (portage du TS, contrat partage/phrases-cas.json)
  notifieur.py              NOUVEAU : planification (pur), envoi FCM, CLI
  etat/notifications.json   NOUVEAU (écrit par le workflow) : registre des envois
  requirements.txt          + google-auth, tzdata
  tests/test_textes.py, tests/test_notifieur.py, tests/test_envoi.py   NOUVEAUX
.github/workflows/mise-a-jour.yml   + passage 15:45 UTC, étape Notifications, entrée test_sujet, commit de collecteur/etat
README.md                   + section Notifications (mise en place Firebase)
.gitignore                  + app/google-services.json, app/android/, app/ios/
app/
  app.json                  + plugins Firebase, googleServicesFile, expo-dev-client
  src/notifications/
    sujets.ts               NOUVEAU : sujets attendus, plan d'abonnements (pur)
    synchro.ts              NOUVEAU : applique le plan via un client (pur, injectable)
    fcm.ts                  NOUVEAU : adaptateur @react-native-firebase/messaging + autorisation Android
    liens.ts                NOUVEAU : lien de notification → route, paramètres de route normalisés
    GestionNotifications.tsx NOUVEAU : écoute (premier plan, ouverture), snackbar « Voir »
  src/suivi/suivi.ts        + préférences de notifications, sujets abonnés, autorisation (version 2 + migration)
  src/ecrans/VueAutorisation.tsx NOUVEAU : écran « Recevoir les résultats ? » après le premier choix
  src/ecrans/VueReglages.tsx + section Notifications
  src/app/autorisation.tsx  NOUVEAU (route) ; src/app/_layout.tsx, (tabs)/_layout.tsx, bienvenue.tsx, reglages.tsx, match/[id].tsx modifiés
  src/donnees/selecteurs.ts matchParId(club, id, equipeId?)
  test/setup.ts             + mock de src/notifications/fcm
```

---

### Task 1: Noms lisibles en Python (partagés avec l'app)

**Files:**
- Create: `collecteur/textes.py`, `collecteur/tests/test_textes.py`

**Interfaces:**
- Consumes: `partage/phrases-cas.json` (contrat existant, section `noms` : 23 cas au 15/10/2026).
- Produces: `textes.nom_lisible(brut: str) -> str` — mêmes règles que `nomLisible` dans `app/src/donnees/phrase.ts`.

- [ ] **Step 1: Écrire les tests (les cas partagés font foi)**

`collecteur/tests/test_textes.py` :

```python
import json
from pathlib import Path

import pytest

from textes import nom_lisible

CAS = json.loads((Path(__file__).resolve().parents[2] / "partage" / "phrases-cas.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("cas", CAS["noms"], ids=lambda c: c["brut"])
def test_nom_lisible_cas_partages(cas):
    assert nom_lisible(cas["brut"]) == cas["attendu"]

```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `.venv/Scripts/python -m pytest collecteur/tests/test_textes.py -q`
Expected: FAIL, `ModuleNotFoundError: No module named 'textes'`

- [ ] **Step 3: Implémenter `collecteur/textes.py`**

Portage ligne à ligne de `nomLisible` (`app/src/donnees/phrase.ts`). Les deux implémentations doivent toujours passer les mêmes cas.

```python
"""
Textes affichés partagés avec l'app (portage de app/src/donnees/phrase.ts).
Contrat commun : partage/phrases-cas.json — toute évolution d'une règle passe par un nouveau cas dans ce fichier.
"""
from __future__ import annotations

import re

MINUSCULES = {"de", "du", "des", "la", "le", "les", "et", "sur", "en", "au", "aux"}
ELISIONS = {"d", "l"}  # minuscule seulement devant une apostrophe (D'ISSY, L'HAY)
ABREVIATIONS = {"st", "ste"}
SIGLES = {"AC", "AS", "ASV", "ASM", "US", "USM", "UC", "ES", "CA", "CO", "OC", "SO", "CSM", "AAS",
          "SCUF", "COM", "ASPTT", "ASC", "USO", "USMT", "PUC", "CSA", "ACBB"}
ROMAINS = {"I", "II", "III", "IV"}
_SEP = r"[\s\-/.'’()]+"


def nom_lisible(brut: str) -> str:
    """Nom FFHB en capitales → nom lisible. Sigles (SC, HB, ASV…), numéros et chiffres romains conservés."""
    morceaux = re.split(f"({_SEP})", (brut or "").strip())
    premier = True
    sortie: list[str] = []
    for i, morceau in enumerate(morceaux):
        if not morceau or re.fullmatch(_SEP, morceau):
            sortie.append(morceau)
            continue
        est_premier, premier = premier, False
        if re.search(r"\d", morceau) or morceau in ROMAINS:
            sortie.append(morceau)
            continue
        bas = morceau.lower()
        if not est_premier and bas in MINUSCULES:
            sortie.append(bas)
            continue
        suivant = morceaux[i + 1] if i + 1 < len(morceaux) else ""
        if not est_premier and re.match(r"['’]", suivant) and bas in ELISIONS:
            sortie.append(bas)
            continue
        capitale = bas[:1].upper() + bas[1:]
        if bas in ABREVIATIONS:
            sortie.append(capitale)
            continue
        if morceau == morceau.upper() and (morceau in SIGLES or (len(morceau) <= 3 and not re.search(r"[AEIOUY]", morceau))):
            sortie.append(morceau)
            continue
        sortie.append(capitale)
    return "".join(sortie)

```

- [ ] **Step 4: Lancer les tests**

Run: `.venv/Scripts/python -m pytest collecteur/tests -q`
Expected: tous PASS (23 noms + les 18 existants). Si un cas partagé échoue, comparer ligne à ligne avec `app/src/donnees/phrase.ts` : c'est le portage qui est faux, jamais le JSON.

- [ ] **Step 5: Commit**

```bash
git add collecteur/textes.py collecteur/tests/test_textes.py
git commit -m "Collecteur : noms lisibles partagés avec l'app

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Planification des notifications (pure)

**Files:**
- Create: `collecteur/notifieur.py` (partie planification), `collecteur/tests/test_notifieur.py`
- Modify: `collecteur/requirements.txt` (+ `tzdata` : Windows n'a pas de base de fuseaux pour `zoneinfo`)

**Interfaces:**
- Consumes: `textes.nom_lisible` (Task 1) ; `config.json → notifications` (Plan 1).
- Produces (dans `notifieur.py`) :
  - `@dataclass(frozen=True) class Message: cle: str; sujet: str; titre: str; corps: str; donnees: dict[str, str]; instant: str` (`instant` = date ISO du match, pour l'ordre)
  - `messages_resultats(club: dict, maintenant: datetime) -> list[Message]`
  - `messages_rappels(club: dict, maintenant: datetime, fuseau: str, a_partir_de: str) -> list[Message]`
  - `purger(registre: dict[str, str], maintenant: datetime) -> dict[str, str]`
  - `planifier(club: dict, registre: dict | None, maintenant: datetime, reglages: dict) -> tuple[list[Message], dict[str, str]]` — messages à envoyer (au plus `max_par_passage`, résultats d'abord, ordre chronologique) et registre de départ (purgé ; au premier déploiement, résultats de la fenêtre marqués).
  - Constantes `FENETRE_RESULTATS = timedelta(days=3)`, `CONSERVATION = timedelta(days=60)`.

- [ ] **Step 1: Ajouter `tzdata` aux dépendances**

`collecteur/requirements.txt` : ajouter la ligne `tzdata>=2024.1`, puis `.venv/Scripts/python -m pip install -r collecteur/requirements-dev.txt`.

- [ ] **Step 2: Écrire les tests**

`collecteur/tests/test_notifieur.py` :

```python
import copy
from datetime import datetime, timedelta, timezone

from notifieur import CONSERVATION, messages_rappels, messages_resultats, planifier, purger

REGLAGES = {"fuseau": "Europe/Paris", "max_par_passage": 40, "rappels_a_partir_de": "16:30"}
PARIS_LUNDI_MATIN = datetime(2026, 10, 12, 8, 0, tzinfo=timezone.utc)      # lun. 12 oct., 10 h à Paris


def club_v2():
    import json
    from pathlib import Path
    chemin = Path(__file__).resolve().parents[2] / "partage" / "fixtures" / "club-2026-10-13.json"
    return json.loads(chemin.read_text(encoding="utf-8"))


def test_resultats_des_3_derniers_jours():
    msgs = messages_resultats(club_v2(), PARIS_LUNDI_MATIN)
    cles = {m.cle for m in msgs}
    assert "resultat:seniors-f-1:2644292" in cles            # dim. 11 oct.
    assert "resultat:seniors-m:2673792" in cles
    assert all(m.sujet.startswith("resultats-") for m in msgs)
    assert not any(":2644268" in c for c in cles)            # 13 sept. : hors fenêtre


def test_texte_d_un_resultat():
    m = next(m for m in messages_resultats(club_v2(), PARIS_LUNDI_MATIN) if m.cle == "resultat:seniors-m:2673792")
    assert m.titre == "Clamart 21 – 22 Levallois SC 1D"          # domicile à gauche
    assert m.corps == "Seniors M · D2 territoriale"
    assert m.donnees == {"type": "resultat", "collectif": "seniors-m", "equipe_id": "32546-clamart-handball",
                         "match_id": "2673792"}


def test_banderole_d_un_match_a_l_exterieur():
    m = next(m for m in messages_resultats(club_v2(), PARIS_LUNDI_MATIN) if m.cle == "resultat:seniors-f-1b:2644473")
    assert m.titre == "Paris SC 1D 17 – 20 Clamart"               # l'équipe qui reçoit à gauche
    assert m.corps == "Seniors F 1B · D2 territoriale"


def test_jamais_de_nom_de_joueur():
    club = club_v2()
    noms = {b["joueur"] for b in club["buteurs_club"]}
    for m in messages_resultats(club, PARIS_LUNDI_MATIN):
        assert not any(n in m.titre or n in m.corps for n in noms)


def test_rappels_seulement_a_partir_de_16h30_pour_le_lendemain():
    club = club_v2()
    avant = datetime(2026, 10, 16, 14, 0, tzinfo=timezone.utc)    # ven. 16 h à Paris
    apres = datetime(2026, 10, 16, 15, 0, tzinfo=timezone.utc)    # ven. 17 h à Paris
    assert messages_rappels(club, avant, "Europe/Paris", "16:30") == []
    rappels = messages_rappels(club, apres, "Europe/Paris", "16:30")
    m = next(r for r in rappels if r.cle == "rappel:seniors-m:2734038")   # sam. 17 oct. 18:00
    assert m.sujet == "rappels-seniors-m"
    assert m.titre == "Demain 18:00 · Seniors M"
    assert m.corps == "Contre Association Sportive St-Cyr/Fontenay Handball 78 · Gymnase du Petit Clamart (domicile)"
    assert all(":2729291" not in r.cle for r in rappels)                  # dim. 18 oct. : pas demain


def test_rappel_le_jour_du_changement_d_heure():
    club = club_v2()
    eq = club["equipes"][0]
    eq["matchs"].append({**copy.deepcopy(eq["matchs"][-1]), "id": "999", "date": "2026-10-25T00:30:00+02:00",
                         "resultat": None, "score_nous": None, "score_eux": None})
    sam_soir = datetime(2026, 10, 24, 16, 0, tzinfo=timezone.utc)          # sam. 24 oct., 18 h à Paris (UTC+2)
    assert any(r.cle == f"rappel:{eq['collectif']}:999" for r in messages_rappels(club, sam_soir, "Europe/Paris", "16:30"))


def test_premier_deploiement_marque_sans_envoyer():
    a_envoyer, registre = planifier(club_v2(), None, PARIS_LUNDI_MATIN, REGLAGES)
    assert a_envoyer == []
    assert "resultat:seniors-f-1:2644292" in registre


def test_registre_existant_evite_les_doublons():
    _, registre = planifier(club_v2(), None, PARIS_LUNDI_MATIN, REGLAGES)
    a_envoyer, _ = planifier(club_v2(), registre, PARIS_LUNDI_MATIN, REGLAGES)
    assert a_envoyer == []


def test_nouveau_resultat_envoye_une_fois():
    _, registre = planifier(club_v2(), None, PARIS_LUNDI_MATIN, REGLAGES)
    del registre["resultat:seniors-f-1:2644292"]
    a_envoyer, _ = planifier(club_v2(), registre, PARIS_LUNDI_MATIN, REGLAGES)
    assert [m.cle for m in a_envoyer] == ["resultat:seniors-f-1:2644292"]


def test_plafond_par_passage():
    a_envoyer, _ = planifier(club_v2(), {}, PARIS_LUNDI_MATIN, {**REGLAGES, "max_par_passage": 2})
    assert len(a_envoyer) == 2


def test_purge_apres_60_jours():
    vieux = (PARIS_LUNDI_MATIN - CONSERVATION - timedelta(days=1)).isoformat()
    recent = PARIS_LUNDI_MATIN.isoformat()
    assert purger({"a": vieux, "b": recent}, PARIS_LUNDI_MATIN) == {"b": recent}
```

Note : `test_plafond_par_passage` utilise un registre vide `{}` (pas `None`) : ce n'est pas un premier déploiement, tous les résultats de la fenêtre sont candidats (plus de 2 au 12/10).

- [ ] **Step 3: Lancer pour vérifier l'échec**

Run: `.venv/Scripts/python -m pytest collecteur/tests/test_notifieur.py -q`
Expected: FAIL, `ModuleNotFoundError: No module named 'notifieur'`

- [ ] **Step 4: Implémenter la planification dans `collecteur/notifieur.py`**

```python
#!/usr/bin/env python3
"""
Notifieur : après chaque collecte, envoie les notifications FCM des nouveaux résultats (et des rappels la veille)
sur des sujets par collectif. Voir docs/superpowers/specs (§4).

  python collecteur/notifieur.py            # envoie (si FIREBASE_SERVICE_ACCOUNT est défini), sinon mode essai
  python collecteur/notifieur.py --essai    # n'envoie rien, n'écrit rien, affiche ce qui partirait
  python collecteur/notifieur.py --test seniors-f-1   # une notification de test sur resultats-seniors-f-1
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ICI = Path(__file__).resolve().parent
sys.path.insert(0, str(ICI))
from textes import nom_lisible  # noqa: E402

FENETRE_RESULTATS = timedelta(days=3)
CONSERVATION = timedelta(days=60)


@dataclass(frozen=True)
class Message:
    cle: str
    sujet: str
    titre: str
    corps: str
    donnees: dict
    instant: str


def _matchs(club: dict):
    for equipe in club["equipes"]:
        for match in equipe["matchs"]:
            if match.get("date"):
                yield equipe, match


def messages_resultats(club: dict, maintenant: datetime) -> list[Message]:
    sortie = []
    for eq, m in _matchs(club):
        if not m.get("resultat") or m.get("score_nous") is None or m.get("score_eux") is None:
            continue
        instant = datetime.fromisoformat(m["date"])
        if not (maintenant - FENETRE_RESULTATS <= instant <= maintenant):
            continue
        adversaire = nom_lisible(m["adversaire"])
        if m["domicile"]:
            banderole = f"Clamart {m['score_nous']} – {m['score_eux']} {adversaire}"
        else:
            banderole = f"{adversaire} {m['score_eux']} – {m['score_nous']} Clamart"
        sortie.append(Message(
            cle=f"resultat:{eq['collectif']}:{m['id']}",
            sujet=f"resultats-{eq['collectif']}",
            titre=banderole,
            corps=f"{eq['nom']} · {eq['detail']}",
            donnees={"type": "resultat", "collectif": eq["collectif"], "equipe_id": eq["id"], "match_id": str(m["id"])},
            instant=m["date"],
        ))
    return sorted(sortie, key=lambda x: (x.instant, x.cle))


def messages_rappels(club: dict, maintenant: datetime, fuseau: str, a_partir_de: str) -> list[Message]:
    tz = ZoneInfo(fuseau)
    local = maintenant.astimezone(tz)
    heure, minute = (int(x) for x in a_partir_de.split(":"))
    if (local.hour, local.minute) < (heure, minute):
        return []
    demain = (local + timedelta(days=1)).date()
    sortie = []
    for eq, m in _matchs(club):
        if m.get("resultat"):
            continue
        debut = datetime.fromisoformat(m["date"]).astimezone(tz)
        if debut.date() != demain:
            continue
        salle = (m.get("salle") or {}).get("nom")
        cote = "domicile" if m["domicile"] else "extérieur"
        lieu = f"{nom_lisible(salle)} ({cote})" if salle else cote
        sortie.append(Message(
            cle=f"rappel:{eq['collectif']}:{m['id']}",
            sujet=f"rappels-{eq['collectif']}",
            titre=f"Demain {debut.strftime('%H:%M')} · {eq['nom']}",
            corps=f"Contre {nom_lisible(m['adversaire'])} · {lieu}",
            donnees={"type": "rappel", "collectif": eq["collectif"], "equipe_id": eq["id"], "match_id": str(m["id"])},
            instant=m["date"],
        ))
    return sorted(sortie, key=lambda x: (x.instant, x.cle))


def purger(registre: dict, maintenant: datetime) -> dict:
    limite = maintenant - CONSERVATION
    return {cle: quand for cle, quand in registre.items() if datetime.fromisoformat(quand) >= limite}


def planifier(club: dict, registre: dict | None, maintenant: datetime, reglages: dict) -> tuple[list[Message], dict]:
    resultats = messages_resultats(club, maintenant)
    rappels = messages_rappels(club, maintenant, reglages["fuseau"], reglages["rappels_a_partir_de"])
    horodatage = maintenant.isoformat(timespec="seconds")
    if registre is None:
        # Premier déploiement : ne pas envoyer une rafale de vieux scores.
        return [], {m.cle: horodatage for m in resultats}
    registre = purger(registre, maintenant)
    a_envoyer = [m for m in resultats + rappels if m.cle not in registre]
    return a_envoyer[: reglages["max_par_passage"]], registre
```

- [ ] **Step 5: Lancer les tests**

Run: `.venv/Scripts/python -m pytest collecteur/tests -q`
Expected: tous PASS. Si `test_texte_d_un_resultat` échoue sur `equipe_id`, lire dans la fixture l'équipe qui porte le match `2673792` et corriger l'attendu (pas le code).

- [ ] **Step 6: Commit**

```bash
git add collecteur/notifieur.py collecteur/tests/test_notifieur.py collecteur/requirements.txt
git commit -m "Notifieur : planification des résultats et rappels, registre

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Envoi FCM et ligne de commande

**Files:**
- Modify: `collecteur/notifieur.py` (envoi + CLI), `collecteur/requirements.txt` (+ `google-auth`)
- Create: `collecteur/tests/test_envoi.py`

**Interfaces:**
- Consumes: `Message`, `planifier` (Task 2).
- Produces:
  - `corps_requete(m: Message) -> dict` — le JSON de l'API FCM HTTP v1.
  - `class EnvoyeurFCM: __init__(self, compte: dict, session=None); envoyer(self, m: Message) -> None` (lève en cas d'échec HTTP).
  - `executer(club, registre, maintenant, reglages, envoyeur) -> tuple[dict, dict]` — registre final et rapport `{"prevus", "envoyes", "echecs"}` ; `envoyeur=None` = essai.
  - `message_test(collectif: str) -> Message` (lève `ValueError` si l'id n'est pas `[a-z0-9-]+`).
  - `main(argv: list[str] | None = None, environ=os.environ, maintenant=None) -> int`.

- [ ] **Step 1: Ajouter `google-auth`**

`collecteur/requirements.txt` : ajouter `google-auth>=2.30`, puis réinstaller (`pip install -r collecteur/requirements-dev.txt`).

- [ ] **Step 2: Écrire les tests**

`collecteur/tests/test_envoi.py` :

```python
import json
from datetime import datetime, timezone

import pytest

import notifieur
from notifieur import Message, corps_requete, executer, message_test

REGLAGES = {"fuseau": "Europe/Paris", "max_par_passage": 40, "rappels_a_partir_de": "16:30"}
LUNDI = datetime(2026, 10, 12, 8, 0, tzinfo=timezone.utc)


def club_v2():
    from pathlib import Path
    return json.loads((Path(__file__).resolve().parents[2] / "partage" / "fixtures" / "club-2026-10-13.json")
                      .read_text(encoding="utf-8"))


class FauxEnvoyeur:
    def __init__(self, echoue_sur=()):
        self.envoyes, self.echoue_sur = [], set(echoue_sur)

    def envoyer(self, m):
        if m.cle in self.echoue_sur:
            raise RuntimeError("HTTP 500")
        self.envoyes.append(m)


def test_corps_requete_fcm_v1():
    m = Message("resultat:seniors-m:1", "resultats-seniors-m", "T", "C", {"type": "resultat", "match_id": "1"}, "x")
    assert corps_requete(m) == {"message": {
        "topic": "resultats-seniors-m",
        "notification": {"title": "T", "body": "C"},
        "data": {"type": "resultat", "match_id": "1"},
        "android": {"priority": "high"},
    }}


def test_envoi_et_registre():
    envoyeur = FauxEnvoyeur()
    registre, rapport = executer(club_v2(), {}, LUNDI, REGLAGES, envoyeur)
    assert rapport["envoyes"] == len(envoyeur.envoyes) > 0
    assert all(m.cle in registre for m in envoyeur.envoyes)


def test_un_echec_n_empeche_pas_les_autres():
    cle_ko = "resultat:seniors-f-1:2644292"
    envoyeur = FauxEnvoyeur(echoue_sur=[cle_ko])
    registre, rapport = executer(club_v2(), {}, LUNDI, REGLAGES, envoyeur)
    assert rapport["echecs"] == 1 and rapport["envoyes"] >= 1
    assert cle_ko not in registre
    # passage suivant : seul le message en échec repart
    envoyeur2 = FauxEnvoyeur()
    executer(club_v2(), registre, LUNDI, REGLAGES, envoyeur2)
    assert [m.cle for m in envoyeur2.envoyes] == [cle_ko]


def test_essai_n_ecrit_rien():
    registre, rapport = executer(club_v2(), {}, LUNDI, REGLAGES, None)
    assert registre == {} and rapport["envoyes"] == 0 and rapport["prevus"] > 0


def test_message_test_valide_le_sujet():
    assert message_test("seniors-f-1").sujet == "resultats-seniors-f-1"
    with pytest.raises(ValueError):
        message_test("seniors f1; rm -rf")


def test_main_sans_secret_ne_touche_pas_au_registre(tmp_path, monkeypatch):
    donnees = tmp_path / "club.json"
    donnees.write_text(json.dumps(club_v2()), encoding="utf-8")
    registre = tmp_path / "etat" / "notifications.json"
    monkeypatch.setattr(notifieur, "DONNEES", donnees)
    monkeypatch.setattr(notifieur, "REGISTRE", registre)
    assert notifieur.main([], environ={}, maintenant=LUNDI) == 0
    assert not registre.exists()


def test_main_premier_deploiement_ecrit_le_registre(tmp_path, monkeypatch):
    donnees = tmp_path / "club.json"
    donnees.write_text(json.dumps(club_v2()), encoding="utf-8")
    registre = tmp_path / "etat" / "notifications.json"
    monkeypatch.setattr(notifieur, "DONNEES", donnees)
    monkeypatch.setattr(notifieur, "REGISTRE", registre)
    monkeypatch.setattr(notifieur, "EnvoyeurFCM", lambda compte: FauxEnvoyeur())
    assert notifieur.main([], environ={"FIREBASE_SERVICE_ACCOUNT": "{\"project_id\": \"p\"}"}, maintenant=LUNDI) == 0
    contenu = json.loads(registre.read_text(encoding="utf-8"))
    assert "resultat:seniors-f-1:2644292" in contenu
```

- [ ] **Step 3: Lancer pour vérifier l'échec**

Run: `.venv/Scripts/python -m pytest collecteur/tests/test_envoi.py -q`
Expected: FAIL, `ImportError: cannot import name 'corps_requete'`

- [ ] **Step 4: Implémenter l'envoi et la CLI (fin de `collecteur/notifieur.py`)**

Ajouter aux imports en tête : `import argparse`, `import json`, `import os`, `import re`, `from datetime import timezone`. Puis, après `planifier` :

```python
RACINE = ICI.parent
DONNEES = RACINE / "site" / "data" / "club.json"
REGISTRE = ICI / "etat" / "notifications.json"
PORTEE_FCM = "https://www.googleapis.com/auth/firebase.messaging"


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def corps_requete(m: Message) -> dict:
    return {"message": {
        "topic": m.sujet,
        "notification": {"title": m.titre, "body": m.corps},
        "data": {k: str(v) for k, v in m.donnees.items()},
        "android": {"priority": "high"},
    }}


class EnvoyeurFCM:
    """Envoi par l'API FCM HTTP v1 avec un compte de service (secret FIREBASE_SERVICE_ACCOUNT)."""

    def __init__(self, compte: dict, session=None):
        import requests
        from google.oauth2 import service_account
        self.projet = compte["project_id"]
        self._credentials = service_account.Credentials.from_service_account_info(compte, scopes=[PORTEE_FCM])
        self._session = session or requests.Session()

    def envoyer(self, m: Message) -> None:
        import google.auth.transport.requests
        if not self._credentials.valid:
            self._credentials.refresh(google.auth.transport.requests.Request())
        reponse = self._session.post(
            f"https://fcm.googleapis.com/v1/projects/{self.projet}/messages:send",
            headers={"Authorization": f"Bearer {self._credentials.token}"},
            json=corps_requete(m), timeout=20)
        reponse.raise_for_status()


def executer(club: dict, registre: dict | None, maintenant: datetime, reglages: dict, envoyeur) -> tuple[dict, dict]:
    a_envoyer, registre = planifier(club, registre, maintenant, reglages)
    rapport = {"prevus": len(a_envoyer), "envoyes": 0, "echecs": 0}
    if envoyeur is None:
        for m in a_envoyer:
            log(f"[essai] {m.sujet} : {m.titre} — {m.corps}")
        return {}, rapport
    for m in a_envoyer:
        try:
            envoyeur.envoyer(m)
        except Exception as err:  # un échec n'arrête pas les autres ; le message repartira au passage suivant
            rapport["echecs"] += 1
            log(f"[!] {m.cle} : {err}")
            continue
        registre[m.cle] = maintenant.isoformat(timespec="seconds")
        rapport["envoyes"] += 1
    return registre, rapport


def message_test(collectif: str) -> Message:
    if not re.fullmatch(r"[a-z0-9-]+", collectif or ""):
        raise ValueError(f"id de collectif invalide : {collectif!r}")
    return Message(f"test:{collectif}", f"resultats-{collectif}", "Test · Clamart Handball",
                   "Ceci est une notification de test.", {"type": "test", "collectif": collectif}, "")


def main(argv: list[str] | None = None, environ=os.environ, maintenant: datetime | None = None) -> int:
    parseur = argparse.ArgumentParser(description="Notifications FCM du Clamart Handball")
    parseur.add_argument("--essai", action="store_true")
    parseur.add_argument("--test", metavar="COLLECTIF")
    args = parseur.parse_args(argv)
    maintenant = maintenant or datetime.now(timezone.utc)
    secret = environ.get("FIREBASE_SERVICE_ACCOUNT", "").strip()
    envoyeur = None if args.essai or not secret else EnvoyeurFCM(json.loads(secret))
    if envoyeur is None:
        log("Mode essai : aucun envoi, registre inchangé.")

    if args.test:
        m = message_test(args.test)
        if envoyeur:
            envoyeur.envoyer(m)
        log(f"Test {'envoyé' if envoyeur else '(essai)'} : {m.sujet}")
        return 0

    club = json.loads(DONNEES.read_text(encoding="utf-8"))
    registre = json.loads(REGISTRE.read_text(encoding="utf-8")) if REGISTRE.exists() else None
    config = json.loads((RACINE / "config.json").read_text(encoding="utf-8"))
    final, rapport = executer(club, registre, maintenant, config["notifications"], envoyeur)
    log(f"Notifications : {rapport['envoyes']} envoyée(s), {rapport['echecs']} échec(s), {rapport['prevus']} prévue(s)")
    if envoyeur is not None:
        REGISTRE.parent.mkdir(parents=True, exist_ok=True)
        tmp = REGISTRE.with_suffix(".tmp")
        tmp.write_text(json.dumps(final, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
        tmp.replace(REGISTRE)
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

Note : `test_main_premier_deploiement_ecrit_le_registre` remplace `EnvoyeurFCM` par un faux : `main` doit appeler `EnvoyeurFCM(json.loads(secret))` via le nom du module (pas un import local) pour que le remplacement s'applique.

- [ ] **Step 5: Lancer les tests**

Run: `.venv/Scripts/python -m pytest collecteur/tests -q`
Expected: tous PASS, sortie propre.

- [ ] **Step 6: Essai sur les vraies données**

Run: `.venv/Scripts/python collecteur/notifieur.py --essai`
Expected (stderr) : « Mode essai… », puis des lignes `[essai] resultats-… : …` ou aucune selon la date, puis le bilan. Aucun fichier créé (`git status` propre).

- [ ] **Step 7: Commit**

```bash
git add collecteur/notifieur.py collecteur/tests/test_envoi.py collecteur/requirements.txt
git commit -m "Notifieur : envoi FCM HTTP v1, mode essai, notification de test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Workflow, mise en place de Firebase, premier passage

**Files:**
- Modify: `.github/workflows/mise-a-jour.yml`, `README.md`, `.gitignore`

**Interfaces:**
- Consumes: `collecteur/notifieur.py` (Task 3).
- Produces: secret GitHub `FIREBASE_SERVICE_ACCOUNT` ; fichier local `app/google-services.json` (non commité) ; registre `collecteur/etat/notifications.json` commité par le workflow ; entrée manuelle `test_sujet` du workflow (utilisée en Task 9).

- [ ] **Step 1: Ignorer les fichiers natifs et Firebase**

Ajouter à `.gitignore` :

```gitignore
# Firebase / builds natifs (CNG)
app/google-services.json
app/GoogleService-Info.plist
app/android/
app/ios/
```

- [ ] **Step 2: Étendre le workflow**

Dans `.github/workflows/mise-a-jour.yml` :

a) sous `schedule:`, ajouter :

```yaml
    - cron: "45 15 * * *"         # tous les jours vers 17 h 45 (été) / 16 h 45 (hiver) : rappels et matchs de semaine
```

b) remplacer `workflow_dispatch:` par :

```yaml
  workflow_dispatch:
    inputs:
      test_sujet:
        description: "Optionnel : id d'équipe (ex. seniors-f-1) pour envoyer une notification de test"
        required: false
        default: ""
```

c) entre l'étape « Récupérer les données sur ffhandball.fr » et « Enregistrer les nouvelles données », ajouter (l'entrée passe par une variable d'environnement, jamais interpolée dans le script) :

```yaml
      - name: Notifications
        if: github.event_name != 'push'
        continue-on-error: true
        env:
          FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          TEST_SUJET: ${{ inputs.test_sujet }}
        run: |
          if [ -n "$TEST_SUJET" ]; then
            python collecteur/notifieur.py --test "$TEST_SUJET"
          else
            python collecteur/notifieur.py
          fi
```

d) dans « Enregistrer les nouvelles données », remplacer `git add site/data collecteur/cache` par :

```yaml
          git add site/data collecteur/cache collecteur/etat
```

- [ ] **Step 3: Documenter dans le README**

Ajouter à la fin de `README.md` :

````markdown
## Notifications

Après chaque collecte, `collecteur/notifieur.py` envoie une notification aux téléphones abonnés
au sujet `resultats-<équipe>` quand un résultat est publié, et (rappel la veille, option de l'app)
au sujet `rappels-<équipe>` à partir de 16 h 30. Le registre `collecteur/etat/notifications.json`
évite les doublons. Sans le secret `FIREBASE_SERVICE_ACCOUNT`, le notifieur tourne en mode essai.

Mise en place (une fois) : projet Firebase, app Android `fr.clamarthandball.app`, fichier
`app/google-services.json` (ne pas le commiter), compte de service → secret GitHub
`FIREBASE_SERVICE_ACCOUNT` (contenu JSON complet). Notification de test :
*Actions → Mise à jour des résultats → Run workflow → test_sujet = seniors-f-1*.

```bash
python collecteur/notifieur.py --essai
```
````

- [ ] **Step 4: Commit et push (après accord de l'utilisateur pour le push)**

```bash
git add .gitignore .github/workflows/mise-a-jour.yml README.md
git commit -m "Workflow : notifications après la collecte, passage de 15:45, test manuel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

Le push vers `main` est une action visible : demander l'accord de l'utilisateur juste avant.

- [ ] **Step 5: Créer le projet Firebase (action de l'utilisateur, guidée)**

L'agent ne crée aucun compte et ne manipule aucune clé. Guider l'utilisateur :
1. console.firebase.google.com → *Ajouter un projet* → nom `clamart-handball` → Google Analytics : désactivé → Créer.
2. *Ajouter une app → Android* → nom du package `fr.clamarthandball.app` → *Enregistrer* → **télécharger `google-services.json`** → le placer dans `E:\MobileApp\app\google-services.json` (il est ignoré par git). Passer les étapes « SDK » de l'assistant.
3. *Paramètres du projet → Comptes de service → Générer une nouvelle clé privée* → un fichier JSON se télécharge. Ne pas le partager.
4. Sur GitHub : *Settings → Secrets and variables → Actions → New repository secret* → nom `FIREBASE_SERVICE_ACCOUNT`, valeur = **tout le contenu** du fichier JSON → *Add secret*. Puis supprimer le fichier téléchargé de l'ordinateur.

- [ ] **Step 6: Premier passage réel**

Utilisateur : *Actions → Mise à jour des résultats → Run workflow* (sans `test_sujet`).
Expected : workflow vert ; dans le journal de l'étape « Notifications » : « Notifications : 0 envoyée(s), 0 échec(s), 0 prévue(s) » (premier déploiement : marquage sans envoi) ; un commit du bot ajoute `collecteur/etat/notifications.json`. Vérifier :

```bash
git pull && python -c "import json; print(len(json.load(open('collecteur/etat/notifications.json', encoding='utf-8'))))"
```

---

### Task 5: Préférences de notifications et sujets attendus (app, pur)

**Files:**
- Create: `app/src/notifications/sujets.ts`, `app/src/notifications/sujets.test.ts`
- Modify: `app/src/suivi/suivi.ts`, `app/src/suivi/suivi.test.ts`

**Interfaces:**
- Consumes: `useSuivi` (Plan 2).
- Produces:
  - `type Autorisation = 'inconnue' | 'accordee' | 'refusee'`
  - Store `useSuivi` étendu (persisté, `version: 2`, migration depuis 1) : `notifResultats: boolean` (défaut `true`), `rappels: boolean` (défaut `false`), `sujets: string[]` (sujets réellement abonnés, défaut `[]`), `autorisation: Autorisation` (défaut `'inconnue'`) ; actions `setNotifResultats(b)`, `setRappels(b)`, `setSujets(s: string[])`, `setAutorisation(a)`.
  - `sujetsAttendus(suivis: string[], prefs: { notifResultats: boolean; rappels: boolean; autorisation: Autorisation }): string[]` — vide si autorisation `'refusee'` ; sinon `resultats-<id>` si `notifResultats`, `rappels-<id>` si `rappels` (ordre : suivis, résultats avant rappels).
  - `planAbonnements(attendus: string[], actuels: string[]): { abonner: string[]; desabonner: string[] }` — `abonner` = tous les attendus (ré-application idempotente au démarrage, spec §5.3) ; `desabonner` = actuels non attendus.

- [ ] **Step 1: Écrire les tests des sujets**

`app/src/notifications/sujets.test.ts` :

```ts
import { planAbonnements, sujetsAttendus } from './sujets';

const prefs = { notifResultats: true, rappels: false, autorisation: 'accordee' as const };

test('résultats seulement par défaut', () => {
  expect(sujetsAttendus(['seniors-m', 'u13-f'], prefs)).toEqual(['resultats-seniors-m', 'resultats-u13-f']);
});

test('rappels en plus quand l’option est active', () => {
  expect(sujetsAttendus(['seniors-m'], { ...prefs, rappels: true })).toEqual(['resultats-seniors-m', 'rappels-seniors-m']);
});

test('aucun sujet si Android refuse les notifications ou si tout est désactivé', () => {
  expect(sujetsAttendus(['seniors-m'], { ...prefs, autorisation: 'refusee' })).toEqual([]);
  expect(sujetsAttendus(['seniors-m'], { ...prefs, notifResultats: false })).toEqual([]);
});

test('autorisation inconnue (Android < 13 ou pas encore demandée) : on s’abonne', () => {
  expect(sujetsAttendus(['u18-f'], { ...prefs, autorisation: 'inconnue' })).toEqual(['resultats-u18-f']);
});

test('plan : ré-abonne tout l’attendu et désabonne le reste', () => {
  expect(planAbonnements(['resultats-a', 'resultats-b'], ['resultats-b', 'rappels-b'])).toEqual({
    abonner: ['resultats-a', 'resultats-b'],
    desabonner: ['rappels-b'],
  });
});
```

- [ ] **Step 2: Écrire les tests du store**

Ajouter à `app/src/suivi/suivi.test.ts` (dans `beforeEach`, compléter le `setState` avec `notifResultats: true, rappels: false, sujets: [], autorisation: 'inconnue'`) :

```ts
test('préférences de notifications : valeurs par défaut et réglages', () => {
  expect(etat().notifResultats).toBe(true);
  expect(etat().rappels).toBe(false);
  etat().setRappels(true);
  etat().setNotifResultats(false);
  etat().setAutorisation('refusee');
  etat().setSujets(['resultats-seniors-m']);
  expect(etat()).toMatchObject({ rappels: true, notifResultats: false, autorisation: 'refusee', sujets: ['resultats-seniors-m'] });
});

test('migration depuis la version 1 : les nouvelles préférences prennent leur valeur par défaut', async () => {
  await AsyncStorage.setItem('clamart-suivi', JSON.stringify({ version: 1, state: { suivis: ['u13-m'], bienvenueFaite: true, retires: [] } }));
  await useSuivi.persist.rehydrate();
  expect(etat()).toMatchObject({ suivis: ['u13-m'], bienvenueFaite: true, notifResultats: true, rappels: false, sujets: [] });
});
```

Mettre à jour l'attendu du test existant « le premier lancement est mémorisé sur le téléphone » : l'état persisté contient désormais aussi `notifResultats: true, rappels: false, sujets: [], autorisation: 'inconnue'`.

- [ ] **Step 3: Lancer pour vérifier l'échec**

Run: `cd /e/MobileApp/app && npm test -- src/notifications src/suivi`
Expected: FAIL (`Cannot find module './sujets'`, `etat().setRappels is not a function`).

- [ ] **Step 4: Implémenter**

`app/src/notifications/sujets.ts` :

```ts
export type Autorisation = 'inconnue' | 'accordee' | 'refusee';

export interface PrefsNotifications {
  notifResultats: boolean;
  rappels: boolean;
  autorisation: Autorisation;
}

/** Sujets FCM auxquels le téléphone doit être abonné. Rien si Android a refusé les notifications. */
export function sujetsAttendus(suivis: string[], prefs: PrefsNotifications): string[] {
  if (prefs.autorisation === 'refusee') return [];
  return suivis.flatMap((id) => [
    ...(prefs.notifResultats ? [`resultats-${id}`] : []),
    ...(prefs.rappels ? [`rappels-${id}`] : []),
  ]);
}

/** Ré-abonne tout l'attendu (idempotent, répare un état perdu) et désabonne ce qui ne l'est plus. */
export function planAbonnements(attendus: string[], actuels: string[]) {
  return { abonner: [...attendus], desabonner: actuels.filter((s) => !attendus.includes(s)) };
}
```

Dans `app/src/suivi/suivi.ts` :
- importer `type Autorisation` depuis `../notifications/sujets` ;
- ajouter à `EtatSuivi` : `notifResultats: boolean; rappels: boolean; sujets: string[]; autorisation: Autorisation; setNotifResultats: (b: boolean) => void; setRappels: (b: boolean) => void; setSujets: (s: string[]) => void; setAutorisation: (a: Autorisation) => void;` ;
- valeurs initiales `notifResultats: true, rappels: false, sujets: [], autorisation: 'inconnue'` et les quatre setters (`set({ ... })`) ;
- options de `persist` : `version: 2`, `migrate: (etat) => ({ notifResultats: true, rappels: false, sujets: [], autorisation: 'inconnue', ...(etat as object) })`, et `partialize` étendu à `{ suivis, bienvenueFaite, retires, notifResultats, rappels, sujets, autorisation }`.

- [ ] **Step 5: Lancer les tests**

Run: `npm test && npm run typecheck`
Expected: tous PASS ; `tsc` propre.

- [ ] **Step 6: Commit**

```bash
git add app/src/notifications app/src/suivi
git commit -m "App : préférences de notifications et sujets attendus

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Firebase dans l'app et synchronisation des abonnements

**Files:**
- Create: `app/src/notifications/fcm.ts`, `app/src/notifications/synchro.ts`, `app/src/notifications/synchro.test.ts`
- Modify: `app/package.json` (dépendances), `app/app.json`, `app/test/setup.ts`, `app/src/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `sujetsAttendus`, `planAbonnements`, store étendu (Task 5) ; `app/google-services.json` (Task 4).
- Produces:
  - `interface ClientSujets { abonner(sujet: string): Promise<void>; desabonner(sujet: string): Promise<void> }`
  - `synchroniser(attendus: string[], actuels: string[], client: ClientSujets): Promise<string[]>` — applique le plan ; renvoie les sujets effectivement abonnés (un échec sur un sujet laisse son état précédent : abonné s'il l'était, non abonné sinon).
  - `fcm.ts` : `clientFcm: ClientSujets`, `demanderAutorisation(): Promise<Autorisation>`, `lireAutorisation(): Promise<Autorisation>`, `ecouterPremierPlan(cb: (n: NotifRecue) => void): () => void`, `ecouterOuverture(cb: (n: NotifRecue) => void): () => void`, `notificationInitiale(): Promise<NotifRecue | null>` avec `interface NotifRecue { titre?: string; corps?: string; donnees: Record<string, string> }`.
  - `useSynchroAbonnements()` (hook dans `synchro.ts`), appelé par `(tabs)/_layout.tsx`.

- [ ] **Step 1: Installer les modules natifs**

Versions : `@react-native-firebase/*` 26.4.0 ; `expo-dev-client` et `expo-build-properties` à la version de `app/node_modules/expo/bundledNativeModules.json` (`~57.0.20` et `~57.0.22` au 15/10/2026). `npx expo install` échoue sur cette machine (EALLOWSCRIPTS) : utiliser `npm install`, sans jamais contourner `~/.npmrc`.

```bash
cd /e/MobileApp/app
npm install @react-native-firebase/app@26.4.0 @react-native-firebase/messaging@26.4.0 expo-dev-client@~57.0.20 expo-build-properties@~57.0.22
```

- [ ] **Step 2: Configurer `app.json`**

Dans `expo` : `"android"` reçoit `"googleServicesFile": "./google-services.json"` ; `"plugins"` reçoit `"@react-native-firebase/app"`, `"expo-dev-client"` et `["expo-build-properties", { "ios": { "useFrameworks": "static" } }]` (exigé par React Native Firebase pour iOS, sans effet sur Android). Vérifier dans la documentation React Native Firebase (rnfirebase.io → *Expo*) qu'aucun autre plugin n'est requis pour la messagerie Android avec la version installée ; s'il en faut un, l'ajouter et le noter dans le rapport.

- [ ] **Step 3: Mock Jest de l'adaptateur**

Ajouter à `app/test/setup.ts` :

```ts
jest.mock('../src/notifications/fcm', () => ({
  clientFcm: { abonner: jest.fn(() => Promise.resolve()), desabonner: jest.fn(() => Promise.resolve()) },
  demanderAutorisation: jest.fn(() => Promise.resolve('accordee')),
  lireAutorisation: jest.fn(() => Promise.resolve('accordee')),
  ecouterPremierPlan: jest.fn(() => () => {}),
  ecouterOuverture: jest.fn(() => () => {}),
  notificationInitiale: jest.fn(() => Promise.resolve(null)),
}));
```

(Le chemin du `jest.mock` est relatif à `test/setup.ts`.)

- [ ] **Step 4: Écrire les tests de la synchronisation**

`app/src/notifications/synchro.test.ts` :

```ts
import { synchroniser } from './synchro';

function client(echecs: string[] = []) {
  const appels: string[] = [];
  return {
    appels,
    abonner: jest.fn(async (s: string) => { appels.push(`+${s}`); if (echecs.includes(`+${s}`)) throw new Error('réseau'); }),
    desabonner: jest.fn(async (s: string) => { appels.push(`-${s}`); if (echecs.includes(`-${s}`)) throw new Error('réseau'); }),
  };
}

test('abonne l’attendu, désabonne le reste, renvoie l’état réel', async () => {
  const c = client();
  const sujets = await synchroniser(['resultats-a'], ['resultats-a', 'rappels-a'], c);
  expect(c.appels).toEqual(['+resultats-a', '-rappels-a']);
  expect(sujets).toEqual(['resultats-a']);
});

test('un échec laisse l’état précédent du sujet', async () => {
  const c = client(['+resultats-b', '-rappels-a']);
  const sujets = await synchroniser(['resultats-a', 'resultats-b'], ['resultats-a', 'rappels-a'], c);
  expect(sujets.sort()).toEqual(['rappels-a', 'resultats-a']);
});
```

- [ ] **Step 5: Lancer pour vérifier l'échec**

Run: `npm test -- src/notifications/synchro.test.ts`
Expected: FAIL, `Cannot find module './synchro'`

- [ ] **Step 6: Implémenter l'adaptateur et la synchronisation**

`app/src/notifications/fcm.ts` — seul fichier qui importe React Native Firebase (API modulaire de la v22+ ; vérifier les noms exportés par la version installée dans `node_modules/@react-native-firebase/messaging/lib/modular` et adapter si besoin) :

```ts
import { getApp } from '@react-native-firebase/app';
import {
  getInitialNotification, getMessaging, onMessage, onNotificationOpenedApp, subscribeToTopic, unsubscribeFromTopic,
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import type { Autorisation } from './sujets';
import type { ClientSujets } from './synchro';

export interface NotifRecue {
  titre?: string;
  corps?: string;
  donnees: Record<string, string>;
}

const messagerie = () => getMessaging(getApp());
const convertir = (m: FirebaseMessagingTypes.RemoteMessage): NotifRecue => ({
  titre: m.notification?.title,
  corps: m.notification?.body,
  donnees: Object.fromEntries(Object.entries(m.data ?? {}).map(([k, v]) => [k, String(v)])),
});

export const clientFcm: ClientSujets = {
  abonner: (sujet) => subscribeToTopic(messagerie(), sujet),
  desabonner: (sujet) => unsubscribeFromTopic(messagerie(), sujet),
};

const PERMISSION = 'android.permission.POST_NOTIFICATIONS' as const;
const exigeAutorisation = () => Platform.OS === 'android' && Number(Platform.Version) >= 33;

export async function lireAutorisation(): Promise<Autorisation> {
  if (!exigeAutorisation()) return 'accordee';
  return (await PermissionsAndroid.check(PERMISSION)) ? 'accordee' : 'inconnue';
}

export async function demanderAutorisation(): Promise<Autorisation> {
  if (!exigeAutorisation()) return 'accordee';
  const r = await PermissionsAndroid.request(PERMISSION);
  return r === PermissionsAndroid.RESULTS.GRANTED ? 'accordee' : 'refusee';
}

export const ecouterPremierPlan = (cb: (n: NotifRecue) => void) => onMessage(messagerie(), async (m) => cb(convertir(m)));
export const ecouterOuverture = (cb: (n: NotifRecue) => void) => onNotificationOpenedApp(messagerie(), (m) => cb(convertir(m)));
export async function notificationInitiale(): Promise<NotifRecue | null> {
  const m = await getInitialNotification(messagerie());
  return m ? convertir(m) : null;
}
```

`app/src/notifications/synchro.ts` :

```ts
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSuivi } from '../suivi/suivi';
import { clientFcm, lireAutorisation } from './fcm';
import { planAbonnements, sujetsAttendus } from './sujets';

export interface ClientSujets {
  abonner(sujet: string): Promise<void>;
  desabonner(sujet: string): Promise<void>;
}

export async function synchroniser(attendus: string[], actuels: string[], client: ClientSujets): Promise<string[]> {
  const plan = planAbonnements(attendus, actuels);
  const etat = new Set(actuels);
  for (const s of plan.abonner) {
    try { await client.abonner(s); etat.add(s); } catch { /* restera dans l'état précédent, retenté au prochain lancement */ }
  }
  for (const s of plan.desabonner) {
    try { await client.desabonner(s); etat.delete(s); } catch { /* idem */ }
  }
  return [...etat];
}

/** Garde les abonnements FCM alignés sur les équipes suivies et les préférences (au lancement et à chaque changement). */
export function useSynchroAbonnements(): void {
  const pret = useSuivi((s) => s.pret);
  const suivis = useSuivi((s) => s.suivis);
  const notifResultats = useSuivi((s) => s.notifResultats);
  const rappels = useSuivi((s) => s.rappels);
  const autorisation = useSuivi((s) => s.autorisation);

  useEffect(() => {
    // L'utilisateur peut changer l'autorisation dans les réglages Android : la relire au retour dans l'app.
    const relire = () => lireAutorisation().then((a) => {
      const actuelle = useSuivi.getState().autorisation;
      if (a === 'accordee' && actuelle !== 'accordee') useSuivi.getState().setAutorisation('accordee');
      if (a !== 'accordee' && actuelle === 'accordee') useSuivi.getState().setAutorisation('refusee');
    }).catch(() => {});
    relire();
    const abonnement = AppState.addEventListener('change', (e) => e === 'active' && relire());
    return () => abonnement.remove();
  }, []);

  useEffect(() => {
    if (!pret) return;
    const attendus = sujetsAttendus(suivis, { notifResultats, rappels, autorisation });
    synchroniser(attendus, useSuivi.getState().sujets, clientFcm)
      .then((sujets) => useSuivi.getState().setSujets(sujets))
      .catch(() => {});
  }, [pret, suivis, notifResultats, rappels, autorisation]);
}
```

Dans `app/src/app/(tabs)/_layout.tsx`, appeler `useSynchroAbonnements()` en tête du composant `Onglets` (avant tout `return`).

- [ ] **Step 7: Lancer les tests et le contrôle de types**

Run: `npm test && npm run typecheck`
Expected: tous PASS ; `tsc` propre (si les types de `@react-native-firebase/messaging` diffèrent, adapter `fcm.ts` uniquement).

- [ ] **Step 8: Premier development build sur l'émulateur**

Prérequis : `app/google-services.json` présent (Task 4 Step 5) ; JDK d'Android Studio : `export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"` ; `export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"`. L'AVD doit avoir les **services Google Play** (image « Google Play » ou « Google APIs ») : sinon FCM ne fonctionne pas — le vérifier dans Device Manager et, au besoin, créer un AVD *Pixel 8 · API 35 · Google Play* (action de l'utilisateur).

```bash
cd /e/MobileApp/app
npx expo run:android
```

Expected : Gradle compile (plusieurs minutes la première fois), l'app « Clamart Handball » s'installe et s'ouvre sur l'émulateur (sans Expo Go). `app/android/` est généré et ignoré par git. Revenir à un `git status` propre (Metro peut réécrire `app/tsconfig.json` : `git checkout app/tsconfig.json`).

- [ ] **Step 9: Commit**

```bash
git add app/package.json app/package-lock.json app/app.json app/test/setup.ts app/src/notifications "app/src/app/(tabs)/_layout.tsx"
git commit -m "App : Firebase Messaging, abonnements aux sujets des équipes suivies

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Autorisation au premier lancement et réglages des notifications

**Files:**
- Create: `app/src/ecrans/VueAutorisation.tsx`, `app/src/ecrans/VueAutorisation.test.tsx`, `app/src/app/autorisation.tsx`
- Modify: `app/src/app/bienvenue.tsx`, `app/src/ecrans/VueReglages.tsx`, `app/src/ecrans/buteurs-reglages.test.tsx`, `app/src/app/reglages.tsx`

**Interfaces:**
- Consumes: `demanderAutorisation` (Task 6), store (Task 5), `CONTENU_BOUTON`, `ProtectionBarreEtat` (Plan 2).
- Produces:
  - `<VueAutorisation onActiver={() => void} onPlusTard={() => void} />` ; route `/autorisation`.
  - `VueReglages` : nouvelles props `notifResultats: boolean`, `rappels: boolean`, `autorisation: Autorisation`, `onNotifResultats(b: boolean)`, `onRappels(b: boolean)`, `onOuvrirReglagesSysteme()`.

- [ ] **Step 1: Écrire les tests**

`app/src/ecrans/VueAutorisation.test.tsx` :

```tsx
import { fireEvent, screen } from '@testing-library/react-native';
import { rendu } from '../../test/rendu';
import { VueAutorisation } from './VueAutorisation';

test('propose d’activer les notifications ou plus tard', () => {
  const onActiver = jest.fn();
  const onPlusTard = jest.fn();
  rendu(<VueAutorisation onActiver={onActiver} onPlusTard={onPlusTard} />);
  expect(screen.getByText('Recevoir les résultats de vos équipes ?')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Activer les notifications'));
  expect(onActiver).toHaveBeenCalled();
  fireEvent.press(screen.getByText('Plus tard'));
  expect(onPlusTard).toHaveBeenCalled();
});
```

Ajouter à `app/src/ecrans/buteurs-reglages.test.tsx` (la fonction `reglages` reçoit les nouvelles props par défaut `notifResultats: true, rappels: false, autorisation: 'accordee', onNotifResultats: jest.fn(), onRappels: jest.fn(), onOuvrirReglagesSysteme: jest.fn()`) :

```tsx
test('notifications : résultats et rappel la veille (désactivé par défaut)', () => {
  const p = reglages();
  const rappel = screen.getByRole('switch', { name: 'Rappel la veille du match' });
  expect(rappel.props.accessibilityState?.checked ?? rappel.props.value).toBe(false);
  fireEvent(rappel, 'valueChange', true);
  expect(p.onRappels).toHaveBeenCalledWith(true);
  fireEvent(screen.getByRole('switch', { name: 'Résultats de mes équipes' }), 'valueChange', false);
  expect(p.onNotifResultats).toHaveBeenCalledWith(false);
});

test('notifications bloquées dans Android', () => {
  const p = reglages({ autorisation: 'refusee' });
  expect(screen.getByText('Les notifications sont bloquées dans les réglages d’Android.')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Ouvrir les réglages'));
  expect(p.onOuvrirReglagesSysteme).toHaveBeenCalled();
});
```

(Si `getByRole('switch', { name })` ne trouve pas le `Switch` de Paper, poser `accessibilityLabel` sur le `Switch` et cibler par `getByLabelText`.)

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- src/ecrans/VueAutorisation.test.tsx src/ecrans/buteurs-reglages.test.tsx`
Expected: FAIL (`Cannot find module './VueAutorisation'`, switch introuvable).

- [ ] **Step 3: Implémenter l'écran d'autorisation**

`app/src/ecrans/VueAutorisation.tsx` :

```tsx
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CONTENU_BOUTON } from '../composants/commun';
import { ProtectionBarreEtat } from '../composants/ProtectionBarreEtat';
import { useThemeClub } from '../theme/theme';

export function VueAutorisation({ onActiver, onPlusTard }: { onActiver: () => void; onPlusTard: () => void }) {
  const t = useThemeClub();
  const encarts = useSafeAreaInsets();
  return (
    <View style={[styles.page, { backgroundColor: t.colors.background, paddingBottom: encarts.bottom + 16 }]}>
      <ProtectionBarreEtat />
      <View style={styles.contenu}>
        <Icon source="bell-ring-outline" size={64} color={t.club.titre} />
        <Text variant="headlineSmall" style={[styles.centrer, { color: t.club.titre }]} accessibilityRole="header">
          Recevoir les résultats de vos équipes ?
        </Text>
        <Text variant="bodyLarge" style={[styles.centrer, { color: t.colors.onSurfaceVariant }]}>
          Une notification dès que le score est publié. Le rappel la veille du match peut s'activer dans les réglages.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button mode="contained" contentStyle={CONTENU_BOUTON} onPress={onActiver}>Activer les notifications</Button>
        <Button mode="text" contentStyle={CONTENU_BOUTON} onPress={onPlusTard}>Plus tard</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16 },
  contenu: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  centrer: { textAlign: 'center' },
  actions: { gap: 4 },
});
```

`app/src/app/autorisation.tsx` :

```tsx
import { useRouter } from 'expo-router';
import { VueAutorisation } from '../ecrans/VueAutorisation';
import { demanderAutorisation } from '../notifications/fcm';
import { useSuivi } from '../suivi/suivi';

export default function Autorisation() {
  const routeur = useRouter();
  const fin = () => routeur.replace('/');
  return (
    <VueAutorisation
      onActiver={() => demanderAutorisation().then((a) => useSuivi.getState().setAutorisation(a)).catch(() => {}).finally(fin)}
      onPlusTard={fin}
    />
  );
}
```

Dans `app/src/app/bienvenue.tsx`, `terminer(ids)` remplace `routeur.replace('/')` par `routeur.replace(ids.length ? '/autorisation' : '/')`.

- [ ] **Step 4: Ajouter la section Notifications aux Réglages**

Dans `VueReglages.tsx` : étendre `Props` (Interfaces ci-dessus) ; ajouter, entre « Mes équipes » et « Données », une section :

```tsx
        <List.Subheader style={{ color: t.club.titre }}>Notifications</List.Subheader>
        <Bloc>
          {p.autorisation === 'refusee' ? (
            <View style={styles.bloque}>
              <Text variant="bodyMedium" style={{ color: t.colors.onSurfaceVariant }}>
                Les notifications sont bloquées dans les réglages d’Android.
              </Text>
              <Button mode="text" contentStyle={CONTENU_BOUTON} onPress={p.onOuvrirReglagesSysteme}>Ouvrir les réglages</Button>
            </View>
          ) : null}
          <List.Item
            title="Résultats de mes équipes"
            description="Dès que le score est publié"
            onPress={() => p.onNotifResultats(!p.notifResultats)}
            right={() => (
              <Switch value={p.notifResultats} onValueChange={p.onNotifResultats} accessibilityLabel="Résultats de mes équipes" />
            )}
          />
          <List.Item
            title="Rappel la veille du match"
            description="Désactivé par défaut"
            onPress={() => p.onRappels(!p.rappels)}
            right={() => <Switch value={p.rappels} onValueChange={p.onRappels} accessibilityLabel="Rappel la veille du match" />}
          />
        </Bloc>
```

avec `Switch` importé de `react-native-paper` et `bloque: { padding: 16, gap: 4 }` dans les styles.

Dans `app/src/app/reglages.tsx` : lire `notifResultats`, `rappels`, `autorisation` du store et passer `onNotifResultats={setNotifResultats}`, `onRappels={setRappels}`, `onOuvrirReglagesSysteme={() => sansRejet(() => Linking.openSettings())}` (`Linking` de `react-native`).

- [ ] **Step 5: Lancer les tests**

Run: `npm test && npm run typecheck`
Expected: tous PASS ; `tsc` propre.

- [ ] **Step 6: Commit**

```bash
git add app/src
git commit -m "App : autorisation des notifications au premier lancement, réglages résultats et rappel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Recevoir et ouvrir une notification

**Files:**
- Create: `app/src/notifications/liens.ts`, `app/src/notifications/liens.test.ts`, `app/src/notifications/GestionNotifications.tsx`, `app/src/notifications/GestionNotifications.test.tsx`
- Modify: `app/src/donnees/selecteurs.ts`, `app/src/donnees/selecteurs.test.ts`, `app/src/ecrans/VueMatch.tsx` (prop `equipeId?`), `app/src/app/match/[id].tsx`, `app/src/app/equipe/[collectif].tsx`, `app/src/app/_layout.tsx`

**Interfaces:**
- Consumes: `ecouterPremierPlan`, `ecouterOuverture`, `notificationInitiale`, `NotifRecue` (Task 6).
- Produces:
  - `parametre(v: string | string[] | undefined): string | undefined` — premier élément d'un paramètre de route.
  - `lienNotification(donnees: Record<string, string>): string | undefined` — `/match/<match_id>?equipe=<equipe_id>` si les deux ids sont `[A-Za-z0-9-]+`, sinon `/equipe/<collectif>` si seul le collectif est valide, sinon `undefined`.
  - `matchParId(club, id, equipeId?)` — préfère la copie du match portée par `equipeId` (derby).
  - `<GestionNotifications />` — monté dans le root layout : snackbar au premier plan (titre + « Voir »), navigation à l'ouverture.

- [ ] **Step 1: Écrire les tests**

`app/src/notifications/liens.test.ts` :

```ts
import { lienNotification, parametre } from './liens';

test('paramètre de route : chaîne, tableau ou absent', () => {
  expect(parametre('a')).toBe('a');
  expect(parametre(['a', 'b'])).toBe('a');
  expect(parametre(undefined)).toBeUndefined();
});

test('lien de notification', () => {
  expect(lienNotification({ type: 'resultat', collectif: 'seniors-m', equipe_id: '32546-clamart-handball', match_id: '2673792' }))
    .toBe('/match/2673792?equipe=32546-clamart-handball');
  expect(lienNotification({ type: 'test', collectif: 'seniors-f-1' })).toBe('/equipe/seniors-f-1');
  expect(lienNotification({ match_id: '../../etc', equipe_id: 'x' })).toBeUndefined();
  expect(lienNotification({})).toBeUndefined();
});
```

Ajouter à `app/src/donnees/selecteurs.test.ts` :

```ts
test('matchParId préfère l’équipe du lien', () => {
  const derby: Club = JSON.parse(JSON.stringify(club));
  const copie = { ...derby.equipes[0].matchs[0] }; // même id et même date : seul l'équipe diffère
  derby.equipes[1].matchs.push(copie);
  const id = derby.equipes[0].matchs[0].id;
  expect(matchParId(derby, id, derby.equipes[1].id)?.equipe.id).toBe(derby.equipes[1].id);
  expect(matchParId(derby, id)?.equipe.id).toBe(derby.equipes[0].id);
  expect(matchParId(derby, id, 'equipe-inconnue')?.equipe.id).toBe(derby.equipes[0].id);
});
```

(importer `type Club` depuis `./types` si besoin.)

`app/src/notifications/GestionNotifications.test.tsx` :

```tsx
import { act, fireEvent, screen } from '@testing-library/react-native';
import { rendu } from '../../test/rendu';
import * as fcm from './fcm';
import { GestionNotifications } from './GestionNotifications';

const { __routeur } = jest.requireMock('expo-router');
const notif = { titre: 'Clamart 21 – 22 Levallois SC 1D', corps: 'Seniors M · D2 territoriale', donnees: { match_id: '2673792', equipe_id: '32546-clamart-handball' } };

beforeEach(() => jest.clearAllMocks());

test('au premier plan : snackbar avec « Voir »', () => {
  let recevoir: (n: typeof notif) => void = () => {};
  jest.mocked(fcm.ecouterPremierPlan).mockImplementation((cb) => { recevoir = cb; return () => {}; });
  rendu(<GestionNotifications />);
  act(() => recevoir(notif));
  expect(screen.getByText('Clamart 21 – 22 Levallois SC 1D')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Voir'));
  expect(__routeur.push).toHaveBeenCalledWith('/match/2673792?equipe=32546-clamart-handball');
});

test('notification touchée : ouvre la fiche du match', () => {
  let ouvrir: (n: typeof notif) => void = () => {};
  jest.mocked(fcm.ecouterOuverture).mockImplementation((cb) => { ouvrir = cb; return () => {}; });
  rendu(<GestionNotifications />);
  act(() => ouvrir(notif));
  expect(__routeur.push).toHaveBeenCalledWith('/match/2673792?equipe=32546-clamart-handball');
});

test('app lancée par une notification', async () => {
  jest.mocked(fcm.notificationInitiale).mockResolvedValueOnce(notif);
  rendu(<GestionNotifications />);
  await act(async () => {});
  expect(__routeur.push).toHaveBeenCalledWith('/match/2673792?equipe=32546-clamart-handball');
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test -- src/notifications src/donnees/selecteurs.test.ts`
Expected: FAIL (`Cannot find module './liens'`, `./GestionNotifications`, assertion du derby).

- [ ] **Step 3: Implémenter**

`app/src/notifications/liens.ts` :

```ts
const ID = /^[A-Za-z0-9-]+$/;

export const parametre = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/** Route ouverte par une notification. Les ids viennent du réseau : validés avant d'en faire une route. */
export function lienNotification(d: Record<string, string>): string | undefined {
  if (d.match_id && ID.test(d.match_id) && d.equipe_id && ID.test(d.equipe_id)) {
    return `/match/${d.match_id}?equipe=${d.equipe_id}`;
  }
  if (d.collectif && ID.test(d.collectif)) return `/equipe/${d.collectif}`;
  return undefined;
}
```

`app/src/donnees/selecteurs.ts` :

```ts
export const matchParId = (club: Club, id: string, equipeId?: string) => {
  const matchs = tousLesMatchs(club).filter((m) => m.id === id);
  return matchs.find((m) => m.equipe.id === equipeId) ?? matchs[0];
};
```

`VueMatch.tsx` : prop optionnelle `equipeId?: string`, passée à `matchParId(club, matchId, equipeId)`. `match/[id].tsx` : `const p = useLocalSearchParams<{ id: string | string[]; equipe?: string | string[] }>(); const id = parametre(p.id) ?? ''; const equipe = parametre(p.equipe);` et `equipeId={equipe}`. `equipe/[collectif].tsx` : même normalisation avec `parametre`.

`app/src/notifications/GestionNotifications.tsx` :

```tsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Portal, Snackbar } from 'react-native-paper';
import { ecouterOuverture, ecouterPremierPlan, notificationInitiale, type NotifRecue } from './fcm';
import { lienNotification } from './liens';

/** Notifications reçues : bandeau « Voir » au premier plan, fiche du match quand on touche la notification. */
export function GestionNotifications() {
  const routeur = useRouter();
  const [affichee, setAffichee] = useState<NotifRecue | null>(null);

  useEffect(() => {
    const ouvrir = (n: NotifRecue) => {
      const lien = lienNotification(n.donnees);
      if (lien) routeur.push(lien as never);
    };
    notificationInitiale().then((n) => n && ouvrir(n)).catch(() => {});
    const arreterOuverture = ecouterOuverture(ouvrir);
    const arreterPremierPlan = ecouterPremierPlan(setAffichee);
    return () => { arreterOuverture(); arreterPremierPlan(); };
  }, [routeur]);

  const lien = affichee ? lienNotification(affichee.donnees) : undefined;
  return (
    <Portal>
      <Snackbar
        visible={affichee !== null}
        onDismiss={() => setAffichee(null)}
        duration={6000}
        action={lien ? { label: 'Voir', onPress: () => routeur.push(lien as never) } : undefined}
      >
        {affichee?.titre ?? ''}
      </Snackbar>
    </Portal>
  );
}
```

Dans `app/src/app/_layout.tsx`, monter `<GestionNotifications />` à l'intérieur de `PaperProvider`, après le `Stack`.

- [ ] **Step 4: Lancer les tests**

Run: `npm test && npm run typecheck`
Expected: tous PASS ; `tsc` propre.

- [ ] **Step 5: Commit**

```bash
git add app/src
git commit -m "App : notification reçue au premier plan, ouverture de la fiche du match

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Vérification de bout en bout

**Files:**
- Create: `.impeccable/review/phone-android-autorisation.png`, `phone-android-reglages-notifications.png`, `phone-android-notification.png` (non commités)

**Interfaces:**
- Consumes: tout le plan ; secret GitHub configuré (Task 4) ; development build (Task 6).
- Produces: preuve sur appareil qu'une notification envoyée par le workflow arrive et ouvre la bonne fiche.

- [ ] **Step 1: Build et parcours de premier lancement**

Sur l'émulateur (avec services Google Play), `npx expo run:android`. Désinstaller d'abord l'ancienne version de l'app si elle existe pour repartir d'un premier lancement (`adb uninstall fr.clamarthandball.app` — ne touche que cette app). Choisir « Seniors F 1 » → Continuer → écran « Recevoir les résultats de vos équipes ? » (capture `phone-android-autorisation.png`) → « Activer les notifications » → accepter la boîte Android.

- [ ] **Step 2: Réglages**

Accueil → Réglages : section Notifications, « Résultats de mes équipes » activé, « Rappel la veille du match » désactivé (capture `phone-android-reglages-notifications.png`).

- [ ] **Step 3: Notification de test (action de l'utilisateur)**

Mettre l'app en arrière-plan (touche Accueil d'Android). Utilisateur : *Actions → Mise à jour des résultats → Run workflow → test_sujet = `seniors-f-1`*. Expected : en moins d'une minute après l'étape « Notifications », la notification « Test · Clamart Handball » s'affiche sur l'émulateur (capture du volet `phone-android-notification.png`) ; la toucher ouvre la fiche « Seniors F 1 ». App au premier plan pendant un second test : le bandeau en bas de l'app s'affiche.

- [ ] **Step 4: Bilan**

Remettre l'émulateur dans son état (thème, police), arrêter Metro et l'émulateur **par leur PID**, `git checkout app/tsconfig.json` si besoin, `git status` propre. Consigner dans le rapport ce qui a été observé (et ce qui ne l'a pas été : un vrai résultat notifié ne peut être observé que le week-end suivant un match).
