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
    d = collecte.detail_de
    assert d("+16 ANS FEMININES - DIVISION 1 TERRITORIALE 92-75") == "Division 1 territoriale 92-75"
    assert d("+16 ANS FEMININES - DIVISION 2 TERRITORIALE 92-75") == "Division 2 territoriale 92-75"
    assert d("LOISIRS MIXTES") == "Loisirs"
    assert d("COUPE LIGUE MASCULINE") == "Coupe de Ligue masculine"
    assert d("COUPE DE FRANCE DEPARTEMENTALE FEMININE 2026-2027") == "Coupe de France départementale"
    assert d("U18F CHAMPIONNAT 92-75") == "Championnat 92-75"
    assert d("U15M - CHAMPIONNAT 92-75") == "Championnat 92-75"
    assert d("U13F - DELAYAGES") == "Délayages"
    assert d("U13M DELAYAGES") == "Délayages"


def test_detail_u11_utilise_la_poule():
    assert collecte.detail_de("U11 MIXTE", "HONNEUR SUD C") == "U11 Mixte · Honneur · Sud C"
    assert collecte.detail_de("U11 MIXTE", "HONNEUR SUD B") == "U11 Mixte · Honneur · Sud B"


def test_fixture_reelle(club_v1):
    assert club_v1["saison"] == "2026-2027"
    assert len(club_v1["equipes"]) == 14
    noms = [e["nom"] for e in club_v1["equipes"]]
    assert noms.count("Seniors M") == 3
    assert "collectif" not in club_v1["equipes"][0]


def test_noms_equipes_fideles_ffhb():
    n = collecte.nom_equipe
    assert n("+16 ANS FEMININES - DIVISION 1 TERRITORIALE 92-75", "CLAMART HANDBALL 1", "1-x") == "Seniors F1"
    assert n("COUPE DE FRANCE DEPARTEMENTALE FEMININE 2026-2027", "CLAMART HANDBALL 1", "2-y") == "Seniors F1"
    assert n("+16 ANS FEMININES - DIVISION 2 TERRITORIALE 92-75", "CLAMART HANDBALL 1B", "3-z") == "Seniors F2"
    assert n("+16 ANS MASCULINS - DIVISION 2 TERRITORIALE 92-75", "CLAMART HANDBALL", "4-a") == "Seniors M"
    assert n("LOISIRS MIXTES", "CLAMART HB", "5-b") == "Seniors Loisir"
    assert n("U18F CHAMPIONNAT 92-75", "CLAMART HB", "6-c") == "U18 F"
    assert n("U13M DELAYAGES", "CLAMART HB", "7-d") == "U13 M"
    assert n("U11 MIXTE", "CLAMART HANDBALL 1", "8-e") == "U11 Mixte 1"
    assert n("U11 MIXTE", "CLAMART HANDBALL 2 (FILLES)", "8-f") == "U11 Mixte 2"
    assert n("U11 MIXTE", "CLAMART HANDBALL 3", "8-g") == "U11 Mixte 3"


def test_ids_collectifs_inchanges():
    nf = collecte.nom_ffhb
    assert nf("+16 ANS FEMININES - DIVISION 1 TERRITORIALE 92-75", "CLAMART HANDBALL 1") == "Seniors F 1"
    assert nf("U11 MIXTE", "CLAMART HANDBALL 2 (FILLES)") == "U11 F 2"


def test_url_ffhb_propre_a_chaque_equipe():
    miennes = [{"id": "i1", "ext_equipeId": 2177119, "libelle": "CLAMART HANDBALL 1"},
               {"id": "i2", "ext_equipeId": 2177120, "libelle": "CLAMART HANDBALL 2 (FILLES)"},
               {"id": "i3", "ext_equipeId": 2177121, "libelle": "CLAMART HANDBALL 3"}]
    racine = "/competitions/saison-2026-2027-22/championnat/u11-mixte-33056/"
    u = collecte.url_equipe
    assert u(racine, miennes, "CLAMART HANDBALL 1", {"i1"}) == racine + "equipe-2177119/"
    assert u(racine, miennes, "CLAMART HANDBALL 2 (FILLES)", {"zz"}) == racine + "equipe-2177120/"
    assert u(racine, miennes, "CLAMART HANDBALL 3", {"i3"}) == racine + "equipe-2177121/"
    assert u(racine, miennes, "INCONNUE", set()) == racine + "equipe-2177119/"
