"""Image « banderole » des notifications de résultat : écusson – score – écusson (1024 × 512)."""
from __future__ import annotations

import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from textes import initiales

ICI = Path(__file__).resolve().parent
POLICE = ICI / "polices" / "Nunito.ttf"
ECUSSON_CLUB = ICI.parent / "assets" / "logo-clamart.png"
# Couleurs de l'app (app/src/theme/couleurs.ts, palette claire)
FOND, TITRE, ROUGE, BLANC, TRAIT, ARDOISE = "#FAF6E6", "#142A3D", "#DB0000", "#FFFFFF", "#CFC6BA", "#2C4256"
CREME = "#FFFEF0"   # texte du monogramme sur son disque ardoise
LARGEUR, HAUTEUR, ECUSSON, MARGE = 1024, 512, 220, 70


def police(poids: int, taille: int) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(POLICE), taille)
    f.set_variation_by_axes([poids])
    return f


def telecharger(url: str) -> bytes:
    requete = urllib.request.Request(url, headers={"User-Agent": "clamart-handball (notifications)"})
    with urllib.request.urlopen(requete, timeout=20) as r:
        return r.read()


def _disque(taille: int) -> Image.Image:
    masque = Image.new("L", (taille, taille), 0)
    ImageDraw.Draw(masque).ellipse((0, 0, taille - 1, taille - 1), fill=255)
    return masque


def ecusson_club() -> Image.Image:
    """Écusson officiel (assets/logo-clamart.png) détouré en disque : le fond carré rouge disparaît."""
    img = Image.open(ECUSSON_CLUB).convert("RGBA")
    c = img.width // 2
    rayon = int(img.width * 0.38)       # cercle extérieur de l'écusson ; vérifier visuellement sur l'aperçu
    img = img.crop((c - rayon, c - rayon, c + rayon, c + rayon))
    img.putalpha(_disque(img.width))
    return img


def monogramme(texte: str, taille: int = 256) -> Image.Image:
    img = Image.new("RGBA", (taille, taille), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((0, 0, taille - 1, taille - 1), fill=ARDOISE)
    d.text((taille / 2, taille / 2), texte, font=police(800, taille // 3), fill=CREME, anchor="mm")
    return img


def ecusson_adversaire(url: str | None, nom: str, cache: Path, telecharger=telecharger) -> Image.Image:
    if url:
        fichier = cache / url.rsplit("/", 1)[-1]
        try:
            if not fichier.exists():
                cache.mkdir(parents=True, exist_ok=True)
                fichier.write_bytes(telecharger(url))
            return Image.open(fichier).convert("RGBA").resize((256, 256), Image.LANCZOS)
        except Exception:
            fichier.unlink(missing_ok=True)
    return monogramme(initiales(nom))


def _pastille(img: Image.Image, taille: int) -> Image.Image:
    fond = Image.new("RGBA", (taille, taille), (0, 0, 0, 0))
    ImageDraw.Draw(fond).ellipse((0, 0, taille - 1, taille - 1), fill=BLANC)
    marge = int(taille * 0.10)
    fond.alpha_composite(img.resize((taille - 2 * marge, taille - 2 * marge), Image.LANCZOS), (marge, marge))
    return fond


def ajuster(texte: str, largeur_max: int) -> tuple[str, int]:
    for taille in range(30, 21, -1):
        if police(700, taille).getlength(texte) <= largeur_max:
            return texte, taille
    f = police(700, 22)
    while texte and f.getlength(texte + "…") > largeur_max:
        texte = texte[:-1].rstrip()
    return texte + "…", 22


def dessiner(gauche, droite, nom_gauche: str, nom_droite: str, score: str, entete: str,
             victoire: bool = False) -> Image.Image:
    """Carte claire aux couleurs de l'app : bandeau de date rouge, écussons, score bleu nuit ; « Victoire » en rouge."""
    img = Image.new("RGBA", (LARGEUR, HAUTEUR), FOND)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, LARGEUR, 84), fill=ROUGE)
    d.text((LARGEUR / 2, 44), entete.upper(), font=police(700, 30), fill=BLANC, anchor="mm")
    for x in (MARGE, LARGEUR - MARGE - ECUSSON):
        d.ellipse((x - 3, 117, x + ECUSSON + 2, 120 + ECUSSON + 2), fill=TRAIT)    # liseré : le disque blanc se détache du fond crème
        img.alpha_composite(_pastille(gauche if x == MARGE else droite, ECUSSON), (x, 120))
    d.text((LARGEUR / 2, 230), score, font=police(800, 120), fill=TITRE, anchor="mm")
    if victoire:
        d.text((LARGEUR / 2, 322), "VICTOIRE", font=police(800, 34), fill=ROUGE, anchor="mm")
    for x, nom in ((MARGE + ECUSSON / 2, nom_gauche), (LARGEUR - MARGE - ECUSSON / 2, nom_droite)):
        texte, taille = ajuster(nom, 300)
        d.text((x, 395), texte, font=police(700, taille), fill=TITRE, anchor="mm")
    return img.convert("RGB")
