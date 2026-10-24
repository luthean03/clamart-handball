"""Salle (nom, adresse) de chaque match non joué : la fiche d'un match à venir affiche son lieu dès que la FFHB le publie."""
from datetime import datetime, timezone

import collecte

MAINTENANT = datetime(2026, 10, 24, 10, 0, tzinfo=timezone.utc)
RACINE = "/competitions/saison-2026-2027-22/departemental/16-ans-masculins-division-2-99999/"
PAGE = {
    "page-header": {"title": "+16 ANS MASCULINS DIVISION 2 TERRITORIALE 92-75"},
    "competitions---poule-selector": {
        "phases": [{"id": 1, "libelle": "Phase 1", "classement": "0"}],
        "poules": [{"ext_pouleId": 10, "phaseId": 1, "libelle": "POULE A"}],
    },
    "competitions---calendar-button": {"equipes": [{"ext_structureId": collecte.CLUB_ID, "ext_equipeId": "55"}]},
}
COMP = {"libelle": "+16 ans masculins", "niveau": "departemental", "organisateur": None, "path": RACINE}


def rencontre(rid: int, date: str | None) -> dict:
    return {"ext_rencontreId": rid, "date": date, "extPouleId": 10, "journeeNumero": rid,
            "equipe1Libelle": "CLAMART HANDBALL", "equipe2Libelle": f"ADVERSAIRE {rid}", "equipe1Id": 7, "equipe2Id": 8}


def pages(rencontres: list[dict], appels: list[str]):
    def components(chemin: str) -> dict:
        appels.append(chemin)
        if chemin.endswith("equipe-55/"):
            return {"competitions---rencontre-list": {"rencontres": rencontres}}
        if "rencontre-" in chemin:
            rid = chemin.rstrip("/").rsplit("-", 1)[-1]
            return {"competitions---rencontre-salle": {"equipement": {
                "libelle": f"GYMNASE {rid}", "rue": f"{rid} RUE DU STADE", "codePostal": "92140", "ville": "CLAMART"}}}
        return {}
    return components


def test_chaque_match_a_venir_a_sa_salle(monkeypatch):
    appels: list[str] = []
    monkeypatch.setattr(collecte.ff, "components", pages([
        rencontre(1, "2026-10-31T18:00:00+01:00"),
        rencontre(2, "2026-11-15T18:00:00+01:00"),
        rencontre(3, "2027-02-27T18:00:00+01:00"),
    ], appels))
    [equipe] = collecte.collecter_competition(COMP, PAGE, MAINTENANT)
    salles = {m["id"]: m.get("salle") for m in equipe["matchs"]}
    assert salles == {
        "1": {"nom": "GYMNASE 1", "adresse": "1 RUE DU STADE 92140 CLAMART"},
        "2": {"nom": "GYMNASE 2", "adresse": "2 RUE DU STADE 92140 CLAMART"},
        "3": {"nom": "GYMNASE 3", "adresse": "3 RUE DU STADE 92140 CLAMART"},
    }


def test_match_commence_sans_score_garde_sa_salle(monkeypatch):
    """Coup d'envoi passé, score pas encore publié : la fiche montre encore le lieu."""
    monkeypatch.setattr(collecte.ff, "components", pages([rencontre(4, "2026-10-24T10:30:00+02:00")], []))
    [equipe] = collecte.collecter_competition(COMP, PAGE, MAINTENANT)
    assert equipe["matchs"][0]["salle"]["nom"] == "GYMNASE 4"


def test_match_sans_date_ne_coute_aucune_requete(monkeypatch):
    """Un match pas encore programmé n'a pas de salle connue : sa page n'est pas téléchargée."""
    appels: list[str] = []
    monkeypatch.setattr(collecte.ff, "components", pages([rencontre(5, None)], appels))
    [equipe] = collecte.collecter_competition(COMP, PAGE, MAINTENANT)
    assert "salle" not in equipe["matchs"][0]
    assert not any("rencontre-" in a for a in appels)
