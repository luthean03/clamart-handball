import json
from datetime import datetime
from pathlib import Path

from programme import Changement, textes
from textes import heure, jour_court

FUSEAU = "Europe/Paris"


def ch(type_, apres=None, avant=None, adversaire="COURBEVOIE HB 1C", domicile=False,
       salle_avant=None, salle_apres=None, match_id="1"):
    return Changement(type=type_, collectif="x", match_id=match_id, equipe_id="e", adversaire=adversaire,
                      domicile=domicile, avant=avant, apres=apres, salle_avant=salle_avant, salle_apres=salle_apres)


def test_nouveau():
    c = ch("nouveau", apres="2026-11-08T16:00:00+01:00", salle_apres="JEAN-BLOT")
    assert textes("Seniors M", [c], FUSEAU) == (
        "Nouveau match · Seniors M", "Dim. 8 nov. à 16:00 contre Courbevoie HB 1C · Jean-Blot (extérieur)")


def test_nouveau_sans_salle():
    c = ch("nouveau", apres="2026-11-08T16:00:00+01:00")
    assert textes("Seniors M", [c], FUSEAU)[1] == "Dim. 8 nov. à 16:00 contre Courbevoie HB 1C · extérieur"
    c = ch("nouveau", apres="2026-11-08T16:00:00+01:00", domicile=True)
    assert textes("Seniors M", [c], FUSEAU)[1].endswith("· domicile")


def test_deplace():
    c = ch("deplace", avant="2026-11-07T18:00:00+01:00", apres="2026-11-08T16:00:00+01:00")
    assert textes("Seniors M", [c], FUSEAU) == (
        "Match déplacé · Seniors M", "Sam. 7 nov. 18:00 → dim. 8 nov. 16:00 · contre Courbevoie HB 1C")


def test_horaire():
    c = ch("horaire", avant="2026-11-07T18:30:00+01:00", apres="2026-11-07T20:00:00+01:00", adversaire="STADE FRANCAIS")
    assert textes("U18 F", [c], FUSEAU) == (
        "Nouvel horaire · U18 F", "Sam. 7 nov. : 18:30 → 20:00 · contre Stade Francais")


def test_salle():
    c = ch("salle", avant="2026-11-21T14:00:00+01:00", apres="2026-11-21T14:00:00+01:00", domicile=True,
           salle_avant="JEAN-BLOT", salle_apres="GYMNASE DU PETIT CLAMART")
    assert textes("U15 M", [c], FUSEAU) == (
        "Changement de salle · U15 M", "Sam. 21 nov. 14:00 : désormais au gymnase du Petit Clamart (domicile)")


def test_salle_sans_mot_type_et_halle():
    base = dict(avant="2026-11-21T14:00:00+01:00", apres="2026-11-21T14:00:00+01:00", domicile=True)
    assert "désormais au gymnase Hautpoul (" in textes("U15 M", [ch("salle", salle_apres="HAUTPOUL", **base)], FUSEAU)[1]
    assert "désormais à la halle Carpentier (" in textes(
        "U15 M", [ch("salle", salle_apres="HALLE CARPENTIER", **base)], FUSEAU)[1]
    assert "désormais au stade Municipal (" in textes(
        "U15 M", [ch("salle", salle_apres="STADE MUNICIPAL", **base)], FUSEAU)[1]


def test_reporte():
    c = ch("reporte", avant="2026-11-07T18:00:00+01:00", adversaire="STADE DE VANVES")
    assert textes("U13 F", [c], FUSEAU) == (
        "Match reporté · U13 F",
        "Le match du sam. 7 nov. contre Stade de Vanves n'a plus de date. Nouvelle date à venir.")


def test_retire():
    c = ch("retire", avant="2026-11-21T14:00:00+01:00", adversaire="STADE DE VANVES 2")
    assert textes("U11 Mixte 1", [c], FUSEAU) == (
        "Match retiré · U11 Mixte 1",
        "Le match du sam. 21 nov. contre Stade de Vanves 2 ne figure plus au calendrier de la FFHB.")


def test_groupe_tous_nouveaux():
    cs = [ch("nouveau", apres="2026-11-14T18:00:00+01:00", match_id="0")]
    cs += [ch("nouveau", apres=f"2026-12-{10 + i}T18:00:00+01:00", match_id=str(i)) for i in range(1, 7)]
    cs.append(ch("nouveau", apres="2027-01-30T18:00:00+01:00", match_id="9"))
    assert textes("U13 M", cs, FUSEAU) == (
        "Nouveau programme · U13 M", "8 matchs programmés, du sam. 14 nov. au sam. 30 janv.")


def test_groupe_mele_comptes_et_detail():
    cs = [
        ch("nouveau", apres="2026-11-14T20:30:00+01:00", adversaire="LEVALLOIS SC 1D"),
        ch("deplace", avant="2026-11-07T18:00:00+01:00", apres="2026-11-08T16:00:00+01:00"),
        ch("nouveau", apres="2026-11-28T20:30:00+01:00", adversaire="LEVALLOIS SC 1D"),
        ch("salle", avant="2026-12-06T14:00:00+01:00", apres="2026-12-06T14:00:00+01:00", salle_apres="HAUTPOUL"),
    ]
    titre, corps = textes("Seniors M", cs, FUSEAU)
    assert titre == "Programme modifié · Seniors M"
    assert corps.split("\n") == [
        "2 nouveaux matchs, 1 déplacé, 1 changement de salle",
        "Nouveau : sam. 14 nov. 20:30 contre Levallois SC 1D",
        "Déplacé : sam. 7 nov. 18:00 → dim. 8 nov. 16:00",
        "Nouveau : sam. 28 nov. 20:30 contre Levallois SC 1D",
        "Salle : dim. 6 déc., désormais au gymnase Hautpoul",
    ]


def test_groupe_horaire_reporte_retire():
    cs = [
        ch("horaire", avant="2026-11-07T18:30:00+01:00", apres="2026-11-07T20:00:00+01:00"),
        ch("deplace", avant="2026-11-08T18:00:00+01:00", apres="2026-11-09T16:00:00+01:00"),
        ch("reporte", avant="2026-11-14T18:00:00+01:00", adversaire="STADE DE VANVES"),
        ch("retire", avant="2026-11-21T14:00:00+01:00", adversaire="STADE DE VANVES 2"),
    ]
    lignes = textes("U13 F", cs, FUSEAU)[1].split("\n")
    assert lignes[0] == "2 déplacés, 1 reporté, 1 retiré"
    assert lignes[1] == "Horaire : sam. 7 nov. 18:30 → 20:00"
    assert lignes[3] == "Reporté : sam. 14 nov. contre Stade de Vanves"
    assert lignes[4] == "Retiré : sam. 21 nov. contre Stade de Vanves 2"


def test_singulier():
    cs = [ch("nouveau", apres="2026-11-14T20:30:00+01:00"),
          ch("reporte", avant="2026-11-21T14:00:00+01:00")]
    assert textes("U13 M", cs, FUSEAU)[1].split("\n")[0] == "1 nouveau match, 1 reporté"


def test_detail_tronque():
    cs = [ch("nouveau", apres=f"2026-11-{10 + i}T20:30:00+01:00", match_id=str(i)) for i in range(8)]
    cs.append(ch("reporte", avant="2026-11-25T14:00:00+01:00"))
    lignes = textes("U13 M", cs, FUSEAU)[1].split("\n")
    assert len(lignes) == 1 + 6 + 1
    assert lignes[-1] == "… et 3 autres"


def test_jamais_de_nom_de_joueur():
    chemin = Path(__file__).resolve().parents[2] / "partage" / "fixtures" / "club-2026-10-13.json"
    club = json.loads(chemin.read_text(encoding="utf-8"))
    joueurs = {b["joueur"] for e in club["equipes"] for m in e["matchs"] for b in m.get("buteurs") or []}
    assert joueurs
    cs = []
    for e in club["equipes"][:1]:
        for m in e["matchs"]:
            if m["date"]:
                cs.append(ch("nouveau", apres=m["date"], adversaire=m["adversaire"], match_id=m["id"]))
    sortie = "\n".join(textes("X", cs, FUSEAU)) + "\n".join(textes("X", cs[:1], FUSEAU))
    for nom in joueurs:
        assert nom not in sortie


def test_jour_court_heure_hiver():
    dt = datetime.fromisoformat("2026-10-31T18:00:00+01:00")
    assert jour_court(dt) == "sam. 31 oct."
    assert heure(dt) == "18:00"
