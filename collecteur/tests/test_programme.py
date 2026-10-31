import copy
import json
from datetime import datetime, timezone
from pathlib import Path

from programme import Changement, detecter, etat_apres, etat_du_club

FUSEAU = "Europe/Paris"
MAINTENANT = datetime(2026, 10, 13, 18, 0, tzinfo=timezone.utc)
CLE = "seniors-m:2734038"


def club_v2():
    chemin = Path(__file__).resolve().parents[2] / "partage" / "fixtures" / "club-2026-10-13.json"
    return json.loads(chemin.read_text(encoding="utf-8"))


def trouver(club, collectif, match_id):
    for equipe in club["equipes"]:
        if equipe["collectif"] == collectif:
            for m in equipe["matchs"]:
                if m["id"] == match_id:
                    return m
    raise KeyError(match_id)


def cas(date_ancienne="2026-10-17T18:00:00+02:00", **modifs):
    """Ancien état = fixture (match 2734038 daté `date_ancienne`) ; club = fixture modifiée par `modifs`."""
    club = club_v2()
    ancien = etat_du_club(club)
    ancien["matchs"][CLE]["date"] = date_ancienne
    m = trouver(club, "seniors-m", "2734038")
    m.update(modifs)
    return ancien, club


def lancer(ancien, club):
    return detecter(ancien, club, MAINTENANT, FUSEAU)


def un_changement(ancien, club, collectif="seniors-m"):
    par_collectif, gardees = lancer(ancien, club)
    assert list(par_collectif) == [collectif]
    assert len(par_collectif[collectif]) == 1
    return par_collectif[collectif][0], gardees


def test_etat_ignore_les_matchs_joues():
    club = club_v2()
    etat = etat_du_club(club)
    assert etat["saison"] == club["saison"]
    assert "seniors-m:2673792" not in etat["matchs"]          # joué (résultat)
    assert "seniors-m:2673808" in etat["matchs"]
    assert etat["matchs"][CLE] == {
        "date": "2026-10-17T18:00:00+02:00", "salle": "GYMNASE DU PETIT CLAMART",
        "equipe_id": "33244-clamart-handball", "adversaire": etat["matchs"][CLE]["adversaire"], "domicile": True,
    }
    assert etat["matchs"]["seniors-m:2673828"]["salle"] is None
    joues = {f"{e['collectif']}:{m['id']}" for e in club["equipes"] for m in e["matchs"] if m["resultat"]}
    assert joues and not joues & set(etat["matchs"])


def test_aucun_changement():
    club = club_v2()
    assert lancer(etat_du_club(club), club) == ({}, set())


def test_nouveau_match_date():
    ancien, club = cas()
    ancien["matchs"][CLE]["date"] = None
    c, _ = un_changement(ancien, club)
    assert c == Changement(
        type="nouveau", collectif="seniors-m", match_id="2734038", equipe_id="33244-clamart-handball",
        adversaire=c.adversaire, domicile=True, avant=None, apres="2026-10-17T18:00:00+02:00",
        salle_avant="GYMNASE DU PETIT CLAMART", salle_apres="GYMNASE DU PETIT CLAMART")

    ancien, club = cas()
    del ancien["matchs"][CLE]
    c, _ = un_changement(ancien, club)
    assert c.type == "nouveau" and c.avant is None


def test_deplace_jour_different():
    ancien, club = cas(date="2026-10-18T18:00:00+02:00")
    c, _ = un_changement(ancien, club)
    assert c.type == "deplace"
    assert (c.avant, c.apres) == ("2026-10-17T18:00:00+02:00", "2026-10-18T18:00:00+02:00")


def test_horaire_meme_jour():
    ancien, club = cas(date="2026-10-17T20:30:00+02:00")
    c, _ = un_changement(ancien, club)
    assert c.type == "horaire"


def test_meme_instant_autre_decalage_pas_de_changement():
    ancien, club = cas(date_ancienne="2026-10-17T16:00:00+00:00")
    assert lancer(ancien, club) == ({}, set())


def test_salle_changee():
    ancien, club = cas(salle={"nom": "Gymnase Autre", "adresse": "x"})
    c, _ = un_changement(ancien, club)
    assert c.type == "salle"
    assert (c.salle_avant, c.salle_apres) == ("GYMNASE DU PETIT CLAMART", "Gymnase Autre")
    assert c.avant == c.apres == "2026-10-17T18:00:00+02:00"


def test_salle_casse_et_espaces_identiques():
    ancien, club = cas(salle={"nom": "Hautpoul ", "adresse": "x"})
    ancien["matchs"][CLE]["salle"] = "HAUTPOUL"
    assert lancer(ancien, club) == ({}, set())


def test_salle_devenue_inconnue_ignoree():
    ancien, club = cas(salle=None)
    assert lancer(ancien, club) == ({}, set())
    ancien, club = cas()
    del trouver(club, "seniors-m", "2734038")["salle"]
    assert lancer(ancien, club) == ({}, set())


def test_jour_et_salle_changes_compte_comme_deplace():
    ancien, club = cas(date="2026-10-18T18:00:00+02:00", salle={"nom": "Gymnase Autre", "adresse": "x"})
    c, _ = un_changement(ancien, club)
    assert c.type == "deplace"
    assert c.salle_apres == "Gymnase Autre"


def test_reporte():
    ancien, club = cas(date=None)
    c, gardees = un_changement(ancien, club)
    assert c.type == "reporte" and c.avant == "2026-10-17T18:00:00+02:00" and c.apres is None
    assert gardees == set()


def test_retire():
    ancien, club = cas()
    equipe = next(e for e in club["equipes"] if e["id"] == "33244-clamart-handball")
    equipe["matchs"] = []
    c, gardees = un_changement(ancien, club)
    assert c.type == "retire" and c.apres is None and c.avant == "2026-10-17T18:00:00+02:00"
    assert gardees == set()


def test_match_joue_n_est_pas_retire():
    ancien, club = cas(resultat={"domicile": 20, "exterieur": 18})
    assert lancer(ancien, club) == ({}, set())
    assert CLE not in etat_du_club(club)["matchs"]


def test_retire_bloque_si_collecte_en_erreur():
    ancien, club = cas()
    club["erreurs"] = ["x"]
    next(e for e in club["equipes"] if e["id"] == "33244-clamart-handball")["matchs"] = []
    assert lancer(ancien, club) == ({}, {CLE})
    ancien, club = cas(date=None)
    club["erreurs"] = ["x"]
    assert lancer(ancien, club) == ({}, {CLE})


def test_retire_bloque_si_equipe_absente():
    ancien, club = cas()
    club["equipes"] = [e for e in club["equipes"] if e["id"] != "33244-clamart-handball"]
    assert lancer(ancien, club) == ({}, {CLE})


def test_match_passe_ignore():
    ancien, club = cas(date="2026-10-12T18:00:00+02:00")          # déplacé vers le passé
    assert lancer(ancien, club) == ({}, set())
    ancien, club = cas()
    ancien["matchs"][CLE]["date"] = None
    trouver(club, "seniors-m", "2734038")["date"] = "2026-10-01T18:00:00+02:00"      # nouveau mais passé
    assert lancer(ancien, club) == ({}, set())
    ancien, club = cas(date_ancienne="2026-10-01T18:00:00+02:00")
    next(e for e in club["equipes"] if e["id"] == "33244-clamart-handball")["matchs"] = []
    assert lancer(ancien, club) == ({}, set())                    # retiré, ancienne date passée


def test_derby_deux_collectifs():
    club = club_v2()
    autre = next(e for e in club["equipes"] if e["collectif"] == "seniors-f-1b")
    derby = copy.deepcopy(trouver(club, "seniors-m", "2734038"))
    autre["matchs"].append(derby)
    ancien = etat_du_club(club)
    assert "seniors-m:2734038" in ancien["matchs"] and "seniors-f-1b:2734038" in ancien["matchs"]
    derby["date"] = "2026-10-18T18:00:00+02:00"
    trouver(club, "seniors-m", "2734038")["date"] = "2026-10-18T18:00:00+02:00"
    par_collectif, _ = lancer(ancien, club)
    assert set(par_collectif) == {"seniors-m", "seniors-f-1b"}
    assert [c.match_id for c in par_collectif["seniors-m"]] == ["2734038"]
    assert [c.match_id for c in par_collectif["seniors-f-1b"]] == ["2734038"]


def test_tri_par_date():
    ancien, club = cas(date="2026-10-18T18:00:00+02:00")
    m = trouver(club, "seniors-m", "2673808")
    ancien["matchs"]["seniors-m:2673808"]["date"] = "2026-12-06T10:00:00+01:00"
    m["date"] = "2026-12-05T10:00:00+01:00"
    par_collectif, _ = lancer(ancien, club)
    assert [c.match_id for c in par_collectif["seniors-m"]] == ["2734038", "2673808"]


def test_etat_apres():
    ancien, club = cas(date="2026-10-18T18:00:00+02:00")
    ancien["matchs"]["seniors-f-1:fantome"] = {"date": None, "salle": None, "equipe_id": "e", "adversaire": "a", "domicile": True}
    ancien["matchs"]["seniors-m:2673808"]["date"] = "2026-12-07T10:00:00+01:00"
    ancien["matchs"]["u18-m:vieux"] = {"date": None, "salle": None, "equipe_id": "e", "adversaire": "a", "domicile": True}
    courant = etat_du_club(club)
    tous = {k.split(":")[0] for k in courant["matchs"]} | {"seniors-f-1", "u18-m"}

    # tout à jour : l'état suit le club (les clés disparues s'en vont)
    assert etat_apres(ancien, club, tous, set()) == courant

    # seniors-m non mis à jour : il garde son ancien état (y compris une clé absente du club)
    ancien["matchs"]["seniors-m:disparu"] = {"date": None, "salle": None, "equipe_id": "e", "adversaire": "a", "domicile": True}
    res = etat_apres(ancien, club, tous - {"seniors-m"}, set())
    assert res["saison"] == club["saison"]
    for cle, v in ancien["matchs"].items():
        if cle.startswith("seniors-m:"):
            assert res["matchs"][cle] == v
    assert res["matchs"]["u18-m:" + next(k.split(":")[1] for k in courant["matchs"] if k.startswith("u18-m:"))] \
        == courant["matchs"][next(k for k in courant["matchs"] if k.startswith("u18-m:"))]
    assert "u18-m:vieux" not in res["matchs"]

    # clé gardée : reprend l'ancienne valeur
    res = etat_apres(ancien, club, tous, {"seniors-m:2673808"})
    assert res["matchs"]["seniors-m:2673808"] == ancien["matchs"]["seniors-m:2673808"]
    assert res["matchs"][CLE] == courant["matchs"][CLE]


def test_etat_apres_garde_la_salle_connue_si_elle_devient_inconnue():
    ancien, club = cas(date="2026-10-17T18:00:00+02:00", salle=None)
    ancien["matchs"][CLE]["salle"] = "GYMNASE DU PETIT CLAMART"
    res = etat_apres(ancien, club, {"seniors-m"}, set())
    assert res["matchs"][CLE]["salle"] == "GYMNASE DU PETIT CLAMART"
    # si la date change en même temps, on suit le club
    ancien, club = cas(date="2026-10-18T18:00:00+02:00", salle=None)
    ancien["matchs"][CLE]["salle"] = "GYMNASE DU PETIT CLAMART"
    assert etat_apres(ancien, club, {"seniors-m"}, set())["matchs"][CLE]["salle"] is None
