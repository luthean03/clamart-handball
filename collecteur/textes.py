"""
Textes affichés partagés avec l'app (portage de app/src/donnees/phrase.ts).
Contrat commun : partage/phrases-cas.json — toute évolution d'une règle passe par un nouveau cas dans ce fichier.
"""
from __future__ import annotations

import re

MINUSCULES = {"de", "du", "des", "la", "le", "les", "et", "sur", "en", "au", "aux"}
ELISIONS = {"d", "l"}  # minuscule seulement devant une apostrophe (D'ISSY, L'HAY)
ABREVIATIONS = {"st", "ste"}
SIGLES = {"AC", "AS", "ASV", "ASM", "US", "USM", "UC", "ES", "CA", "CO", "OC", "SO", "CSM", "AAS",
          "SCUF", "COM", "ASPTT", "ASC", "USO", "USMT", "PUC", "CSA", "ACBB"}
ROMAINS = {"I", "II", "III", "IV"}
_SEP = r"[\s\-/.'’()]+"


def nom_lisible(brut: str) -> str:
    """Nom FFHB en capitales → nom lisible. Sigles (SC, HB, ASV…), numéros et chiffres romains conservés."""
    morceaux = re.split(f"({_SEP})", (brut or "").strip())
    premier = True
    sortie: list[str] = []
    for i, morceau in enumerate(morceaux):
        if not morceau or re.fullmatch(_SEP, morceau):
            sortie.append(morceau)
            continue
        est_premier, premier = premier, False
        if re.search(r"\d", morceau) or morceau in ROMAINS:
            sortie.append(morceau)
            continue
        bas = morceau.lower()
        if not est_premier and bas in MINUSCULES:
            sortie.append(bas)
            continue
        suivant = morceaux[i + 1] if i + 1 < len(morceaux) else ""
        if not est_premier and re.match(r"['’]", suivant) and bas in ELISIONS:
            sortie.append(bas)
            continue
        capitale = bas[:1].upper() + bas[1:]
        if bas in ABREVIATIONS:
            sortie.append(capitale)
            continue
        if morceau == morceau.upper() and (morceau in SIGLES or (len(morceau) <= 3 and not re.search(r"[AEIOUY]", morceau))):
            sortie.append(morceau)
            continue
        sortie.append(capitale)
    return "".join(sortie)


def initiales(nom: str) -> str:
    """Monogramme d'un club sans écusson : initiales des deux premiers mots en majuscule (comme l'app)."""
    mots = [m for m in re.split(_SEP, nom or "") if m and m[0].isupper()]
    if not mots:
        return ""
    return (mots[0][:2] if len(mots) == 1 else mots[0][0] + mots[1][0]).upper()
