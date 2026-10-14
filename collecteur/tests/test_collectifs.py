import re

from collectifs import construire_collectifs, slug

ATTENDUS = ["seniors-f-1", "seniors-f-1b", "seniors-m", "u18-f", "u18-m", "u15-m",
            "u13-f", "u13-m", "u11-f-2", "u11-mixte-1", "u11-mixte-3"]


def test_slug():
    assert slug("Seniors F 1") == "seniors-f-1"
    assert slug("U11 Mixte 1") == "u11-mixte-1"
    assert slug("Équipe Réserve (filles)") == "equipe-reserve-filles"


def test_onze_collectifs_dans_l_ordre(club_v1):
    collectifs = construire_collectifs(club_v1["equipes"])
    assert [c["id"] for c in collectifs] == ATTENDUS


def test_seniors_m_regroupe_trois_competitions(club_v1):
    collectifs = {c["id"]: c for c in construire_collectifs(club_v1["equipes"])}
    sm = collectifs["seniors-m"]
    assert sm["equipes"] == ["32546-clamart-handball", "33403-clamart-handball", "33244-clamart-handball"]
    assert (sm["nom"], sm["categorie"], sm["genre"]) == ("Seniors M", "seniors", "M")


def test_chaque_equipe_porte_son_collectif(club_v1):
    construire_collectifs(club_v1["equipes"])
    par_id = {e["id"]: e["collectif"] for e in club_v1["equipes"]}
    assert par_id["32542-clamart-handball-1"] == "seniors-f-1"
    assert par_id["33243-clamart-handball-1"] == "seniors-f-1"
    assert all(e.get("collectif") for e in club_v1["equipes"])


def test_surcharge_separe_deux_equipes(club_v1):
    collectifs = construire_collectifs(club_v1["equipes"], {"33403-clamart-handball": "seniors-m-region"})
    ids = {c["id"]: c for c in collectifs}
    assert ids["seniors-m"]["equipes"] == ["32546-clamart-handball", "33244-clamart-handball"]
    assert ids["seniors-m-region"]["equipes"] == ["33403-clamart-handball"]
    assert ids["seniors-m-region"]["nom"] == "Seniors M"


def test_collectif_stable_si_une_equipe_est_renommee(club_v1):
    base = {e["id"]: e["nom"] for e in club_v1["equipes"]}      # nom FFHB, avant noms_equipes
    for e in club_v1["equipes"]:
        if e["id"] == "32542-clamart-handball-1":
            e["nom"] = "Seniors Filles 1"                          # effet de config.json → noms_equipes
    collectifs = {c["id"]: c for c in construire_collectifs(club_v1["equipes"], base=lambda e: base[e["id"]])}
    assert "seniors-filles-1" not in collectifs
    assert collectifs["seniors-f-1"]["equipes"] == ["32542-clamart-handball-1", "33243-clamart-handball-1"]
    assert collectifs["seniors-f-1"]["nom"] == "Seniors Filles 1"


def test_surcharge_est_normalisee(club_v1):
    collectifs = construire_collectifs(club_v1["equipes"], {"33403-clamart-handball": "Seniors M Région"})
    assert "seniors-m-region" in [c["id"] for c in collectifs]


def test_ids_valides_pour_sujets_fcm(club_v1):
    club_v1["equipes"][0]["nom"] = "Équipe d'été (filles) !"
    for c in construire_collectifs(club_v1["equipes"]):
        assert re.fullmatch(r"[a-z0-9-]+", c["id"]), c["id"]
