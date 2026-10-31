import math

import icones_app
from PIL import Image


def test_logo_rond_est_un_disque_transparent_et_stable():
    img = icones_app.logo_rond()
    assert img.size == (512, 512) and img.mode == "RGBA"
    assert img.getpixel((0, 0))[3] == 0 and img.getpixel((511, 511))[3] == 0   # coins hors du disque
    assert img.getpixel((256, 256))[3] == 255                                   # centre opaque
    assert img.tobytes() == icones_app.logo_rond().tobytes()                    # déterministe


def test_icone_est_un_ecusson_rond_sur_rouge_sans_transparence():
    img = icones_app.icone()
    assert img.size == (1024, 1024) and img.mode == "RGB"                       # iOS refuse la transparence
    for coin in ((0, 0), (1023, 0), (0, 1023), (1023, 1023), (60, 60)):
        assert img.getpixel(coin) == (219, 0, 0)                                # fond rouge du club
    assert img.getpixel((512, 512 - 400)) != (255, 255, 255)                    # l'écusson occupe le centre (bande rouge à 400 du centre)


def test_premier_plan_est_un_disque_de_640_centre_sur_rouge_opaque():
    # Opaque : certains lanceurs teintent la couche de fond (anneau rose vu sur l'émulateur), le premier plan la cache.
    img = icones_app.premier_plan()
    assert img.size == (1024, 1024) and img.mode == "RGBA"
    assert img.getchannel("A").getextrema() == (255, 255)
    assert img.getpixel((10, 10)) == (219, 0, 0, 255) and img.getpixel((192, 192)) == (219, 0, 0, 255)
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
            assert alpha == 0 or (pixel[0] > 200 and pixel[1] < 40 and pixel[2] < 40)   # hors du disque : le rouge du club (fond de l'icône), jamais rose ni blanc


def test_monochrome_est_le_pictogramme_blanc_dans_la_zone_sure():
    img = icones_app.monochrome()
    assert img.size == (1024, 1024) and img.mode == "RGBA"
    alpha = img.getchannel("A")
    gauche, haut, droite, bas = alpha.getbbox()
    assert img.getpixel((0, 0))[3] == 0
    assert math.hypot(droite - gauche, bas - haut) <= icones_app.DIAGONALE_SILHOUETTE + 10    # même zone sûre qu'avant
    assert max(abs(512 - gauche), abs(droite - 512), abs(512 - haut), abs(bas - 512)) <= 320   # tient dans le disque sûr de 640
    assert abs((gauche + droite) / 2 - 512) <= 2 and abs((haut + bas) / 2 - 512) <= 2          # centré
    assert all(p[:3] == (255, 255, 255) for p in img.get_flattened_data() if p[3] > 0)     # blanc partout où c'est visible
    assert max(alpha.get_flattened_data()) == 255
    assert any(0 < v < 255 for v in alpha.get_flattened_data())                            # bords lissés


def test_icones_de_notification_sont_nettes_et_dans_la_zone_utile():
    assert icones_app.TAILLES_NOTIFICATION == {"mdpi": 24, "hdpi": 36, "xhdpi": 48, "xxhdpi": 72, "xxxhdpi": 96}
    for dossier, taille in icones_app.TAILLES_NOTIFICATION.items():
        img = icones_app.notification(taille)
        assert img.size == (taille, taille) and img.mode == "RGBA", dossier
        alpha = img.getchannel("A")
        assert all(img.getpixel(c)[3] == 0 for c in ((0, 0), (taille - 1, 0), (0, taille - 1), (taille - 1, taille - 1))), dossier
        assert all(p[:3] == (255, 255, 255) for p in img.get_flattened_data() if p[3] > 0), dossier
        assert max(alpha.get_flattened_data()) == 255, dossier
        assert any(0 < v < 255 for v in alpha.get_flattened_data()), dossier                  # bords lissés
        marge = taille / 24                                                                    # zone utile de 22 dp sur 24
        gauche, haut, droite, bas = alpha.point(lambda v: 255 if v > 40 else 0).getbbox()   # hors halo de rééchantillonnage
        assert gauche >= marge - 1 and haut >= marge - 1 and droite <= taille - marge + 1 and bas <= taille - marge + 1, dossier


def test_icone_de_notification_est_l_ecusson_complet():
    img = icones_app.notification(96)
    alpha = img.getchannel("A")
    rayon = 40                                                                            # anneaux extérieurs (blanc puis noir)
    for angle in range(0, 360, 5):
        x, y = 48 + rayon * math.cos(math.radians(angle)), 48 + rayon * math.sin(math.radians(angle))
        assert alpha.getpixel((round(x), round(y))) >= 200, angle                         # plein tout autour
    lettres = [alpha.getpixel((round(48 + 37 * math.cos(math.radians(a))), round(48 + 37 * math.sin(math.radians(a)))))
               for a in range(200, 340)]                                                  # bande de CLAMART
    assert min(lettres) < 60 and max(lettres) > 200                                       # lettres en creux dans le plein
    assert alpha.getpixel((48, 48 + 12)) < 60                                             # fond clair autour du joueur, en creux


def test_les_fichiers_livres_correspondent_au_generateur():
    for chemin, genere in (
        (icones_app.LOGO_ROND, icones_app.logo_rond()),
        (icones_app.ICONE, icones_app.icone()),
        (icones_app.PREMIER_PLAN, icones_app.premier_plan()),
        (icones_app.MONOCHROME, icones_app.monochrome()),
        *((icones_app.NOTIFICATION / f"{d}.png", icones_app.notification(t)) for d, t in icones_app.TAILLES_NOTIFICATION.items()),
    ):
        with Image.open(chemin) as livre:
            assert livre.size == genere.size
            assert livre.convert("RGBA").tobytes() == genere.convert("RGBA").tobytes(), chemin.name
