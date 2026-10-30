import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Club } from '../donnees/types';
import { nettoyerSuivis, useSuivi } from './suivi';

beforeEach(() =>
  useSuivi.setState({
    suivis: [],
    bienvenueFaite: false,
    retires: [],
    saison: null,
    pret: false,
    notifResultats: true,
    rappels: false,
    programme: true,
    sujets: [],
    autorisation: 'inconnue',
    apparence: 'auto',
  }),
);
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

test('préférences de notifications : valeurs par défaut et réglages', () => {
  expect(etat().notifResultats).toBe(true);
  expect(etat().rappels).toBe(false);
  etat().setRappels(true);
  etat().setNotifResultats(false);
  etat().setAutorisation('refusee');
  etat().setSujets(['resultats-seniors-m']);
  expect(etat()).toMatchObject({ rappels: true, notifResultats: false, autorisation: 'refusee', sujets: ['resultats-seniors-m'] });
});

test('programme : activé par défaut, puis réglable', () => {
  expect(useSuivi.getInitialState().programme).toBe(true);
  etat().setProgramme(false);
  expect(etat().programme).toBe(false);
});

test('migration depuis la version 4 : programme activé, autres préférences gardées', async () => {
  await AsyncStorage.setItem('clamart-suivi', JSON.stringify({ version: 4, state: { suivis: ['u13-m'], bienvenueFaite: true, retires: [], saison: '2026-2027', notifResultats: false, rappels: true, sujets: [], autorisation: 'accordee', apparence: 'sombre' } }));
  await useSuivi.persist.rehydrate();
  expect(etat()).toMatchObject({ suivis: ['u13-m'], programme: true, notifResultats: false, rappels: true, apparence: 'sombre', saison: '2026-2027' });
});

test('apparence : automatique par défaut, puis réglable', () => {
  expect(useSuivi.getInitialState().apparence).toBe('auto');
  etat().setApparence('sombre');
  expect(etat().apparence).toBe('sombre');
  etat().setApparence('clair');
  expect(etat().apparence).toBe('clair');
});

test('migration depuis la version 2 : une ancienne sauvegarde sans apparence charge en automatique', async () => {
  await AsyncStorage.setItem('clamart-suivi', JSON.stringify({ version: 2, state: { suivis: ['u13-m'], bienvenueFaite: true, retires: [], notifResultats: false, rappels: true, sujets: [], autorisation: 'accordee' } }));
  await useSuivi.persist.rehydrate();
  expect(etat()).toMatchObject({ suivis: ['u13-m'], notifResultats: false, apparence: 'auto' });
});

test('migration depuis la version 1  : les nouvelles préférences prennent leur valeur par défaut', async () => {
  await AsyncStorage.setItem('clamart-suivi', JSON.stringify({ version: 1, state: { suivis: ['u13-m'], bienvenueFaite: true, retires: [] } }));
  await useSuivi.persist.rehydrate();
  expect(etat()).toMatchObject({ suivis: ['u13-m'], bienvenueFaite: true, notifResultats: true, rappels: false, sujets: [] });
});

test('le premier lancement est mémorisé sur le téléphone', async () => {
  etat().basculer('u13-m');
  etat().terminerBienvenue();
  await new Promise((r) => setTimeout(r, 0));
  const sauve = JSON.parse((await AsyncStorage.getItem('clamart-suivi')) ?? '{}');
  expect(sauve.state).toEqual({
    suivis: ['u13-m'],
    bienvenueFaite: true,
    retires: [],
    saison: null,
    notifResultats: true,
    rappels: false,
    programme: true,
    sujets: [],
    autorisation: 'inconnue',
    apparence: 'auto',
  });
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

describe('nettoyerSuivis (jamais de perte en cours de saison)', () => {
  const complet = { saison: '2026-2027', collectifs: [{ id: 'seniors-m' }, { id: 'u18-f' }], erreurs: [] } as unknown as Club;

  test('même saison : une équipe suivie absente des données est conservée', () => {
    useSuivi.setState({ suivis: ['seniors-m', 'disparue'], retires: [], saison: '2026-2027' });
    nettoyerSuivis(complet, true);
    expect(etat().suivis).toEqual(['seniors-m', 'disparue']);
    expect(etat().retires).toEqual([]);
  });

  test('nouvelle saison : les équipes absentes sont retirées et la saison mémorisée', () => {
    useSuivi.setState({ suivis: ['seniors-m', 'disparue'], retires: [], saison: '2025-2026' });
    nettoyerSuivis(complet, true);
    expect(etat().suivis).toEqual(['seniors-m']);
    expect(etat().retires).toEqual(['disparue']);
    expect(etat().saison).toBe('2026-2027');
  });

  test('première lecture (saison inconnue) : on mémorise la saison sans rien retirer', () => {
    useSuivi.setState({ suivis: ['seniors-m', 'disparue'], saison: null });
    nettoyerSuivis(complet, true);
    expect(etat().suivis).toEqual(['seniors-m', 'disparue']);
    expect(etat().saison).toBe('2026-2027');
  });

  test('collecte avec erreurs, suivis pas relus ou pas de données → rien ne change', () => {
    useSuivi.setState({ suivis: ['disparue'], saison: '2025-2026' });
    nettoyerSuivis({ ...complet, erreurs: ['échec'] } as unknown as Club, true);
    nettoyerSuivis(complet, false);
    nettoyerSuivis(undefined, true);
    expect(etat().suivis).toEqual(['disparue']);
    expect(etat().saison).toBe('2025-2026');
  });

  test('migration depuis la version 3 : saison inconnue, aucun retrait au premier chargement', async () => {
    await AsyncStorage.setItem('clamart-suivi', JSON.stringify({ version: 3, state: { suivis: ['seniors-m', 'disparue'], bienvenueFaite: true, retires: [], apparence: 'sombre' } }));
    await useSuivi.persist.rehydrate();
    expect(etat().saison).toBeNull();
    nettoyerSuivis(complet, etat().pret);
    expect(etat().suivis).toEqual(['seniors-m', 'disparue']);
    expect(etat().saison).toBe('2026-2027');
  });
});
