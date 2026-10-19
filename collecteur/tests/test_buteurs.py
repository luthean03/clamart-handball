import json
from datetime import datetime, timedelta, timezone

import pytest

import collecte

STATS = [
    {"prenom": "DIARA", "nom": "DORILAS", "numero": "41", "buts": "9", "equipeId": 7},
    {"prenom": "EVA", "nom": "NDIAYE", "numero": "9", "buts": "4", "equipeId": 7},
    {"prenom": "MELINA", "nom": "KOBZILI", "numero": "97", "buts": "0", "equipeId": 7},
    {"prenom": "AMA", "nom": "KOUADIO", "numero": "5", "buts": "5", "equipeId": 3},
    {"prenom": "MARIE", "nom": "DUPONT", "numero": "2", "buts": "3", "equipeId": 3},
]


def test_tous_les_joueurs_des_deux_equipes_y_compris_a_zero_but():
    nous, eux = collecte.buteurs_de_la_rencontre(STATS, 7)
    assert nous == [{"joueur": "D. Dorilas", "numero": 41, "buts": 9}, {"joueur": "E. Ndiaye", "numero": 9, "buts": 4},
                    {"joueur": "M. Kobzili", "numero": 97, "buts": 0}]
    assert [b["joueur"] for b in eux] == ["A. Kouadio", "M. Dupont"]


def test_joueur_masque_a_zero_but_ecarte(monkeypatch):
    monkeypatch.setattr(collecte, "MASQUES", {"MELINA KOBZILI"})
    nous, _ = collecte.buteurs_de_la_rencontre(STATS, 7)
    assert [b["joueur"] for b in nous] == ["D. Dorilas", "E. Ndiaye"]


def test_joueur_masque_jamais_publie(monkeypatch):
    monkeypatch.setattr(collecte, "MASQUES", {"MARIE DUPONT"})
    _, eux = collecte.buteurs_de_la_rencontre(STATS, 7)
    assert [b["joueur"] for b in eux] == ["A. Kouadio"]


def test_aucun_prenom_complet_dans_les_buteurs():
    nous, eux = collecte.buteurs_de_la_rencontre(STATS, 7)
    assert not any("DIARA" in b["joueur"].upper() for b in nous + eux)


# --- cache des matchs joués : le cache ne contient que des noms réduits, donc pas re-masquable

def _page_match(stats=STATS):
    return {"competitions---rencontre-liste-joueurs": {"statsJoueurs": stats}}


@pytest.fixture
def cache(tmp_path, monkeypatch):
    monkeypatch.setattr(collecte, "CACHE", tmp_path)
    return tmp_path


def _telechargements(monkeypatch):
    appels = []
    monkeypatch.setattr(collecte.ff, "components", lambda chemin: appels.append(chemin) or _page_match())
    return appels


def test_cache_retelecharge_quand_la_liste_des_masques_change(cache, monkeypatch):
    appels = _telechargements(monkeypatch)
    monkeypatch.setattr(collecte, "MASQUES", set())
    info = collecte.salle_et_buteurs("/x/rencontre-42/", 7, True)
    assert "M. Dupont" in [b["joueur"] for b in info["buteurs_adverses"]]
    assert "M. Dupont" in (cache / "42.json").read_text(encoding="utf-8")

    monkeypatch.setattr(collecte, "MASQUES", {"MARIE DUPONT"})
    info = collecte.salle_et_buteurs("/x/rencontre-42/", 7, True)
    assert len(appels) == 2
    assert [b["joueur"] for b in info["buteurs_adverses"]] == ["A. Kouadio"]
    assert "Dupont" not in (cache / "42.json").read_text(encoding="utf-8")


def test_cache_a_jour_reutilise_sans_telechargement(cache, monkeypatch):
    appels = _telechargements(monkeypatch)
    monkeypatch.setattr(collecte, "MASQUES", {"MARIE DUPONT"})
    premier = collecte.salle_et_buteurs("/x/rencontre-42/", 7, True)
    assert collecte.salle_et_buteurs("/x/rencontre-42/", 7, True) == premier
    assert len(appels) == 1


def test_cache_ancien_sans_buteurs_adverses_retelecharge(cache, monkeypatch):
    appels = _telechargements(monkeypatch)
    (cache / "42.json").write_text('{"salle": null, "buteurs": [], "masques": ""}', encoding="utf-8")
    monkeypatch.setattr(collecte, "MASQUES", set())
    info = collecte.salle_et_buteurs("/x/rencontre-42/", 7, True)
    assert len(appels) == 1
    assert [b["joueur"] for b in info["buteurs_adverses"]] == ["A. Kouadio", "M. Dupont"]


def test_cache_sans_marqueur_joueurs_retelecharge(cache, monkeypatch):
    appels = _telechargements(monkeypatch)
    monkeypatch.setattr(collecte, "MASQUES", set())
    ancien = {"salle": None, "buteurs": [{"joueur": "D. Dorilas", "numero": 41, "buts": 9}], "buteurs_adverses": [],
              "masques": ""}
    (cache / "42.json").write_text(json.dumps(ancien), encoding="utf-8")
    info = collecte.salle_et_buteurs("/x/rencontre-42/", 7, True)
    assert len(appels) == 1
    assert "M. Kobzili" in [b["joueur"] for b in info["buteurs"]]
    assert info["joueurs"] == "tous"
    collecte.salle_et_buteurs("/x/rencontre-42/", 7, True)
    assert len(appels) == 1


# --- match joué sans buteurs en cache : la FFHB publie parfois les stats après le score

MAINTENANT = datetime(2026, 10, 16, 12, 0, tzinfo=timezone.utc)


def _ecrire_cache(cache, buteurs, buteurs_adverses):
    info = {"salle": None, "buteurs": buteurs, "buteurs_adverses": buteurs_adverses, "masques": "",
            "joueurs": "tous"}
    (cache / "42.json").write_text(json.dumps(info), encoding="utf-8")


def test_cache_sans_buteurs_retelecharge_dans_les_7_jours(cache, monkeypatch):
    appels = _telechargements(monkeypatch)
    monkeypatch.setattr(collecte, "MASQUES", set())
    _ecrire_cache(cache, [], [])
    date = (MAINTENANT - timedelta(days=6, hours=23)).isoformat()
    info = collecte.salle_et_buteurs("/x/rencontre-42/", 7, True, date, MAINTENANT)
    assert len(appels) == 1
    assert [b["joueur"] for b in info["buteurs"]] == ["D. Dorilas", "E. Ndiaye", "M. Kobzili"]


def test_cache_sans_buteurs_conserve_apres_7_jours(cache, monkeypatch):
    appels = _telechargements(monkeypatch)
    monkeypatch.setattr(collecte, "MASQUES", set())
    _ecrire_cache(cache, [], [])
    date = (MAINTENANT - timedelta(days=7)).isoformat()
    info = collecte.salle_et_buteurs("/x/rencontre-42/", 7, True, date, MAINTENANT)
    assert appels == []
    assert info["buteurs"] == [] and info["buteurs_adverses"] == []


def test_cache_avec_buteurs_conserve_dans_les_7_jours(cache, monkeypatch):
    appels = _telechargements(monkeypatch)
    monkeypatch.setattr(collecte, "MASQUES", set())
    _ecrire_cache(cache, [], [{"joueur": "A. Kouadio", "numero": 5, "buts": 5}])
    date = (MAINTENANT - timedelta(days=1)).isoformat()
    info = collecte.salle_et_buteurs("/x/rencontre-42/", 7, True, date, MAINTENANT)
    assert appels == []
    assert [b["joueur"] for b in info["buteurs_adverses"]] == ["A. Kouadio"]
