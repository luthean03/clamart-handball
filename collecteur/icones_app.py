"""Génère les images de l'app tirées de l'écusson officiel : `python collecteur/icones_app.py`.

Sorties (app/assets/) :
  - logo-rond.png (512 × 512) : l'écusson détouré en disque sur fond transparent ;
  - icone/icone.png (1024 × 1024) : l'écusson rond sur le rouge du club, sans transparence (icône de l'app, iOS) ;
  - icone/premier-plan.png (1024 × 1024) : l'écusson rond de 640 de diamètre, centré, sur le rouge du club, opaque
    (premier plan de l'icône adaptative Android : le disque tient dans la zone sûre, que le masque du lanceur ne rogne pas ;
    opaque parce que certains lanceurs teintent la couche de fond, ce qui donnait l'anneau rose) ;
  - icone/monochrome.png (1024 × 1024) : le pictogramme handball blanc sur fond transparent (icône thématique Android 13) ;
  - notification/{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}.png (24 à 96 px) : le même pictogramme, icône de la barre d'état.
Pictogramme handball (assets/pictogramme-handball.svg), fourni par le responsable du club.
Déterministe : mêmes entrées, même fichier.
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw
from svgelements import SVG, Circle, Line, Move, Shape
from svgelements import Path as TraceSvg

from banderole import ecusson_club

ICI = Path(__file__).resolve().parent
ASSETS = ICI.parent / "app" / "assets"
LOGO_ROND = ASSETS / "logo-rond.png"
ICONE = ASSETS / "icone" / "icone.png"
PREMIER_PLAN = ASSETS / "icone" / "premier-plan.png"
MONOCHROME = ASSETS / "icone" / "monochrome.png"
TAILLE = 512
TAILLE_ICONE = 1024
DIAMETRE_ICONE = 840          # écusson de l'icône carrée : une marge rouge autour, le système arrondit les coins
DIAMETRE_PREMIER_PLAN = 640   # zone sûre adaptative : disque de 66/108 de la couche, soit ~626 sur 1024
DIAGONALE_SILHOUETTE = 600    # la silhouette (son rectangle englobant) tient dans la même zone sûre
SURECHANTILLONNAGE = 8
MARGE_NOTIFICATION = 1 / 24   # icône de notification Android : 24 dp dont 22 dp de zone utile
TAILLES_NOTIFICATION = {"mdpi": 24, "hdpi": 36, "xhdpi": 48, "xxhdpi": 72, "xxxhdpi": 96}
NOTIFICATION = ASSETS / "notification"
PICTOGRAMME = ICI.parent / "assets" / "pictogramme-handball.svg"   # pictogramme handball (assets/pictogramme-handball.svg), fourni par le responsable du club


def logo_rond() -> Image.Image:
    return ecusson_club().resize((TAILLE, TAILLE), Image.LANCZOS)


def _ecusson_centre(diametre: int, fond: tuple[int, int, int, int]) -> Image.Image:
    toile = Image.new("RGBA", (TAILLE_ICONE, TAILLE_ICONE), fond)
    disque = ecusson_club().resize((diametre, diametre), Image.LANCZOS)
    marge = (TAILLE_ICONE - diametre) // 2
    toile.alpha_composite(disque, (marge, marge))
    return toile


ROUGE_CLUB = (219, 0, 0, 255)  # #DB0000, fond de l'icône


def icone() -> Image.Image:
    return _ecusson_centre(DIAMETRE_ICONE, ROUGE_CLUB).convert("RGB")


def premier_plan() -> Image.Image:
    return _ecusson_centre(DIAMETRE_PREMIER_PLAN, ROUGE_CLUB)


def _formes() -> tuple[list[list[list[tuple[float, float]]]], list[tuple[float, float, float, float]]]:
    """Lit le SVG : (contours remplis, anneaux (cx, cy, rayon, épaisseur)). Les contours d'un même tracé sont combinés en pair-impair."""
    svg = SVG.parse(str(PICTOGRAMME))
    remplis, anneaux = [], []
    for el in svg.elements():
        if isinstance(el, Circle) and el.fill.value is None and el.stroke.value is not None:
            anneaux.append((el.cx, el.cy, el.rx, el.stroke_width))
        elif isinstance(el, Shape) and el.fill.value is not None:
            contours = []
            for sous in TraceSvg(el).as_subpaths():
                pts = []
                for seg in sous:
                    if isinstance(seg, Move):
                        continue
                    n = 1 if isinstance(seg, Line) else 48
                    pts += [(seg.point(i / n).x, seg.point(i / n).y) for i in range(n + 1)]
                if len(pts) >= 3:
                    contours.append(pts)
            remplis.append(contours)
    return remplis, anneaux


def pictogramme(taille: int, marge: float) -> Image.Image:
    """Le pictogramme handball en blanc sur fond transparent, centré dans taille × taille, marge de chaque côté en fraction de la taille."""
    remplis, anneaux = _formes()
    xs = [x for c in remplis for k in c for x, _ in k] + [v for cx, _, r, w in anneaux for v in (cx - r - w / 2, cx + r + w / 2)]
    ys = [y for c in remplis for k in c for _, y in k] + [v for _, cy, r, w in anneaux for v in (cy - r - w / 2, cy + r + w / 2)]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    grand = taille * SURECHANTILLONNAGE
    echelle = grand * (1 - 2 * marge) / max(x1 - x0, y1 - y0)
    dx = (grand - (x1 - x0) * echelle) / 2 - x0 * echelle
    dy = (grand - (y1 - y0) * echelle) / 2 - y0 * echelle
    masque = Image.new("L", (grand, grand), 0)
    for contours in remplis:
        forme = Image.new("L", (grand, grand), 0)
        for pts in contours:
            couche = Image.new("L", (grand, grand), 0)
            ImageDraw.Draw(couche).polygon([(x * echelle + dx, y * echelle + dy) for x, y in pts], fill=255)
            forme = ImageChops.logical_xor(forme.convert("1"), couche.convert("1")).convert("L")
        masque = ImageChops.lighter(masque, forme)
    dessin = ImageDraw.Draw(masque)
    for cx, cy, r, w in anneaux:
        ext, int_ = (r + w / 2) * echelle, (r - w / 2) * echelle
        centre = (cx * echelle + dx, cy * echelle + dy)
        dessin.ellipse((centre[0] - ext, centre[1] - ext, centre[0] + ext, centre[1] + ext), fill=255)
        dessin.ellipse((centre[0] - int_, centre[1] - int_, centre[0] + int_, centre[1] + int_), fill=0)
    alpha = masque.resize((taille, taille), Image.LANCZOS)
    image = Image.new("RGBA", (taille, taille), (255, 255, 255, 0))
    image.putalpha(alpha)
    return image


def _proportions() -> tuple[float, float]:
    """Largeur et hauteur relatives du dessin (pour l'inscrire dans un cercle de diagonale donnée)."""
    boite = pictogramme(400, 0).getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    assert boite is not None
    return boite[2] - boite[0], boite[3] - boite[1]


def monochrome() -> Image.Image:
    """Le pictogramme blanc sur fond transparent, son rectangle englobant de diagonale DIAGONALE_SILHOUETTE (zone sûre adaptative)."""
    largeur, hauteur = _proportions()
    cote = DIAGONALE_SILHOUETTE * max(largeur, hauteur) / math.hypot(largeur, hauteur)
    return pictogramme(TAILLE_ICONE, (1 - cote / TAILLE_ICONE) / 2)


def notification(taille: int) -> Image.Image:
    return pictogramme(taille, MARGE_NOTIFICATION)


def main() -> None:
    ICONE.parent.mkdir(parents=True, exist_ok=True)
    NOTIFICATION.mkdir(parents=True, exist_ok=True)
    logo_rond().save(LOGO_ROND, optimize=True)
    print(f"{LOGO_ROND} ({TAILLE} × {TAILLE})")
    for dossier, taille in TAILLES_NOTIFICATION.items():
        chemin = NOTIFICATION / f"{dossier}.png"
        notification(taille).save(chemin, optimize=True)
        print(f"{chemin} ({taille} × {taille})")
    for chemin, image in ((ICONE, icone()), (PREMIER_PLAN, premier_plan()), (MONOCHROME, monochrome())):
        image.save(chemin, optimize=True)
        print(f"{chemin} ({TAILLE_ICONE} × {TAILLE_ICONE})")


if __name__ == "__main__":
    main()
