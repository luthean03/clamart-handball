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


# --- câblage de main() -------------------------------------------------------------------------

class FauxEnvoyeur:
    def __init__(self):
        self.envoyes = []

    def envoyer(self, m):
        self.envoyes.append(m)


def _environnement(tmp_path, monkeypatch, registre=None):
    """Redirige toutes les entrées/sorties de notifieur vers tmp_path."""
    donnees = tmp_path / "club.json"
    donnees.write_text(json.dumps(club_v2()), encoding="utf-8")
    fichier_registre = tmp_path / "etat" / "notifications.json"
    if registre is not None:
        fichier_registre.parent.mkdir(parents=True)
        fichier_registre.write_text(json.dumps(registre), encoding="utf-8")
    monkeypatch.setattr(notifieur, "DONNEES", donnees)
    monkeypatch.setattr(notifieur, "REGISTRE", fichier_registre)
    monkeypatch.setattr(notifieur, "DOSSIER_IMAGES", tmp_path / "notifs")
    monkeypatch.setattr(notifieur, "CACHE_LOGOS", tmp_path / "logos")
    return fichier_registre


def test_main_images_produit_sans_envoyer_ni_ecrire_le_registre(tmp_path, monkeypatch):
    registre = _environnement(tmp_path, monkeypatch, registre={})
    avant = registre.read_text(encoding="utf-8")

    def interdit(compte):
        raise AssertionError("aucun envoi avec --images")
    monkeypatch.setattr(notifieur, "EnvoyeurFCM", interdit)
    assert notifieur.main(["--images"], environ={"FIREBASE_SERVICE_ACCOUNT": "{\"project_id\": \"p\"}"},
                          maintenant=LUNDI) == 0
    assert (tmp_path / "notifs" / "20261011-seniors-f-1-2644292.png").exists()
    assert registre.read_text(encoding="utf-8") == avant


def test_main_images_purge_les_vieilles_images(tmp_path, monkeypatch):
    _environnement(tmp_path, monkeypatch, registre={})
    (tmp_path / "notifs").mkdir()
    vieille = tmp_path / "notifs" / "20260701-u13-f-1-1.png"
    vieille.write_bytes(b"x")
    notifieur.main(["--images"], environ={}, maintenant=LUNDI)
    assert not vieille.exists()


def test_main_images_et_test_produit_l_image_de_test(tmp_path, monkeypatch):
    _environnement(tmp_path, monkeypatch, registre={})
    assert notifieur.main(["--images", "--test", "seniors-f-1"], environ={}, maintenant=LUNDI) == 0
    assert (tmp_path / "notifs" / "test-seniors-f-1.png").exists()


def test_main_envoi_joint_l_image_quand_le_fichier_existe(tmp_path, monkeypatch):
    registre = _environnement(tmp_path, monkeypatch, registre={})
    (tmp_path / "notifs").mkdir()
    (tmp_path / "notifs" / "20261011-seniors-f-1-2644292.png").write_bytes(b"x")
    faux = FauxEnvoyeur()
    monkeypatch.setattr(notifieur, "EnvoyeurFCM", lambda compte: faux)
    assert notifieur.main([], environ={"FIREBASE_SERVICE_ACCOUNT": "{\"project_id\": \"p\"}"}, maintenant=LUNDI) == 0
    par_cle = {m.cle: m for m in faux.envoyes}
    assert par_cle["resultat:seniors-f-1:2644292"].image == (
        "https://luthean03.github.io/clamart-handball/notifs/20261011-seniors-f-1-2644292.png")
    assert all(m.image is None for cle, m in par_cle.items() if cle != "resultat:seniors-f-1:2644292")
    assert "resultat:seniors-f-1:2644292" in json.loads(registre.read_text(encoding="utf-8"))


def test_main_test_joint_l_image_de_test(tmp_path, monkeypatch):
    _environnement(tmp_path, monkeypatch)
    (tmp_path / "notifs").mkdir()
    (tmp_path / "notifs" / "test-seniors-f-1.png").write_bytes(b"x")
    faux = FauxEnvoyeur()
    monkeypatch.setattr(notifieur, "EnvoyeurFCM", lambda compte: faux)
    assert notifieur.main(["--test", "seniors-f-1"], environ={"FIREBASE_SERVICE_ACCOUNT": "{\"project_id\": \"p\"}"},
                          maintenant=LUNDI) == 0
    assert faux.envoyes[0].image == "https://luthean03.github.io/clamart-handball/notifs/test-seniors-f-1.png"
