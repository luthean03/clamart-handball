"""Configuration pytest : rend `collecte` et `ffhandball` importables, fournit les données réelles."""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

import pytest

COLLECTEUR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COLLECTEUR))

FIXTURES = Path(__file__).resolve().parent / "fixtures"
_CLUB_V1 = json.loads((FIXTURES / "club-2026-10-13-v1.json").read_text(encoding="utf-8"))


@pytest.fixture
def club_v1() -> dict:
    """club.json réel du 13/10/2026 (format v1, sans collectifs). Copie neuve à chaque test."""
    return copy.deepcopy(_CLUB_V1)


@pytest.fixture(autouse=True)
def _etat_programme_isole(tmp_path, monkeypatch):
    """Aucun test ne doit lire ni écrire collecteur/etat/programme.json."""
    import notifieur
    monkeypatch.setattr(notifieur, "ETAT_PROGRAMME", tmp_path / "etat_programme.json")
