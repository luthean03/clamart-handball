import { screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { rendu } from '../../test/rendu';
import { BarreOnglets } from './BarreOnglets';

const routes = [
  { key: 'accueil', name: 'index' },
  { key: 'matchs', name: 'matchs' },
];

function barre() {
  const props = {
    state: { index: 0, routes, key: 'tabs', routeNames: ['index', 'matchs'], type: 'tab', stale: false, history: [], preloadedRouteKeys: [] },
    descriptors: {
      accueil: { options: { title: 'Accueil' } },
      matchs: { options: { title: 'Matchs' } },
    },
    navigation: { emit: jest.fn(() => ({ defaultPrevented: false })), dispatch: jest.fn() },
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as unknown as BottomTabBarProps;
  return rendu(<BarreOnglets {...props} />);
}

test('les libellés des onglets suivent la taille de police de l’appareil, avec un plafond', () => {
  barre();
  for (const libelle of ['Accueil', 'Matchs']) {
    // Paper fige les libellés à 1 par défaut (aucun agrandissement) : on le relève.
    for (const texte of screen.getAllByText(libelle)) {
      expect(texte.props.maxFontSizeMultiplier).toBeGreaterThan(1);
      expect(texte.props.maxFontSizeMultiplier).toBeLessThanOrEqual(2);
    }
  }
});
