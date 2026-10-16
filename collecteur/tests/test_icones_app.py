import icones_app


def test_logo_rond_est_un_disque_transparent_et_stable():
    img = icones_app.logo_rond()
    assert img.size == (512, 512) and img.mode == "RGBA"
    assert img.getpixel((0, 0))[3] == 0 and img.getpixel((511, 511))[3] == 0   # coins hors du disque
    assert img.getpixel((256, 256))[3] == 255                                   # centre opaque
    assert img.tobytes() == icones_app.logo_rond().tobytes()                    # déterministe


def test_le_fichier_livre_correspond_au_generateur():
    from PIL import Image

    with Image.open(icones_app.LOGO_ROND) as livre:
        assert livre.convert("RGBA").tobytes() == icones_app.logo_rond().tobytes()
