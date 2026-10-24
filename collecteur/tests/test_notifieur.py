import copy
from datetime import datetime, timedelta, timezone

from notifieur import CONSERVATION, messages_rappels, messages_resultats, planifier, purger

REGLAGES = {"fuseau": "Europe/Paris", "max_par_passage": 40, "rappels_a_partir_de": "16:30"}
PARIS_LUNDI_MATIN = datetime(2026, 10, 12, 8, 0, tzinfo=timezone.utc)      # lun. 12 oct., 10 h à Paris


def club_v2():
    import json
    from pathlib import Path
    chemin = Path(__file__).resolve().parents[2] / "partage" / "fixtures" / "club-2026-10-13.json"
    return json.loads(chemin.read_text(encoding="utf-8"))


def test_resultats_des_3_derniers_jours():
    msgs = messages_resultats(club_v2(), PARIS_LUNDI_MATIN)
    cles = {m.cle for m in msgs}
    assert "resultat:seniors-f-1:2644292" in cles            # dim. 11 oct.
    assert "resultat:seniors-m:2673792" in cles
    assert all(m.sujet.startswith("resultats-") for m in msgs)
    assert not any(":2644268" in c for c in cles)            # 13 sept. : hors fenêtre


def test_texte_d_un_resultat():
    m = next(m for m in messages_resultats(club_v2(), PARIS_LUNDI_MATIN) if m.cle == "resultat:seniors-m:2673792")
    assert m.titre == "Clamart 21 – 22 Levallois SC 1D"          # domicile à gauche
    assert m.corps == "Seniors M · D2 territoriale"
    assert m.donnees == {"type": "resultat", "collectif": "seniors-m", "equipe_id": "32546-clamart-handball",
                         "match_id": "2673792"}


def test_banderole_d_un_match_a_l_exterieur():
    m = next(m for m in messages_resultats(club_v2(), PARIS_LUNDI_MATIN) if m.cle == "resultat:seniors-f-1b:2644473")
    assert m.titre == "Paris SC 1D 17 – 20 Clamart"               # l'équipe qui reçoit à gauche
    assert m.corps == "Seniors F 1B · D2 territoriale"


def test_jamais_de_nom_de_joueur():
    club = club_v2()
    noms = {b["joueur"] for b in club["buteurs_club"]}
    for m in messages_resultats(club, PARIS_LUNDI_MATIN):
        assert not any(n in m.titre or n in m.corps for n in noms)


def test_rappels_seulement_a_partir_de_16h30_pour_le_lendemain():
    club = club_v2()
    avant = datetime(2026, 10, 16, 14, 0, tzinfo=timezone.utc)    # ven. 16 h à Paris
    apres = datetime(2026, 10, 16, 15, 0, tzinfo=timezone.utc)    # ven. 17 h à Paris
    assert messages_rappels(club, avant, "Europe/Paris", "16:30") == []
    rappels = messages_rappels(club, apres, "Europe/Paris", "16:30")
    m = next(r for r in rappels if r.cle == "rappel:seniors-m:2734038:20261017T1800")   # sam. 17 oct. 18:00
    assert m.sujet == "rappels-seniors-m"
    assert m.titre == "Demain 18:00 · Seniors M"
    assert m.corps == "Contre Association Sportive St-Cyr/Fontenay Handball 78 · Gymnase du Petit Clamart (domicile)"
    assert all(":2729291" not in r.cle for r in rappels)                  # dim. 18 oct. : pas demain


def test_rappel_le_jour_du_changement_d_heure():
    club = club_v2()
    eq = club["equipes"][0]
    eq["matchs"].append({**copy.deepcopy(eq["matchs"][-1]), "id": "999", "date": "2026-10-25T00:30:00+02:00",
                         "resultat": None, "score_nous": None, "score_eux": None})
    sam_soir = datetime(2026, 10, 24, 16, 0, tzinfo=timezone.utc)          # sam. 24 oct., 18 h à Paris (UTC+2)
    assert any(r.cle == f"rappel:{eq['collectif']}:999:20261025T0030" for r in messages_rappels(club, sam_soir, "Europe/Paris", "16:30"))


def test_premier_deploiement_marque_sans_envoyer():
    a_envoyer, registre = planifier(club_v2(), None, PARIS_LUNDI_MATIN, REGLAGES)
    assert a_envoyer == []
    assert "resultat:seniors-f-1:2644292" in registre


def test_registre_existant_evite_les_doublons():
    _, registre = planifier(club_v2(), None, PARIS_LUNDI_MATIN, REGLAGES)
    a_envoyer, _ = planifier(club_v2(), registre, PARIS_LUNDI_MATIN, REGLAGES)
    assert a_envoyer == []


def test_nouveau_resultat_envoye_une_fois():
    _, registre = planifier(club_v2(), None, PARIS_LUNDI_MATIN, REGLAGES)
    del registre["resultat:seniors-f-1:2644292"]
    a_envoyer, _ = planifier(club_v2(), registre, PARIS_LUNDI_MATIN, REGLAGES)
    assert [m.cle for m in a_envoyer] == ["resultat:seniors-f-1:2644292"]


def test_plafond_par_passage():
    a_envoyer, _ = planifier(club_v2(), {}, PARIS_LUNDI_MATIN, {**REGLAGES, "max_par_passage": 2})
    assert len(a_envoyer) == 2


def test_purge_apres_60_jours():
    vieux = (PARIS_LUNDI_MATIN - CONSERVATION - timedelta(days=1)).isoformat()
    recent = PARIS_LUNDI_MATIN.isoformat()
    assert purger({"a": vieux, "b": recent}, PARIS_LUNDI_MATIN) == {"b": recent}


VEN_17H = datetime(2026, 10, 16, 15, 0, tzinfo=timezone.utc)    # ven. 16 oct., 17 h à Paris


def test_rappel_d_un_match_reprogramme_repart():
    club = club_v2()
    deja = {m.cle: VEN_17H.isoformat() for m in messages_rappels(club, VEN_17H, "Europe/Paris", "16:30")}
    eq = next(e for e in club["equipes"] if any(m["id"] == "2734038" for m in e["matchs"]))
    match = next(m for m in eq["matchs"] if m["id"] == "2734038")
    match["date"] = "2026-10-17T20:30:00+02:00"                    # même jour, nouvelle heure
    a_envoyer, _ = planifier(club, deja, VEN_17H, REGLAGES)
    assert [m.titre for m in a_envoyer if m.sujet == "rappels-seniors-m"] == ["Demain 20:30 · Seniors M"]


def test_rappel_deja_envoye_avec_l_ancienne_cle_sans_date():
    club = club_v2()
    rappels = messages_rappels(club, VEN_17H, "Europe/Paris", "16:30")
    anciennes = {m.cle.rsplit(":", 1)[0]: VEN_17H.isoformat() for m in rappels}
    a_envoyer, _ = planifier(club, anciennes, VEN_17H, REGLAGES)
    assert not any(m.cle.startswith("rappel:") for m in a_envoyer)
