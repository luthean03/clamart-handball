from datetime import datetime, timezone

import pytest

import collecte

MAINTENANT = datetime(2026, 10, 13, 14, 41, 53, tzinfo=timezone.utc)


@pytest.fixture
def donnees(club_v1):
    """Équipes et collectifs au contrat v3 : la fixture v1 n'a pas de collectifs, assembler les dérive."""
    for e in club_v1["equipes"]:
        e.pop("collectif", None)
    club = collecte.assembler(club_v1["equipes"], MAINTENANT, "2026-2027", [], surcharges={})
    return club["equipes"], club["collectifs"]


def test_agenda_par_collectif(tmp_path, donnees):
    equipes, collectifs = donnees
    collecte.ecrire_agendas(tmp_path, equipes, collectifs)
    texte = (tmp_path / "seniors-f-1.ics").read_text(encoding="utf-8")
    nb_dates = sum(1 for e in equipes if e["collectif"] == "seniors-f-1" for m in e["matchs"] if m["date"])
    assert nb_dates and texte.count("BEGIN:VEVENT") == nb_dates
    nom = next(c["nom"] for c in collectifs if c["id"] == "seniors-f-1")
    assert f"X-WR-CALNAME:{collecte.CONFIG['club']['nom']} - {nom}" in texte.splitlines()


def test_un_agenda_par_collectif_meme_sans_match_date(tmp_path, donnees):
    """L'app abonne à <collectif>.ics pour toute équipe : un 404 casserait l'abonnement."""
    equipes, collectifs = donnees
    vide = collectifs[0]["id"]
    for e in equipes:
        if e["collectif"] == vide:
            for m in e["matchs"]:
                m["date"] = None
    collecte.ecrire_agendas(tmp_path, equipes, collectifs)
    ecrits = {p.stem for p in tmp_path.glob("*.ics")} - {e["id"] for e in equipes} - {"club"}
    assert ecrits == {c["id"] for c in collectifs}
    texte = (tmp_path / f"{vide}.ics").read_text(encoding="utf-8")
    assert texte.count("BEGIN:VEVENT") == 0
    lignes = [l for l in texte.splitlines() if l]
    assert lignes[0] == "BEGIN:VCALENDAR" and lignes[-1] == "END:VCALENDAR"


def test_agendas_par_equipe_et_club_inchanges(tmp_path, donnees):
    equipes, collectifs = donnees
    collecte.ecrire_agendas(tmp_path, equipes, collectifs)
    for e in equipes:
        assert (tmp_path / f"{e['id']}.ics").read_text(encoding="utf-8").count("BEGIN:VEVENT") == sum(
            1 for m in e["matchs"] if m["date"])
    assert (tmp_path / "club.ics").read_text(encoding="utf-8").count("BEGIN:VEVENT") == sum(
        1 for e in equipes for m in e["matchs"] if m["date"])


def test_agenda_d_un_match_a_venir_seulement(tmp_path, donnees):
    equipes, collectifs = donnees
    collecte.ecrire_agendas(tmp_path, equipes, collectifs)
    fichiers = {p.name for p in (tmp_path / "match").glob("*.ics")}
    attendus = {f"{e['id']}-{m['id']}.ics" for e in equipes for m in e["matchs"] if m["date"] and not m["resultat"]}
    assert fichiers == attendus and fichiers
    assert all(p.read_text(encoding="utf-8").count("BEGIN:VEVENT") == 1 for p in (tmp_path / "match").glob("*.ics"))


def test_anciens_fichiers_de_match_supprimes(tmp_path, donnees):
    equipes, collectifs = donnees
    (tmp_path / "match").mkdir()
    (tmp_path / "match" / "vieux-1.ics").write_text("x", encoding="utf-8")
    collecte.ecrire_agendas(tmp_path, equipes, collectifs)
    assert not (tmp_path / "match" / "vieux-1.ics").exists()
