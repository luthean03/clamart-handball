import collecte

R = {"structure1Logo": "2023-08-30-aaa.png", "equipe1ShowLogo": "1",
     "structure2Logo": "2024-06-13-bbb.png", "equipe2ShowLogo": "1"}


def test_logo_de_l_adversaire_selon_le_cote():
    assert collecte.logo_adversaire(R, domicile=True) == "https://media-logos-clubs.ffhandball.fr/128/2024-06-13-bbb.webp"
    assert collecte.logo_adversaire(R, domicile=False) == "https://media-logos-clubs.ffhandball.fr/128/2023-08-30-aaa.webp"


def test_pas_de_logo_quand_la_ffhb_ne_l_affiche_pas():
    assert collecte.logo_adversaire({**R, "equipe2ShowLogo": "0"}, domicile=True) is None
    assert collecte.logo_adversaire({**R, "structure2Logo": None}, domicile=True) is None
    assert collecte.logo_adversaire({}, domicile=True) is None


def test_valeur_d_affichage_booleenne_acceptee():
    assert collecte.logo_adversaire({**R, "equipe2ShowLogo": True}, domicile=True) is not None
