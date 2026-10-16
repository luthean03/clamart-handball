"""Génère les images de l'app tirées de l'écusson officiel : `python collecteur/icones_app.py`.

Sorties (app/assets/) :
  - logo-rond.png (512 × 512) : l'écusson détouré en disque sur fond transparent ;
  - icone/icone.png (1024 × 1024) : l'écusson rond sur blanc, sans transparence (icône de l'app, iOS) ;
  - icone/premier-plan.png (1024 × 1024) : l'écusson rond de 640 de diamètre, centré, sur blanc opaque
    (premier plan de l'icône adaptative Android : le disque tient dans la zone sûre, que le masque du lanceur ne rogne pas ;
    opaque parce que certains lanceurs teintent la couche de fond, ce qui donnait l'anneau rose) ;
  - icone/monochrome.png (1024 × 1024) : la silhouette blanche du joueur sur fond transparent (icône thématique Android 13).
Déterministe : mêmes entrées, même fichier.
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

from banderole import ECUSSON_CLUB, ecusson_club

ICI = Path(__file__).resolve().parent
ASSETS = ICI.parent / "app" / "assets"
LOGO_ROND = ASSETS / "logo-rond.png"
ICONE = ASSETS / "icone" / "icone.png"
PREMIER_PLAN = ASSETS / "icone" / "premier-plan.png"
MONOCHROME = ASSETS / "icone" / "monochrome.png"
TAILLE = 512
TAILLE_ICONE = 1024
DIAMETRE_ICONE = 840          # écusson de l'icône carrée : une marge blanche autour, le système arrondit les coins
DIAMETRE_PREMIER_PLAN = 640   # zone sûre adaptative : disque de 66/108 de la couche, soit ~626 sur 1024
DIAGONALE_SILHOUETTE = 600    # la silhouette (son rectangle englobant) tient dans la même zone sûre
RAYON_DISQUE_BLANC = 95       # disque blanc central de l'écusson (rayon ~101 autour de (250, 250)) : la silhouette seule, sans l'anneau marine


def logo_rond() -> Image.Image:
    return ecusson_club().resize((TAILLE, TAILLE), Image.LANCZOS)


def _ecusson_centre(diametre: int, fond: tuple[int, int, int, int]) -> Image.Image:
    toile = Image.new("RGBA", (TAILLE_ICONE, TAILLE_ICONE), fond)
    disque = ecusson_club().resize((diametre, diametre), Image.LANCZOS)
    marge = (TAILLE_ICONE - diametre) // 2
    toile.alpha_composite(disque, (marge, marge))
    return toile


def icone() -> Image.Image:
    return _ecusson_centre(DIAMETRE_ICONE, (255, 255, 255, 255)).convert("RGB")


def premier_plan() -> Image.Image:
    return _ecusson_centre(DIAMETRE_PREMIER_PLAN, (255, 255, 255, 255))


def monochrome() -> Image.Image:
    """Le joueur de l'écusson (noir sur le disque blanc central) devient blanc, opaque là où il est noir."""
    with Image.open(ECUSSON_CLUB) as logo:
        gris = logo.convert("L")
    c = gris.width // 2
    masque = Image.new("L", gris.size, 0)
    ImageDraw.Draw(masque).ellipse((c - RAYON_DISQUE_BLANC, c - RAYON_DISQUE_BLANC, c + RAYON_DISQUE_BLANC, c + RAYON_DISQUE_BLANC), fill=255)
    alpha = ImageChops.multiply(ImageChops.invert(gris), masque)
    boite = alpha.point(lambda v: 255 if v > 16 else 0).getbbox()
    assert boite is not None
    alpha = alpha.crop(boite)
    echelle = DIAGONALE_SILHOUETTE / math.hypot(*alpha.size)
    alpha = alpha.resize((round(alpha.width * echelle), round(alpha.height * echelle)), Image.LANCZOS)
    silhouette = Image.new("RGBA", alpha.size, (255, 255, 255, 255))
    silhouette.putalpha(alpha)
    toile = Image.new("RGBA", (TAILLE_ICONE, TAILLE_ICONE), (0, 0, 0, 0))
    toile.alpha_composite(silhouette, ((TAILLE_ICONE - alpha.width) // 2, (TAILLE_ICONE - alpha.height) // 2))
    return toile


def main() -> None:
    ICONE.parent.mkdir(parents=True, exist_ok=True)
    logo_rond().save(LOGO_ROND, optimize=True)
    print(f"{LOGO_ROND} ({TAILLE} × {TAILLE})")
    for chemin, image in ((ICONE, icone()), (PREMIER_PLAN, premier_plan()), (MONOCHROME, monochrome())):
        image.save(chemin, optimize=True)
        print(f"{chemin} ({TAILLE_ICONE} × {TAILLE_ICONE})")


if __name__ == "__main__":
    main()
