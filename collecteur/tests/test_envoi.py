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
        "android": {"priority": "high", "notification": {"tag": "resultat:seniors-m:1"}},
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


def test_erreur_http_fcm_conserve_le_corps_de_la_reponse_sans_fuite_du_jeton():
    class FausseReponse:
        status_code = 403
        text = '{"error": {"status": "PERMISSION_DENIED"}} ' + "x" * 600

        def raise_for_status(self):
            raise RuntimeError("403 Client Error: Forbidden")

    class FausseSession:
        def post(self, url, headers=None, json=None, timeout=None):
            return FausseReponse()

    class FauxIdentifiants:
        valid = True
        token = "JETON-SECRET"

    envoyeur = object.__new__(notifieur.EnvoyeurFCM)
    envoyeur.projet = "projet"
    envoyeur._credentials = FauxIdentifiants()
    envoyeur._session = FausseSession()
    m = Message("resultat:seniors-m:1", "resultats-seniors-m", "T", "C", {"type": "resultat"}, "x")
    with pytest.raises(RuntimeError) as err:
        envoyeur.envoyer(m)
    texte = str(err.value)
    assert "PERMISSION_DENIED" in texte
    assert "403" in texte
    assert "JETON-SECRET" not in texte
    assert len(texte) < 600


# --- échecs bruyants et registre sans doublon ni oubli -----------------------------------------

SECRET = {"FIREBASE_SERVICE_ACCOUNT": "{\"project_id\": \"p\"}"}
CLE_KO = "resultat:seniors-f-1:2644292"


def _decor(tmp_path, monkeypatch, registre):
    donnees = tmp_path / "club.json"
    donnees.write_text(json.dumps(club_v2()), encoding="utf-8")
    fichier = tmp_path / "etat" / "notifications.json"
    fichier.parent.mkdir()
    fichier.write_text(json.dumps(registre), encoding="utf-8")
    monkeypatch.setattr(notifieur, "DONNEES", donnees)
    monkeypatch.setattr(notifieur, "REGISTRE", fichier)
    return fichier


def _lire(fichier):
    return json.loads(fichier.read_text(encoding="utf-8"))


def test_envoi_en_echec_sortie_non_nulle_et_resultat_non_marque(tmp_path, monkeypatch, capsys):
    fichier = _decor(tmp_path, monkeypatch, {})
    monkeypatch.setattr(notifieur, "EnvoyeurFCM", lambda compte: FauxEnvoyeur(echoue_sur=[CLE_KO]))
    assert notifieur.main([], environ=SECRET, maintenant=LUNDI) == 1
    assert CLE_KO not in _lire(fichier)
    err = capsys.readouterr().err
    assert "échec(s)" in err and "HTTP 500" in err and CLE_KO in err


def test_envoi_reussi_marque_et_sortie_nulle(tmp_path, monkeypatch):
    fichier = _decor(tmp_path, monkeypatch, {})
    monkeypatch.setattr(notifieur, "EnvoyeurFCM", lambda compte: FauxEnvoyeur())
    assert notifieur.main([], environ=SECRET, maintenant=LUNDI) == 0
    assert CLE_KO in _lire(fichier)


def test_relance_apres_succes_n_envoie_rien(tmp_path, monkeypatch):
    fichier = _decor(tmp_path, monkeypatch, {})
    monkeypatch.setattr(notifieur, "EnvoyeurFCM", lambda compte: FauxEnvoyeur())
    notifieur.main([], environ=SECRET, maintenant=LUNDI)
    deuxieme = FauxEnvoyeur()
    monkeypatch.setattr(notifieur, "EnvoyeurFCM", lambda compte: deuxieme)
    assert notifieur.main([], environ=SECRET, maintenant=LUNDI) == 0
    assert deuxieme.envoyes == []


def test_relance_apres_echec_retente_seulement_l_echec(tmp_path, monkeypatch):
    fichier = _decor(tmp_path, monkeypatch, {})
    monkeypatch.setattr(notifieur, "EnvoyeurFCM", lambda compte: FauxEnvoyeur(echoue_sur=[CLE_KO]))
    assert notifieur.main([], environ=SECRET, maintenant=LUNDI) == 1
    deuxieme = FauxEnvoyeur()
    monkeypatch.setattr(notifieur, "EnvoyeurFCM", lambda compte: deuxieme)
    assert notifieur.main([], environ=SECRET, maintenant=LUNDI) == 0
    assert [m.cle for m in deuxieme.envoyes] == [CLE_KO]
    assert CLE_KO in _lire(fichier)


def test_registre_ecrit_apres_chaque_envoi_meme_si_le_processus_meurt(tmp_path, monkeypatch):
    fichier = _decor(tmp_path, monkeypatch, {})

    class Meurt(FauxEnvoyeur):
        def envoyer(self, m):
            if len(self.envoyes) == 2:
                raise KeyboardInterrupt        # tuerie du runner : n'est pas une Exception
            super().envoyer(m)

    envoyeur = Meurt()
    monkeypatch.setattr(notifieur, "EnvoyeurFCM", lambda compte: envoyeur)
    with pytest.raises(KeyboardInterrupt):
        notifieur.main([], environ=SECRET, maintenant=LUNDI)
    assert {m.cle for m in envoyeur.envoyes} == set(_lire(fichier))


def test_initialisation_impossible_sortie_non_nulle(tmp_path, monkeypatch, capsys):
    _decor(tmp_path, monkeypatch, {})
    assert notifieur.main([], environ={"FIREBASE_SERVICE_ACCOUNT": "pas du json"}, maintenant=LUNDI) == 1
    assert "initialisation" in capsys.readouterr().err


def test_sujet_sans_abonne_n_est_pas_un_echec():
    # FCM répond 200 + {"name": "projects/p/messages/..."} même si personne n'est abonné au sujet
    class Reponse:
        status_code = 200
        text = '{"name": "projects/p/messages/123"}'

        def raise_for_status(self):
            pass

    class Session:
        def post(self, url, headers=None, json=None, timeout=None):
            return Reponse()

    class Identifiants:
        valid = True
        token = "t"

    envoyeur = object.__new__(notifieur.EnvoyeurFCM)
    envoyeur.projet, envoyeur._credentials, envoyeur._session = "p", Identifiants(), Session()
    registre, rapport = executer(club_v2(), {}, LUNDI, REGLAGES, envoyeur)
    assert rapport["echecs"] == 0 and rapport["envoyes"] > 0
