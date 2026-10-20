"""R6 : en cours de saison, une collecte appauvrie ne doit jamais remplacer les données publiées."""
import json

import pytest

import collecte


def _club(saison, ids):
    return {"saison": saison, "collectifs": [{"id": i} for i in ids], "equipes": []}


def test_pertes_meme_saison_collectif_manquant():
    assert collecte.collectifs_perdus(_club("2026-2027", ["a", "b"]), _club("2026-2027", ["a"])) == ["b"]


def test_pertes_meme_saison_meme_nombre_mais_id_different():
    assert collecte.collectifs_perdus(_club("2026-2027", ["a", "b"]), _club("2026-2027", ["a", "c"])) == ["b"]


def test_pas_de_perte_si_identique_ou_plus():
    assert collecte.collectifs_perdus(_club("2026-2027", ["a"]), _club("2026-2027", ["a", "b"])) == []
    assert collecte.collectifs_perdus(_club("2026-2027", ["a"]), _club("2026-2027", ["a"])) == []


def test_pas_de_perte_si_nouvelle_saison():
    assert collecte.collectifs_perdus(_club("2025-2026", ["a", "b"]), _club("2026-2027", ["a"])) == []


def test_pas_de_perte_sans_fichier_precedent():
    assert collecte.collectifs_perdus(None, _club("2026-2027", ["a"])) == []


@pytest.fixture
def sortie(tmp_path, monkeypatch):
    monkeypatch.setattr(collecte, "SORTIE", tmp_path)
    return tmp_path


def _publier(sortie, ancien, nouveau):
    if ancien is not None:
        (sortie / "club.json").write_text(json.dumps(ancien), encoding="utf-8")
    return collecte.ecrire_club(nouveau)


def test_ecrire_club_refuse_la_perte_et_ne_touche_a_rien(sortie, capsys):
    ancien = _club("2026-2027", ["a", "b"])
    assert _publier(sortie, ancien, _club("2026-2027", ["a"])) is False
    assert json.loads((sortie / "club.json").read_text(encoding="utf-8")) == ancien
    assert not (sortie / "club.json.tmp").exists()
    assert "b" in capsys.readouterr().err


def test_ecrire_club_nouvelle_saison(sortie):
    nouveau = _club("2027-2028", ["a"])
    assert _publier(sortie, _club("2026-2027", ["a", "b"]), nouveau) is True
    assert json.loads((sortie / "club.json").read_text(encoding="utf-8")) == nouveau


@pytest.mark.parametrize("ids", [["a", "b"], ["a", "b", "c"]])
def test_ecrire_club_meme_saison_sans_perte(sortie, ids):
    nouveau = _club("2026-2027", ids)
    assert _publier(sortie, _club("2026-2027", ["a", "b"]), nouveau) is True
    assert json.loads((sortie / "club.json").read_text(encoding="utf-8")) == nouveau


def test_ecrire_club_premier_fichier(sortie):
    assert _publier(sortie, None, _club("2026-2027", ["a"])) is True


def test_ecrire_club_ancien_fichier_illisible(sortie):
    (sortie / "club.json").write_text("{pas du json", encoding="utf-8")
    assert collecte.ecrire_club(_club("2026-2027", ["a"])) is True
