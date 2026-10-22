import io

from PIL import Image

import banderole


def faux_png(couleur="#00AA00") -> bytes:
    tampon = io.BytesIO()
    Image.new("RGBA", (128, 128), couleur).save(tampon, "PNG")
    return tampon.getvalue()


def test_dimensions_et_mode():
    img = banderole.dessiner(banderole.ecusson_club(), banderole.monogramme("LS"), "Clamart", "Levallois SC 1D",
                             "21 – 22", "Seniors M · D2 territoriale")
    assert img.size == (1024, 512) and img.mode == "RGB"
    assert img.getpixel((512, 5)) == (219, 0, 0)          # bandeau de date rouge
    assert img.getpixel((512, 480)) == (250, 246, 230)    # fond crème de l'app


def _rouge_sous_le_score(victoire):
    img = banderole.dessiner(banderole.ecusson_club(), banderole.monogramme("LS"), "Clamart", "Levallois SC 1D",
                             "25 – 22", "Seniors M · D2 territoriale", victoire)
    zone = img.crop((380, 300, 644, 345)).convert("RGB")
    return zone.tobytes().count(bytes((219, 0, 0)))


def test_victoire_ajoute_le_libelle_rouge():
    assert _rouge_sous_le_score(True) > 100
    assert _rouge_sous_le_score(False) == 0


def test_ecusson_du_club_detoure_en_disque():
    e = banderole.ecusson_club()
    assert e.mode == "RGBA" and e.getpixel((0, 0))[3] == 0   # coin transparent : plus de carré rouge


def test_nom_long_tient_dans_300_px():
    texte, taille = banderole.ajuster("Association Sportive St-Cyr/Fontenay Handball 78", 300)
    assert banderole.police(700, taille).getlength(texte) <= 300
    assert 22 <= taille <= 30
    assert banderole.ajuster("Clamart", 300) == ("Clamart", 30)


def test_ecusson_adversaire_monogramme_sans_logo(tmp_path):
    appels = []
    img = banderole.ecusson_adversaire(None, "Ent. Suresnes / Nanterre", tmp_path, telecharger=lambda u: appels.append(u))
    assert appels == [] and img.size == (256, 256)


def test_ecusson_adversaire_echec_de_telechargement(tmp_path):
    def echoue(url):
        raise OSError("réseau")
    img = banderole.ecusson_adversaire("https://x/128/a.webp", "Levallois SC 1D", tmp_path, telecharger=echoue)
    assert img.size == (256, 256)


def test_ecusson_adversaire_mis_en_cache(tmp_path):
    appels = []
    def telecharger(url):
        appels.append(url)
        return faux_png()
    for _ in range(2):
        banderole.ecusson_adversaire("https://x/128/a.webp", "Levallois SC 1D", tmp_path, telecharger=telecharger)
    assert appels == ["https://x/128/a.webp"]
    assert (tmp_path / "a.webp").exists()


def test_ecusson_du_club_bord_lisse_et_anneau_blanc_complet():
    """Le disque garde l'anneau blanc d'origine sur tout le tour, avec un bord adouci (pas d'escalier de pixels)."""
    import math
    e = banderole.ecusson_club()
    assert e.width >= 1024                                     # grande résolution : les réductions restent nettes
    c, r = e.width / 2, e.width / 2
    demi_transparents = 0
    for angle in range(0, 360, 3):
        a = math.radians(angle)
        bord = e.getpixel((round(c + (r - 1.5) * math.cos(a)), round(c + (r - 1.5) * math.sin(a))))
        anneau = e.getpixel((round(c + r * 0.985 * math.cos(a)), round(c + r * 0.985 * math.sin(a))))
        assert anneau[3] == 255 and min(anneau[:3]) >= 235, (angle, anneau)   # anneau blanc, jamais rouge ni rose
        assert not (bord[0] - bord[1] > 60 and bord[3] > 40), (angle, bord)     # pas de liseré rouge au bord
        if 0 < bord[3] < 255:
            demi_transparents += 1
    assert demi_transparents > 30                              # bord anti-crénelé
