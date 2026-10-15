import { StyleSheet } from 'react-native';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { club, MAR_SOIR } from '../../test/donnees';
import { contenuDuBouton } from '../../test/boutons';
import { rendu } from '../../test/rendu';
import { themeClair, themeSombre } from '../theme/theme';
import { VueAccueil, type PropsAccueil } from './VueAccueil';

function accueil(props: Partial<PropsAccueil> = {}) {
  const p: PropsAccueil = {
    club, maintenant: MAR_SOIR, suivis: ['seniors-f-1', 'seniors-m'], horsLigne: false, majRequise: false, rafraichissement: false,
    rafraichir: jest.fn(), onOuvrirEquipe: jest.fn(), onOuvrirMatch: jest.fn(), onAgenda: jest.fn(),
    onReglages: jest.fn(), onChoisirEquipes: jest.fn(), ...props,
  };
  rendu(<VueAccueil {...p} />);
  return p;
}

test('en-tête : salutation, week-end et heure de mise à jour', () => {
  accueil();
  expect(screen.getByText('Bonsoir !')).toBeOnTheScreen();
  expect(screen.getByText('Week-end du 10–11 oct. · mis à jour à 16:41')).toBeOnTheScreen();
});

test('mes équipes : le résultat raconté en une phrase', () => {
  const p = accueil();
  expect(screen.getByText('Victoire contre Ent. Suresnes / Nanterre')).toBeOnTheScreen();
  expect(screen.getByText('3e victoire de suite')).toBeOnTheScreen();
  expect(screen.getByText("Défaite d'un but contre Levallois SC 1D")).toBeOnTheScreen();
  expect(screen.getByText('32–22')).toBeOnTheScreen();
  expect(screen.getByText('3e sur 11')).toBeOnTheScreen();
  fireEvent.press(screen.getAllByText('Voir le match')[0]);
  expect(p.onOuvrirMatch).toHaveBeenCalledWith('2644292');
  fireEvent.press(screen.getByText('Victoire contre Ent. Suresnes / Nanterre'));
  expect(p.onOuvrirEquipe).toHaveBeenCalledWith('seniors-f-1');
});

test('carte d’équipe : le nom de l’équipe en titre, sans surtitre, avec la place à côté', () => {
  accueil();
  const nom = screen.getByText('Seniors F 1');
  expect(nom.props.children).toBe('Seniors F\u00A01');
  expect(nom).toHaveProp('android_hyphenationFrequency', 'none');
  expect(nom).toHaveProp('textBreakStrategy', 'simple');
  expect(screen.queryByText(/Seniors F 1 · /)).toBeNull();
  expect(screen.getByText('3e sur 11').props.children).toBe('3e\u00A0sur\u00A011');
  // le titre et le rang sont dans la même rangée d'en-tête, avant la phrase
  const entete = screen.getAllByTestId('entete-carte')[0];
  expect(within(entete).getByText('Seniors F 1')).toBeOnTheScreen();
  expect(within(entete).getByText('3e sur 11')).toBeOnTheScreen();
  expect(within(entete).queryByText(/Victoire/)).toBeNull();
});

test('carte d’équipe : date, salle et domicile ou extérieur sous la phrase', () => {
  accueil();
  expect(screen.getAllByText(/^dimanche 11 oct\. · .* · domicile$/)).toHaveLength(2); // Seniors F 1 et Seniors M
});

test('carte d’équipe : le libellé lu contient l’équipe, la phrase, la série, le score et la date', () => {
  accueil();
  expect(
    screen.getByLabelText('Seniors F 1, Victoire contre Ent. Suresnes / Nanterre, 3e victoire de suite, 32 à 22, dimanche 11 oct.'),
  ).toBeOnTheScreen();
});

test('carte d’équipe : le nom de l’adversaire peut tenir sur trois lignes', () => {
  accueil({ maintenant: new Date('2026-10-14T12:00:00+02:00'), suivis: ['seniors-m'] });
  expect(screen.getByText('Contre Association Sportive St-Cyr/Fontenay Handball 78')).toHaveProp('numberOfLines', 3);
});

test('match à venir : le dernier résultat est rappelé sous la date', () => {
  accueil({ maintenant: new Date('2026-10-14T12:00:00+02:00'), suivis: ['seniors-f-1', 'seniors-m'] });
  expect(screen.getByText('Dernier match : Victoire contre Ent. Suresnes / Nanterre, 32–22')).toBeOnTheScreen();
  expect(screen.getByText("Dernier match : Défaite d'un but contre Levallois SC 1D, 21–22")).toBeOnTheScreen();
});

test('match à venir sans résultat passé : pas de ligne « Dernier match »', () => {
  accueil({ maintenant: new Date('2026-09-10T12:00:00+02:00'), suivis: ['seniors-f-1'] });
  expect(screen.queryByText(/Dernier match/)).toBeNull();
});

test('un résultat déjà affiché n’est pas répété en « Dernier match »', () => {
  accueil();
  expect(screen.queryByText(/Dernier match/)).toBeNull();
});

test('tout le club ce week-end : 11 matchs', () => {
  accueil();
  expect(screen.getByText('11 matchs')).toBeOnTheScreen();
  expect(screen.getAllByTestId('ligne-match')).toHaveLength(11);
});

test('aucune équipe suivie : invitation à choisir', () => {
  const p = accueil({ suivis: [] });
  fireEvent.press(screen.getByText('Choisir mes équipes'));
  expect(p.onChoisirEquipes).toHaveBeenCalled();
});

test('ignore une équipe suivie absente des données', () => {
  accueil({ suivis: ['equipe-disparue', 'seniors-m'] });
  expect(screen.getByText("Défaite d'un but contre Levallois SC 1D")).toBeOnTheScreen();
});

test('match à venir : ajouter à l’agenda', () => {
  const p = accueil({ maintenant: new Date('2026-10-14T12:00:00+02:00'), suivis: ['seniors-m'] });
  expect(screen.getByText('Contre Association Sportive St-Cyr/Fontenay Handball 78')).toBeOnTheScreen();
  expect(screen.getAllByText('18:00').length).toBeGreaterThan(0); // carte + liste du club
  fireEvent.press(screen.getByText("Ajouter à l'agenda"));
  expect(p.onAgenda).toHaveBeenCalledWith(expect.objectContaining({ id: '2734038' }));
});

test('hors saison : pas de match', () => {
  accueil({ maintenant: new Date('2027-07-01T12:00:00+02:00'), suivis: ['seniors-f-1'] });
  expect(screen.getByText('Pas de match ce week-end')).toBeOnTheScreen();
  expect(screen.getByText('Aucun match programmé pour le moment')).toBeOnTheScreen();
  expect(screen.getByText('Aucun match au club ce week-end.')).toBeOnTheScreen();
});

test('hors ligne et réglages', () => {
  const p = accueil({ horsLigne: true });
  expect(screen.getByText('Hors ligne · résultats mis à jour à 16:41')).toBeOnTheScreen();
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
  accueil({ maintenant: new Date('2026-10-14T12:00:00+02:00'), suivis: ['seniors-m'] });
  expect(contenuDuBouton(screen.getByText("Ajouter à l'agenda")).minHeight).toBeGreaterThanOrEqual(48);
  screen.unmount();
  accueil();
  for (const voir of screen.getAllByText('Voir le match')) expect(contenuDuBouton(voir).minHeight).toBeGreaterThanOrEqual(48);
  screen.unmount();
  accueil({ suivis: [] });
  expect(contenuDuBouton(screen.getByText('Choisir mes équipes')).minHeight).toBeGreaterThanOrEqual(48);
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
    rendu(<VueAccueil {...({ club, maintenant: MAR_SOIR, suivis: [], horsLigne: false, majRequise: false, rafraichissement: false, rafraichir: jest.fn(), onOuvrirEquipe: jest.fn(), onOuvrirMatch: jest.fn(), onAgenda: jest.fn(), onReglages: jest.fn(), onChoisirEquipes: jest.fn() } as PropsAccueil)} />, themeSombre);
    expect(StyleSheet.flatten(screen.getByTestId('protection-barre-etat').props.style).backgroundColor).toBe(themeSombre.colors.background);
  });
});

test('mise à jour requise : le bandeau de l’Accueil demande la mise à jour de l’app', () => {
  accueil({ majRequise: true, horsLigne: false });
  expect(screen.getByText("Une nouvelle version de l'app est nécessaire pour voir les derniers résultats.")).toBeOnTheScreen();
  expect(screen.getByText('Mettre à jour')).toBeOnTheScreen();
});
