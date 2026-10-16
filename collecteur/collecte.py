#!/usr/bin/env python3
"""
Collecte les données du club sur ffhandball.fr et écrit :
  site/data/club.json          toutes les données affichées par le site
  site/data/agenda/*.ics       un calendrier par équipe + un pour tout le club

Lancement :  python collecteur/collecte.py
Réglages  :  config.json à la racine du projet

Le script ne fait que des lectures sur ffhandball.fr, espacées d'au moins
1 seconde (voir ffhandball.DELAI). Les matchs déjà joués sont mis en cache
dans collecteur/cache/ : ils ne sont téléchargés qu'une fois.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import traceback
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote

ICI = Path(__file__).resolve().parent
sys.path.insert(0, str(ICI))
import ffhandball as ff  # noqa: E402
from collectifs import construire_collectifs  # noqa: E402
from textes import nom_joueur  # noqa: E402

RACINE = ICI.parent
CONFIG = json.loads((RACINE / "config.json").read_text(encoding="utf-8"))
SORTIE = RACINE / "site" / "data"
CACHE = ICI / "cache"
CLUB_ID = str(CONFIG["club"]["id_ffhb"])
NOMS = {k: v for k, v in CONFIG.get("noms_equipes", {}).items() if k not in ("commentaire",) and not k.startswith("exemple")}
MOTIFS = CONFIG["club"].get("motifs_nom_equipe") or [CONFIG["club"]["recherche_ffhb"]]
MASQUES = {" ".join(n.upper().split()) for n in CONFIG.get("stats_joueurs", {}).get("joueurs_masques", [])}
SURCHARGES_COLLECTIFS = {k: v for k, v in CONFIG.get("collectifs", {}).items() if k != "commentaire"}
VERSION_SCHEMA = 3
URL_LOGOS = "https://media-logos-clubs.ffhandball.fr/128/"


def logo_adversaire(r: dict, domicile: bool) -> str | None:
    """Écusson de l'adversaire publié par la FFHB (128 px, webp), ou None s'il n'est pas affiché."""
    cote = "2" if domicile else "1"
    fichier, afficher = r.get(f"structure{cote}Logo"), r.get(f"equipe{cote}ShowLogo")
    if not fichier or str(afficher).lower() not in ("1", "true"):
        return None
    return URL_LOGOS + fichier.rsplit(".", 1)[0] + ".webp"


def masque(nom: str) -> bool:
    return " ".join((nom or "").upper().split()) in MASQUES

ERREURS: list[str] = []


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def erreur(message: str):
    ERREURS.append(message)
    log("  [!]", message)


# ============================================================================ noms lisibles

def categorie_de(libelle_comp: str) -> str:
    """'seniors' ou 'U13', 'U15'... d'après le nom de la compétition."""
    L = libelle_comp.upper()
    if "+16" in L or "SENIOR" in L:
        return "seniors"
    m = re.search(r"\bU\s?(\d{1,2})|(?<![+\d])-\s?(\d{1,2})(?!\d)", L)
    return f"U{m.group(1) or m.group(2)}" if m else "seniors"


def genre_de(libelle_comp: str) -> str:
    L = libelle_comp.upper()
    if re.search(r"FEMIN|FILLES|\bU\s?\d{1,2}\s?F\b", L):
        return "F"
    if re.search(r"MASCUL|GARCONS|\bU\s?\d{1,2}\s?M\b", L):
        return "M"
    if "MIXTE" in L:
        return "Mixte"
    return ""


def detail_de(libelle_comp: str) -> str:
    """Partie 'niveau' du nom : 'D1 territoriale', 'Coupe de France départementale'..."""
    L = libelle_comp.upper()
    if "COUPE DE FRANCE" in L:
        niveau = re.search(r"COUPE DE FRANCE (\w+)", L)
        suffixe = {"DEPARTEMENTALE": " départementale", "REGIONALE": " régionale",
                   "NATIONALE": " nationale", "FEDERALE": " fédérale"}.get(niveau.group(1) if niveau else "", "")
        return "Coupe de France" + suffixe
    if "COUPE" in L:
        return "Coupe de Ligue" if "LIGUE" in L else "Coupe"
    m = re.search(r"DIVISION\s*(\d)", L)
    if m:
        return f"D{m.group(1)}" + (" territoriale" if "TERRITORIAL" in L else "")
    for mot, texte in (("EXCELLENCE", "Excellence"), ("HONNEUR", "Honneur"), ("PRE-REGION", "Pré-région"),
                       ("PRENATIONALE", "Prénationale"), ("NATIONALE", "Nationale"), ("CHAMPIONNAT", "Championnat"),
                       ("DELAYAGE", "Délayages"), ("BRASSAGE", "Brassage")):
        if mot in L:
            return texte
    reste = re.sub(r"\+16 ANS|\bU\s?\d{1,2}[MF]?\b|-\s?\d{1,2}\b|MIXTES?|MASCULIN\w*|FEMININ\w*|\d{2,4}-\d{2,4}|[-/]",
                   " ", L).strip()
    return reste.title() if reste else "Championnat"


def nom_equipe(libelle_comp: str, libelle_equipe: str, equipe_id: str) -> str:
    return NOMS.get(equipe_id) or nom_ffhb(libelle_comp, libelle_equipe)


def nom_ffhb(libelle_comp: str, libelle_equipe: str) -> str:
    """Nom construit depuis les libellés FFHB, sans les renommages de config.json."""
    cat = categorie_de(libelle_comp)
    cat = "Seniors" if cat == "seniors" else cat
    numero = re.search(r"\s(\d[A-Z]?)(?=\s|$|\()", (libelle_equipe or "").upper())
    return " ".join(x for x in (cat, genre_equipe(libelle_comp, libelle_equipe),
                                numero.group(1) if numero else "") if x)


def genre_equipe(libelle_comp: str, libelle_equipe: str | None) -> str:
    """'(FILLES)' dans le nom de l'équipe l'emporte sur 'MIXTE' dans la compétition."""
    lib = (libelle_equipe or "").upper()
    return "F" if "FILLE" in lib else "M" if "GARCON" in lib else genre_de(libelle_comp)


def est_nous(libelle_equipe: str | None) -> bool:
    """Une équipe du club ? (d'après son nom, voir config club.motifs_nom_equipe)."""
    lib = ff.slugify(libelle_equipe or "")
    return any(ff.slugify(m) in lib for m in MOTIFS)


# ============================================================================ accès FFHB

def saison_courante() -> tuple[str, str]:
    chemin = ff._saison_courante()                      # '/competitions/saison-2026-2027-22'
    annees = re.search(r"saison-(\d{4}-\d{4})", chemin)
    return chemin, annees.group(1) if annees else chemin


def competitions_du_club(saison: str) -> list[dict]:
    q = quote(CONFIG["club"]["recherche_ffhb"])
    data = ff.components(f"{saison}/recherche/?type=structure&q={q}")
    out, vues = [], set()
    for r in (data.get("competitions---search-results") or {}).get("results") or []:
        if str(r.get("id", "")).split("/")[-1] != CLUB_ID:
            continue
        niveau = ff.slugify(r.get("type") or "")
        path = f"{saison}/{niveau}/{ff.slugify(r['libelle'])}-{r['ext_competitionId']}/"
        if path not in vues:
            vues.add(path)
            out.append({"libelle": r["libelle"], "niveau": niveau,
                        "organisateur": r.get("structure_libelle"), "path": path})
    return out


def buteurs_de_la_rencontre(stats: list[dict], equipe_interne) -> tuple[list[dict], list[dict]]:
    """(nos buteurs, ceux de l'adversaire) d'après `statsJoueurs` : seulement ceux qui ont marqué, nom réduit
    à 'D. Dorilas'. Les joueurs masqués (config.json) sont écartés d'après leur nom complet, avant réduction."""
    nous: list[dict] = []
    eux: list[dict] = []
    for j in stats:
        buts = ff._int(j.get("buts")) or 0
        if buts <= 0 or masque(f"{j.get('prenom') or ''} {j.get('nom') or ''}"):
            continue
        (nous if str(j.get("equipeId")) == str(equipe_interne) else eux).append(
            {"joueur": nom_joueur(j.get("prenom"), j.get("nom")), "numero": ff._int(j.get("numero")), "buts": buts})
    tri = lambda liste: sorted(liste, key=lambda b: (-b["buts"], b["joueur"]))
    return tri(nous), tri(eux)


def empreinte_masques() -> str:
    """Empreinte de la liste des joueurs masqués ('' si vide) : le cache ne garde que des noms réduits,
    il ne peut donc pas être re-masqué, seulement retéléchargé quand la liste change."""
    return hashlib.sha1("\n".join(sorted(MASQUES)).encode("utf-8")).hexdigest() if MASQUES else ""


def salle_et_buteurs(match_path: str, equipe_interne, joue: bool) -> dict:
    """Page d'un match : salle + buteurs des deux équipes (match joué). Cache permanent si le match est joué."""
    rid = match_path.rstrip("/").split("rencontre-")[-1]
    fichier = CACHE / f"{rid}.json"
    if joue and fichier.exists():
        info = json.loads(fichier.read_text(encoding="utf-8"))
        # ancien cache (avant le schéma 3) ou liste de joueurs masqués modifiée depuis : on retélécharge
        if info.get("buteurs_adverses") is not None and info.get("masques") == empreinte_masques():
            return info
    d = ff.components(match_path)
    eq = (d.get("competitions---rencontre-salle") or {}).get("equipement") or {}
    info = {"salle": {"nom": eq.get("libelle") or None,
                      "adresse": " ".join(x for x in (eq.get("rue"), eq.get("codePostal"), eq.get("ville")) if x) or None}
            if eq else None}
    if joue:
        stats = (d.get("competitions---rencontre-liste-joueurs") or {}).get("statsJoueurs") or []
        info["buteurs"], info["buteurs_adverses"] = buteurs_de_la_rencontre(stats, equipe_interne)
        info["masques"] = empreinte_masques()
        CACHE.mkdir(parents=True, exist_ok=True)
        fichier.write_text(json.dumps(info, ensure_ascii=False), encoding="utf-8")
    return info


# ============================================================================ une compétition

def collecter_competition(comp: dict, page: dict, maintenant: datetime) -> list[dict]:
    """
    Toutes les équipes du club dans une compétition.
    La page 'equipe-<id>' du site liste les matchs de TOUTES les équipes du club dans la
    compétition (et l'identifiant interne d'une équipe change à chaque phase) : on regroupe
    donc les matchs par nom d'équipe du club.
    """
    racine = comp["path"]
    comp_id = racine.rstrip("/").rsplit("-", 1)[-1]
    sel = page.get("competitions---poule-selector") or {}
    phases = {p["id"]: p for p in sel.get("phases") or []}
    poules = {str(p["ext_pouleId"]): p for p in sel.get("poules") or []}
    titre = (page.get("page-header") or {}).get("title") or comp["libelle"]
    categorie = categorie_de(titre)

    miennes = [e for e in (page.get("competitions---calendar-button") or {}).get("equipes") or []
               if str(e.get("ext_structureId")) == CLUB_ID]
    if not miennes:
        erreur(f"Aucune équipe du club trouvée dans {titre}")
        return []
    url_cal = f"{racine}equipe-{miennes[0]['ext_equipeId']}/"
    cal = ff.components(url_cal)

    groupes: dict[str, list] = {}
    for r in (cal.get("competitions---rencontre-list") or {}).get("rencontres") or []:
        dom = est_nous(r.get("equipe1Libelle"))
        if not dom and not est_nous(r.get("equipe2Libelle")):
            continue
        lib = r.get("equipe1Libelle") if dom else r.get("equipe2Libelle")
        groupes.setdefault(lib, []).append((r, dom))

    equipes = []
    for lib, items in groupes.items():
        items.sort(key=lambda x: (x[0].get("date") is None, x[0].get("date") or ""))
        equipe_id = f"{comp_id}-{ff.slugify(lib)}"
        dates = [x for x in items if x[0].get("date")]
        poule_ext = str((dates[-1] if dates else items[-1])[0].get("extPouleId"))   # phase en cours
        poule = poules.get(poule_ext, {})
        phase = phases.get(poule.get("phaseId"), {})
        ids_nous = {str(r.get("equipe1Id") if dom else r.get("equipe2Id")) for r, dom in items}

        equipe = {
            "id": equipe_id,
            "nom": nom_equipe(titre, lib, equipe_id),
            "libelle_ffhb": lib,
            "competition": titre,
            "detail": detail_de(titre),
            "organisateur": (page.get("page-header") or {}).get("subTitle") or comp["organisateur"],
            "niveau": comp["niveau"],
            "categorie": categorie,
            "genre": genre_equipe(titre, lib),
            "phase": phase.get("libelle"),
            "poule": poule.get("libelle"),
            "url_ffhb": f"{ff.BASE}{url_cal}",
            "classement": None,
            "matchs": [],
        }

        # --- classement de la poule en cours (lignes repérées par nom ou identifiant)
        #     pas de classement pour une coupe (tours à élimination directe)
        est_coupe = "coupe" in detail_de(titre).lower()
        if poule and str(phase.get("classement", "1")) == "1" and not est_coupe:
            cl = ff.components(f"{racine}poule-{poule_ext}/classements/")
            lignes = (cl.get("competitions---classement") or {}).get("classements") or []
            if lignes:
                equipe["classement"] = [{
                    "place": ff._int(x.get("place")), "equipe": x.get("equipe_libelle"),
                    "points": ff._int(x.get("point")), "joues": ff._int(x.get("joue")),
                    "gagnes": ff._int(x.get("gagne")), "nuls": ff._int(x.get("nul")),
                    "perdus": ff._int(x.get("perdu")), "bp": ff._int(x.get("butPlus")),
                    "bc": ff._int(x.get("butMoins")), "diff": ff._int(x.get("diff")),
                    "nous": x.get("equipe_libelle") == lib or str(x.get("equipeId")) in ids_nous}
                    for x in lignes]

        # --- matchs
        prochain_traite = False
        for r, dom in items:
            s1, s2 = ff._int(r.get("equipe1Score")), ff._int(r.get("equipe2Score"))
            joue = s1 is not None and s2 is not None
            nous, eux = (s1, s2) if dom else (s2, s1)
            chemin = f"{racine}poule-{r.get('extPouleId')}/rencontre-{r.get('ext_rencontreId')}/"
            m = {
                "id": str(r.get("ext_rencontreId")),
                "date": r.get("date"),
                "journee": ff._int(r.get("journeeNumero")),
                "domicile": dom,
                "adversaire": r.get("equipe2Libelle") if dom else r.get("equipe1Libelle"),
                "logo_adversaire": logo_adversaire(r, dom),
                "score_nous": nous, "score_eux": eux,
                "mt_nous": ff._int(r.get("equipe1ScoreMT") if dom else r.get("equipe2ScoreMT")),
                "mt_eux": ff._int(r.get("equipe2ScoreMT") if dom else r.get("equipe1ScoreMT")),
                "resultat": (("V" if nous > eux else "N" if nous == eux else "D") if joue else None),
                "url_ffhb": f"{ff.BASE}{chemin}",
                "feuille_de_match": ff.url_feuille_de_match(r.get("fdmCode")) if joue else None,
            }
            a_venir = not joue and bool(r.get("date")) and datetime.fromisoformat(r["date"]) >= maintenant
            if joue or (a_venir and not prochain_traite):
                try:
                    nous_id = r.get("equipe1Id") if dom else r.get("equipe2Id")
                    info = salle_et_buteurs(chemin, nous_id, joue)
                    m["salle"] = info.get("salle")
                    if joue:
                        m["buteurs"] = info.get("buteurs") or []
                        m["buteurs_adverses"] = info.get("buteurs_adverses") or []
                except Exception as err:
                    erreur(f"Match {m['id']} ({equipe['nom']}) : {err}")
                prochain_traite = prochain_traite or a_venir
            equipe["matchs"].append(m)

        joues = [m for m in equipe["matchs"] if m["resultat"]]
        equipe["bilan"] = {"joues": len(joues),
                           "victoires": sum(m["resultat"] == "V" for m in joues),
                           "nuls": sum(m["resultat"] == "N" for m in joues),
                           "defaites": sum(m["resultat"] == "D" for m in joues),
                           "bp": sum(m["score_nous"] for m in joues), "bc": sum(m["score_eux"] for m in joues)}
        equipe["forme"] = "".join(m["resultat"] for m in sorted(joues, key=lambda m: m["date"])[-5:])
        if equipe["classement"]:
            moi = next((l for l in equipe["classement"] if l["nous"]), None)
            equipe["place"] = moi["place"] if moi else None
            equipe["nb_equipes"] = len(equipe["classement"])
        equipes.append(equipe)
    return equipes


# ============================================================================ calendriers

def ecrire_ics(fichier: Path, nom_cal: str, evenements: list[tuple[dict, dict]]):
    def echapper(t):
        return (t or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")

    lignes = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//clamart-handball//FR", "CALSCALE:GREGORIAN",
              f"X-WR-CALNAME:{echapper(nom_cal)}", "X-WR-TIMEZONE:Europe/Paris"]
    horodatage = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    for eq, m in evenements:
        if not m.get("date"):
            continue
        debut = datetime.fromisoformat(m["date"]).astimezone(timezone.utc)
        fin = debut + timedelta(minutes=90)
        club = CONFIG["club"]["nom"]
        titre = (f"{club} {eq['nom']} - {m['adversaire']}" if m["domicile"]
                 else f"{m['adversaire']} - {club} {eq['nom']}")
        if m["resultat"]:
            titre += f" ({m['score_nous']}-{m['score_eux']})"
        salle = m.get("salle") or {}
        lignes += ["BEGIN:VEVENT", f"UID:ffhb-{m['id']}-{eq['id']}@clamart-handball",
                   f"DTSTAMP:{horodatage}", f"DTSTART:{debut.strftime('%Y%m%dT%H%M%SZ')}",
                   f"DTEND:{fin.strftime('%Y%m%dT%H%M%SZ')}", f"SUMMARY:{echapper(titre)}",
                   f"DESCRIPTION:{echapper(eq['competition'])}\\n{m['url_ffhb']}"]
        if salle.get("nom"):
            lignes.append(f"LOCATION:{echapper(salle['nom'] + ', ' + (salle.get('adresse') or ''))}")
        lignes.append("END:VEVENT")
    lignes.append("END:VCALENDAR")
    fichier.write_text("\r\n".join(lignes) + "\r\n", encoding="utf-8")


# ============================================================================ main

def assembler(equipes: list[dict], maintenant: datetime, annees: str, erreurs: list[str],
              surcharges: dict[str, str] | None = None) -> dict:
    """Contenu complet de club.json (contrat v3). Les équipes reçoivent leur 'collectif'.

    surcharges : par défaut celles de config.json (paramètre explicite pour les tests).
    """
    if not equipes:
        raise ValueError("aucune équipe : club.json ne doit pas être remplacé")
    collectifs = construire_collectifs(
        equipes, SURCHARGES_COLLECTIFS if surcharges is None else surcharges,
        base=lambda e: nom_ffhb(e["competition"], e["libelle_ffhb"]))
    return {
        "version_schema": VERSION_SCHEMA,
        "club": {"nom": CONFIG["club"]["nom"], "id_ffhb": CLUB_ID},
        "site": CONFIG.get("site", {}),
        "saison": annees,
        "mis_a_jour": maintenant.isoformat(timespec="seconds"),
        "source": "https://www.ffhandball.fr",
        "collectifs": collectifs,
        "equipes": equipes,
        "erreurs": erreurs,
    }


def main() -> int:
    debut = datetime.now(timezone.utc)
    maintenant = datetime.now(timezone.utc)
    saison, annees = saison_courante()
    log(f"Saison {annees} — recherche du club {CLUB_ID}")
    comps = competitions_du_club(saison)
    log(f"{len(comps)} compétitions trouvées")

    equipes = []
    for comp in comps:
        log(f"- {comp['libelle']}")
        try:
            page = ff.components(comp["path"])
            equipes += collecter_competition(comp, page, maintenant)
        except Exception as err:
            erreur(f"{comp['libelle']} : {err}")
            log(traceback.format_exc())

    if not equipes:
        log("Aucune donnée collectée : les fichiers existants ne sont PAS remplacés.")
        return 1

    ordre_cat = lambda c: (0, 0) if c == "seniors" else (1, -int(c[1:]))   # seniors, puis U18, U15...
    # ICS : matchs sans date (pas encore programmés) ignorés
    equipes.sort(key=lambda e: (ordre_cat(e["categorie"]), e["niveau"] == "coupe-de-france",
                                "coupe" in e["detail"].lower(), e["genre"], e["nom"]))

    donnees = assembler(equipes, maintenant, annees, ERREURS)
    SORTIE.mkdir(parents=True, exist_ok=True)
    tmp = SORTIE / "club.json.tmp"
    tmp.write_text(json.dumps(donnees, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(SORTIE / "club.json")

    agenda = SORTIE / "agenda"
    agenda.mkdir(exist_ok=True)
    for eq in equipes:
        ecrire_ics(agenda / f"{eq['id']}.ics", f"{CONFIG['club']['nom']} - {eq['nom']}",
                   [(eq, m) for m in eq["matchs"]])
    ecrire_ics(agenda / "club.ics", CONFIG["club"]["nom"], [(eq, m) for eq in equipes for m in eq["matchs"]])

    duree = (datetime.now(timezone.utc) - debut).seconds
    log(f"OK : {len(equipes)} équipes, {sum(len(e['matchs']) for e in equipes)} matchs, "
        f"{len(ERREURS)} erreur(s), {duree} s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
