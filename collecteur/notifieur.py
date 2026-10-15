#!/usr/bin/env python3
"""
Notifieur : après chaque collecte, envoie les notifications FCM des nouveaux résultats (et des rappels la veille)
sur des sujets par collectif. Voir docs/superpowers/specs (§4).

  python collecteur/notifieur.py            # envoie (si FIREBASE_SERVICE_ACCOUNT est défini), sinon mode essai
  python collecteur/notifieur.py --essai    # n'envoie rien, n'écrit rien, affiche ce qui partirait
  python collecteur/notifieur.py --test seniors-f-1   # une notification de test sur resultats-seniors-f-1
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ICI = Path(__file__).resolve().parent
sys.path.insert(0, str(ICI))
from textes import nom_lisible  # noqa: E402

FENETRE_RESULTATS = timedelta(days=3)
CONSERVATION = timedelta(days=60)


@dataclass(frozen=True)
class Message:
    cle: str
    sujet: str
    titre: str
    corps: str
    donnees: dict
    instant: str


def _matchs(club: dict):
    for equipe in club["equipes"]:
        for match in equipe["matchs"]:
            if match.get("date"):
                yield equipe, match


def messages_resultats(club: dict, maintenant: datetime) -> list[Message]:
    sortie = []
    for eq, m in _matchs(club):
        if not m.get("resultat") or m.get("score_nous") is None or m.get("score_eux") is None:
            continue
        instant = datetime.fromisoformat(m["date"])
        if not (maintenant - FENETRE_RESULTATS <= instant <= maintenant):
            continue
        adversaire = nom_lisible(m["adversaire"])
        if m["domicile"]:
            banderole = f"Clamart {m['score_nous']} – {m['score_eux']} {adversaire}"
        else:
            banderole = f"{adversaire} {m['score_eux']} – {m['score_nous']} Clamart"
        sortie.append(Message(
            cle=f"resultat:{eq['collectif']}:{m['id']}",
            sujet=f"resultats-{eq['collectif']}",
            titre=banderole,
            corps=f"{eq['nom']} · {eq['detail']}",
            donnees={"type": "resultat", "collectif": eq["collectif"], "equipe_id": eq["id"], "match_id": str(m["id"])},
            instant=m["date"],
        ))
    return sorted(sortie, key=lambda x: (x.instant, x.cle))


def messages_rappels(club: dict, maintenant: datetime, fuseau: str, a_partir_de: str) -> list[Message]:
    tz = ZoneInfo(fuseau)
    local = maintenant.astimezone(tz)
    heure, minute = (int(x) for x in a_partir_de.split(":"))
    if (local.hour, local.minute) < (heure, minute):
        return []
    demain = (local + timedelta(days=1)).date()
    sortie = []
    for eq, m in _matchs(club):
        if m.get("resultat"):
            continue
        debut = datetime.fromisoformat(m["date"]).astimezone(tz)
        if debut.date() != demain:
            continue
        salle = (m.get("salle") or {}).get("nom")
        cote = "domicile" if m["domicile"] else "extérieur"
        lieu = f"{nom_lisible(salle)} ({cote})" if salle else cote
        sortie.append(Message(
            cle=f"rappel:{eq['collectif']}:{m['id']}",
            sujet=f"rappels-{eq['collectif']}",
            titre=f"Demain {debut.strftime('%H:%M')} · {eq['nom']}",
            corps=f"Contre {nom_lisible(m['adversaire'])} · {lieu}",
            donnees={"type": "rappel", "collectif": eq["collectif"], "equipe_id": eq["id"], "match_id": str(m["id"])},
            instant=m["date"],
        ))
    return sorted(sortie, key=lambda x: (x.instant, x.cle))


def purger(registre: dict, maintenant: datetime) -> dict:
    limite = maintenant - CONSERVATION
    return {cle: quand for cle, quand in registre.items() if datetime.fromisoformat(quand) >= limite}


def planifier(club: dict, registre: dict | None, maintenant: datetime, reglages: dict) -> tuple[list[Message], dict]:
    resultats = messages_resultats(club, maintenant)
    rappels = messages_rappels(club, maintenant, reglages["fuseau"], reglages["rappels_a_partir_de"])
    horodatage = maintenant.isoformat(timespec="seconds")
    if registre is None:
        # Premier déploiement : ne pas envoyer une rafale de vieux scores.
        return [], {m.cle: horodatage for m in resultats}
    registre = purger(registre, maintenant)
    a_envoyer = [m for m in resultats + rappels if m.cle not in registre]
    return a_envoyer[: reglages["max_par_passage"]], registre
