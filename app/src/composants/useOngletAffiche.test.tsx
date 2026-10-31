import { renderHook } from '@testing-library/react-native';
import { useRoute } from 'expo-router';
import { useNavigationState } from 'expo-router/react-navigation';
import { useOngletAffiche } from './useOngletAffiche';

jest.mock('expo-router/react-navigation', () => ({ useNavigationState: jest.fn() }));

/** Barre d'onglets réduite à l'onglet affiché : `actif` est la clé de sa route. */
function onglets(actif: string) {
  jest.mocked(useNavigationState).mockImplementation((choisir) =>
    choisir({ index: 1, routes: [{ key: 'accueil' }, { key: actif }] } as never),
  );
}

beforeEach(() => {
  jest.mocked(useRoute).mockReturnValue({ key: 'matchs' } as never);
});

test('vrai quand l’onglet est celui affiché par la barre, faux sinon', () => {
  onglets('matchs');
  const { result, rerender } = renderHook(() => useOngletAffiche());
  expect(result.current).toBe(true);
  onglets('equipes');
  rerender({});
  expect(result.current).toBe(false);
  onglets('matchs');
  rerender({});
  expect(result.current).toBe(true);
});
