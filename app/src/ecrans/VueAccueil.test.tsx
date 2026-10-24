import { Dimensions, StyleSheet } from 'react-native';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { club } from '../../test/donnees';
import { prochainMatchDate } from '../donnees/selecteurs';
import { contenuDuBouton } from '../../test/boutons';
import { rendu } from '../../test/rendu';
import { POLICES, themeClair, themeSombre } from '../theme/theme';
import { VueAccueil, type PropsAccueil } from './VueAccueil';

/** Vendredi 16 oct. 2026, 11 h 30 : le prochain match de Seniors F 1 est dans deux jours. */
const VEN_MATIN = new Date('2026-10-16T11:30:00+02:00');

function propsAccueil(props: Partial<PropsAccueil> = {}): PropsAccueil {
  return {
    club, maintenant: VEN_MATIN, suivis: ['seniors-f-1', 'seniors-m'], horsLigne: false, majRequise: false, rafraichissement: false,
    rafraichir: jest.fn(), onOuvrirMatch: jest.fn(), onAgenda: jest.fn(),
    onReglages: jest.fn(), onChoisirEquipes: jest.fn(), onTousLesMatchs: jest.fn(), ...props,
  };
}

function accueil(props: Partial<PropsAccueil> = {}) {
  const p = propsAccueil(props);
  rendu(<VueAccueil {...p} />);
  return p;
}

/** La première carte de « Mes équipes » : le match le plus proche des équipes suivies. */
const carte1 = () => within(screen.getAllByTestId('carte-equipe')[0]);

test('en-tête : salutation et mise à jour, sans week-end', () => {
  accueil();
  expect(screen.getByText('Bonjour !')).toBeOnTheScreen();
  expect(screen.getByText('Mis à jour mar. 13 oct. à 16:41')).toBeOnTheScreen();
  expect(screen.queryByText(/Week-end/)).toBeNull();
});

test('carte : bandeau de date du prochain match et compte à rebours', () => {
  accueil({ suivis: ['seniors-f-1'] });
  expect(screen.getByText('Dim. 18 octobre')).toBeOnTheScreen();
  expect(screen.queryByText('Dim. 18 octobre · 15:30')).toBeNull();
  expect(screen.getByText('dans 2 jours')).toBeOnTheScreen();
  expect(screen.getByText('Coupe de France départementale')).toBeOnTheScreen();
  expect(within(carte1().getByTestId('colonne-adversaire')).getByText('Cellois HB')).toBeOnTheScreen();
  expect(screen.getByText('Victor Hugo · extérieur')).toBeOnTheScreen();
});

test('carte : l’heure du coup d’envoi s’affiche sous le VS, pas dans le bandeau', () => {
  accueil({ suivis: ['seniors-m'] });
  expect(carte1().getByTestId('heure-match')).toHaveTextContent('18:00');
  expect(carte1().getByText('VS')).toBeOnTheScreen();
  expect(within(carte1().getByTestId('bandeau-date')).queryByText(/18:00/)).toBeNull();
});

test('carte : le match du lendemain est « demain »', () => {
  accueil({ suivis: ['seniors-m'] });
  expect(screen.getByText('Sam. 17 octobre')).toBeOnTheScreen();
  expect(screen.getByText('demain')).toBeOnTheScreen();
  expect(within(carte1().getByTestId('colonne-adversaire')).getByText('Association Sportive St-Cyr/Fontenay Handball 78')).toHaveProp('numberOfLines', 2);
});

test('carte : le jour du match, après le coup d’envoi, la carte garde ce match et dit « aujourd’hui »', () => {
  accueil({ maintenant: new Date('2026-10-17T19:00:00+02:00'), suivis: ['seniors-m'] });
  expect(screen.getByText('Sam. 17 octobre')).toBeOnTheScreen();
  expect(screen.getByText('aujourd’hui')).toBeOnTheScreen();
  expect(within(carte1().getByTestId('colonne-adversaire')).getByText('Association Sportive St-Cyr/Fontenay Handball 78')).toBeOnTheScreen();
});

test('carte : pas de classement pour une coupe, classement pour un championnat', () => {
  accueil({ suivis: ['seniors-f-1'] });
  expect(carte1().queryByText(/sur \d+/)).toBeNull();
  screen.unmount();
  accueil({ suivis: ['u18-f'] });
  expect(screen.getByText('Sam. 7 novembre')).toBeOnTheScreen();
  expect(screen.getByText('dans 22 jours')).toBeOnTheScreen();
  expect(screen.getByText('4e sur 6').props.children).toBe('4e sur 6');
  expect(within(carte1().getByTestId('colonne-club')).getByText('Clamart U18 F')).toBeOnTheScreen();
});

test('carte : le nom de l’équipe sous l’écusson du club, sans coupure ni césure', () => {
  accueil({ suivis: ['seniors-f-1'] });
  const nom = within(carte1().getByTestId('colonne-club')).getByText('Clamart Seniors F 1');
    expect(nom).toHaveProp('numberOfLines', 2);
  expect(nom).toHaveProp('android_hyphenationFrequency', 'none');
  expect(nom).toHaveProp('textBreakStrategy', 'simple');
});

test('carte : plus de « Dernier match », la forme reste', () => {
  accueil();
  expect(screen.queryByText(/Dernier match/)).toBeNull();
  expect(screen.getAllByLabelText(/^Forme : /).length).toBeGreaterThan(0);
  expect(screen.getAllByLabelText('Forme : victoire, défaite, victoire, victoire, victoire').length).toBeGreaterThan(0);
});

test('carte : le libellé lu contient la date, l’équipe, l’adversaire, la compétition, la salle, le classement, la forme et le rang', () => {
  accueil({ suivis: ['u18-f'] });
  expect(
    screen.getByLabelText(
      /^samedi 7 nov\. à 18:30, dans 22 jours, Stade Francais contre Clamart U18 F, Championnat, Stade Pierre de Coubertin, extérieur, 4e sur 6, (forme : [a-zé ,]+, )?carte 1 sur 1, ouvre le match$/,
    ),
  ).toBeOnTheScreen();
  screen.unmount();
  accueil({ suivis: ['seniors-f-1'] });
  expect(
    screen.getByLabelText(/^dimanche 18 oct\. à 15:30, dans 2 jours, Cellois HB contre Clamart Seniors F 1, Coupe de France départementale, Victor Hugo, extérieur, (forme : [a-zé ,]+, )?carte 1 sur 2, ouvre le match$/),
  ).toBeOnTheScreen();
});

test('carte : toucher la carte ouvre la fiche du match, avec son équipe', () => {
  const p = accueil({ suivis: ['seniors-f-1'] });
  fireEvent.press(within(carte1().getByTestId('colonne-adversaire')).getByText('Cellois HB'));
  const m = prochainMatchDate(club, 'seniors-f-1', VEN_MATIN)!;
  expect(p.onOuvrirMatch).toHaveBeenCalledWith(m.id, m.equipe.id);
});

test('carte : l’écusson de l’adversaire est celui de la FFHB, sinon ses initiales', () => {
  accueil({ suivis: ['seniors-f-1'] });
  expect(within(carte1().getByTestId('colonne-adversaire')).getByTestId('monogramme', { includeHiddenElements: true })).toBeOnTheScreen();
  screen.unmount();
  const avecLogo = structuredClone(club);
  for (const m of avecLogo.equipes.flatMap((e) => e.matchs)) m.logo_adversaire = 'https://exemple.test/ecusson.webp';
  accueil({ club: avecLogo, suivis: ['seniors-f-1'] });
  expect(within(carte1().getByTestId('colonne-adversaire')).getByTestId('ecusson-image')).toBeOnTheScreen();
});

test('sans prochain match daté, l’équipe suivie n’a pas de carte', () => {
  accueil({ maintenant: new Date('2027-07-01T12:00:00+02:00'), suivis: ['seniors-f-1'] });
  expect(screen.queryByText('Clamart Seniors F 1')).toBeNull();
  expect(screen.queryByText(/Aucun match programmé/)).toBeNull();
  expect(screen.queryByLabelText(/^Forme : /)).toBeNull();
  expect(screen.getByText('Aucun match à venir au club.')).toBeOnTheScreen();
});

test('sans prochain match pour aucune équipe suivie, toute la section « Mes équipes » disparaît', () => {
  accueil({ maintenant: new Date('2027-07-01T12:00:00+02:00'), suivis: ['seniors-f-1', 'seniors-m'] });
  expect(screen.queryByText('Mes équipes')).toBeNull();
  expect(screen.queryByText('Choisir mes équipes')).toBeNull();
  expect(screen.getByText('Tout le club')).toBeOnTheScreen();
});

test('une équipe suivie sans match est omise, les autres gardent leur carte sous l’en-tête', () => {
  const sansMatch = structuredClone(club);
  for (const e of sansMatch.equipes.filter((x) => x.collectif === 'seniors-m')) e.matchs = [];
  accueil({ club: sansMatch, suivis: ['seniors-m', 'seniors-f-1'] });
  expect(screen.getByText('Mes équipes')).toBeOnTheScreen();
  // Seniors F 1 garde ses deux prochains matchs ; aucune carte pour Seniors M
  expect(screen.getAllByTestId('bandeau-date')).toHaveLength(2);
  for (const c of screen.getAllByTestId('colonne-club')) expect(within(c).getByText('Clamart Seniors F 1')).toBeOnTheScreen();
});

test('tout le club : 5 prochains matchs avec leur date, puis « Tous les matchs »', () => {
  const p = accueil({ suivis: [] });
  expect(screen.getByText('Tout le club')).toBeOnTheScreen();
  expect(screen.queryByText(/ce week-end/)).toBeNull();
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(5);
  expect(screen.getByText('17/10')).toBeOnTheScreen();
  expect(screen.getByText('18/10')).toBeOnTheScreen();
  fireEvent.press(screen.getAllByTestId('ligne-match')[0]);
  expect(p.onOuvrirMatch).toHaveBeenCalledWith('2734038', '33244-clamart-handball');
  fireEvent.press(screen.getByText('Tous les matchs'));
  expect(p.onTousLesMatchs).toHaveBeenCalled();
});

test('tout le club n’est jamais filtré par les équipes suivies', () => {
  accueil({ suivis: ['u18-f'] });
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(5);
});

test('plus de week-end dans l’en-tête', () => {
  accueil();
  expect(screen.queryByText(/Week-end/)).toBeNull();
});

test('aucune équipe suivie : invitation à choisir', () => {
  const p = accueil({ suivis: [] });
  fireEvent.press(screen.getByText('Choisir mes équipes'));
  expect(p.onChoisirEquipes).toHaveBeenCalled();
});

test('ignore une équipe suivie absente des données', () => {
  accueil({ suivis: ['equipe-disparue', 'seniors-m'] });
  expect(screen.getByText('Sam. 17 octobre')).toBeOnTheScreen();
  expect(screen.getAllByTestId('bandeau-date')).toHaveLength(3);
});

test('match à venir : ajouter à l’agenda', () => {
  const p = accueil({ suivis: ['seniors-m'] });
  fireEvent.press(carte1().getByText("Ajouter à l'agenda"));
  expect(p.onAgenda).toHaveBeenCalledWith(expect.objectContaining({ id: '2734038' }));
});

test('hors ligne et réglages', () => {
  const p = accueil({ horsLigne: true });
  expect(screen.getByText('Hors ligne · résultats mis à jour mar. 13 oct. à 16:41')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Réglages'));
  expect(p.onReglages).toHaveBeenCalled();
});

test('le bouton Réglages a une cible tactile de 48 dp', () => {
  accueil();
  const style = StyleSheet.flatten(screen.getByTestId('icon-button-container-outer-layer').props.style);
  expect(style.width).toBeGreaterThanOrEqual(48);
  expect(style.height).toBeGreaterThanOrEqual(48);
});

test('les boutons de l’Accueil ont une zone tactile d’au moins 48 dp (hauteur minimale sur le contenu)', () => {
  accueil({ suivis: ['seniors-m'] });
  expect(contenuDuBouton(carte1().getByText("Ajouter à l'agenda")).minHeight).toBeGreaterThanOrEqual(48);
  expect(contenuDuBouton(screen.getByText('Tous les matchs')).minHeight).toBeGreaterThanOrEqual(48);
  screen.unmount();
  accueil({ suivis: [] });
  expect(contenuDuBouton(screen.getByText('Choisir mes équipes')).minHeight).toBeGreaterThanOrEqual(48);
});

test('le bandeau de date prend les couleurs du thème, clair puis sombre', () => {
  accueil({ suivis: ['seniors-m'] });
  expect(StyleSheet.flatten(carte1().getByTestId('bandeau-date').props.style).backgroundColor).toBe(themeClair.club.bandeau.fond);
  expect(StyleSheet.flatten(screen.getByText('demain').props.style).color).toBe(themeClair.club.bandeau.doux);
  expect(StyleSheet.flatten(screen.getByText('demain').props.style).fontFamily).toBe(POLICES.gras);
  screen.unmount();
  rendu(<VueAccueil {...propsAccueil({ suivis: ['seniors-m'] })} />, themeSombre);
  expect(StyleSheet.flatten(carte1().getByTestId('bandeau-date').props.style).backgroundColor).toBe(themeSombre.club.bandeau.fond);
  expect(StyleSheet.flatten(screen.getByText('Sam. 17 octobre').props.style).color).toBe(themeSombre.club.bandeau.texte);
});

describe('bord à bord', () => {
  afterEach(() => jest.restoreAllMocks());

  test('une protection de barre d’état fixe, de la hauteur de l’encart, au-dessus du contenu défilant', () => {
    jest.spyOn(require('react-native-safe-area-context'), 'useSafeAreaInsets').mockReturnValue({ top: 32, bottom: 0, left: 0, right: 0 });
    accueil();
    const garde = screen.getByTestId('protection-barre-etat');
    const style = StyleSheet.flatten(garde.props.style);
    expect(style.height).toBe(32);
    expect(style.backgroundColor).toBe(themeClair.colors.background);
    // le contenu défilant ne commence qu'en dessous : il n'ajoute plus l'encart à son propre remplissage
    const liste = screen.getByTestId('defilement-accueil');
    expect(StyleSheet.flatten(liste.props.contentContainerStyle).paddingTop).toBeLessThan(32);
  });

  test('la protection prend la couleur du thème sombre', () => {
    jest.spyOn(require('react-native-safe-area-context'), 'useSafeAreaInsets').mockReturnValue({ top: 24, bottom: 0, left: 0, right: 0 });
    rendu(<VueAccueil {...propsAccueil({ suivis: [] })} />, themeSombre);
    expect(StyleSheet.flatten(screen.getByTestId('protection-barre-etat').props.style).backgroundColor).toBe(themeSombre.colors.background);
  });
});

test('mise à jour requise : le bandeau de l’Accueil demande la mise à jour de l’app', () => {
  accueil({ majRequise: true, horsLigne: false });
  expect(screen.getByText("Une nouvelle version de l'app est nécessaire pour voir les derniers résultats.")).toBeOnTheScreen();
  expect(screen.getByText('Mettre à jour')).toBeOnTheScreen();
});

const datesDesCartes = () =>
  screen.getAllByTestId('bandeau-date').map((n) => within(n).getByText(/^[A-Z][a-zé]{2}\. \d/).props.children);

test('Mes équipes : les 5 prochains matchs des équipes suivies, mêlés par date, le plus proche d’abord', () => {
  accueil({ suivis: ['seniors-f-1', 'seniors-m', 'u18-f'] });
  // 6 matchs à venir pour ces trois équipes : le plus lointain (Seniors M, 27 février) ne tient pas dans les 5
  expect(datesDesCartes()).toEqual(['Sam. 17 octobre', 'Dim. 18 octobre', 'Sam. 7 novembre', 'Dim. 8 novembre', 'Dim. 6 décembre']);
});

test('Mes équipes : une seule équipe suivie montre tous ses prochains matchs (5 au plus), pas seulement le premier', () => {
  accueil({ suivis: ['seniors-m'] });
  expect(datesDesCartes()).toEqual(['Sam. 17 octobre', 'Dim. 6 décembre', 'Sam. 27 février']);
  expect(screen.getAllByTestId('carte-equipe')).toHaveLength(3);
});

describe('carrousel Mes équipes', () => {
  const TROIS = ['seniors-f-1', 'seniors-m', 'u18-f'];
  afterEach(() => jest.useRealTimers());

  test('un point par carte, qui suit la carte affichée, hors du parcours d’accessibilité', () => {
    jest.useFakeTimers();
    accueil({ suivis: TROIS });
    const largeur = Dimensions.get('window').width;
    const pas = Math.round(largeur * 0.85) + 12;
    const largeurs = () => screen.getAllByTestId('point-carrousel', { includeHiddenElements: true }).map((n) => StyleSheet.flatten(n.props.style).width);
    expect(screen.getAllByTestId('point-carrousel', { includeHiddenElements: true })).toHaveLength(5);
    expect(largeurs()[0]).toBeGreaterThan(largeurs()[1]);
    fireEvent.scroll(screen.getByTestId('carrousel-equipes'), { nativeEvent: { contentOffset: { x: pas, y: 0 }, contentSize: { width: 5 * pas, height: 400 }, layoutMeasurement: { width: largeur, height: 400 } } });
    // la liste planifie sa mise à jour de cellules : on la purge ici plutôt que d'empiéter sur le test suivant
    act(() => jest.runOnlyPendingTimers());
    expect(largeurs()[1]).toBeGreaterThan(largeurs()[0]);
    expect(largeurs()[1]).toBeGreaterThan(largeurs()[2]);
    expect(screen.getByTestId('points-carrousel', { includeHiddenElements: true })).toHaveProp('importantForAccessibility', 'no-hide-descendants');
    expect(screen.getByTestId('points-carrousel', { includeHiddenElements: true })).toHaveProp('accessibilityElementsHidden', true);
  });

  test('une seule carte : pleine largeur, pas de points', () => {
    accueil({ suivis: ['u18-f'] });   // un seul match à venir
    expect(screen.queryByTestId('points-carrousel', { includeHiddenElements: true })).toBeNull();
    const largeur = Dimensions.get('window').width;
    expect(StyleSheet.flatten(screen.getByTestId('carte-equipe').props.style).width).toBe(largeur - 32);
  });

  test('plusieurs cartes : environ 85 % de la largeur, accroche à chaque carte', () => {
    accueil({ suivis: TROIS });
    const largeur = Dimensions.get('window').width;
    expect(StyleSheet.flatten(screen.getAllByTestId('carte-equipe')[0].props.style).width).toBe(Math.round(largeur * 0.85));
    const liste = screen.getByTestId('carrousel-equipes');
    expect(liste).toHaveProp('snapToInterval', Math.round(largeur * 0.85) + 12);
    expect(liste).toHaveProp('decelerationRate', 'fast');
    expect(liste).toHaveProp('horizontal', true);
  });

  test('chaque carte annonce son rang : « carte 1 sur 5 »', () => {
    accueil({ suivis: TROIS });
    expect(screen.getByLabelText(/Clamart Seniors M contre .*carte 1 sur 5, ouvre le match$/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/Cellois HB contre Clamart Seniors F 1, .*carte 2 sur 5, ouvre le match$/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/Stade Francais contre Clamart U18 F, .*carte 3 sur 5, ouvre le match$/)).toBeOnTheScreen();
  });

  test('chaque équipe a sa colonne, avec « VS » au centre', () => {
    accueil({ suivis: ['seniors-f-1'] });
    expect(within(carte1().getByTestId('colonne-club')).getByTestId('ecusson-club')).toBeOnTheScreen();
    expect(within(carte1().getByTestId('colonne-adversaire')).getByText('Cellois HB')).toBeOnTheScreen();
    expect(carte1().getByText('VS')).toBeOnTheScreen();
  });

  /** Colonnes d'équipe de la première carte, dans l'ordre de rendu : gauche puis droite. */
  const colonnes = () => carte1().getAllByTestId(/^colonne-/);

  test('match à domicile : Clamart à gauche, l’adversaire à droite', () => {
    accueil({ suivis: ['seniors-m'] });
    expect(colonnes().map((c) => c.props.testID)).toEqual(['colonne-club', 'colonne-adversaire']);
    expect(within(colonnes()[0]).getByText('Clamart Seniors M')).toBeOnTheScreen();
    expect(within(colonnes()[1]).getByText('Association Sportive St-Cyr/Fontenay Handball 78')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^samedi 17 oct\. à 18:00, .*Clamart Seniors M contre Association Sportive St-Cyr\/Fontenay Handball 78, /)).toBeOnTheScreen();
  });

  test('match à l’extérieur : l’adversaire à gauche, Clamart à droite', () => {
    accueil({ suivis: ['seniors-f-1'] });
    expect(colonnes().map((c) => c.props.testID)).toEqual(['colonne-adversaire', 'colonne-club']);
    expect(within(colonnes()[0]).getByText('Cellois HB')).toBeOnTheScreen();
    expect(within(colonnes()[1]).getByText('Clamart Seniors F 1')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^dimanche 18 oct\. à 15:30, .*Cellois HB contre Clamart Seniors F 1, /)).toBeOnTheScreen();
  });
  test('un long nom d’adversaire tient dans une colonne de largeur fixe, sur 2 lignes au plus', () => {
    accueil({ suivis: ['seniors-m'] });
    const nom = within(carte1().getByTestId('colonne-adversaire')).getByText('Association Sportive St-Cyr/Fontenay Handball 78');
    expect(nom).toHaveProp('numberOfLines', 2);
    expect(nom).toHaveProp('ellipsizeMode', 'tail');
    const colonne = StyleSheet.flatten(carte1().getByTestId('colonne-adversaire').props.style);
    expect(colonne.width).toBe(StyleSheet.flatten(carte1().getByTestId('colonne-club').props.style).width);
    expect(colonne.width).toBeGreaterThan(0);
  });

  test('écussons de 56 dp, sur la pastille en mode sombre', () => {
    accueil({ suivis: ['seniors-f-1'] });
    expect(StyleSheet.flatten(within(carte1().getByTestId('colonne-club')).getByTestId('ecusson-club').props.style).width).toBe(56);
    screen.unmount();
    rendu(<VueAccueil {...propsAccueil({ suivis: ['seniors-f-1'] })} />, themeSombre);
    const pastilles = within(carte1().getByTestId('colonne-club')).getAllByTestId('pastille');
    expect(pastilles.length).toBeGreaterThan(0);
    expect(StyleSheet.flatten(pastilles[0].props.style).width).toBe(56);
  });

  test('l’action agenda est un bouton à part qui n’ouvre pas le match', () => {
    const p = accueil({ suivis: TROIS });
    expect(screen.getAllByText("Ajouter à l'agenda")).toHaveLength(5);
    fireEvent.press(screen.getAllByText("Ajouter à l'agenda")[0]);
    expect(p.onAgenda).toHaveBeenCalledWith(expect.objectContaining({ id: '2734038' }));
    expect(p.onOuvrirMatch).not.toHaveBeenCalled();
  });

});
