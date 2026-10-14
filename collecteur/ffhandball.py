"""
ffhandball.py — Fonctions de scraping de ffhandball.fr, pensées pour devenir des tools MCP.

Conventions (pour faciliter la transformation en tools)
-------------------------------------------------------
* Entrées simples : str / int / None. Les docstrings servent de description.
* Une compétition est identifiée par son `url` (chemin relatif, ex.
  "/competitions/saison-2026-2027-22/national/daikin-starligue-2026-27-32372/").
  Le site exige le slug exact : on réutilise toujours l'`url` renvoyée par
  rechercher_* / lister_*. Une URL complète https://www.ffhandball.fr/... marche aussi.
* Une poule est identifiée par `poule_id`, une équipe par `equipe_id`,
  un club par `club_id` (tous en str).
* Sorties : dict / list JSON-sérialisables.
* Erreurs : exceptions FFHBErreur au message explicite. Les fonctions qui
  parcourent plusieurs pages ne s'arrêtent pas sur une erreur : elles la
  renvoient dans la clé "erreurs".

Comment marche le site
----------------------
Chaque page contient ses données en JSON dans des balises
<smartfire-component name="..." attributes="{...}"> : on lit le HTML, pas besoin
de navigateur.

Réseau
------
* Requêtes espacées d'au moins FFHB_DELAI secondes (1 s par défaut).
* Cache mémoire de FFHB_CACHE_TTL secondes (600 par défaut).
* Erreurs réseau / SSL / 429 / 5xx : nouvelles tentatives automatiques.
* Si `truststore` est installé, Python utilise les certificats du système
  (corrige la plupart des "CERTIFICATE_VERIFY_FAILED"). Sinon, FFHB_CA_BUNDLE
  peut pointer vers un fichier de certificats.

Installation : pip install requests beautifulsoup4 pdfplumber truststore
"""

from __future__ import annotations

import json
import os
import re
import tempfile
import threading
import time
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path
from typing import Optional, Union
from urllib.parse import quote, urlsplit

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

try:  # certificats du système d'exploitation (Windows / macOS / proxy d'entreprise)
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass

BASE = "https://www.ffhandball.fr"
FDM_BASE = "https://fdm.fdme.ffhandball.fr"
NIVEAUX = ("national", "regional", "departemental", "coupe-de-france")

DELAI = float(os.environ.get("FFHB_DELAI", "1.0"))
CACHE_TTL = float(os.environ.get("FFHB_CACHE_TTL", "600"))
ESSAIS = 4
SEUIL = 0.6  # score minimal de correspondance d'un nom (0 à 1)

_NIVEAU_SITE = {
    "NATIONAL": "national",
    "REGIONAL": "regional",
    "DEPARTEMENTAL": "departemental",
    "COUPE_DE_FRANCE": "coupe-de-france",
}
_ALIAS_NIVEAU = {
    "nationale": "national", "nat": "national",
    "region": "regional", "regionale": "regional", "ligue": "regional",
    "departement": "departemental", "departementale": "departemental", "comite": "departemental",
    "coupe": "coupe-de-france", "cdf": "coupe-de-france",
}


# ---------------------------------------------------------------------------
# Erreurs
# ---------------------------------------------------------------------------

class FFHBErreur(Exception):
    """Erreur générique du scraper (message lisible, adapté à un agent)."""


class PageIntrouvable(FFHBErreur):
    """La page n'existe pas (404) : mauvaise URL, mauvais identifiant."""


class ErreurReseau(FFHBErreur):
    """Le site n'a pas pu être joint malgré plusieurs essais."""


# ---------------------------------------------------------------------------
# Réseau, cache, lecture des pages
# ---------------------------------------------------------------------------

def _creer_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (compatible; ffhb-scraper)",
        "Accept-Language": "fr-FR,fr;q=0.9",
    })
    # Le Retry ne gère que les codes HTTP ; les erreurs de connexion/SSL sont
    # gérées dans _http_get (connect=0, read=0).
    retry = Retry(total=3, connect=0, read=0, status=3, backoff_factor=2,
                  status_forcelist=(429, 500, 502, 503, 504),
                  allowed_methods=frozenset(["GET"]),
                  respect_retry_after_header=True, raise_on_status=False)
    s.mount("https://", HTTPAdapter(max_retries=retry))
    ca = os.environ.get("FFHB_CA_BUNDLE")
    if ca:
        s.verify = ca
    return s


SESSION = _creer_session()
_cache: dict = {}
_verrou = threading.Lock()
_dernier_appel = 0.0


def _attendre() -> None:
    global _dernier_appel
    with _verrou:
        attente = _dernier_appel + DELAI - time.monotonic()
        if attente > 0:
            time.sleep(attente)
        _dernier_appel = time.monotonic()


def _http_get(url: str) -> requests.Response:
    derniere = None
    for essai in range(ESSAIS):
        _attendre()
        try:
            return SESSION.get(url, timeout=30)
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            derniere = e                      # SSLError est une ConnectionError
            time.sleep(2 * (essai + 1))
    raise ErreurReseau(f"Échec réseau après {ESSAIS} essais sur {url} : {derniere}")


def _chemin(url_ou_chemin: str) -> str:
    """Normalise une URL complète ou un chemin en '/chemin/?query'."""
    p = urlsplit(url_ou_chemin.strip())
    chemin = p.path or "/"
    if not chemin.startswith("/"):
        chemin = "/" + chemin
    if not chemin.endswith("/"):
        chemin += "/"
    return chemin + (f"?{p.query}" if p.query else "")


def _page(url_ou_chemin: str) -> tuple:
    """Renvoie (chemin final après redirection, {nom_composant: données})."""
    chemin = _chemin(url_ou_chemin)
    maintenant = time.monotonic()
    en_cache = _cache.get(chemin)
    if en_cache and maintenant - en_cache[0] < CACHE_TTL:
        return en_cache[1], en_cache[2]

    r = _http_get(BASE + chemin)
    if r.status_code == 404:
        raise PageIntrouvable(f"Page introuvable : {BASE + chemin}")
    if r.status_code >= 400:
        raise ErreurReseau(f"HTTP {r.status_code} sur {BASE + chemin}")

    soup = BeautifulSoup(r.text, "html.parser")
    donnees = {}
    for tag in soup.find_all("smartfire-component"):
        brut = tag.get("attributes")
        if not brut:
            continue
        try:
            donnees[tag.get("name")] = json.loads(brut)
        except json.JSONDecodeError:
            pass
    final = _chemin(r.url)
    _cache[chemin] = (maintenant, final, donnees)
    return final, donnees


def components(url_ou_chemin: str) -> dict:
    """Bas niveau : tous les composants JSON d'une page du site."""
    return _page(url_ou_chemin)[1]


def vider_cache() -> None:
    """Vide le cache mémoire (pour forcer des données fraîches)."""
    _cache.clear()


def _bloc(donnees: dict, nom: str, chemin: str = "") -> dict:
    bloc = donnees.get(nom)
    if bloc is None:
        raise FFHBErreur(f"Données '{nom}' absentes de la page {chemin} "
                         "(mauvaise URL, ou structure du site modifiée).")
    return bloc


# ---------------------------------------------------------------------------
# Petits utilitaires
# ---------------------------------------------------------------------------

def slugify(texte: str) -> str:
    """'+16 1ERE DIV MASCULINE' -> '16-1ere-div-masculine' (comme le site)."""
    texte = unicodedata.normalize("NFKD", texte or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", texte.lower()).strip("-")


def _score(requete: str, texte: str) -> float:
    """Ressemblance 0..1 entre une requête et un nom (accents/casse ignorés)."""
    q, t = slugify(requete), slugify(texte)
    if not q or not t:
        return 0.0
    if q == t:
        return 1.0
    mots_q, mots_t = q.split("-"), set(t.split("-"))
    trouves = sum(1 for w in mots_q
                  if w in mots_t or (len(w) >= 3 and any(x.startswith(w) for x in mots_t)))
    return round(0.8 * trouves / len(mots_q) + 0.2 * SequenceMatcher(None, q, t).ratio(), 3)


def _int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _journees(poule: dict) -> list:
    j = (poule or {}).get("journees") or []
    return json.loads(j) if isinstance(j, str) else j


def _niveau(niveau: str) -> str:
    n = slugify(niveau)
    n = _ALIAS_NIVEAU.get(n, n)
    if n not in NIVEAUX:
        raise FFHBErreur(f"Niveau inconnu '{niveau}'. Valeurs possibles : {', '.join(NIVEAUX)}.")
    return n


def _comp_root(url: str) -> str:
    """Ramène n'importe quelle URL d'une compétition à sa racine."""
    chemin = _chemin(url).split("?")[0]
    m = re.match(r"^(/competitions/saison-[^/]+/[^/]+/[^/]+/)", chemin)
    if not m or "/o-" in m.group(1):
        raise FFHBErreur(f"URL de compétition invalide : {url}. Utiliser l'`url` renvoyée "
                         "par rechercher_competitions / lister_competitions.")
    return m.group(1)


def url_feuille_de_match(fdm_code: Optional[str]) -> Optional[str]:
    """'WAGTRKG' -> 'https://fdm.fdme.ffhandball.fr/W/A/G/T/WAGTRKG.pdf'"""
    if not fdm_code:
        return None
    return f"{FDM_BASE}/{'/'.join(fdm_code[:4])}/{fdm_code}.pdf"


# ---------------------------------------------------------------------------
# Saisons
# ---------------------------------------------------------------------------

def _saison_courante() -> str:
    final, _ = _page("/competitions/")
    m = re.match(r"^(/competitions/saison-[^/]+)/", final)
    if not m:
        raise FFHBErreur("Impossible de déterminer la saison en cours.")
    return m.group(1)


def lister_saisons() -> list:
    """
    Liste les saisons consultables sur le site, de la plus récente à la plus ancienne.

    Returns:
        [{"saison_id": "22", "saison": "2026 - 2027", "url": "/competitions/saison-2026-2027-22"}]
    """
    courante = _saison_courante()
    bloc = _bloc(components(f"{courante}/national/"), "competitions---saison-selector")
    out = []
    for s in bloc.get("saisons") or []:
        if str(s.get("displayResults", "1")) != "1":
            continue
        annees = s["libelle"].replace(" ", "")
        out.append({"saison_id": str(s["ext_saisonId"]), "saison": s["libelle"],
                    "url": f"/competitions/saison-{annees}-{s['ext_saisonId']}"})
    return sorted(out, key=lambda s: -int(s["saison_id"]))


def _saison(saison: Union[str, int, None] = None) -> str:
    """None -> saison en cours ; accepte un id (22), '2025-2026', '2025 - 2026' ou une url."""
    if saison in (None, ""):
        return _saison_courante()
    s = str(saison).strip()
    if s.startswith("/competitions/saison-") or s.startswith("http"):
        m = re.search(r"(/competitions/saison-[^/]+)", s)
        if m:
            return m.group(1)
    cle = s.replace(" ", "")
    for x in lister_saisons():
        if cle in (x["saison_id"], x["saison"].replace(" ", "")):
            return x["url"]
    raise FFHBErreur(f"Saison inconnue : {saison}. Voir lister_saisons().")


# ---------------------------------------------------------------------------
# Recherche
# ---------------------------------------------------------------------------

def _recherche(q: str, type_: str, saison) -> tuple:
    if not q or not q.strip():
        raise FFHBErreur("La recherche ne peut pas être vide.")
    s = _saison(saison)
    data = components(f"{s}/recherche/?type={type_}&q={quote(q.strip())}")
    return s, _bloc(data, "competitions---search-results").get("results") or []


def _competition_depuis_recherche(s: str, r: dict) -> dict:
    niveau = _NIVEAU_SITE.get(r.get("type"), slugify(r.get("type", "")))
    return {
        "competition": r["libelle"],
        "niveau": niveau,
        "organisateur": r.get("structure_libelle"),
        "competition_id": str(r["ext_competitionId"]),
        "url": f"{s}/{niveau}/{slugify(r['libelle'])}-{r['ext_competitionId']}/",
    }


def rechercher_competitions(nom: str, niveau: Optional[str] = None,
                            saison: Optional[str] = None) -> list:
    """
    Cherche des compétitions par nom (moteur de recherche du site).

    Args:
        nom: texte à chercher, ex. "starligue", "nationale 1 masculine", "+16 1ere div".
        niveau: filtre optionnel : national, regional, departemental, coupe-de-france.
        saison: optionnelle (id ou "2025-2026"), saison en cours par défaut.

    Returns:
        [{"competition", "niveau", "organisateur", "competition_id", "url"}]
        Le site limite la recherche à 30 résultats : préciser la requête si besoin.
    """
    s, res = _recherche(nom, "competition", saison)
    out = [_competition_depuis_recherche(s, r) for r in res]
    if niveau:
        n = _niveau(niveau)
        out = [c for c in out if c["niveau"] == n]
    return out


def rechercher_clubs(nom: str, saison: Optional[str] = None) -> list:
    """
    Cherche des clubs par nom et liste les compétitions où ils sont engagés.

    Args:
        nom: nom ou partie du nom du club, ex. "caen handball", "chemin vert".
        saison: optionnelle, saison en cours par défaut.

    Returns:
        Clubs triés par pertinence :
        [{"club", "club_id", "score", "competitions": [{"competition", "niveau",
          "organisateur", "competition_id", "url"}]}]
        Le site limite la recherche à 30 compétitions au total : pour un gros club,
        certaines peuvent manquer.
    """
    s, res = _recherche(nom, "structure", saison)
    clubs: dict = {}
    for r in res:
        club_id = str(r.get("id", "")).split("/")[-1]
        c = clubs.setdefault(club_id, {"club": r.get("equipe_libelle"), "club_id": club_id,
                                       "score": _score(nom, r.get("equipe_libelle", "")),
                                       "competitions": []})
        comp = _competition_depuis_recherche(s, r)
        if comp["url"] not in {x["url"] for x in c["competitions"]}:
            c["competitions"].append(comp)
    return sorted(clubs.values(), key=lambda c: -c["score"])


# ---------------------------------------------------------------------------
# Structures (ligues / comités) et compétitions
# ---------------------------------------------------------------------------

def lister_structures(niveau: str, nom: Optional[str] = None,
                      saison: Optional[str] = None) -> list:
    """
    Liste les ligues (niveau "regional") ou les comités (niveau "departemental").

    Args:
        niveau: "regional" ou "departemental".
        nom: filtre optionnel, ex. "calvados", "normandie", "hauts-de-seine".
        saison: optionnelle, saison en cours par défaut.

    Returns:
        [{"structure", "structure_id", "url"}]
    """
    n = _niveau(niveau)
    if n not in ("regional", "departemental"):
        raise FFHBErreur("lister_structures n'a de sens que pour 'regional' ou 'departemental'.")
    s = _saison(saison)
    menu = _bloc(components(f"{s}/{n}/"), "competitions---competition-main-menu")
    out = [{"structure": x["libelle"], "structure_id": str(x["ext_structureId"]),
            "url": f"{s}/{n}/o-{slugify(x['libelle'])}-{x['ext_structureId']}/"}
           for x in menu.get("structures") or []]
    if nom:
        out = [x for x in out if _score(nom, x["structure"]) >= SEUIL]
        out.sort(key=lambda x: -_score(nom, x["structure"]))
    return out


def _resoudre_structure(niveau: str, structure: str, saison) -> dict:
    if structure.startswith("/competitions/") or structure.startswith("http"):
        return {"structure": None, "url": _chemin(structure)}
    candidats = lister_structures(niveau, structure, saison)
    if not candidats:
        raise FFHBErreur(f"Aucune structure '{structure}' au niveau {niveau}. "
                         "Voir lister_structures(niveau).")
    return candidats[0]


def lister_competitions(niveau: str, structure: Optional[str] = None,
                        nom: Optional[str] = None, saison: Optional[str] = None) -> list:
    """
    Liste les compétitions d'un niveau.

    Args:
        niveau: national, regional, departemental ou coupe-de-france.
        structure: obligatoire pour regional / departemental : nom de la ligue ou du
            comité (ex. "calvados", "ligue de normandie") ou son url.
        nom: filtre optionnel sur le nom de la compétition, ex. "16 masculin".
        saison: optionnelle, saison en cours par défaut.

    Returns:
        [{"competition", "genre", "niveau", "organisateur", "competition_id", "url"}]
    """
    n = _niveau(niveau)
    s = _saison(saison)
    if n in ("regional", "departemental"):
        if not structure:
            raise FFHBErreur(f"Pour le niveau {n}, préciser `structure` (ligue ou comité). "
                             "Voir lister_structures.")
        st = _resoudre_structure(n, structure, saison)
        page, organisateur = st["url"], st["structure"]
    else:
        page, organisateur = f"{s}/{n}/", "FEDERATION FRANCAISE DE HANDBALL"

    menu = _bloc(components(page), "competitions---competition-main-menu", page)
    if menu.get("structure"):
        organisateur = menu["structure"].get("libelle") or organisateur
    out = [{"competition": c["libelle"], "genre": c.get("genre"), "niveau": n,
            "organisateur": organisateur, "competition_id": str(c["ext_competitionId"]),
            "url": f"{s}/{n}/{slugify(c['libelle'])}-{c['ext_competitionId']}/"}
           for c in menu.get("competitions") or []]
    if nom:
        out = [c for c in out if _score(nom, c["competition"]) >= SEUIL]
        out.sort(key=lambda c: -_score(nom, c["competition"]))
    return out


# ---------------------------------------------------------------------------
# Compétition : poules et identifiants d'équipes
# ---------------------------------------------------------------------------

def _poules_brutes(root: str) -> tuple:
    data = components(root)
    sel = _bloc(data, "competitions---poule-selector", root)
    phases = {p["id"]: p for p in sel.get("phases") or []}
    poules = []
    for p in sel.get("poules") or []:
        ph = phases.get(p.get("phaseId"), {})
        poules.append({"phase": ph.get("libelle"), "poule": p["libelle"],
                       "poule_id": str(p["ext_pouleId"]),
                       "avec_classement": str(ph.get("classement", "1")) == "1",
                       "journees": _journees(p)})
    return data, poules


def _titre(data: dict) -> tuple:
    h = data.get("page-header") or {}
    return h.get("title"), h.get("subTitle")


def _ids_equipes(root: str) -> dict:
    """id interne d'équipe -> {equipe_id (externe), equipe}."""
    data = components(root)
    m = {}
    sources = ((data.get("competitions---calendar-button") or {}).get("equipes") or []) + \
              ((data.get("competitions---poule-selector") or {}).get("equipe_options") or [])
    for e in sources:
        m[e["id"]] = {"equipe_id": str(e["ext_equipeId"]), "equipe": e.get("libelle")}
    return m


def _completer_ids(root: str, poule_id: str, ids_internes, m: dict) -> None:
    if all(i in m for i in ids_internes):
        return
    try:
        d = components(f"{root}poule-{poule_id}/")
    except FFHBErreur:
        return
    sources = ((d.get("competitions---poule-selector") or {}).get("equipe_options") or []) + \
              ((d.get("competitions---calendar-button") or {}).get("equipes") or [])
    for e in sources:
        m.setdefault(e["id"], {"equipe_id": str(e["ext_equipeId"]), "equipe": e.get("libelle")})


def infos_competition(url: str) -> dict:
    """
    Décrit une compétition : nom, organisateur, phases et poules.

    Args:
        url: url de la compétition (renvoyée par rechercher_* / lister_competitions).

    Returns:
        {"competition", "organisateur", "url", "poule_par_defaut", "journee_courante",
         "poules": [{"phase", "poule", "poule_id", "avec_classement",
                     "nb_journees", "debut", "fin"}]}
        Une compétition peut avoir plusieurs phases (tours de coupe, brassages…)
        et plusieurs poules par phase.
    """
    root = _comp_root(url)
    data, poules = _poules_brutes(root)
    titre, orga = _titre(data)
    rl = data.get("competitions---rencontre-list") or {}
    return {
        "competition": titre,
        "organisateur": orga,
        "url": root,
        "poule_par_defaut": str((rl.get("poule") or {}).get("ext_pouleId") or "") or None,
        "journee_courante": _int(rl.get("selected_numero_journee")),
        "poules": [{"phase": p["phase"], "poule": p["poule"], "poule_id": p["poule_id"],
                    "avec_classement": p["avec_classement"],
                    "nb_journees": len(p["journees"]),
                    "debut": p["journees"][0].get("date_debut") if p["journees"] else None,
                    "fin": p["journees"][-1].get("date_fin") if p["journees"] else None}
                   for p in poules],
    }


# ---------------------------------------------------------------------------
# Classements
# ---------------------------------------------------------------------------

def _classement_brut(root: str, poule_id: str) -> list:
    data = components(f"{root}poule-{poule_id}/classements/")
    return (data.get("competitions---classement") or {}).get("classements") or []


def _ligne_classement(r: dict, ids: dict) -> dict:
    return {
        "place": _int(r.get("place")),
        "equipe": r.get("equipe_libelle"),
        "equipe_id": (ids.get(r.get("equipeId")) or {}).get("equipe_id"),
        "club_id": str(r.get("ext_structureId")) if r.get("ext_structureId") else None,
        "points": _int(r.get("point")),
        "joues": _int(r.get("joue")),
        "gagnes": _int(r.get("gagne")),
        "nuls": _int(r.get("nul")),
        "perdus": _int(r.get("perdu")),
        "buts_pour": _int(r.get("butPlus")),
        "buts_contre": _int(r.get("butMoins")),
        "diff": _int(r.get("diff")),
    }


def classement(url: str, poule_id: Optional[str] = None) -> dict:
    """
    Classement d'une compétition : toutes ses poules, ou une seule.

    Args:
        url: url de la compétition.
        poule_id: optionnel ; sans lui, toutes les poules avec classement sont renvoyées.

    Returns:
        {"competition", "organisateur", "url",
         "poules": [{"phase", "poule", "poule_id", "nb_equipes",
                     "classement": [{"place", "equipe", "equipe_id", "club_id", "points",
                                     "joues", "gagnes", "nuls", "perdus",
                                     "buts_pour", "buts_contre", "diff"}]}],
         "erreurs": [...]}
    """
    root = _comp_root(url)
    data, poules = _poules_brutes(root)
    titre, orga = _titre(data)
    if poule_id:
        poules = [p for p in poules if p["poule_id"] == str(poule_id)]
        if not poules:
            raise FFHBErreur(f"Poule {poule_id} absente de {root}. Voir infos_competition.")
    else:
        poules = [p for p in poules if p["avec_classement"]]

    ids = _ids_equipes(root)
    res = {"competition": titre, "organisateur": orga, "url": root, "poules": [], "erreurs": []}
    for p in poules:
        try:
            brut = _classement_brut(root, p["poule_id"])
        except FFHBErreur as e:
            res["erreurs"].append({"poule": p["poule"], "erreur": str(e)})
            continue
        if not brut:
            continue
        _completer_ids(root, p["poule_id"], [r.get("equipeId") for r in brut], ids)
        res["poules"].append({"phase": p["phase"], "poule": p["poule"], "poule_id": p["poule_id"],
                              "nb_equipes": len(brut),
                              "classement": [_ligne_classement(r, ids) for r in brut]})
    return res


def classement_equipe(nom: str, competition_url: Optional[str] = None,
                      club_id: Optional[str] = None, niveau: Optional[str] = None,
                      saison: Optional[str] = None, max_competitions: int = 15) -> dict:
    """
    Trouve une équipe et donne sa place dans chaque classement où elle apparaît.

    Deux modes :
      * sans competition_url : cherche le club (rechercher_clubs) puis parcourt les
        classements de toutes ses compétitions. Peut prendre du temps pour un gros
        club : utiliser `niveau` ou `max_competitions` pour limiter.
      * avec competition_url : cherche l'équipe par son nom dans cette seule compétition.

    Args:
        nom: nom du club ou de l'équipe, ex. "caen handball", "chemin vert".
        competition_url: optionnel, limite la recherche à une compétition.
        club_id: optionnel, pour viser un club précis quand le nom est ambigu.
        niveau: optionnel : national, regional, departemental, coupe-de-france.
        saison: optionnelle, saison en cours par défaut.
        max_competitions: nombre maximal de compétitions parcourues (défaut 15).

    Returns:
        {"requete", "clubs": [{"club", "club_id"}],
         "equipes": [{"competition", "niveau", "competition_url", "phase", "poule",
                      "poule_id", "nb_equipes", "place", "equipe", "equipe_id", "club_id",
                      "points", "joues", "gagnes", "nuls", "perdus",
                      "buts_pour", "buts_contre", "diff"}],
         "competitions_non_parcourues": int, "erreurs": [...]}
    """
    erreurs, equipes, clubs_out = [], [], []
    if competition_url:
        comps = [{"competition": None, "niveau": None, "url": _comp_root(competition_url)}]

        def garder(row):
            if club_id:
                return row["club_id"] == str(club_id)
            return _score(nom, row["equipe"] or "") >= SEUIL
    else:
        clubs = rechercher_clubs(nom, saison)
        if club_id:
            clubs = [c for c in clubs if c["club_id"] == str(club_id)]
        elif clubs:
            meilleur = clubs[0]["score"]
            clubs = [c for c in clubs if c["score"] >= max(SEUIL, meilleur - 0.15)]
        if not clubs:
            return {"requete": nom, "clubs": [], "equipes": [], "competitions_non_parcourues": 0,
                    "erreurs": [], "message": "Aucun club correspondant. Essayer rechercher_clubs "
                                              "avec un autre nom."}
        ids_clubs = {c["club_id"] for c in clubs}
        clubs_out = [{"club": c["club"], "club_id": c["club_id"]} for c in clubs]
        comps, vues = [], set()
        for c in clubs:
            for comp in c["competitions"]:
                if comp["url"] not in vues:
                    vues.add(comp["url"])
                    comps.append(comp)
        if niveau:
            n = _niveau(niveau)
            comps = [c for c in comps if c["niveau"] == n]

        def garder(row):
            return row["club_id"] in ids_clubs

    non_parcourues = max(0, len(comps) - max_competitions)
    for comp in comps[:max_competitions]:
        try:
            cl = classement(comp["url"])
        except FFHBErreur as e:
            erreurs.append({"competition": comp.get("competition"), "url": comp["url"],
                            "erreur": str(e)})
            continue
        erreurs += cl["erreurs"]
        for p in cl["poules"]:
            for row in p["classement"]:
                if garder(row):
                    equipes.append({"competition": cl["competition"] or comp.get("competition"),
                                    "niveau": comp.get("niveau"), "competition_url": cl["url"],
                                    "phase": p["phase"], "poule": p["poule"],
                                    "poule_id": p["poule_id"], "nb_equipes": p["nb_equipes"],
                                    **row})
    return {"requete": nom, "clubs": clubs_out, "equipes": equipes,
            "competitions_non_parcourues": non_parcourues, "erreurs": erreurs}


# ---------------------------------------------------------------------------
# Rencontres
# ---------------------------------------------------------------------------

def _match(r: dict, root: str, ids: dict) -> dict:
    s1, s2 = _int(r.get("equipe1Score")), _int(r.get("equipe2Score"))
    return {
        "date": r.get("date"),
        "journee": _int(r.get("journeeNumero")),
        "domicile": r.get("equipe1Libelle"),
        "domicile_id": (ids.get(r.get("equipe1Id")) or {}).get("equipe_id"),
        "exterieur": r.get("equipe2Libelle"),
        "exterieur_id": (ids.get(r.get("equipe2Id")) or {}).get("equipe_id"),
        "score_domicile": s1,
        "score_exterieur": s2,
        "mi_temps": (f"{r.get('equipe1ScoreMT')}-{r.get('equipe2ScoreMT')}"
                     if r.get("equipe1ScoreMT") not in (None, "") else None),
        "statut": "joue" if s1 is not None and s2 is not None else "a_venir",
        "arbitres": [a for a in (r.get("arbitre1"), r.get("arbitre2")) if a],
        "poule_id": str(r.get("extPouleId")) if r.get("extPouleId") else None,
        "rencontre_id": str(r.get("ext_rencontreId")) if r.get("ext_rencontreId") else None,
        "rencontre_url": (f"{root}poule-{r.get('extPouleId')}/rencontre-{r.get('ext_rencontreId')}/"
                          if r.get("ext_rencontreId") else None),
        "fdm_code": r.get("fdmCode") or None,
    }


def rencontres(url: str, poule_id: Optional[str] = None,
               journee: Union[int, str, None] = None) -> dict:
    """
    Matchs d'une poule : la journée en cours, une journée précise, ou toutes.

    Args:
        url: url de la compétition.
        poule_id: optionnel ; poule par défaut de la compétition si absent.
        journee: numéro de journée, "toutes", ou rien pour la journée en cours.

    Returns:
        {"competition_url", "poule", "poule_id", "journee_courante", "journees": [1, 2, ...],
         "matchs": [{"date", "journee", "domicile", "domicile_id", "exterieur",
                     "exterieur_id", "score_domicile", "score_exterieur", "mi_temps",
                     "statut" ("joue"/"a_venir"), "arbitres", "rencontre_id",
                     "rencontre_url", "fdm_code"}],
         "erreurs": [...]}
        fdm_code sert à feuille_de_match().
    """
    root = _comp_root(url)
    numero = None
    if journee not in (None, "") and str(journee).lower() != "toutes":
        numero = _int(journee)
        if numero is None:
            raise FFHBErreur(f"journee invalide : {journee} (numéro, 'toutes' ou vide).")
    if numero is not None and poule_id:
        base = f"{root}poule-{poule_id}/journee-{numero}/"   # une seule requête
    else:
        base = f"{root}poule-{poule_id}/" if poule_id else root
    data = components(base)
    rl = _bloc(data, "competitions---rencontre-list", base)
    poule = rl.get("poule") or {}
    pid = str(poule.get("ext_pouleId") or poule_id)
    nums = [j["journee_numero"] for j in _journees(poule)]
    courante = _int(rl.get("selected_numero_journee"))
    ids = _ids_equipes(root)

    res = {"competition_url": root, "poule": poule.get("libelle"), "poule_id": pid,
           "journee_courante": courante, "journees": nums, "matchs": [], "erreurs": []}
    if journee in (None, "") or (numero is not None and poule_id):
        brut = rl.get("rencontres") or []
        _completer_ids(root, pid, [x for r in brut for x in (r.get("equipe1Id"), r.get("equipe2Id"))], ids)
        res["matchs"] = [_match(r, root, ids) for r in brut]
        return res

    a_lire = nums if numero is None else [numero]
    for n in a_lire:
        try:
            bloc = components(f"{root}poule-{pid}/journee-{n}/").get("competitions---rencontre-list") or {}
        except FFHBErreur as e:
            res["erreurs"].append({"journee": n, "erreur": str(e)})
            continue
        brut = bloc.get("rencontres") or []
        _completer_ids(root, pid, [x for r in brut for x in (r.get("equipe1Id"), r.get("equipe2Id"))], ids)
        res["matchs"] += [_match(r, root, ids) for r in brut]
    return res


def calendrier_equipe(competition_url: str, equipe_id: str) -> dict:
    """
    Calendrier complet d'une équipe dans une compétition : matchs joués et à venir.

    Args:
        competition_url: url de la compétition.
        equipe_id: identifiant de l'équipe (champ equipe_id de classement /
            classement_equipe / rencontres).

    Returns:
        {"equipe", "equipe_id", "competition_url", "bilan": {"victoires", "nuls",
         "defaites", "buts_pour", "buts_contre"}, "forme": "VVDNV" (5 derniers, du plus
         ancien au plus récent), "joues": [...], "a_venir": [...]}
        Chaque match a les mêmes champs que dans rencontres(), plus "resultat" (V/N/D)
        pour les matchs joués.
    """
    root = _comp_root(competition_url)
    chemin = f"{root}equipe-{equipe_id}/"
    data = components(chemin)
    rl = _bloc(data, "competitions---rencontre-list", chemin)
    sel = (data.get("competitions---poule-selector") or {}).get("selected_equipe") or {}
    ids = _ids_equipes(root)
    if sel.get("id"):
        ids[sel["id"]] = {"equipe_id": str(equipe_id), "equipe": sel.get("libelle")}
    interne = sel.get("id")

    matchs = sorted((r for r in rl.get("rencontres") or []), key=lambda r: r.get("date") or "")
    joues, a_venir = [], []
    bilan = {"victoires": 0, "nuls": 0, "defaites": 0, "buts_pour": 0, "buts_contre": 0}
    for r in matchs:
        m = _match(r, root, ids)
        if m["statut"] != "joue":
            a_venir.append(m)
            continue
        dom = r.get("equipe1Id") == interne if interne else m["domicile_id"] == str(equipe_id)
        pour, contre = ((m["score_domicile"], m["score_exterieur"]) if dom
                        else (m["score_exterieur"], m["score_domicile"]))
        m["resultat"] = "V" if pour > contre else ("N" if pour == contre else "D")
        bilan["victoires" if pour > contre else "nuls" if pour == contre else "defaites"] += 1
        bilan["buts_pour"] += pour
        bilan["buts_contre"] += contre
        joues.append(m)

    if not matchs and not sel:
        raise PageIntrouvable(f"Aucune équipe {equipe_id} dans {root}.")
    return {"equipe": sel.get("libelle"), "equipe_id": str(equipe_id), "competition_url": root,
            "bilan": bilan, "forme": "".join(m["resultat"] for m in joues[-5:]),
            "joues": joues, "a_venir": a_venir}


def detail_rencontre(rencontre_url: str) -> dict:
    """
    Détail d'un match : score, mi-temps, salle, arbitres, buteurs, lien de la feuille de match.

    Args:
        rencontre_url: champ rencontre_url renvoyé par rencontres() / calendrier_equipe().

    Returns:
        {"domicile", "exterieur", "score_domicile", "score_exterieur", "mi_temps", "date",
         "titre", "salle", "arbitres", "fdm_url",
         "buteurs": [{"equipe", "numero", "joueur", "buts"}]}
    """
    chemin = _chemin(rencontre_url)
    d = components(chemin)
    score = _bloc(d, "competitions---competition-score", chemin)
    salle = (d.get("competitions---rencontre-salle") or {}).get("equipement") or {}
    lj = d.get("competitions---rencontre-liste-joueurs") or {}
    e1, e2 = lj.get("equipe1") or {}, lj.get("equipe2") or {}
    noms = {e1.get("id"): e1.get("libelle"), e2.get("id"): e2.get("libelle")}
    home, away = score.get("home") or {}, score.get("away") or {}
    buteurs = [{"equipe": noms.get(j.get("equipeId")), "numero": _int(j.get("numero")),
                "joueur": f"{(j.get('prenom') or '').title()} {j.get('nom') or ''}".strip(),
                "buts": _int(j.get("buts")) or 0}
               for j in lj.get("statsJoueurs") or []]
    buteurs.sort(key=lambda b: (b["equipe"] or "", -b["buts"]))
    return {
        "domicile": home.get("name"), "exterieur": away.get("name"),
        "score_domicile": _int(home.get("score")), "score_exterieur": _int(away.get("score")),
        "mi_temps": (f"{home.get('halfTimeScore')}-{away.get('halfTimeScore')}"
                     if home.get("halfTimeScore") not in (None, "") else None),
        "date": score.get("date"), "titre": score.get("title"),
        "salle": " ".join(x for x in (salle.get("libelle"), salle.get("rue"),
                                      salle.get("codePostal"), salle.get("ville")) if x) or None,
        "arbitres": (d.get("competitions---rencontre-arbitres") or {}).get("arbitres") or [],
        "fdm_url": (d.get("competitions---rencontre-fdm-button") or {}).get("url"),
        "buteurs": buteurs,
    }


# ---------------------------------------------------------------------------
# Statistiques joueurs
# ---------------------------------------------------------------------------

def statistiques_joueurs(url: str, poule_id: Optional[str] = None, equipe: Optional[str] = None,
                         tri: str = "buts", limite: int = 20) -> dict:
    """
    Statistiques individuelles d'une poule (meilleurs buteurs, gardiens…).

    Args:
        url: url de la compétition.
        poule_id: optionnel ; poule par défaut si absent.
        equipe: filtre optionnel sur le nom de l'équipe.
        tri: "buts", "arrets" ou "matchs" (ordre décroissant).
        limite: nombre de joueurs renvoyés (défaut 20).

    Returns:
        {"poule_id", "total_joueurs",
         "joueurs": [{"joueur", "equipe", "matchs", "buts", "arrets"}]}
        Vide si la compétition n'affiche pas de statistiques.
    """
    if tri not in ("buts", "arrets", "matchs"):
        raise FFHBErreur("tri doit valoir 'buts', 'arrets' ou 'matchs'.")
    root = _comp_root(url)
    pid = poule_id
    if not pid:
        rl = components(root).get("competitions---rencontre-list") or {}
        pid = (rl.get("poule") or {}).get("ext_pouleId")
        if not pid:
            _, poules = _poules_brutes(root)
            pid = poules[0]["poule_id"] if poules else None
    if not pid:
        raise FFHBErreur(f"Aucune poule trouvée pour {root}.")
    data = components(f"{root}poule-{pid}/statistiques/")
    lignes = (data.get("competitions---stats-joueurs") or {}).get("rowsData") or []
    joueurs = [{"joueur": f"{(r.get('prenom') or '').title()} {r.get('nom') or ''}".strip(),
                "equipe": r.get("equipeLibelle"),
                "matchs": _int(r.get("matchCount")) or 0,
                "buts": _int(r.get("totalButs")) or 0,
                "arrets": _int(r.get("totalArrets")) or 0}
               for r in lignes]
    if equipe:
        joueurs = [j for j in joueurs if _score(equipe, j["equipe"] or "") >= SEUIL]
    joueurs.sort(key=lambda j: -j[tri])
    return {"poule_id": str(pid), "total_joueurs": len(joueurs), "joueurs": joueurs[:limite]}


# ---------------------------------------------------------------------------
# Feuille de match (PDF)
# ---------------------------------------------------------------------------

def telecharger_feuille_de_match(code_ou_url: str, dossier: Optional[str] = None) -> str:
    """Télécharge le PDF (code fdm ex. 'WAGTRKG', ou URL) et renvoie le chemin local."""
    url = code_ou_url if code_ou_url.startswith("http") else url_feuille_de_match(code_ou_url.strip())
    rep = Path(dossier or os.environ.get("FFHB_FDM_DIR") or Path(tempfile.gettempdir()) / "ffhb_fdm")
    rep.mkdir(parents=True, exist_ok=True)
    chemin = rep / url.rsplit("/", 1)[-1]
    if not chemin.exists():
        r = _http_get(url)
        if r.status_code == 404:
            raise PageIntrouvable(f"Feuille de match indisponible (match pas encore joué ou "
                                  f"pas encore saisi) : {url}")
        if r.status_code >= 400:
            raise ErreurReseau(f"HTTP {r.status_code} sur {url}")
        if not r.content.startswith(b"%PDF"):
            raise FFHBErreur(f"La réponse n'est pas un PDF : {url}")
        chemin.write_bytes(r.content)
    return str(chemin)


def feuille_de_match(code_ou_url: str, inclure_licences: bool = False) -> dict:
    """
    Télécharge et lit une feuille de match officielle (PDF).

    Args:
        code_ou_url: fdm_code d'un match (renvoyé par rencontres / calendrier_equipe,
            ex. "WAGTRKG") ou URL du PDF (fdm_url de detail_rencontre).
        inclure_licences: False par défaut : les numéros de licence sont retirés.

    Returns:
        {"url", "entete": {compétition, date, journée, salle, juges-arbitres, table...},
         "score": {"domicile", "exterieur"},
         "periodes": [{"periode", "dom", "ext"}]  (score cumulé en fin de période),
         "equipes": [{"nom", "joueurs": [{"numero", "nom", "capitaine", "buts", "buts_7m",
                      "tirs", "arrets", "avertissement", "deux_minutes", "disqualification"...}],
                      "officiels": [{"role", "nom", ...}]}],
         "deroule": [{"temps", "score_dom", "score_ext", "type", "joueur", "equipe", "action"}]}
    """
    chemin = telecharger_feuille_de_match(code_ou_url)
    res = parse_feuille_de_match(chemin, inclure_licences=inclure_licences)
    url = code_ou_url if code_ou_url.startswith("http") else url_feuille_de_match(code_ou_url.strip())
    return {"url": url, **res}


# ---------------------------------------------------------------------------
# Lecture du PDF de feuille de match (pdfplumber)
# ---------------------------------------------------------------------------

_LABELS_ENTETE = [
    "Organisateur", "Code Renc", "Compétition", "Groupe", "Date", "Journée", "Salle",
    "Chronométreur", "Secrétaire", "Tuteur de table", "Resp. de salle", "Speaker",
    "Juge arbitre 1", "Juge arbitre 2", "Juge accomp.", "Juge délégué", "Délégué officiel",
]
_COLS = {"N°": "numero", "Licence": "licence", "Type": "type", "JFL": "jfl", "Buts": "buts",
         "7m": "buts_7m", "Tirs": "tirs", "Arrets": "arrets", "Av.": "avertissement",
         "2'": "deux_minutes", "Dis": "disqualification", "Capt": "capitaine"}
_RE_TEMPS = re.compile(r"^\d{1,3}:\d{2}$")
_RE_SCORE = re.compile(r"^(\d+)\s*-\s*(\d+)$")
_RE_LICENCE = re.compile(r"^\d{10,14}$")


def _lignes(page, ecart_max=3.5, tol_y=2.5):
    """Regroupe le texte d'une page en lignes de 'blocs' (x0, x1, texte)."""
    mots = page.extract_words(keep_blank_chars=False, x_tolerance=1.5, y_tolerance=2,
                              use_text_flow=False)
    mots.sort(key=lambda w: (round(w["top"]), w["x0"]))
    lignes: list[list] = []
    for w in mots:
        if lignes and abs(lignes[-1][0] - w["top"]) <= tol_y:
            lignes[-1][1].append(w)
        else:
            lignes.append([w["top"], [w]])
    out = []
    for top, ws in lignes:
        ws.sort(key=lambda w: w["x0"])
        blocs = []
        for w in ws:
            if blocs and w["x0"] - blocs[-1][1] <= ecart_max:
                b = blocs[-1]
                blocs[-1] = (b[0], w["x1"], b[2] + " " + w["text"])
            else:
                blocs.append((w["x0"], w["x1"], w["text"]))
        mots_ligne = [(w["x0"], w["x1"], w["text"]) for w in ws]
        out.append((top, blocs, mots_ligne))
    return out


_RE_LABELS = re.compile(
    "(" + "|".join(re.escape(l) for l in sorted(_LABELS_ENTETE, key=len, reverse=True)) + r")(?=\s|$)")


def _entete(lignes) -> dict:
    """Champs du haut de la page 1 (compétition, date, officiels de table...)."""
    info = {}
    for _, _, mots in lignes:
        texte = " ".join(m[2] for m in mots)
        morceaux = _RE_LABELS.split(texte)
        for k in range(1, len(morceaux) - 1, 2):
            label, valeur = morceaux[k], morceaux[k + 1].strip()
            if not valeur:
                continue
            m = re.match(r"^(.*?)\s*(\d{10,14})$", valeur)
            if m:
                info[label] = {"nom": m.group(1) or None, "licence": m.group(2)}
            else:
                info[label] = valeur
    return info


def _colonnes(blocs_entete):
    cols = {}
    for x0, x1, t in blocs_entete:
        t2 = t.replace(" ", "")
        if t2 in ("7", "7m"):
            t2 = "7m"
        if t2 in _COLS:
            cols[_COLS[t2]] = (x0 + x1) / 2
    return cols


def _colonne_proche(cols, x_centre):
    return min(cols, key=lambda k: abs(cols[k] - x_centre))


_RE_ROLE = re.compile(
    r"^(Officiel\s+Resp\.?\s*[A-Z]|Officiel\s+[A-Z]|M[ée]decin|Kin[ée]\w*|Soigneur|Entra[iî]neur\w*"
    r"|Kin[ée]sith[ée]rapeute|Ost[ée]opathe)\s+(.+)$")
_RE_JOUEUR = re.compile(r"^(?:(X)\s+)?(\d{1,3})\s+(.+)$")


def _bloc_equipe(lignes, cols, x_marge=60):
    """
    Lit les lignes d'une équipe mot par mot.
    Partie gauche (avant la colonne Licence) : [X capitaine] numéro NOM, ou rôle + NOM.
    Partie droite : chaque valeur va dans la colonne d'entête la plus proche.
    """
    x_licence = cols.get("licence", 340) - 25
    joueurs, officiels = [], []
    for _, _, mots in lignes:
        mots = [m for m in mots if m[0] >= x_marge]    # ignore marge (texte vertical, nom du club)
        gauche = " ".join(m[2] for m in mots if m[0] < x_licence)
        droite = [m for m in mots if m[0] >= x_licence]
        if not gauche:
            continue
        valeurs = {}
        for x0, x1, t in droite:
            valeurs[_colonne_proche(cols, (x0 + x1) / 2)] = t

        mr = _RE_ROLE.match(gauche)
        mj = _RE_JOUEUR.match(gauche)
        if mr:
            officiels.append({"role": re.sub(r"\s+", " ", mr.group(1)), "nom": mr.group(2),
                              "licence": valeurs.get("licence"), "type": valeurs.get("type"),
                              "avertissement": valeurs.get("avertissement") == "X",
                              "deux_minutes": _int(valeurs.get("deux_minutes")) or 0,
                              "disqualification": valeurs.get("disqualification") == "X"})
        elif mj:
            j = {"numero": int(mj.group(2)), "nom": mj.group(3),
                 "licence": valeurs.get("licence"), "type": valeurs.get("type"),
                 "capitaine": mj.group(1) == "X",
                 "jfl": valeurs.get("jfl") == "X",
                 "avertissement": valeurs.get("avertissement") == "X",
                 "disqualification": valeurs.get("disqualification") == "X"}
            for k in ("buts", "buts_7m", "tirs", "arrets", "deux_minutes"):
                j[k] = _int(valeurs.get(k)) or 0
            joueurs.append(j)
    return joueurs, officiels


def _type_action(action: str):
    regles = [
        (r"^But 7m\s+(.*)", "but_7m"), (r"^But\s+(.*)", "but"),
        (r"^Tir 7m (?:manqué|rate|raté)\s+(.*)", "7m_rate"),
        (r"^Avertissement\s+(.*)", "avertissement"),
        (r"^2\s*MN\s+(.*)", "2_minutes"),
        (r"^Disqualification\S*\s+(.*)", "disqualification"),
        (r"^Temps mort\s+(.*)", "temps_mort"),
    ]
    for motif, nom in regles:
        m = re.match(motif, action, flags=re.I)
        if m:
            return nom, m.group(1).strip()
    return "autre", None


def parse_feuille_de_match(pdf_path: str | Path, inclure_licences: bool = False) -> dict:
    """
    Lit une feuille de match FFHandball (PDF) et renvoie :
      entete     : compétition, code, date, journée, salle, officiels de table...
      equipes    : [{nom, joueurs:[...], officiels:[...]}, {...}]  (domicile puis visiteur)
      score      : {domicile, exterieur}
      periodes   : [{periode, dom, ext}, ...]   score cumulé à la fin de chaque période
      deroule    : [{temps, score_dom, score_ext, type, joueur, equipe, action}, ...]
    """
    import pdfplumber

    res = {"entete": {}, "equipes": [], "score": {}, "periodes": [], "deroule": []}
    with pdfplumber.open(str(pdf_path)) as pdf:
        pages = [_lignes(p) for p in pdf.pages]
        largeur = pdf.pages[0].width

    # --- page 1 : entête + compositions ---
    p1 = pages[0]
    entetes_idx = [i for i, (_, _, b) in enumerate(p1)
                   if {"Licence", "Buts"} <= {x[2] for x in b}]
    res["entete"] = _entete(p1[: entetes_idx[0]] if entetes_idx else p1)

    for _, blocs, _ in p1[: entetes_idx[0] if entetes_idx else len(p1)]:
        for k, (x0, x1, t) in enumerate(blocs):
            if " / " in t and k + 2 < len(blocs) and blocs[k + 1][2].isdigit():
                dom, ext = t.split(" / ", 1)
                res["equipes_noms"] = [dom.strip(), ext.strip()]
                res["score"] = {"domicile": int(blocs[k + 1][2]), "exterieur": int(blocs[k + 2][2])}
    noms_eq = res.pop("equipes_noms", ["Domicile", "Visiteur"])

    for n, idx in enumerate(entetes_idx):
        fin = entetes_idx[n + 1] if n + 1 < len(entetes_idx) else len(p1)
        cols = _colonnes(p1[idx][2])
        joueurs, officiels = _bloc_equipe(p1[idx + 1: fin], cols)
        res["equipes"].append({"nom": noms_eq[n] if n < len(noms_eq) else None,
                               "joueurs": joueurs, "officiels": officiels})

    # --- scores par période + déroulé (pages suivantes) ---
    joueur_equipe = {}
    for eq in res["equipes"]:
        for j in eq["joueurs"]:
            joueur_equipe[j["nom"]] = eq["nom"]
        for o in eq["officiels"]:
            joueur_equipe.setdefault(o["nom"], eq["nom"])

    milieu = largeur / 2
    for lignes in pages[1:]:
        entete_periodes = None
        for _, blocs, _ in lignes:
            textes = [b[2] for b in blocs]
            if any(t.startswith("Période") or t.startswith("Fin") for t in textes) and not any(
                    _RE_TEMPS.match(t) for t in textes):
                entete_periodes = [b for b in blocs if b[2].startswith(("Période", "Fin", "Prol", "Tirs"))]
            if textes and textes[0] == "Détail score" and entete_periodes:
                vals = [int(b[2]) for b in blocs[1:] if b[2].isdigit()]
                for k, per in enumerate(entete_periodes):
                    if 2 * k + 1 < len(vals):
                        res["periodes"].append({"periode": per[2], "dom": vals[2 * k], "ext": vals[2 * k + 1]})

        evenements = {"g": [], "d": []}
        for _, blocs, _ in lignes:
            for cote in ("g", "d"):
                col = [b for b in blocs if (b[0] < milieu) == (cote == "g")]
                if len(col) >= 3 and _RE_TEMPS.match(col[0][2]) and _RE_SCORE.match(col[1][2]):
                    evenements[cote].append(col)
        for col in evenements["g"] + evenements["d"]:
            sd, se = _RE_SCORE.match(col[1][2]).groups()
            action = " ".join(b[2] for b in col[2:])
            type_, qui = _type_action(action)
            res["deroule"].append({
                "temps": col[0][2], "score_dom": int(sd), "score_ext": int(se),
                "type": type_, "joueur": qui if type_ != "temps_mort" else None,
                "equipe": (noms_eq[0] if qui == "Recevant" else noms_eq[1]) if type_ == "temps_mort"
                          else joueur_equipe.get(qui),
                "action": action,
            })

    def _sec(t):
        m, s = t.split(":")
        return int(m) * 60 + int(s)
    res["deroule"].sort(key=lambda e: _sec(e["temps"]))
    if not inclure_licences:
        _retirer_licences(res)
    return res


def _retirer_licences(res: dict) -> None:
    """Supprime les numéros de licence (données personnelles) du résultat."""
    for eq in res["equipes"]:
        for p in eq["joueurs"] + eq["officiels"]:
            p.pop("licence", None)
    for k, v in list(res["entete"].items()):
        if isinstance(v, dict):
            res["entete"][k] = v.get("nom")


# ---------------------------------------------------------------------------
# Liste des fonctions à exposer en tools
# ---------------------------------------------------------------------------

TOOLS = [
    lister_saisons,
    rechercher_clubs,
    rechercher_competitions,
    lister_structures,
    lister_competitions,
    infos_competition,
    classement,
    classement_equipe,
    rencontres,
    calendrier_equipe,
    detail_rencontre,
    statistiques_joueurs,
    feuille_de_match,
]


__all__ = [f.__name__ for f in TOOLS] + [
    "FFHBErreur", "PageIntrouvable", "ErreurReseau", "components", "vider_cache",
    "telecharger_feuille_de_match", "parse_feuille_de_match", "url_feuille_de_match", "TOOLS"]
