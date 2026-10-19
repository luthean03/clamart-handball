#!/usr/bin/env python3
"""
Notifieur : après chaque collecte, envoie les notifications FCM des nouveaux résultats (et des rappels la veille)
sur des sujets par collectif. Voir docs/superpowers/specs (§4).

  python collecteur/notifieur.py            # envoie (si FIREBASE_SERVICE_ACCOUNT est défini), sinon mode essai
  python collecteur/notifieur.py --essai    # n'envoie rien, n'écrit rien, affiche ce qui partirait
  python collecteur/notifieur.py --test seniors-f-1   # une notification de test sur resultats-seniors-f-1
  python collecteur/notifieur.py --images   # produit (et purge) les images banderole de site/notifs/ ; n'envoie rien
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
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
    image: str | None = None


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


RACINE = ICI.parent
DONNEES = RACINE / "site" / "data" / "club.json"
REGISTRE = ICI / "etat" / "notifications.json"
DOSSIER_IMAGES = RACINE / "site" / "notifs"
CACHE_LOGOS = ICI / "cache" / "logos"
PORTEE_FCM = "https://www.googleapis.com/auth/firebase.messaging"


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def corps_requete(m: Message) -> dict:
    android = {"priority": "high"}
    if m.image:
        android["notification"] = {"image": m.image}
    return {"message": {
        "topic": m.sujet,
        "notification": {"title": m.titre, "body": m.corps},
        "data": {k: str(v) for k, v in m.donnees.items()},
        "android": android,
    }}


class EnvoyeurFCM:
    """Envoi par l'API FCM HTTP v1 avec un compte de service (secret FIREBASE_SERVICE_ACCOUNT)."""

    def __init__(self, compte: dict, session=None):
        import requests
        from google.oauth2 import service_account
        self.projet = compte["project_id"]
        self._credentials = service_account.Credentials.from_service_account_info(compte, scopes=[PORTEE_FCM])
        self._session = session or requests.Session()

    def envoyer(self, m: Message) -> None:
        import google.auth.transport.requests
        if not self._credentials.valid:
            self._credentials.refresh(google.auth.transport.requests.Request())
        reponse = self._session.post(
            f"https://fcm.googleapis.com/v1/projects/{self.projet}/messages:send",
            headers={"Authorization": f"Bearer {self._credentials.token}"},
            json=corps_requete(m), timeout=20)
        try:
            reponse.raise_for_status()
        except Exception as err:
            # le corps de la réponse (ex. PERMISSION_DENIED) dit pourquoi FCM refuse ; jamais le jeton ni les en-têtes
            raise RuntimeError(f"{err} — {(reponse.text or '')[:300]}") from err


def nom_image(m: Message) -> str:
    if m.donnees.get("type") == "test":
        return f"test-{m.donnees['collectif']}.png"
    return f"{m.instant[:10].replace('-', '')}-{m.donnees['collectif']}-{m.donnees['match_id']}.png"


def _image_resultat(club: dict, m: Message, cache: Path, telecharger) -> "Image.Image":
    import banderole
    eq = next(e for e in club["equipes"] if e["id"] == m.donnees["equipe_id"])
    match = next(x for x in eq["matchs"] if str(x["id"]) == m.donnees["match_id"])
    adversaire = nom_lisible(match["adversaire"])
    club_img = banderole.ecusson_club()
    adv_img = banderole.ecusson_adversaire(match.get("logo_adversaire"), adversaire, cache, telecharger=telecharger)
    gagne = match["score_nous"] > match["score_eux"]
    if match["domicile"]:
        return banderole.dessiner(club_img, adv_img, "Clamart", adversaire,
                                  f"{match['score_nous']} – {match['score_eux']}", f"{eq['nom']} · {eq['detail']}", gagne)
    return banderole.dessiner(adv_img, club_img, adversaire, "Clamart",
                              f"{match['score_eux']} – {match['score_nous']}", f"{eq['nom']} · {eq['detail']}", gagne)


def produire_images(club, registre, maintenant, dossier: Path, cache: Path, telecharger=None) -> list[Path]:
    import banderole
    telecharger = telecharger or banderole.telecharger
    if registre is None:          # premier déploiement : rien ne partira, donc aucune image
        return []
    deja = purger(registre, maintenant)
    chemins = []
    for m in messages_resultats(club, maintenant):
        if m.cle in deja:
            continue
        chemin = dossier / nom_image(m)
        if not chemin.exists():
            dossier.mkdir(parents=True, exist_ok=True)
            _image_resultat(club, m, cache, telecharger).save(chemin, "PNG", optimize=True)
        chemins.append(chemin)
    return chemins


def image_de_test(club: dict, collectif: str, dossier: Path, cache: Path, telecharger=None) -> Path | None:
    """test-<collectif>.png : même dessin que pour le dernier résultat connu de ce collectif (None s'il n'y en a pas)."""
    import banderole
    telecharger = telecharger or banderole.telecharger
    trouve = dernier_resultat(club, collectif)
    if not trouve:
        return None
    eq, m = trouve
    modele = Message(f"test:{collectif}", f"resultats-{collectif}", "", "",
                     {"type": "test", "collectif": collectif, "equipe_id": eq["id"], "match_id": str(m["id"])}, "")
    dossier.mkdir(parents=True, exist_ok=True)
    chemin = dossier / nom_image(modele)
    _image_resultat(club, modele, cache, telecharger).save(chemin, "PNG", optimize=True)
    return chemin


def purger_images(dossier: Path, maintenant: datetime) -> list[Path]:
    limite = (maintenant - CONSERVATION).strftime("%Y%m%d")
    supprimees = [p for p in sorted(dossier.glob("[0-9]*.png")) if p.name[:8] < limite]
    for p in supprimees:
        p.unlink()
    return supprimees


def avec_images(messages: list[Message], dossier: Path, url_base: str) -> list[Message]:
    from dataclasses import replace
    return [replace(m, image=url_base + nom_image(m)) if (dossier / nom_image(m)).exists() else m for m in messages]


def executer(club: dict, registre: dict | None, maintenant: datetime, reglages: dict, envoyeur,
             habiller=lambda messages: messages) -> tuple[dict, dict]:
    a_envoyer, registre = planifier(club, registre, maintenant, reglages)
    a_envoyer = habiller(a_envoyer)
    rapport = {"prevus": len(a_envoyer), "envoyes": 0, "echecs": 0}
    if envoyeur is None:
        for m in a_envoyer:
            log(f"[essai] {m.sujet} : {m.titre} — {m.corps}")
        return {}, rapport
    for m in a_envoyer:
        try:
            envoyeur.envoyer(m)
        except Exception as err:  # un échec n'arrête pas les autres ; le message repartira au passage suivant
            rapport["echecs"] += 1
            log(f"[!] {m.cle} : {err}")
            continue
        registre[m.cle] = maintenant.isoformat(timespec="seconds")
        rapport["envoyes"] += 1
    return registre, rapport


def dernier_resultat(club: dict, collectif: str):
    """(équipe, match) du dernier résultat connu de ce collectif, ou None."""
    candidats = [(eq, m) for eq, m in _matchs(club)
                 if eq["collectif"] == collectif and m.get("resultat")
                 and m.get("score_nous") is not None and m.get("score_eux") is not None]
    return max(candidats, key=lambda c: datetime.fromisoformat(c[1]["date"])) if candidats else None


def message_test(collectif: str, club: dict | None = None) -> Message:
    if not re.fullmatch(r"[a-z0-9-]+", collectif or ""):
        raise ValueError(f"id de collectif invalide : {collectif!r}")
    donnees = {"type": "test", "collectif": collectif}
    trouve = dernier_resultat(club, collectif) if club else None
    if trouve:       # comme un vrai résultat : l'appui ouvre la fiche du match
        donnees.update(equipe_id=trouve[0]["id"], match_id=str(trouve[1]["id"]))
    return Message(f"test:{collectif}", f"resultats-{collectif}", "Test · Clamart Handball",
                   "Ceci est une notification de test.", donnees, "")


def main(argv: list[str] | None = None, environ=os.environ, maintenant: datetime | None = None) -> int:
    parseur = argparse.ArgumentParser(description="Notifications FCM du Clamart Handball")
    parseur.add_argument("--essai", action="store_true")
    parseur.add_argument("--test", metavar="COLLECTIF")
    parseur.add_argument("--images", action="store_true",
                         help="produit et purge les images des notifications ; n'envoie rien, n'écrit pas le registre")
    args = parseur.parse_args(argv)
    maintenant = maintenant or datetime.now(timezone.utc)

    if args.images:
        club = json.loads(DONNEES.read_text(encoding="utf-8"))
        registre = json.loads(REGISTRE.read_text(encoding="utf-8")) if REGISTRE.exists() else None
        chemins = produire_images(club, registre, maintenant, DOSSIER_IMAGES, CACHE_LOGOS)
        if args.test:
            message_test(args.test)       # valide l'id du collectif avant de l'utiliser
            image = image_de_test(club, args.test, DOSSIER_IMAGES, CACHE_LOGOS)
            if image:
                chemins.append(image)
            else:
                log(f"Aucun résultat connu pour {args.test} : pas d'image de test.")
        supprimees = purger_images(DOSSIER_IMAGES, maintenant)
        log(f"Images : {len(chemins)} produite(s), {len(supprimees)} supprimée(s).")
        return 0

    secret = environ.get("FIREBASE_SERVICE_ACCOUNT", "").strip()
    envoyeur = None if args.essai or not secret else EnvoyeurFCM(json.loads(secret))
    if envoyeur is None:
        log("Mode essai : aucun envoi, registre inchangé.")

    config = json.loads((RACINE / "config.json").read_text(encoding="utf-8"))
    url_images = config["notifications"]["url_images"]

    if args.test:
        club = json.loads(DONNEES.read_text(encoding="utf-8")) if DONNEES.exists() else None
        m = avec_images([message_test(args.test, club)], DOSSIER_IMAGES, url_images)[0]
        if envoyeur:
            envoyeur.envoyer(m)
        log(f"Test {'envoyé' if envoyeur else '(essai)'} : {m.sujet}")
        return 0

    club = json.loads(DONNEES.read_text(encoding="utf-8"))
    registre = json.loads(REGISTRE.read_text(encoding="utf-8")) if REGISTRE.exists() else None
    final, rapport = executer(club, registre, maintenant, config["notifications"], envoyeur,
                              habiller=lambda ms: avec_images(ms, DOSSIER_IMAGES, url_images))
    log(f"Notifications : {rapport['envoyes']} envoyée(s), {rapport['echecs']} échec(s), {rapport['prevus']} prévue(s)")
    if envoyeur is not None:
        REGISTRE.parent.mkdir(parents=True, exist_ok=True)
        tmp = REGISTRE.with_suffix(".tmp")
        tmp.write_text(json.dumps(final, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
        tmp.replace(REGISTRE)
    return 0


if __name__ == "__main__":
    sys.exit(main())
