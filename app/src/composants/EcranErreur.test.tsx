import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet, useColorScheme } from 'react-native';
import { contenuDuBouton } from '../../test/boutons';
import { themeClair, themeSombre } from '../theme/theme';
import { EcranErreur } from './EcranErreur';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: jest.fn(() => 'light') }));

jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));

const erreur = new Error('boom technique');

test('écran d’erreur : message en français et bouton Réessayer qui relance la route', async () => {
  const retry = jest.fn(() => Promise.resolve());
  render(<EcranErreur error={erreur} retry={retry} />);
  expect(screen.getByText('Un problème est survenu')).toBeOnTheScreen();
  expect(screen.queryByText(/boom/)).toBeNull(); // pas de message technique à l'écran
  const bouton = screen.getByRole('button', { name: 'Réessayer' });
  expect(contenuDuBouton(bouton).minHeight).toBeGreaterThanOrEqual(48);
  fireEvent.press(screen.getByText('Réessayer'));
  await waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
});

test('écran d’erreur : couleurs du thème clair, puis du thème sombre (hors du fournisseur de thème)', () => {
  render(<EcranErreur error={erreur} retry={jest.fn(() => Promise.resolve())} />);
  expect(StyleSheet.flatten(screen.getByTestId('ecran-erreur').props.style).backgroundColor).toBe(themeClair.colors.background);
  screen.unmount();
  jest.mocked(useColorScheme).mockReturnValue('dark');
  render(<EcranErreur error={erreur} retry={jest.fn(() => Promise.resolve())} />);
  expect(StyleSheet.flatten(screen.getByTestId('ecran-erreur').props.style).backgroundColor).toBe(themeSombre.colors.background);
});

test('la route racine exporte cet écran comme ErrorBoundary', () => {
  const racine = require('../app/_layout') as { ErrorBoundary?: unknown };
  expect(racine.ErrorBoundary).toBe(EcranErreur);
});
