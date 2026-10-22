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


CENTRE_ECUSSON = 249.5   # centre de l'écusson dans assets/logo-clamart.png (500 × 500)
RAYON_ECUSSON = 191.8    # bord extérieur de l'anneau blanc d'origine (mesuré sur le fichier)
RAYON_ANNEAU = 185.0     # début de l'anneau blanc (après l'anneau noir)
TAILLE_ECUSSON = 1536    # rendu en grande taille : les réductions ultérieures restent nettes
SURECHANTILLON = 4       # masque dessiné 4 fois plus grand puis réduit : bord anti-crénelé


def ecusson_club() -> Image.Image:
    """Écusson officiel (assets/logo-clamart.png) détouré en disque, sans le carré rouge.

    L'anneau blanc d'origine est conservé et repeint en blanc pur jusqu'au bord (le fichier source mélange
    blanc et rouge sur le dernier pixel), puis le disque est découpé avec un masque anti-crénelé."""
    source = Image.open(ECUSSON_CLUB).convert("RGBA")
    marge = RAYON_ECUSSON + 1
    boite = (CENTRE_ECUSSON - marge, CENTRE_ECUSSON - marge, CENTRE_ECUSSON + marge, CENTRE_ECUSSON + marge)
    echelle = TAILLE_ECUSSON / (2 * marge)
    img = source.resize((TAILLE_ECUSSON, TAILLE_ECUSSON), Image.LANCZOS, box=boite)
    c = TAILLE_ECUSSON / 2
    blanc = Image.new("L", (TAILLE_ECUSSON, TAILLE_ECUSSON), 0)
    ImageDraw.Draw(blanc).ellipse((c - (RAYON_ECUSSON + 1) * echelle, c - (RAYON_ECUSSON + 1) * echelle,
                                   c + (RAYON_ECUSSON + 1) * echelle, c + (RAYON_ECUSSON + 1) * echelle), fill=255)
    ImageDraw.Draw(blanc).ellipse((c - RAYON_ANNEAU * echelle, c - RAYON_ANNEAU * echelle,
                                   c + RAYON_ANNEAU * echelle, c + RAYON_ANNEAU * echelle), fill=0)
    img.paste((255, 255, 255, 255), (0, 0), blanc)
    grand = TAILLE_ECUSSON * SURECHANTILLON
    masque = Image.new("L", (grand, grand), 0)
    r = RAYON_ECUSSON * echelle * SURECHANTILLON
    ImageDraw.Draw(masque).ellipse((grand / 2 - r, grand / 2 - r, grand / 2 + r, grand / 2 + r), fill=255)
    img.putalpha(masque.resize((TAILLE_ECUSSON, TAILLE_ECUSSON), Image.LANCZOS))
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
