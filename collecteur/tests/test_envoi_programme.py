import copy
import json
from datetime import datetime, timezone

import pytest

import notifieur
from notifieur import corps_requete, executer_programme, messages_programme
from programme import etat_du_club
from test_envoi import FauxEnvoyeur, club_v2

REGLAGES = {"fuseau": "Europe/Paris", "max_par_passage": 40, "rappels_a_partir_de": "16:30"}
LUNDI = datetime(2026, 10, 13, 8, 0, tzinfo=timezone.utc)
CLE = "seniors-m:2734038"
CLE_F = "seniors-f-1:2729291"


def match(club, collectif, match_id):
    for e in club["equipes"]:
        if e["collectif"] == collectif:
            for m in e["matchs"]:
                if m["id"] == match_id:
                    return m
    raise KeyError(match_id)


def deplacer(club, collectif, match_id, date):
    match(club, collectif, match_id)["date"] = date


def un_changement():
    """(club, ancien état) : le match seniors-m 2734038 est déplacé du 17 au 24/10."""
    club = club_v2()
    ancien = etat_du_club(club)
    deplacer(club, "seniors-m", "2734038", "2026-10-24T18:00:00+02:00")
    return club, ancien


def deux_changements():
    club, ancien = un_changement()
    deplacer(club, "seniors-f-1", "2729291", "2026-10-25T15:30:00+02:00")
    return club, ancien


def test_premier_passage_ecrit_l_etat_sans_envoyer():
    club, envoyeur = club_v2(), FauxEnvoyeur()
    etat, rapport = executer_programme(club, None, LUNDI, REGLAGES, envoyeur, 40)
    assert etat == etat_du_club(club)
    assert envoyeur.envoyes == [] and rapport == {"prevus": 0, "envoyes": 0, "echecs": 0, "raisons": []}


def test_nouvelle_saison_sans_envoi():
    club, envoyeur = club_v2(), FauxEnvoyeur()
    ancien = etat_du_club(club)
    ancien["saison"] = "2025-2026"
    ancien["matchs"] = {}
    etat, rapport = executer_programme(club, ancien, LUNDI, REGLAGES, envoyeur, 40)
    assert etat == etat_du_club(club) and envoyeur.envoyes == [] and rapport["prevus"] == 0


def test_un_changement_ouvre_le_match():
    club, ancien = un_changement()
    envoyeur = FauxEnvoyeur()
    etat, rapport = executer_programme(club, ancien, LUNDI, REGLAGES, envoyeur, 40)
    [m] = envoyeur.envoyes
    assert m.sujet == "programme-seniors-m"
    assert m.cle.startswith("programme:seniors-m:") and len(m.cle.split(":")[2]) == 10
    assert m.titre.startswith("Match déplacé · Seniors M")
    assert m.donnees == {"type": "programme", "collectif": "seniors-m",
                         "equipe_id": "33244-clamart-handball", "match_id": "2734038"}
    assert m.instant == "2026-10-24T18:00:00+02:00"
    assert rapport == {"prevus": 1, "envoyes": 1, "echecs": 0, "raisons": []}
    assert etat["matchs"][CLE]["date"] == "2026-10-24T18:00:00+02:00"


def test_retire_et_groupe_ouvrent_l_equipe():
    club, ancien = un_changement()
    retire = copy.deepcopy(club)
    for e in retire["equipes"]:
        e["matchs"] = [m for m in e["matchs"] if not (e["collectif"] == "seniors-m" and m["id"] == "2734038")]
    [m], _ = messages_programme(retire, ancien, LUNDI, "Europe/Paris")
    assert m.donnees == {"type": "programme", "collectif": "seniors-m"}

    deplacer(club, "seniors-m", "2673808", "2026-12-13T14:30:00+01:00")
    [m], _ = messages_programme(club, ancien, LUNDI, "Europe/Paris")
    assert m.donnees == {"type": "programme", "collectif": "seniors-m"}
    assert m.titre.startswith("Programme modifié")


def test_corps_requete_programme():
    club, ancien = un_changement()
    [m], gardees = messages_programme(club, ancien, LUNDI, "Europe/Paris")
    assert gardees == set()
    requete = corps_requete(m)["message"]
    assert requete["topic"] == "programme-seniors-m"
    assert requete["android"]["notification"]["tag"] == m.cle
    assert "image" not in requete["android"]["notification"]
    assert requete["data"]["type"] == "programme"


def test_echec_puis_reussite_meme_tag():
    club, ancien = un_changement()
    [prevu], _ = messages_programme(club, ancien, LUNDI, "Europe/Paris")
    etat, rapport = executer_programme(club, ancien, LUNDI, REGLAGES, FauxEnvoyeur(echoue_sur=[prevu.cle]), 40)
    assert rapport["echecs"] == 1 and rapport["envoyes"] == 0 and prevu.cle in rapport["raisons"][0]
    assert etat["matchs"][CLE] == ancien["matchs"][CLE]

    envoyeur = FauxEnvoyeur()
    etat, rapport = executer_programme(club, ancien, LUNDI, REGLAGES, envoyeur, 40)
    assert [m.cle for m in envoyeur.envoyes] == [prevu.cle]
    assert etat["matchs"][CLE]["date"] == "2026-10-24T18:00:00+02:00"


def test_plafond_garde_l_etat_des_collectifs_non_envoyes():
    club, ancien = deux_changements()
    envoyeur = FauxEnvoyeur()
    etat, rapport = executer_programme(club, ancien, LUNDI, REGLAGES, envoyeur, 1)
    assert len(envoyeur.envoyes) == 1 and rapport["prevus"] == 1
    envoye = envoyeur.envoyes[0].donnees["collectif"]
    nouveau = {"seniors-m": ("2026-10-24T18:00:00+02:00", CLE), "seniors-f-1": ("2026-10-25T15:30:00+02:00", CLE_F)}
    for col, (date, cle) in nouveau.items():
        attendu = date if col == envoye else ancien["matchs"][cle]["date"]
        assert etat["matchs"][cle]["date"] == attendu


def test_budget_nul_n_envoie_rien():
    club, ancien = un_changement()
    envoyeur = FauxEnvoyeur()
    etat, rapport = executer_programme(club, ancien, LUNDI, REGLAGES, envoyeur, 0)
    assert envoyeur.envoyes == [] and etat == ancien and rapport["prevus"] == 0


def test_essai_renvoie_l_etat_inchange():
    club, ancien = un_changement()
    etat, rapport = executer_programme(club, ancien, LUNDI, REGLAGES, None, 40)
    assert etat == ancien and rapport["envoyes"] == 0 and rapport["prevus"] == 1


# --- main -----------------------------------------------------------------------------------------

@pytest.fixture
def chemins(tmp_path, monkeypatch):
    club, ancien = un_changement()
    donnees = tmp_path / "club.json"
    donnees.write_text(json.dumps(club), encoding="utf-8")
    etat = tmp_path / "etat" / "programme.json"
    etat.parent.mkdir()
    etat.write_text(json.dumps(ancien), encoding="utf-8")
    registre = tmp_path / "etat" / "notifications.json"
    registre.write_text("{}", encoding="utf-8")
    monkeypatch.setattr(notifieur, "DONNEES", donnees)
    monkeypatch.setattr(notifieur, "ETAT_PROGRAMME", etat)
    monkeypatch.setattr(notifieur, "REGISTRE", registre)
    monkeypatch.setattr(notifieur, "DOSSIER_IMAGES", tmp_path / "notifs")
    return etat, ancien


def faux_envoyeur(monkeypatch, **options):
    envoyeur = FauxEnvoyeur(**options)
    monkeypatch.setattr(notifieur, "EnvoyeurFCM", lambda compte: envoyeur)
    return envoyeur


def test_main_essai_n_ecrit_pas_l_etat(chemins):
    etat, ancien = chemins
    avant = etat.read_text(encoding="utf-8")
    assert notifieur.main(["--essai"], {}, LUNDI) == 0
    assert etat.read_text(encoding="utf-8") == avant


def test_main_ecrit_l_etat_apres_envoi(chemins, monkeypatch):
    etat, ancien = chemins
    envoyeur = faux_envoyeur(monkeypatch)
    assert notifieur.main([], {"FIREBASE_SERVICE_ACCOUNT": "{}"}, LUNDI) == 0
    assert [m.sujet for m in envoyeur.envoyes if m.sujet.startswith("programme-")] == ["programme-seniors-m"]
    ecrit = json.loads(etat.read_text(encoding="utf-8"))
    assert ecrit["matchs"][CLE]["date"] == "2026-10-24T18:00:00+02:00"


def test_main_cree_l_etat_au_premier_passage(chemins, monkeypatch):
    etat, ancien = chemins
    etat.unlink()
    envoyeur = faux_envoyeur(monkeypatch)
    assert notifieur.main([], {"FIREBASE_SERVICE_ACCOUNT": "{}"}, LUNDI) == 0
    assert not [m for m in envoyeur.envoyes if m.sujet.startswith("programme-")]
    assert json.loads(etat.read_text(encoding="utf-8"))["matchs"][CLE]["date"] == "2026-10-24T18:00:00+02:00"


def test_main_echec_programme_rend_1(chemins, monkeypatch):
    etat, ancien = chemins
    club, _ = un_changement()
    [prevu], _ = messages_programme(club, ancien, LUNDI, "Europe/Paris")
    faux_envoyeur(monkeypatch, echoue_sur=[prevu.cle])
    assert notifieur.main([], {"FIREBASE_SERVICE_ACCOUNT": "{}"}, LUNDI) == 1
    assert json.loads(etat.read_text(encoding="utf-8")) == ancien


def test_main_test_envoie_aussi_sur_programme(chemins, monkeypatch):
    envoyeur = faux_envoyeur(monkeypatch)
    assert notifieur.main(["--test", "seniors-m"], {"FIREBASE_SERVICE_ACCOUNT": "{}"}, LUNDI) == 0
    assert [m.sujet for m in envoyeur.envoyes] == ["resultats-seniors-m", "programme-seniors-m"]
    p = envoyeur.envoyes[1]
    assert p.donnees == {"type": "test", "collectif": "seniors-m"}
    assert (p.titre, p.corps) == (envoyeur.envoyes[0].titre, envoyeur.envoyes[0].corps)
