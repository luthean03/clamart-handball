import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { club } from '../../test/donnees';
import { contenuDuBouton } from '../../test/boutons';
import { rendu } from '../../test/rendu';
import { themeClair } from '../theme/theme';
import { VueBienvenue } from './VueBienvenue';

test('choisir ses équipes puis continuer', () => {
  const onTerminer = jest.fn();
  rendu(<VueBienvenue club={club} onTerminer={onTerminer} onPasser={jest.fn()} />);
  expect(screen.getByText('Bienvenue au Clamart Handball')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Seniors F 1'));
  fireEvent.press(screen.getByText('U13 M'));
  fireEvent.press(screen.getByText('Continuer (2)'));
  expect(onTerminer).toHaveBeenCalledWith(['seniors-f-1', 'u13-m']);
});

test('une deuxième pression retire l’équipe', () => {
  const onTerminer = jest.fn();
  rendu(<VueBienvenue club={club} onTerminer={onTerminer} onPasser={jest.fn()} />);
  fireEvent.press(screen.getByText('U18 F'));
  fireEvent.press(screen.getByText('U18 F'));
  fireEvent.press(screen.getByText('Continuer'));
  expect(onTerminer).toHaveBeenCalledWith([]);
});

test('passer', () => {
  const onPasser = jest.fn();
  rendu(<VueBienvenue club={club} onTerminer={jest.fn()} onPasser={onPasser} />);
  fireEvent.press(screen.getByText('Passer'));
  expect(onPasser).toHaveBeenCalled();
});

test('chaque équipe a une cible tactile d’au moins 48 dp', () => {
  rendu(<VueBienvenue club={club} onTerminer={jest.fn()} onPasser={jest.fn()} />);
  const style = StyleSheet.flatten(screen.getByRole('checkbox', { name: 'Seniors F 1' }).props.style);
  expect(style.minHeight ?? style.height).toBeGreaterThanOrEqual(48);
});

describe('bord à bord', () => {
  afterEach(() => jest.restoreAllMocks());

  test('une protection de barre d’état fixe, de la hauteur de l’encart, au-dessus du contenu défilant', () => {
    jest.spyOn(require('react-native-safe-area-context'), 'useSafeAreaInsets').mockReturnValue({ top: 32, bottom: 0, left: 0, right: 0 });
    rendu(<VueBienvenue club={club} onTerminer={jest.fn()} onPasser={jest.fn()} />);
    const style = StyleSheet.flatten(screen.getByTestId('protection-barre-etat').props.style);
    expect(style.height).toBe(32);
    expect(style.backgroundColor).toBe(themeClair.colors.background);
  });
});

test('les boutons de bienvenue ont une zone tactile d’au moins 48 dp (hauteur minimale sur le contenu)', () => {
  rendu(<VueBienvenue club={club} onTerminer={jest.fn()} onPasser={jest.fn()} />);
  for (const bouton of screen.getAllByTestId('button')) expect(contenuDuBouton(bouton).minHeight).toBeGreaterThanOrEqual(48);
  expect(screen.getAllByTestId('button')).toHaveLength(2);
});
