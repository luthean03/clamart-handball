"""Génère les images de l'app tirées de l'écusson officiel : `python collecteur/icones_app.py`.

Sortie : app/assets/logo-rond.png (512 × 512), l'écusson détouré en disque sur fond transparent.
Déterministe : mêmes entrées, même fichier.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

from banderole import ecusson_club

ICI = Path(__file__).resolve().parent
LOGO_ROND = ICI.parent / "app" / "assets" / "logo-rond.png"
TAILLE = 512


def logo_rond() -> Image.Image:
    return ecusson_club().resize((TAILLE, TAILLE), Image.LANCZOS)


def main() -> None:
    logo_rond().save(LOGO_ROND, optimize=True)
    print(f"{LOGO_ROND} ({TAILLE} × {TAILLE})")


if __name__ == "__main__":
    main()
