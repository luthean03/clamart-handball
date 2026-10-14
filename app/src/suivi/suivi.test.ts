import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSuivi } from './suivi';

beforeEach(() => useSuivi.setState({ suivis: [], bienvenueFaite: false, retires: [], pret: false }));
const etat = () => useSuivi.getState();

test('basculer ajoute puis retire', () => {
  etat().basculer('seniors-m');
  expect(etat().suivis).toEqual(['seniors-m']);
  etat().basculer('seniors-m');
  expect(etat().suivis).toEqual([]);
});

test('definirSuivis dédoublonne', () => {
  etat().definirSuivis(['u18-f', 'u18-f', 'seniors-m']);
  expect(etat().suivis).toEqual(['u18-f', 'seniors-m']);
});

test('retirerInconnus retire et mémorise les équipes disparues', () => {
  useSuivi.setState({ suivis: ['seniors-m', 'ancienne-equipe'] });
  expect(etat().retirerInconnus(['seniors-m', 'u18-f'])).toEqual(['ancienne-equipe']);
  expect(etat().suivis).toEqual(['seniors-m']);
  expect(etat().retires).toEqual(['ancienne-equipe']);
  etat().effacerRetires();
  expect(etat().retires).toEqual([]);
});

test('retirerInconnus ne change rien si tout est connu', () => {
  useSuivi.setState({ suivis: ['seniors-m'], retires: [] });
  expect(etat().retirerInconnus(['seniors-m'])).toEqual([]);
  expect(etat().retires).toEqual([]);
});

test('le premier lancement est mémorisé sur le téléphone', async () => {
  etat().basculer('u13-m');
  etat().terminerBienvenue();
  await new Promise((r) => setTimeout(r, 0));
  const sauve = JSON.parse((await AsyncStorage.getItem('clamart-suivi')) ?? '{}');
  expect(sauve.state).toEqual({ suivis: ['u13-m'], bienvenueFaite: true, retires: [] });
});

test('un stockage illisible laisse le store prêt avec l’état par défaut', async () => {
  // Le mock d'AsyncStorage est déjà un jest.fn : on ne le restaure pas (mockRestore effacerait son implémentation).
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('illisible'));
  await useSuivi.persist.rehydrate();
  expect(etat().pret).toBe(true);
  expect(etat().suivis).toEqual([]);
});

test('une relecture normale rend le store prêt', async () => {
  await AsyncStorage.setItem(
    'clamart-suivi',
    JSON.stringify({ state: { suivis: ['u13-m'], bienvenueFaite: true, retires: [] }, version: 1 }),
  );
  await useSuivi.persist.rehydrate();
  expect(etat().pret).toBe(true);
  expect(etat().suivis).toEqual(['u13-m']);
});
