from datetime import datetime, timezone

import pytest

import collecte

MAINTENANT = datetime(2026, 10, 13, 14, 41, 53, tzinfo=timezone.utc)


def _equipes_sans_collectif(club):
    for e in club["equipes"]:
        e.pop("collectif", None)
    return club["equipes"]


def test_assembler_contrat_v2(club_v1):
    donnees = collecte.assembler(_equipes_sans_collectif(club_v1), MAINTENANT, "2026-2027", [], surcharges={})
    assert donnees["version_schema"] == 2
    assert list(donnees)[0] == "version_schema"
    assert donnees["saison"] == "2026-2027"
    assert donnees["mis_a_jour"] == "2026-10-13T14:41:53+00:00"
    assert len(donnees["collectifs"]) == 11
    assert all(e["collectif"] for e in donnees["equipes"])
    assert donnees["erreurs"] == []


def test_assembler_conserve_les_buteurs(club_v1):
    attendus = club_v1["buteurs_club"]
    donnees = collecte.assembler(_equipes_sans_collectif(club_v1), MAINTENANT, "2026-2027", [], surcharges={})
    assert donnees["buteurs_club"] == attendus


def test_assembler_refuse_liste_vide():
    with pytest.raises(ValueError):
        collecte.assembler([], MAINTENANT, "2026-2027", [], surcharges={})


def test_surcharges_de_la_config_bien_formees():
    """Ne dépend pas du contenu de config.json : une surcharge ajoutée par le club ne casse pas la CI."""
    assert "commentaire" not in collecte.SURCHARGES_COLLECTIFS
    assert all(isinstance(v, str) and v for v in collecte.SURCHARGES_COLLECTIFS.values())


def test_assembler_applique_les_surcharges(club_v1):
    donnees = collecte.assembler(_equipes_sans_collectif(club_v1), MAINTENANT, "2026-2027", [],
                                 surcharges={"33403-clamart-handball": "seniors-m-region"})
    assert len(donnees["collectifs"]) == 12


def test_renommer_une_equipe_ne_change_pas_son_collectif(club_v1, monkeypatch):
    monkeypatch.setitem(collecte.NOMS, "32542-clamart-handball-1", "Seniors Filles 1")
    equipes = _equipes_sans_collectif(club_v1)
    for e in equipes:
        if e["id"] in collecte.NOMS:
            e["nom"] = collecte.NOMS[e["id"]]
    donnees = collecte.assembler(equipes, MAINTENANT, "2026-2027", [], surcharges={})
    ids = {c["id"]: c for c in donnees["collectifs"]}
    assert ids["seniors-f-1"]["equipes"] == ["32542-clamart-handball-1", "33243-clamart-handball-1"]
    assert len(ids) == 11
