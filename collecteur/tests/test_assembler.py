from datetime import datetime, timezone

import pytest

import collecte

MAINTENANT = datetime(2026, 10, 13, 14, 41, 53, tzinfo=timezone.utc)


def _equipes_sans_collectif(club):
    for e in club["equipes"]:
        e.pop("collectif", None)
    return club["equipes"]


def test_assembler_contrat_v2(club_v1):
    donnees = collecte.assembler(_equipes_sans_collectif(club_v1), MAINTENANT, "2026-2027", [])
    assert donnees["version_schema"] == 2
    assert list(donnees)[0] == "version_schema"
    assert donnees["saison"] == "2026-2027"
    assert donnees["mis_a_jour"] == "2026-10-13T14:41:53+00:00"
    assert len(donnees["collectifs"]) == 11
    assert all(e["collectif"] for e in donnees["equipes"])
    assert donnees["erreurs"] == []


def test_assembler_conserve_les_buteurs(club_v1):
    attendus = club_v1["buteurs_club"]
    donnees = collecte.assembler(_equipes_sans_collectif(club_v1), MAINTENANT, "2026-2027", [])
    assert donnees["buteurs_club"] == attendus


def test_assembler_refuse_liste_vide():
    with pytest.raises(ValueError):
        collecte.assembler([], MAINTENANT, "2026-2027", [])


def test_surcharges_lues_dans_la_config():
    assert isinstance(collecte.SURCHARGES_COLLECTIFS, dict)
    assert "commentaire" not in collecte.SURCHARGES_COLLECTIFS
