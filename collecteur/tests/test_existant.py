"""Caractérisation du collecteur existant : ces tests doivent passer AVANT toute modification."""
import collecte


def test_categorie_de():
    assert collecte.categorie_de("+16 ANS FEMININES - DIVISION 1 TERRITORIALE 92-75") == "seniors"
    assert collecte.categorie_de("U18 MASCULINS") == "U18"
    assert collecte.categorie_de("-13 FEMININES DELAYAGE") == "U13"


def test_genre_equipe_filles_prime_sur_mixte():
    assert collecte.genre_equipe("U11 MIXTES", "CLAMART HANDBALL 2 (FILLES)") == "F"
    assert collecte.genre_equipe("U11 MIXTES", "CLAMART HANDBALL 1") == "Mixte"


def test_detail_de():
    assert collecte.detail_de("+16 ANS FEMININES - DIVISION 1 TERRITORIALE 92-75") == "D1 territoriale"
    assert collecte.detail_de("COUPE DE FRANCE DEPARTEMENTALE FEMININE") == "Coupe de France départementale"


def test_fixture_reelle(club_v1):
    assert club_v1["saison"] == "2026-2027"
    assert len(club_v1["equipes"]) == 14
    noms = [e["nom"] for e in club_v1["equipes"]]
    assert noms.count("Seniors M") == 3
    assert "collectif" not in club_v1["equipes"][0]
