import json
from pathlib import Path

import pytest

from textes import initiales, nom_joueur, nom_lisible

CAS = json.loads((Path(__file__).resolve().parents[2] / "partage" / "phrases-cas.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("cas", CAS["noms"], ids=lambda c: c["brut"])
def test_nom_lisible_cas_partages(cas):
    assert nom_lisible(cas["brut"]) == cas["attendu"]


def test_initiales():
    assert initiales("Ent. Suresnes / Nanterre") == "ES"
    assert initiales("Levallois SC 1D") == "LS"
    assert initiales("Martigua SCL") == "MS"
    assert initiales("Issy") == "IS"
    assert initiales("") == ""


def test_nom_joueur():
    assert nom_joueur("DIARA", "DORILAS") == "D. Dorilas"
    assert nom_joueur("HAQUIMA", "ES-SALEMY") == "H. Es-Salemy"
    assert nom_joueur("MATHILDE", "DOS SANTOS UZARRALDE") == "M. Dos Santos Uzarralde"
    assert nom_joueur("LUCAS FREDERIC MARIE LIV", "CHAUDEAUX") == "L. Chaudeaux"
    assert nom_joueur("Coralie-Stella", "PORGRONT") == "C. Porgront"
    assert nom_joueur("AMA", "N'GUESSAN") == "A. N'Guessan"
    assert nom_joueur("", "NDIAYE") == "Ndiaye"
    assert nom_joueur(None, None) == ""
