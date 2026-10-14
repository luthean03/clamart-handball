"""
Collectifs : une équipe du club, toutes compétitions confondues.

La FFHB donne un identifiant par (compétition, équipe) et il change avec les phases.
« Seniors M » existe ainsi en départemental, régional et Coupe de France. L'app suit
un collectif, identifié par le slug de son nom affiché, stable toute la saison et
utilisable tel quel dans un nom de sujet de notification (FCM).
"""
from __future__ import annotations

import re
import unicodedata


def slug(texte: str) -> str:
    """'Seniors F 1' -> 'seniors-f-1' (minuscules ASCII, chiffres et tirets)."""
    ascii_ = unicodedata.normalize("NFKD", texte or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_.lower()).strip("-")


def construire_collectifs(equipes: list[dict], surcharges: dict[str, str] | None = None) -> list[dict]:
    """Ajoute equipe['collectif'] à chaque équipe et renvoie les collectifs (ordre d'apparition).

    surcharges : {equipe_id: collectif_id} pour séparer deux équipes de même nom.
    """
    surcharges = surcharges or {}
    collectifs: dict[str, dict] = {}
    for equipe in equipes:
        cid = surcharges.get(equipe["id"]) or slug(equipe["nom"])
        equipe["collectif"] = cid
        collectif = collectifs.setdefault(cid, {
            "id": cid, "nom": equipe["nom"], "categorie": equipe["categorie"],
            "genre": equipe["genre"], "equipes": [],
        })
        collectif["equipes"].append(equipe["id"])
    return list(collectifs.values())
