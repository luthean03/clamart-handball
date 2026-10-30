"""Détection des changements de programme (matchs datés, déplacés, reportés, retirés).

Fonctions pures : comparent l'état de référence (`collecteur/etat/programme.json`) à `club.json`.
"""
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo


@dataclass(frozen=True)
class Changement:
    type: str                       # nouveau | deplace | horaire | salle | reporte | retire
    collectif: str
    match_id: str
    equipe_id: str
    adversaire: str
    domicile: bool
    avant: str | None
    apres: str | None
    salle_avant: str | None
    salle_apres: str | None


def _cle(collectif: str, match_id: str) -> str:
    return f"{collectif}:{match_id}"


def _collectif_de(cle: str) -> str:
    return cle.split(":", 1)[0]


def _nom_salle(match: dict) -> str | None:
    salle = match.get("salle")
    return (salle.get("nom") or None) if salle else None


def etat_du_club(club: dict) -> dict:
    matchs = {}
    for equipe in club["equipes"]:
        for m in equipe["matchs"]:
            if m.get("resultat"):
                continue
            matchs[_cle(equipe["collectif"], m["id"])] = {
                "date": m.get("date"),
                "salle": _nom_salle(m),
                "equipe_id": equipe["id"],
                "adversaire": m["adversaire"],
                "domicile": m["domicile"],
            }
    return {"saison": club["saison"], "matchs": matchs}


def _instant(iso: str) -> datetime:
    return datetime.fromisoformat(iso)


def _norm(salle: str) -> str:
    return " ".join(salle.upper().split())


def detecter(ancien: dict, club: dict, maintenant: datetime, fuseau: str):
    tz = ZoneInfo(fuseau)
    courant = etat_du_club(club)["matchs"]
    anciens = ancien["matchs"]
    ids_presents = {_cle(e["collectif"], m["id"]) for e in club["equipes"] for m in e["matchs"]}
    equipes = {e["id"] for e in club["equipes"]}
    collecte_sure = not club.get("erreurs")

    par_collectif: dict[str, list[Changement]] = {}
    gardees: set[str] = set()

    def futur(iso: str | None) -> bool:
        return iso is not None and _instant(iso) >= maintenant

    for cle in list(courant) + [k for k in anciens if k not in courant]:
        collectif, match_id = cle.split(":", 1)
        avant_e = anciens.get(cle)
        apres_e = courant.get(cle)
        ref = apres_e or avant_e
        avant = avant_e["date"] if avant_e else None
        salle_avant = avant_e["salle"] if avant_e else None
        type_ = None

        if apres_e is not None:
            apres, salle_apres = apres_e["date"], apres_e["salle"]
            if apres and not avant:
                type_ = "nouveau" if futur(apres) else None
            elif apres and avant:
                if _instant(apres) != _instant(avant):
                    if futur(apres):
                        meme_jour = _instant(apres).astimezone(tz).date() == _instant(avant).astimezone(tz).date()
                        type_ = "horaire" if meme_jour else "deplace"
                elif (salle_avant and salle_apres and _norm(salle_avant) != _norm(salle_apres)
                      and futur(apres)):
                    type_ = "salle"
            elif avant and not apres and futur(avant):
                if collecte_sure and ref["equipe_id"] in equipes:
                    type_ = "reporte"
                else:
                    gardees.add(cle)
        else:
            apres, salle_apres = None, None
            if cle in ids_presents:
                continue                                  # match joué : il sort simplement de l'état
            if futur(avant):
                if collecte_sure and ref["equipe_id"] in equipes:
                    type_ = "retire"
                else:
                    gardees.add(cle)

        if type_:
            par_collectif.setdefault(collectif, []).append(Changement(
                type=type_, collectif=collectif, match_id=match_id, equipe_id=ref["equipe_id"],
                adversaire=ref["adversaire"], domicile=ref["domicile"], avant=avant, apres=apres,
                salle_avant=salle_avant, salle_apres=salle_apres))

    for liste in par_collectif.values():
        liste.sort(key=lambda c: _instant(c.apres or c.avant))
    return par_collectif, gardees


def etat_apres(ancien: dict, club: dict, a_jour: set[str], gardees: set[str]) -> dict:
    etat = etat_du_club(club)
    matchs = {k: v for k, v in etat["matchs"].items() if _collectif_de(k) in a_jour}
    for cle, valeur in ancien["matchs"].items():
        if _collectif_de(cle) not in a_jour or cle in gardees:
            matchs[cle] = valeur
    return {"saison": etat["saison"], "matchs": matchs}
