import collecte

STATS = [
    {"prenom": "DIARA", "nom": "DORILAS", "numero": "41", "buts": "9", "equipeId": 7},
    {"prenom": "EVA", "nom": "NDIAYE", "numero": "9", "buts": "4", "equipeId": 7},
    {"prenom": "MELINA", "nom": "KOBZILI", "numero": "97", "buts": "0", "equipeId": 7},
    {"prenom": "AMA", "nom": "KOUADIO", "numero": "5", "buts": "5", "equipeId": 3},
    {"prenom": "MARIE", "nom": "DUPONT", "numero": "2", "buts": "3", "equipeId": 3},
]


def test_buteurs_des_deux_equipes_seulement_ceux_qui_marquent():
    nous, eux = collecte.buteurs_de_la_rencontre(STATS, 7)
    assert nous == [{"joueur": "D. Dorilas", "numero": 41, "buts": 9}, {"joueur": "E. Ndiaye", "numero": 9, "buts": 4}]
    assert [b["joueur"] for b in eux] == ["A. Kouadio", "M. Dupont"]


def test_joueur_masque_jamais_publie(monkeypatch):
    monkeypatch.setattr(collecte, "MASQUES", {"MARIE DUPONT"})
    _, eux = collecte.buteurs_de_la_rencontre(STATS, 7)
    assert [b["joueur"] for b in eux] == ["A. Kouadio"]


def test_aucun_prenom_complet_dans_les_buteurs():
    nous, eux = collecte.buteurs_de_la_rencontre(STATS, 7)
    assert not any("DIARA" in b["joueur"].upper() for b in nous + eux)
