"""Détection des changements de programme (matchs datés, déplacés, reportés, retirés).

Fonctions pures : comparent l'état de référence (`collecteur/etat/programme.json`) à `club.json`.
"""
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

from textes import heure, jour_court, nom_lisible


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


# --- Textes des notifications -------------------------------------------------------------------

_MAX_DETAIL = 6


def _local(iso: str, tz: ZoneInfo) -> datetime:
    return datetime.fromisoformat(iso).astimezone(tz)


def _cap(texte: str) -> str:
    return texte[:1].upper() + texte[1:]


def _vers_salle(brut: str | None) -> str:
    nom = nom_lisible(brut or "")
    premier, _, reste = nom.partition(" ")
    mot = premier.lower()
    if mot in ("gymnase", "stade", "complexe"):
        return f"au {mot} {reste}".strip()
    if mot in ("salle", "halle"):
        return f"à la {mot} {reste}".strip()
    return f"au gymnase {nom}"


def _lieu(c: Changement) -> str:
    return "domicile" if c.domicile else "extérieur"


def _seul(nom_equipe: str, c: Changement, tz: ZoneInfo) -> tuple[str, str]:
    adv = nom_lisible(c.adversaire)
    if c.type == "nouveau":
        d = _local(c.apres, tz)
        corps = f"{jour_court(d)} à {heure(d)} contre {adv} · "
        corps += f"{nom_lisible(c.salle_apres)} ({_lieu(c)})" if c.salle_apres else _lieu(c)
        return f"Nouveau match · {nom_equipe}", _cap(corps)
    if c.type == "deplace":
        a, b = _local(c.avant, tz), _local(c.apres, tz)
        corps = f"{jour_court(a)} {heure(a)} → {jour_court(b)} {heure(b)} · contre {adv}"
        return f"Match déplacé · {nom_equipe}", _cap(corps)
    if c.type == "horaire":
        a, b = _local(c.avant, tz), _local(c.apres, tz)
        corps = f"{jour_court(b)} : {heure(a)} → {heure(b)} · contre {adv}"
        return f"Nouvel horaire · {nom_equipe}", _cap(corps)
    if c.type == "salle":
        d = _local(c.apres, tz)
        corps = f"{jour_court(d)} {heure(d)} : désormais {_vers_salle(c.salle_apres)} ({_lieu(c)})"
        return f"Changement de salle · {nom_equipe}", _cap(corps)
    if c.type == "reporte":
        d = _local(c.avant, tz)
        return (f"Match reporté · {nom_equipe}",
                f"Le match du {jour_court(d)} contre {adv} n'a plus de date. Nouvelle date à venir.")
    d = _local(c.avant, tz)
    return (f"Match retiré · {nom_equipe}",
            f"Le match du {jour_court(d)} contre {adv} ne figure plus au calendrier de la FFHB.")


def _pluriel(n: int, singulier: str, pluriel: str) -> str:
    return f"{n} {singulier if n == 1 else pluriel}"


def _ligne(c: Changement, tz: ZoneInfo) -> str:
    adv = nom_lisible(c.adversaire)
    if c.type == "nouveau":
        d = _local(c.apres, tz)
        return f"Nouveau : {jour_court(d)} {heure(d)} contre {adv}"
    if c.type == "deplace":
        a, b = _local(c.avant, tz), _local(c.apres, tz)
        return f"Déplacé : {jour_court(a)} {heure(a)} → {jour_court(b)} {heure(b)}"
    if c.type == "horaire":
        a, b = _local(c.avant, tz), _local(c.apres, tz)
        return f"Horaire : {jour_court(b)} {heure(a)} → {heure(b)}"
    if c.type == "salle":
        return f"Salle : {jour_court(_local(c.apres, tz))}, désormais {_vers_salle(c.salle_apres)}"
    d = _local(c.avant, tz)
    return f"{'Reporté' if c.type == 'reporte' else 'Retiré'} : {jour_court(d)} contre {adv}"


def _groupe(nom_equipe: str, changements: list[Changement], tz: ZoneInfo) -> tuple[str, str]:
    if all(c.type == "nouveau" for c in changements):
        premier, dernier = _local(changements[0].apres, tz), _local(changements[-1].apres, tz)
        return (f"Nouveau programme · {nom_equipe}",
                f"{len(changements)} matchs programmés, du {jour_court(premier)} au {jour_court(dernier)}")
    n = {k: sum(1 for c in changements if c.type in ks) for k, ks in (
        ("nouveau", ("nouveau",)), ("deplace", ("deplace", "horaire")), ("salle", ("salle",)),
        ("reporte", ("reporte",)), ("retire", ("retire",)))}
    comptes = [
        _pluriel(n["nouveau"], "nouveau match", "nouveaux matchs"),
        _pluriel(n["deplace"], "déplacé", "déplacés"),
        _pluriel(n["salle"], "changement de salle", "changements de salle"),
        _pluriel(n["reporte"], "reporté", "reportés"),
        _pluriel(n["retire"], "retiré", "retirés"),
    ]
    lignes = [", ".join(t for t, k in zip(comptes, n) if n[k])]
    lignes += [_ligne(c, tz) for c in changements[:_MAX_DETAIL]]
    if len(changements) > _MAX_DETAIL:
        lignes.append(f"… et {len(changements) - _MAX_DETAIL} autres")
    return f"Programme modifié · {nom_equipe}", "\n".join(lignes)


def textes(nom_equipe: str, changements: list[Changement], fuseau: str) -> tuple[str, str]:
    """(titre, corps) de la notification d'un collectif ; groupée dès 2 changements. Jamais de nom de joueur."""
    tz = ZoneInfo(fuseau)
    if len(changements) == 1:
        return _seul(nom_equipe, changements[0], tz)
    return _groupe(nom_equipe, changements, tz)
