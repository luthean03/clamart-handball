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
