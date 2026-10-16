import math

import icones_app
from PIL import Image


def test_logo_rond_est_un_disque_transparent_et_stable():
    img = icones_app.logo_rond()
    assert img.size == (512, 512) and img.mode == "RGBA"
    assert img.getpixel((0, 0))[3] == 0 and img.getpixel((511, 511))[3] == 0   # coins hors du disque
    assert img.getpixel((256, 256))[3] == 255                                   # centre opaque
    assert img.tobytes() == icones_app.logo_rond().tobytes()                    # déterministe


def test_icone_est_un_ecusson_rond_sur_blanc_sans_transparence():
    img = icones_app.icone()
    assert img.size == (1024, 1024) and img.mode == "RGB"                       # iOS refuse la transparence
    for coin in ((0, 0), (1023, 0), (0, 1023), (1023, 1023), (60, 60)):
        assert img.getpixel(coin) == (255, 255, 255)                            # pas de coin rouge
    assert img.getpixel((512, 512 - 400)) != (255, 255, 255)                    # l'écusson occupe le centre (bande rouge à 400 du centre)


def test_premier_plan_est_un_disque_de_640_centre_sur_blanc_opaque():
    # Opaque : certains lanceurs teintent la couche de fond (anneau rose vu sur l'émulateur), le premier plan la cache.
    img = icones_app.premier_plan()
    assert img.size == (1024, 1024) and img.mode == "RGBA"
    assert img.getchannel("A").getextrema() == (255, 255)
    assert img.getpixel((10, 10)) == (255, 255, 255, 255) and img.getpixel((192, 192)) == (255, 255, 255, 255)
    assert img.getpixel((512, 512 - 300)) != (255, 255, 255, 255)               # diamètre 640, centré : zone sûre adaptative


def test_pas_de_halo_rose_au_bord_du_disque():
    for img, rayon in ((icones_app.premier_plan(), 320), (icones_app.icone().convert("RGBA"), 420)):
        for angle in range(360):
            for r in range(rayon - 10, rayon - 4):                                 # liseré blanc de l'écusson, juste sous le bord
                x, y = round(512 + r * math.cos(math.radians(angle))), round(512 + r * math.sin(math.radians(angle)))
                rouge, vert, bleu, alpha = img.getpixel((x, y))
                assert alpha >= 240 and not (rouge - vert > 40 and vert > 60), (angle, r, (rouge, vert, bleu, alpha))
            x, y = round(512 + (rayon + 3) * math.cos(math.radians(angle))), round(512 + (rayon + 3) * math.sin(math.radians(angle)))
            *_, alpha = pixel = img.getpixel((x, y))
            assert alpha == 0 or pixel[:3] == (255, 255, 255)                    # hors du disque : transparent, ou blanc (queue du rééchantillonnage, fond de l'icône)


def test_monochrome_est_une_silhouette_blanche_dans_la_zone_sure():
    img = icones_app.monochrome()
    assert img.size == (1024, 1024) and img.mode == "RGBA"
    alpha = img.getchannel("A")
    gauche, haut, droite, bas = alpha.getbbox()
    assert img.getpixel((0, 0))[3] == 0
    assert max(abs(512 - gauche), abs(droite - 512), abs(512 - haut), abs(bas - 512)) <= 320   # tient dans le disque sûr de 640
    assert all(p[:3] == (255, 255, 255) for p in img.get_flattened_data() if p[3] > 0)     # blanc partout où c'est visible
    assert max(alpha.get_flattened_data()) == 255


def test_les_fichiers_livres_correspondent_au_generateur():
    for chemin, genere in (
        (icones_app.LOGO_ROND, icones_app.logo_rond()),
        (icones_app.ICONE, icones_app.icone()),
        (icones_app.PREMIER_PLAN, icones_app.premier_plan()),
        (icones_app.MONOCHROME, icones_app.monochrome()),
    ):
        with Image.open(chemin) as livre:
            assert livre.size == genere.size
            assert livre.convert("RGBA").tobytes() == genere.convert("RGBA").tobytes(), chemin.name
