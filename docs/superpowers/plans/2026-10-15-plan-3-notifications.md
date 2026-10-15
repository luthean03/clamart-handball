# Plan 3 — Notifications (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Envoyer une notification quand une équipe suivie a joué — une banderole écusson – score – écusson — (et, en option désactivée par défaut, un rappel la veille du match), et l'ouvrir sur la fiche du match dans l'app.

**Architecture:** Côté serveur, un module Python `collecteur/notifieur.py` exécuté par GitHub Actions juste après la collecte : il calcule les messages à partir de `site/data/club.json` et d'un registre `collecteur/etat/notifications.json`, dessine pour chaque résultat une image « banderole » (Pillow) publiée sur GitHub Pages avant l'envoi, puis les envoie par l'API FCM HTTP v1 sur des **sujets** (`resultats-<collectif>`, `rappels-<collectif>`). Côté app, le téléphone s'abonne aux sujets des équipes suivies via `@react-native-firebase/messaging` (ce qui impose désormais un *development build*, plus Expo Go), demande l'autorisation Android 13+, affiche les notifications reçues au premier plan et ouvre la fiche match quand on touche une notification. Toute la logique (messages, registre, sujets attendus, liens) est en fonctions pures testées.

**Tech Stack:** Python 3.12 (google-auth, requests, tzdata, Pillow, pytest), GitHub Actions, Firebase Cloud Messaging HTTP v1 ; Expo SDK 57, @react-native-firebase/app + messaging 26.4.0, expo-dev-client, zustand, react-native-paper, Jest + RNTL 13.

**Spec:** [docs/superpowers/specs/2026-10-14-clamart-handball-app-design.md](../specs/2026-10-14-clamart-handball-app-design.md) (§4, §5.3, §5.4, §5.2 Réglages et premier lancement, §7, §8 étape 3). Décisions du Plan 2 : [2026-10-14-plan-2-journal-execution.md](2026-10-14-plan-2-journal-execution.md).

**Prérequis :** Plans 1 et 2 fusionnés dans `main` (la PR `plan-2-app`) ; données en ligne sur `https://luthean03.github.io/clamart-handball/data/club.json`.

## Global Constraints

- Sujets FCM : `resultats-<collectif>` et `rappels-<collectif>`, `<collectif>` = id de collectif `[a-z0-9-]+`.
- Rappel la veille : **désactivé par défaut** ; notifications de résultats activées par défaut pour une équipe suivie (si Android l'autorise).
- Textes résultat, façon banderole (choix de l'utilisateur, 15/10/2026 — pas de phrase) : titre = `<domicile> <score domicile> – <score extérieur> <extérieur>`, Clamart écrit « Clamart », l'adversaire via `nom_lisible` (ex. `Clamart 32 – 22 Ent. Suresnes / Nanterre`, à l'extérieur `Paris SC 1D 17 – 20 Clamart`) ; corps = `<équipe> · <compétition>` (ex. `Seniors F 1 · D1 territoriale`). Rappel : titre `Demain 16:15 · <équipe>`, corps `Contre <adversaire> · <salle> (domicile|extérieur)` (sans salle : `Contre <adversaire> · domicile|extérieur`). Données : `{type, collectif, equipe_id, match_id}` (chaînes).
- Image de résultat (Android, « grande image ») : banderole 1024 × 512 PNG, équipe qui reçoit à gauche, score au centre, écusson officiel de Clamart (jamais redessiné, détouré en disque), écusson FFHB de l'adversaire (`logo_adversaire`) ou ses initiales ; publiée dans `site/notifs/` sur GitHub Pages **avant** l'envoi ; sans réseau à la réception, le texte suffit. Rappels sans image.
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
4. **Autorisation refusée dans Android** : les réglages l'indiquent et proposent d'ouvrir les réglages système ; rien ne plante. Test : `notifications bloquées` (Task 9).
5. **Notification touchée pour un match absent du cache ou en double (derby Clamart contre Clamart)** : la fiche montre le bon côté (équipe passée dans le lien) ou « Match introuvable ». Tests : `matchParId préfère l'équipe du lien` et `lien de notification` (Task 10).

---

## File Structure

```
collecteur/
  textes.py                 NOUVEAU : nom_lisible (portage du TS, contrat partage/phrases-cas.json)
  notifieur.py              NOUVEAU : planification (pur), images, envoi FCM, CLI
  banderole.py              NOUVEAU : dessin de l'image écusson – score – écusson (Pillow)
  polices/Nunito.ttf, OFL.txt NOUVEAU : police de la banderole (licence OFL)
  collecte.py               + champ logo_adversaire de chaque match
  cache/logos/              NOUVEAU (écrit par le workflow) : écussons FFHB téléchargés
  etat/notifications.json   NOUVEAU (écrit par le workflow) : registre des envois
  requirements.txt          + google-auth, tzdata, pillow
  tests/test_textes.py, test_notifieur.py, test_envoi.py, test_logos.py, test_banderole.py, test_images.py   NOUVEAUX
site/notifs/                NOUVEAU (écrit par le workflow) : images des notifications, purgées après 60 jours
config.json                 + notifications.url_images
.github/workflows/mise-a-jour.yml   trois jobs (collecte + images → publication → notifications), passage 15:45 UTC, entrée test_sujet
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

### Task 4: Écusson de l'adversaire dans les données

**Files:**
- Modify: `collecteur/collecte.py` (`collecter_competition` : champ `logo_adversaire` de chaque match), `app/src/donnees/types.ts` (`Match.logo_adversaire?: string | null`), `docs/superpowers/specs/2026-10-14-clamart-handball-app-design.md` (§3.1)
- Create: `collecteur/tests/test_logos.py`

**Interfaces:**
- Consumes: la liste des rencontres que le collecteur lit déjà (`competitions---rencontre-list`) : chaque rencontre porte `structure1Logo`, `structure2Logo` (nom de fichier, ex. `2024-06-13-a9f3….png`) et `equipe1ShowLogo`, `equipe2ShowLogo` (`'1'` quand la FFHB affiche l'écusson).
- Produces:
  - `collecte.URL_LOGOS = "https://media-logos-clubs.ffhandball.fr/128/"`
  - `collecte.logo_adversaire(r: dict, domicile: bool) -> str | None` — URL `URL_LOGOS + <nom sans extension> + ".webp"` de l'écusson de l'adversaire (côté 2 si Clamart reçoit, côté 1 sinon), `None` si la FFHB ne l'affiche pas ou s'il manque.
  - Champ `logo_adversaire` (URL ou `null`) sur chaque match de `club.json`. Ajout optionnel : `version_schema` reste `2`.

- [ ] **Step 1: Écrire les tests**

`collecteur/tests/test_logos.py` :

```python
import collecte

R = {"structure1Logo": "2023-08-30-aaa.png", "equipe1ShowLogo": "1",
     "structure2Logo": "2024-06-13-bbb.png", "equipe2ShowLogo": "1"}


def test_logo_de_l_adversaire_selon_le_cote():
    assert collecte.logo_adversaire(R, domicile=True) == "https://media-logos-clubs.ffhandball.fr/128/2024-06-13-bbb.webp"
    assert collecte.logo_adversaire(R, domicile=False) == "https://media-logos-clubs.ffhandball.fr/128/2023-08-30-aaa.webp"


def test_pas_de_logo_quand_la_ffhb_ne_l_affiche_pas():
    assert collecte.logo_adversaire({**R, "equipe2ShowLogo": "0"}, domicile=True) is None
    assert collecte.logo_adversaire({**R, "structure2Logo": None}, domicile=True) is None
    assert collecte.logo_adversaire({}, domicile=True) is None


def test_valeur_d_affichage_booleenne_acceptee():
    assert collecte.logo_adversaire({**R, "equipe2ShowLogo": True}, domicile=True) is not None
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `.venv/Scripts/python -m pytest collecteur/tests/test_logos.py -q`
Expected: FAIL, `AttributeError: module 'collecte' has no attribute 'logo_adversaire'`

- [ ] **Step 3: Implémenter**

Dans `collecteur/collecte.py`, sous les constantes (`VERSION_SCHEMA = 2`) :

```python
URL_LOGOS = "https://media-logos-clubs.ffhandball.fr/128/"


def logo_adversaire(r: dict, domicile: bool) -> str | None:
    """Écusson de l'adversaire publié par la FFHB (128 px, webp), ou None s'il n'est pas affiché."""
    cote = "2" if domicile else "1"
    fichier, afficher = r.get(f"structure{cote}Logo"), r.get(f"equipe{cote}ShowLogo")
    if not fichier or str(afficher).lower() not in ("1", "true"):
        return None
    return URL_LOGOS + fichier.rsplit(".", 1)[0] + ".webp"
```

Dans `collecter_competition`, dans le dictionnaire `m = {...}` de chaque match, ajouter après `"adversaire": ...` :

```python
                "logo_adversaire": logo_adversaire(r, dom),
```

Dans `app/src/donnees/types.ts`, interface `Match` : ajouter `/** Écusson FFHB de l'adversaire (URL), absent s'il n'est pas publié. */ logo_adversaire?: string | null;`. Dans la spec §3.1, ajouter `logo_adversaire` à la liste des champs d'un match.

- [ ] **Step 4: Lancer les tests et une collecte réelle**

Run: `.venv/Scripts/python -m pytest collecteur/tests -q && .venv/Scripts/python collecteur/collecte.py`
Expected: tests PASS ; collecte « OK : … 0 erreur(s) ». Vérifier :

```bash
.venv/Scripts/python -c "import json; d=json.load(open('site/data/club.json',encoding='utf-8')); ms=[m for e in d['equipes'] for m in e['matchs']]; print(len(ms), sum(1 for m in ms if m.get('logo_adversaire')))"
```

Expected : `92 <nombre de matchs avec écusson>` (une partie des adversaires n'a pas d'écusson publié : c'est normal). Ouvrir une des URL dans un navigateur : l'image de l'écusson s'affiche.

- [ ] **Step 5: Commit**

```bash
git add collecteur/collecte.py collecteur/tests/test_logos.py app/src/donnees/types.ts docs/superpowers/specs/2026-10-14-clamart-handball-app-design.md site/data collecteur/cache
git commit -m "Collecteur : écusson FFHB de l'adversaire pour chaque match

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Image de la banderole des notifications

**Files:**
- Create: `collecteur/banderole.py`, `collecteur/polices/Nunito.ttf`, `collecteur/polices/OFL.txt`, `collecteur/tests/test_banderole.py`, `collecteur/tests/test_images.py`
- Modify: `collecteur/notifieur.py` (champ `image` de `Message`, `corps_requete`, production des images, option `--images`), `collecteur/textes.py` (`initiales`), `collecteur/tests/test_textes.py`, `collecteur/requirements.txt` (+ `pillow`), `config.json` (`notifications.url_images`)

**Interfaces:**
- Consumes: `Message`, `planifier`, `executer`, `main` (Tasks 2–3) ; champ `logo_adversaire` (Task 4) ; `assets/logo-clamart.png` (écusson officiel, jamais redessiné).
- Produces:
  - `textes.initiales(nom: str) -> str` — même règle que `initiales` de `app/src/donnees/phrase.ts` (initiales des deux premiers mots commençant par une majuscule ; un seul mot → ses deux premières lettres).
  - `banderole.dessiner(gauche, droite, nom_gauche: str, nom_droite: str, score: str, entete: str) -> PIL.Image.Image` (1024 × 512, RGB) ; `banderole.ecusson_club() -> Image` ; `banderole.ecusson_adversaire(url: str | None, nom: str, cache: Path, telecharger=telecharger) -> Image` ; `banderole.ajuster(texte: str, largeur_max: int) -> tuple[str, int]` (texte éventuellement tronqué avec « … » et taille de police, 30 → 22 px).
  - Dans `notifieur.py` : `Message.image: str | None = None` (dernier champ, avec défaut) ; `corps_requete` ajoute `android.notification.image` quand `m.image` ; `nom_image(m: Message) -> str` (`AAAAMMJJ-<collectif>-<match_id>.png`, ou `test-<collectif>.png` pour un test) ; `produire_images(club, registre, maintenant, dossier: Path, cache: Path, telecharger=...) -> list[Path]` ; `purger_images(dossier: Path, maintenant: datetime) -> list[Path]` ; `avec_images(messages, dossier: Path, url_base: str) -> list[Message]` ; option CLI `--images` (produit et purge les images, n'envoie rien, n'écrit pas le registre ; avec `--test <collectif>`, produit aussi `test-<collectif>.png` d'après le dernier résultat de ce collectif).
  - Constantes : `DOSSIER_IMAGES = RACINE / "site" / "notifs"`, `CACHE_LOGOS = ICI / "cache" / "logos"`.
  - `config.json → notifications.url_images = "https://luthean03.github.io/clamart-handball/notifs/"`.

Rendu (repris de l'aperçu validé par l'utilisateur le 15/10/2026, `.superpowers/apercus/`) : fond bleu nuit `#142A3D` ; filet rouge `#DB0000` de 10 px en haut ; en-tête `<ÉQUIPE> · <COMPÉTITION>` en capitales, Nunito 700, 30 px, `#B4C0CC`, centré à y = 62 ; écussons de 220 px sur des disques blancs, à 70 px des bords, y = 120 ; équipe qui reçoit **à gauche** ; score `21 – 22` (tiret demi-cadratin entouré d'espaces) Nunito 800, 120 px, crème `#FFFEF0`, centré à y = 230 ; noms sous les écussons (centrés sur eux, y = 395), Nunito 700, 30 px réduits jusqu'à 22 px puis tronqués avec « … » pour tenir dans 300 px. Écusson de Clamart : `assets/logo-clamart.png` découpé en disque (le fond carré rouge disparaît). Adversaire sans écusson ou téléchargement en échec : disque `#2C4256` avec ses initiales en crème (Nunito 800). Corrige les deux défauts de l'aperçu : fond carré rouge visible, nom long qui touche le bord.

- [ ] **Step 1: Police et dépendance**

```bash
cd /e/MobileApp
mkdir -p collecteur/polices
curl -sL -o collecteur/polices/Nunito.ttf "https://github.com/google/fonts/raw/main/ofl/nunito/Nunito%5Bwght%5D.ttf"
curl -sL -o collecteur/polices/OFL.txt "https://github.com/google/fonts/raw/main/ofl/nunito/OFL.txt"
```

Ajouter `pillow>=10` à `collecteur/requirements.txt` et réinstaller. Nunito est sous licence SIL Open Font License (le fichier `OFL.txt` l'accompagne). Ajouter dans `config.json → notifications` la clé `"url_images": "https://luthean03.github.io/clamart-handball/notifs/"`.

- [ ] **Step 2: Écrire les tests**

Ajouter à `collecteur/tests/test_textes.py` :

```python
from textes import initiales


def test_initiales():
    assert initiales("Ent. Suresnes / Nanterre") == "ES"
    assert initiales("Levallois SC 1D") == "LS"
    assert initiales("Martigua SCL") == "MS"
    assert initiales("Issy") == "IS"
    assert initiales("") == ""
```

`collecteur/tests/test_banderole.py` :

```python
import io

from PIL import Image

import banderole


def faux_png(couleur="#00AA00") -> bytes:
    tampon = io.BytesIO()
    Image.new("RGBA", (128, 128), couleur).save(tampon, "PNG")
    return tampon.getvalue()


def test_dimensions_et_mode():
    img = banderole.dessiner(banderole.ecusson_club(), banderole.monogramme("LS"), "Clamart", "Levallois SC 1D",
                             "21 – 22", "Seniors M · D2 territoriale")
    assert img.size == (1024, 512) and img.mode == "RGB"
    assert img.getpixel((512, 5)) == (219, 0, 0)          # filet rouge
    assert img.getpixel((512, 480)) == (20, 42, 61)       # fond bleu nuit


def test_ecusson_du_club_detoure_en_disque():
    e = banderole.ecusson_club()
    assert e.mode == "RGBA" and e.getpixel((0, 0))[3] == 0   # coin transparent : plus de carré rouge


def test_nom_long_tient_dans_300_px():
    texte, taille = banderole.ajuster("Association Sportive St-Cyr/Fontenay Handball 78", 300)
    assert banderole.police(700, taille).getlength(texte) <= 300
    assert 22 <= taille <= 30
    assert banderole.ajuster("Clamart", 300) == ("Clamart", 30)


def test_ecusson_adversaire_monogramme_sans_logo(tmp_path):
    appels = []
    img = banderole.ecusson_adversaire(None, "Ent. Suresnes / Nanterre", tmp_path, telecharger=lambda u: appels.append(u))
    assert appels == [] and img.size == (256, 256)


def test_ecusson_adversaire_echec_de_telechargement(tmp_path):
    def echoue(url):
        raise OSError("réseau")
    img = banderole.ecusson_adversaire("https://x/128/a.webp", "Levallois SC 1D", tmp_path, telecharger=echoue)
    assert img.size == (256, 256)


def test_ecusson_adversaire_mis_en_cache(tmp_path):
    appels = []
    def telecharger(url):
        appels.append(url)
        return faux_png()
    for _ in range(2):
        banderole.ecusson_adversaire("https://x/128/a.webp", "Levallois SC 1D", tmp_path, telecharger=telecharger)
    assert appels == ["https://x/128/a.webp"]
    assert (tmp_path / "a.webp").exists()
```

`collecteur/tests/test_images.py` :

```python
import json
from datetime import datetime, timezone
from pathlib import Path

from test_banderole import faux_png

import notifieur
from notifieur import Message, avec_images, corps_requete, nom_image, produire_images, purger_images

LUNDI = datetime(2026, 10, 12, 8, 0, tzinfo=timezone.utc)


def club_v2():
    return json.loads((Path(__file__).resolve().parents[2] / "partage" / "fixtures" / "club-2026-10-13.json")
                      .read_text(encoding="utf-8"))


def test_nom_image():
    m = next(m for m in notifieur.messages_resultats(club_v2(), LUNDI) if m.cle == "resultat:seniors-f-1:2644292")
    assert nom_image(m) == "20261011-seniors-f-1-2644292.png"


def test_images_pour_les_resultats_en_attente(tmp_path):
    chemins = produire_images(club_v2(), {}, LUNDI, tmp_path / "notifs", tmp_path / "logos", telecharger=lambda u: faux_png())
    noms = {p.name for p in chemins}
    assert "20261011-seniors-f-1-2644292.png" in noms
    assert all(p.exists() for p in chemins)


def test_pas_d_images_au_premier_deploiement(tmp_path):
    assert produire_images(club_v2(), None, LUNDI, tmp_path / "notifs", tmp_path / "logos", telecharger=lambda u: faux_png()) == []


def test_purger_images(tmp_path):
    (tmp_path / "20260701-u13-f-1.png").write_bytes(b"x")
    (tmp_path / "20261011-seniors-f-1-2644292.png").write_bytes(b"x")
    supprimees = purger_images(tmp_path, LUNDI)
    assert [p.name for p in supprimees] == ["20260701-u13-f-1.png"]
    assert (tmp_path / "20261011-seniors-f-1-2644292.png").exists()


def test_avec_images(tmp_path):
    m = Message("resultat:seniors-f-1:2644292", "resultats-seniors-f-1", "T", "C",
                {"type": "resultat", "collectif": "seniors-f-1", "match_id": "2644292"}, "2026-10-11T16:15:00+02:00")
    assert avec_images([m], tmp_path, "https://h/notifs/")[0].image is None
    (tmp_path / "20261011-seniors-f-1-2644292.png").write_bytes(b"x")
    assert avec_images([m], tmp_path, "https://h/notifs/")[0].image == "https://h/notifs/20261011-seniors-f-1-2644292.png"


def test_corps_requete_avec_image():
    m = Message("k", "resultats-a", "T", "C", {}, "x", image="https://h/notifs/i.png")
    assert corps_requete(m)["message"]["android"] == {"priority": "high", "notification": {"image": "https://h/notifs/i.png"}}
```

Mettre à jour `test_corps_requete_fcm_v1` (Task 3) : sans image, `android` reste `{"priority": "high"}`.

- [ ] **Step 3: Lancer pour vérifier l'échec**

Run: `.venv/Scripts/python -m pytest collecteur/tests -q`
Expected: FAIL (`No module named 'banderole'`, `cannot import name 'initiales'`, `cannot import name 'avec_images'`).

- [ ] **Step 4: Implémenter**

`collecteur/textes.py`, ajouter :

```python
def initiales(nom: str) -> str:
    """Monogramme d'un club sans écusson : initiales des deux premiers mots en majuscule (comme l'app)."""
    mots = [m for m in re.split(_SEP, nom or "") if m and m[0].isupper()]
    if not mots:
        return ""
    return (mots[0][:2] if len(mots) == 1 else mots[0][0] + mots[1][0]).upper()
```

`collecteur/banderole.py` :

```python
"""Image « banderole » des notifications de résultat : écusson – score – écusson (1024 × 512)."""
from __future__ import annotations

import io
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from textes import initiales

ICI = Path(__file__).resolve().parent
POLICE = ICI / "polices" / "Nunito.ttf"
ECUSSON_CLUB = ICI.parent / "assets" / "logo-clamart.png"
NUIT, CREME, ROUGE, BLANC, GRIS, ARDOISE = "#142A3D", "#FFFEF0", "#DB0000", "#FFFFFF", "#B4C0CC", "#2C4256"
LARGEUR, HAUTEUR, ECUSSON, MARGE = 1024, 512, 220, 70


def police(poids: int, taille: int) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(POLICE), taille)
    f.set_variation_by_axes([poids])
    return f


def telecharger(url: str) -> bytes:
    requete = urllib.request.Request(url, headers={"User-Agent": "clamart-handball (notifications)"})
    with urllib.request.urlopen(requete, timeout=20) as r:
        return r.read()


def _disque(taille: int) -> Image.Image:
    masque = Image.new("L", (taille, taille), 0)
    ImageDraw.Draw(masque).ellipse((0, 0, taille - 1, taille - 1), fill=255)
    return masque


def ecusson_club() -> Image.Image:
    """Écusson officiel (assets/logo-clamart.png) détouré en disque : le fond carré rouge disparaît."""
    img = Image.open(ECUSSON_CLUB).convert("RGBA")
    c = img.width // 2
    rayon = int(img.width * 0.38)       # cercle extérieur de l'écusson ; vérifier visuellement sur l'aperçu
    img = img.crop((c - rayon, c - rayon, c + rayon, c + rayon))
    img.putalpha(_disque(img.width))
    return img


def monogramme(texte: str, taille: int = 256) -> Image.Image:
    img = Image.new("RGBA", (taille, taille), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((0, 0, taille - 1, taille - 1), fill=ARDOISE)
    d.text((taille / 2, taille / 2), texte, font=police(800, taille // 3), fill=CREME, anchor="mm")
    return img


def ecusson_adversaire(url: str | None, nom: str, cache: Path, telecharger=telecharger) -> Image.Image:
    if url:
        fichier = cache / url.rsplit("/", 1)[-1]
        try:
            if not fichier.exists():
                cache.mkdir(parents=True, exist_ok=True)
                fichier.write_bytes(telecharger(url))
            return Image.open(fichier).convert("RGBA").resize((256, 256), Image.LANCZOS)
        except Exception:
            fichier.unlink(missing_ok=True)
    return monogramme(initiales(nom))


def _pastille(img: Image.Image, taille: int) -> Image.Image:
    fond = Image.new("RGBA", (taille, taille), (0, 0, 0, 0))
    ImageDraw.Draw(fond).ellipse((0, 0, taille - 1, taille - 1), fill=BLANC)
    marge = int(taille * 0.10)
    fond.alpha_composite(img.resize((taille - 2 * marge, taille - 2 * marge), Image.LANCZOS), (marge, marge))
    return fond


def ajuster(texte: str, largeur_max: int) -> tuple[str, int]:
    for taille in range(30, 21, -1):
        if police(700, taille).getlength(texte) <= largeur_max:
            return texte, taille
    f = police(700, 22)
    while texte and f.getlength(texte + "…") > largeur_max:
        texte = texte[:-1].rstrip()
    return texte + "…", 22


def dessiner(gauche, droite, nom_gauche: str, nom_droite: str, score: str, entete: str) -> Image.Image:
    img = Image.new("RGBA", (LARGEUR, HAUTEUR), NUIT)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, LARGEUR, 9), fill=ROUGE)
    d.text((LARGEUR / 2, 62), entete.upper(), font=police(700, 30), fill=GRIS, anchor="mm")
    img.alpha_composite(_pastille(gauche, ECUSSON), (MARGE, 120))
    img.alpha_composite(_pastille(droite, ECUSSON), (LARGEUR - MARGE - ECUSSON, 120))
    d.text((LARGEUR / 2, 230), score, font=police(800, 120), fill=CREME, anchor="mm")
    for x, nom in ((MARGE + ECUSSON / 2, nom_gauche), (LARGEUR - MARGE - ECUSSON / 2, nom_droite)):
        texte, taille = ajuster(nom, 300)
        d.text((x, 395), texte, font=police(700, taille), fill=CREME, anchor="mm")
    return img.convert("RGB")
```

Le centre des noms est à 180 px du bord : un nom de 300 px dépasse donc la marge de 30 px de chaque côté — c'est voulu, il reste dans l'image (0…1024). Ne pas élargir `largeur_max` au-delà de 300.

Dans `collecteur/notifieur.py` :
- `Message` : ajouter le dernier champ `image: str | None = None`.
- `corps_requete` : `android = {"priority": "high"}` ; si `m.image` : `android["notification"] = {"image": m.image}`.
- Ajouter :

```python
DOSSIER_IMAGES = RACINE / "site" / "notifs"
CACHE_LOGOS = ICI / "cache" / "logos"


def nom_image(m: Message) -> str:
    if m.donnees.get("type") == "test":
        return f"test-{m.donnees['collectif']}.png"
    return f"{m.instant[:10].replace('-', '')}-{m.donnees['collectif']}-{m.donnees['match_id']}.png"


def _image_resultat(club: dict, m: Message, cache: Path, telecharger) -> "Image.Image":
    import banderole
    eq = next(e for e in club["equipes"] if e["id"] == m.donnees["equipe_id"])
    match = next(x for x in eq["matchs"] if str(x["id"]) == m.donnees["match_id"])
    adversaire = nom_lisible(match["adversaire"])
    club_img = banderole.ecusson_club()
    adv_img = banderole.ecusson_adversaire(match.get("logo_adversaire"), adversaire, cache, telecharger=telecharger)
    if match["domicile"]:
        return banderole.dessiner(club_img, adv_img, "Clamart", adversaire,
                                  f"{match['score_nous']} – {match['score_eux']}", f"{eq['nom']} · {eq['detail']}")
    return banderole.dessiner(adv_img, club_img, adversaire, "Clamart",
                              f"{match['score_eux']} – {match['score_nous']}", f"{eq['nom']} · {eq['detail']}")


def produire_images(club, registre, maintenant, dossier: Path, cache: Path, telecharger=None) -> list[Path]:
    import banderole
    telecharger = telecharger or banderole.telecharger
    if registre is None:          # premier déploiement : rien ne partira, donc aucune image
        return []
    deja = purger(registre, maintenant)
    chemins = []
    for m in messages_resultats(club, maintenant):
        if m.cle in deja:
            continue
        chemin = dossier / nom_image(m)
        if not chemin.exists():
            dossier.mkdir(parents=True, exist_ok=True)
            _image_resultat(club, m, cache, telecharger).save(chemin, "PNG", optimize=True)
        chemins.append(chemin)
    return chemins


def purger_images(dossier: Path, maintenant: datetime) -> list[Path]:
    limite = (maintenant - CONSERVATION).strftime("%Y%m%d")
    supprimees = [p for p in sorted(dossier.glob("[0-9]*.png")) if p.name[:8] < limite]
    for p in supprimees:
        p.unlink()
    return supprimees


def avec_images(messages: list[Message], dossier: Path, url_base: str) -> list[Message]:
    from dataclasses import replace
    return [replace(m, image=url_base + nom_image(m)) if (dossier / nom_image(m)).exists() else m for m in messages]
```

Note : `produire_images` produit les images des résultats que le job suivant va notifier (même registre, mêmes clés) ; un registre absent (premier déploiement) n'en produit aucune. Les rappels n'ont pas d'image.

- `executer(..., habiller=lambda ms: ms)` : nouveau paramètre appliqué à `a_envoyer` juste après `planifier`.
- `main` : option `--images` → `produire_images(club, registre, maintenant, DOSSIER_IMAGES, CACHE_LOGOS)` puis `purger_images(DOSSIER_IMAGES, maintenant)` ; si `--test X` est aussi donné, produire `test-<X>.png` à partir du dernier résultat de ce collectif (même dessin) ; afficher le nombre d'images et `return 0` sans envoyer ni écrire le registre. Pour l'envoi normal : `executer(..., habiller=lambda ms: avec_images(ms, DOSSIER_IMAGES, config["notifications"]["url_images"]))` ; pour `--test`, `avec_images([message_test(...)], ...)[0]`.

- [ ] **Step 5: Lancer les tests**

Run: `.venv/Scripts/python -m pytest collecteur/tests -q`
Expected: tous PASS, sortie propre.

- [ ] **Step 6: Vérifier le rendu sur les vraies données**

```bash
.venv/Scripts/python -c "import sys,json; sys.path.insert(0,'collecteur'); import notifieur as n; from datetime import datetime,timezone; from pathlib import Path; d=json.load(open('partage/fixtures/club-2026-10-13.json',encoding='utf-8')); print(n.produire_images(d, {}, datetime(2026,10,12,8,0,tzinfo=timezone.utc), Path('.superpowers/apercus/notifs'), Path('.superpowers/apercus/logos'))[:3])"
```

Ouvrir `20261011-seniors-f-1-2644292.png` (adversaire sans écusson → initiales « ES ») et `20261011-seniors-m-2673792.png` (Levallois, écusson FFHB) dans `.superpowers/apercus/notifs/` : écusson de Clamart rond sans carré rouge, noms entiers ou tronqués proprement, score centré. `.superpowers/` est ignoré par git.

- [ ] **Step 7: Commit**

```bash
git add collecteur/banderole.py collecteur/polices collecteur/textes.py collecteur/notifieur.py collecteur/tests collecteur/requirements.txt config.json
git commit -m "Notifieur : image banderole écusson – score – écusson

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Workflow, mise en place de Firebase, premier passage

**Files:**
- Modify: `.github/workflows/mise-a-jour.yml`, `README.md`, `.gitignore`

**Interfaces:**
- Consumes: `collecteur/notifieur.py` (Tasks 3 et 5).
- Produces: secret GitHub `FIREBASE_SERVICE_ACCOUNT` ; fichier local `app/google-services.json` (non commité) ; registre `collecteur/etat/notifications.json` commité par le workflow ; entrée manuelle `test_sujet` du workflow (utilisée en Task 11).

- [ ] **Step 1: Ignorer les fichiers natifs et Firebase**

Ajouter à `.gitignore` :

```gitignore
# Firebase / builds natifs (CNG)
app/google-services.json
app/GoogleService-Info.plist
app/android/
app/ios/
```

- [ ] **Step 2: Restructurer le workflow en trois jobs**

L'image d'une notification doit être **en ligne avant l'envoi** : Android la télécharge à la réception. Le workflow devient : `collecte` (tests, collecte, images, commit, artefact Pages) → `publication` (déploiement Pages, inchangé) → `notifications` (envoi, commit du registre).

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

c) dans le job `collecte`, entre « Récupérer les données sur ffhandball.fr » et « Enregistrer les nouvelles données », ajouter (l'entrée passe par une variable d'environnement, jamais interpolée dans le script) :

```yaml
      - name: Images des notifications
        if: github.event_name != 'push'
        env:
          TEST_SUJET: ${{ inputs.test_sujet }}
        run: |
          if [ -n "$TEST_SUJET" ]; then
            python collecteur/notifieur.py --images --test "$TEST_SUJET"
          else
            python collecteur/notifieur.py --images
          fi
```

et dans « Enregistrer les nouvelles données », remplacer `git add site/data collecteur/cache` par `git add site/data site/notifs collecteur/cache`.

d) ajouter à la fin du fichier un troisième job :

```yaml
  notifications:
    needs: publication
    if: github.event_name != 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.ref_name }}      # la tête de branche, qui contient le commit du job collecte

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
          cache-dependency-path: |
            collecteur/requirements.txt
            collecteur/requirements-dev.txt

      - name: Installer les dépendances
        run: pip install -r collecteur/requirements.txt

      - name: Envoyer les notifications
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

      - name: Enregistrer le registre des envois
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add collecteur/etat
          if git diff --cached --quiet; then
            echo "Registre inchangé."
          else
            git commit -m "Notifications du $(date -u +'%Y-%m-%d %H:%M') UTC"
            git push
          fi
```

Le groupe `concurrency: mise-a-jour` (déjà présent, sans annulation) garantit qu'un passage ne démarre pas pendant qu'un autre pousse ses commits.

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
git commit -m "Workflow : images puis publication puis notifications, passage de 15:45, test manuel

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
Expected : workflow vert (trois jobs) ; dans le journal de l'étape « Envoyer les notifications » : « Notifications : 0 envoyée(s), 0 échec(s), 0 prévue(s) » (premier déploiement : marquage sans envoi) ; un commit du bot ajoute `collecteur/etat/notifications.json`. Vérifier :

```bash
git pull && python -c "import json; print(len(json.load(open('collecteur/etat/notifications.json', encoding='utf-8'))))"
```

---

### Task 7: Préférences de notifications et sujets attendus (app, pur)

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

### Task 8: Firebase dans l'app et synchronisation des abonnements

**Files:**
- Create: `app/src/notifications/fcm.ts`, `app/src/notifications/synchro.ts`, `app/src/notifications/synchro.test.ts`
- Modify: `app/package.json` (dépendances), `app/app.json`, `app/test/setup.ts`, `app/src/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `sujetsAttendus`, `planAbonnements`, store étendu (Task 7) ; `app/google-services.json` (Task 6).
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

Prérequis : `app/google-services.json` présent (Task 6 Step 5) ; JDK d'Android Studio : `export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"` ; `export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"`. L'AVD doit avoir les **services Google Play** (image « Google Play » ou « Google APIs ») : sinon FCM ne fonctionne pas — le vérifier dans Device Manager et, au besoin, créer un AVD *Pixel 8 · API 35 · Google Play* (action de l'utilisateur).

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

### Task 9: Autorisation au premier lancement et réglages des notifications

**Files:**
- Create: `app/src/ecrans/VueAutorisation.tsx`, `app/src/ecrans/VueAutorisation.test.tsx`, `app/src/app/autorisation.tsx`
- Modify: `app/src/app/bienvenue.tsx`, `app/src/ecrans/VueReglages.tsx`, `app/src/ecrans/buteurs-reglages.test.tsx`, `app/src/app/reglages.tsx`

**Interfaces:**
- Consumes: `demanderAutorisation` (Task 8), store (Task 7), `CONTENU_BOUTON`, `ProtectionBarreEtat` (Plan 2).
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

### Task 10: Recevoir et ouvrir une notification

**Files:**
- Create: `app/src/notifications/liens.ts`, `app/src/notifications/liens.test.ts`, `app/src/notifications/GestionNotifications.tsx`, `app/src/notifications/GestionNotifications.test.tsx`
- Modify: `app/src/donnees/selecteurs.ts`, `app/src/donnees/selecteurs.test.ts`, `app/src/ecrans/VueMatch.tsx` (prop `equipeId?`), `app/src/app/match/[id].tsx`, `app/src/app/equipe/[collectif].tsx`, `app/src/app/_layout.tsx`

**Interfaces:**
- Consumes: `ecouterPremierPlan`, `ecouterOuverture`, `notificationInitiale`, `NotifRecue` (Task 8).
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

### Task 11: Vérification de bout en bout

**Files:**
- Create: `.impeccable/review/phone-android-autorisation.png`, `phone-android-reglages-notifications.png`, `phone-android-notification.png` (non commités)

**Interfaces:**
- Consumes: tout le plan ; secret GitHub configuré (Task 6) ; development build (Task 8).
- Produces: preuve sur appareil qu'une notification envoyée par le workflow arrive et ouvre la bonne fiche.

- [ ] **Step 1: Build et parcours de premier lancement**

Sur l'émulateur (avec services Google Play), `npx expo run:android`. Désinstaller d'abord l'ancienne version de l'app si elle existe pour repartir d'un premier lancement (`adb uninstall fr.clamarthandball.app` — ne touche que cette app). Choisir « Seniors F 1 » → Continuer → écran « Recevoir les résultats de vos équipes ? » (capture `phone-android-autorisation.png`) → « Activer les notifications » → accepter la boîte Android.

- [ ] **Step 2: Réglages**

Accueil → Réglages : section Notifications, « Résultats de mes équipes » activé, « Rappel la veille du match » désactivé (capture `phone-android-reglages-notifications.png`).

- [ ] **Step 3: Notification de test (action de l'utilisateur)**

Mettre l'app en arrière-plan (touche Accueil d'Android). Utilisateur : *Actions → Mise à jour des résultats → Run workflow → test_sujet = `seniors-f-1`*. Expected : en moins d'une minute après l'étape « Envoyer les notifications », la notification « Test · Clamart Handball » s'affiche sur l'émulateur ; dépliée, elle montre la banderole du dernier résultat de Seniors F 1 (`test-seniors-f-1.png`, publiée par le job collecte) — capture du volet `phone-android-notification.png` ; la toucher ouvre la fiche « Seniors F 1 ». App au premier plan pendant un second test : le bandeau en bas de l'app s'affiche.

- [ ] **Step 4: Bilan**

Remettre l'émulateur dans son état (thème, police), arrêter Metro et l'émulateur **par leur PID**, `git checkout app/tsconfig.json` si besoin, `git status` propre. Consigner dans le rapport ce qui a été observé (et ce qui ne l'a pas été : un vrai résultat notifié ne peut être observé que le week-end suivant un match).
