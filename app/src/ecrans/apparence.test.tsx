import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet, useColorScheme } from 'react-native';
import { rendu } from '../../test/rendu';
import { FournisseurTheme } from '../theme/FournisseurTheme';
import { themeClair, themeSombre } from '../theme/theme';
import { useSuivi } from '../suivi/suivi';
import Reglages from '../app/reglages';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: jest.fn(() => 'light') }));
jest.mock('../donnees/maintenant', () => ({ useMaintenant: () => new Date('2026-10-13T19:05:00+02:00') }));
jest.mock('../donnees/requetes', () => ({
  useClub: () => ({ club: require('../../test/donnees').club, chargement: false, erreur: null, rafraichir: jest.fn() }),
}));
jest.mock('../notifications/fcm', () => ({ demanderAutorisation: jest.fn(() => Promise.resolve('accordee')) }));

/** La page Réglages, rendue avec le thème choisi (comme la racine de l'app). */
function ecran(appareil: 'light' | 'dark', apparence: 'auto' | 'clair' | 'sombre') {
  jest.mocked(useColorScheme).mockReturnValue(appareil);
  useSuivi.setState({ apparence });
  rendu(<FournisseurTheme><Reglages /></FournisseurTheme>);
}

const fond = () => StyleSheet.flatten(screen.getByTestId('page-reglages').props.style).backgroundColor;

beforeEach(() => useSuivi.setState({ apparence: 'auto' }));

test('apparence Sombre : palette sombre même si le téléphone est clair', () => {
  ecran('light', 'auto');
  expect(fond()).toBe(themeClair.colors.background);
  fireEvent.press(screen.getByRole('radio', { name: 'Sombre' }));
  expect(useSuivi.getState().apparence).toBe('sombre');
  expect(screen.getByRole('radio', { name: 'Sombre' })).toBeChecked();
  expect(fond()).toBe(themeSombre.colors.background);
});

test('apparence Clair : palette claire même si le téléphone est sombre', () => {
  ecran('dark', 'auto');
  expect(fond()).toBe(themeSombre.colors.background);
  fireEvent.press(screen.getByRole('radio', { name: 'Clair' }));
  expect(useSuivi.getState().apparence).toBe('clair');
  expect(fond()).toBe(themeClair.colors.background);
});

test('apparence Appareil : suit le téléphone', () => {
  ecran('dark', 'clair');
  fireEvent.press(screen.getByRole('radio', { name: 'Appareil, comme le réglage du téléphone' }));
  expect(useSuivi.getState().apparence).toBe('auto');
  expect(screen.getByRole('radio', { name: 'Appareil, comme le réglage du téléphone' })).toBeChecked();
  expect(fond()).toBe(themeSombre.colors.background);
});
