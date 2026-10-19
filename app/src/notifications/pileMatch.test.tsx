import { act, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { idFicheMatch } from './liens';

// Le routeur réel (le setup global le remplace par un faux).
jest.unmock('expo-router');

/* eslint-disable @typescript-eslint/no-require-imports */
function monter() {
  const { renderRouter } = require('expo-router/testing-library');
  const { useLocalSearchParams, Stack, Tabs } = require('expo-router');
  const { store } = require('expo-router/build/global-state/router-store');
  function Fiche() {
    const p = useLocalSearchParams() as { id: string; equipe: string };
    return <Text>{`fiche ${p.id} ${p.equipe}`}</Text>;
  }
  const Pile = () => (
    <Stack>
      <Stack.Screen name="match/[id]" dangerouslySingular={idFicheMatch} />
    </Stack>
  );
  renderRouter(
    { _layout: Pile, '(tabs)/_layout': () => <Tabs />, '(tabs)/index': () => <Text>accueil</Text>, 'match/[id]': Fiche },
    { initialUrl: '/' },
  );
  /** Un lien externe (clamart://…) : l'action que expo-router déduit de l'URL, comme un lien profond reçu en marche. */
  const lien = (chemin: string) => {
    const config = store.linking.config;
    const action = store.linking.getActionFromState(store.linking.getStateFromPath(chemin, config), config);
    act(() => store.navigationRef.dispatch(action));
  };
  const chemins = () => (store.navigationRef.getRootState().routes[0].state?.routes ?? []).map((r: { name: string }) => r.name);
  return { lien, chemins, router: require('expo-router').router };
}

test('un lien vers un autre match, fiche déjà ouverte : la nouvelle fiche s’affiche', () => {
  const { lien, chemins } = monter();
  lien('/match/2702666?equipe=33004-clamart-handball');
  expect(screen.getByText('fiche 2702666 33004-clamart-handball')).toBeOnTheScreen();
  lien('/match/2710062?equipe=33056-clamart-handball-1');
  expect(screen.getByText('fiche 2710062 33056-clamart-handball-1')).toBeOnTheScreen();
  expect(chemins()).toEqual(['(tabs)', 'match/[id]', 'match/[id]']);
});

test('le retour ramène à la première fiche', () => {
  const { lien, router } = monter();
  lien('/match/2702666?equipe=33004-clamart-handball');
  lien('/match/2710062?equipe=33056-clamart-handball-1');
  act(() => router.back());
  expect(screen.getByText('fiche 2702666 33004-clamart-handball')).toBeOnTheScreen();
});

test('la notification (push) d’un autre match ouvre ce match', () => {
  const { lien, router } = monter();
  lien('/match/2702666?equipe=33004-clamart-handball');
  act(() => router.push('/match/2710062?equipe=33056-clamart-handball-1'));
  expect(screen.getByText('fiche 2710062 33056-clamart-handball-1')).toBeOnTheScreen();
});

test('le même match deux fois ne double pas la fiche', () => {
  const { lien, chemins } = monter();
  lien('/match/2702666?equipe=33004-clamart-handball');
  lien('/match/2702666?equipe=33004-clamart-handball');
  expect(chemins()).toEqual(['(tabs)', 'match/[id]']);
});

test('idFicheMatch : match et équipe font l’identité', () => {
  expect(idFicheMatch('match/[id]', { id: '1', equipe: 'a' })).not.toBe(idFicheMatch('match/[id]', { id: '2', equipe: 'a' }));
  expect(idFicheMatch('match/[id]', { id: ['1'], equipe: 'a' })).toBe(idFicheMatch('match/[id]', { id: '1', equipe: 'a' }));
});
