import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Club } from '../donnees/types';
import { nettoyerSuivis, useSuivi } from './suivi';

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

describe('nettoyerSuivis (garde « collecte complète »)', () => {
  const complet = { collectifs: [{ id: 'seniors-m' }, { id: 'u18-f' }], erreurs: [] } as unknown as Club;

  test('cas nominal : relecture terminée et collecte complète → les collectifs inconnus sont retirés', () => {
    const retirer = jest.fn(() => []);
    nettoyerSuivis(complet, true, retirer);
    expect(retirer).toHaveBeenCalledWith(['seniors-m', 'u18-f']);
  });

  test('collecte partielle (erreurs non vides) → rien n’est retiré', () => {
    const retirer = jest.fn(() => []);
    nettoyerSuivis({ ...complet, erreurs: [{ competition: 'x', message: 'échec' }] } as unknown as Club, true, retirer);
    expect(retirer).not.toHaveBeenCalled();
  });

  test('suivis pas encore relus (pret faux) → rien n’est retiré', () => {
    const retirer = jest.fn(() => []);
    nettoyerSuivis(complet, false, retirer);
    expect(retirer).not.toHaveBeenCalled();
  });

  test('pas de données → rien n’est retiré', () => {
    const retirer = jest.fn(() => []);
    nettoyerSuivis(undefined, true, retirer);
    expect(retirer).not.toHaveBeenCalled();
  });

  test('par défaut, agit sur le magasin des équipes suivies', () => {
    useSuivi.setState({ suivis: ['seniors-m', 'disparue'], retires: [] });
    nettoyerSuivis(complet, true);
    expect(useSuivi.getState().suivis).toEqual(['seniors-m']);
    expect(useSuivi.getState().retires).toEqual(['disparue']);
  });
});
