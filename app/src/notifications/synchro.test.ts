import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSuivi } from '../suivi/suivi';
import { lireAutorisation } from './fcm';
import { planifierSynchro, synchroniser, useSynchroAbonnements } from './synchro';

beforeEach(() => jest.clearAllMocks());


function client(echecs: string[] = []) {
  const appels: string[] = [];
  return {
    appels,
    abonner: jest.fn(async (s: string) => { appels.push(`+${s}`); if (echecs.includes(`+${s}`)) throw new Error('réseau'); }),
    desabonner: jest.fn(async (s: string) => { appels.push(`-${s}`); if (echecs.includes(`-${s}`)) throw new Error('réseau'); }),
  };
}

test('abonne l’attendu, désabonne le reste, renvoie l’état réel', async () => {
  const c = client();
  const sujets = await synchroniser(['resultats-a'], ['resultats-a', 'rappels-a'], c);
  expect(c.appels).toEqual(['+resultats-a', '-rappels-a']);
  expect(sujets).toEqual(['resultats-a']);
});

test('un échec laisse l’état précédent du sujet', async () => {
  const c = client(['+resultats-b', '-rappels-a']);
  const sujets = await synchroniser(['resultats-a', 'resultats-b'], ['resultats-a', 'rappels-a'], c);
  expect(sujets.sort()).toEqual(['rappels-a', 'resultats-a']);
});

describe('planifierSynchro et useSynchroAbonnements', () => {
  const initial = useSuivi.getState();
  beforeEach(() =>
    useSuivi.setState({ ...initial, suivis: ['X'], notifResultats: true, rappels: false, autorisation: 'accordee', sujets: [], pret: true }),
  );

  test('deux cycles qui se chevauchent : le sujet abonné puis retiré est bien désabonné', async () => {
    const appels: string[] = [];
    let finAbonnement!: () => void;
    const client = {
      abonner: jest.fn((s: string) => { appels.push(`+${s}`); return new Promise<void>((r) => { finAbonnement = r; }); }),
      desabonner: jest.fn(async (s: string) => { appels.push(`-${s}`); }),
    };
    const cycle1 = planifierSynchro(client);
    await waitFor(() => expect(client.abonner).toHaveBeenCalledWith('resultats-X'));
    useSuivi.setState({ notifResultats: false });
    const cycle2 = planifierSynchro(client);
    expect(client.desabonner).not.toHaveBeenCalled(); // le cycle 2 attend la fin du cycle 1
    finAbonnement();
    await Promise.all([cycle1, cycle2]);
    expect(appels).toEqual(['+resultats-X', '-resultats-X']);
    expect(useSuivi.getState().sujets).toEqual([]);
  });

  test('un cycle en échec ne bloque pas la file', async () => {
    const mauvais = { abonner: jest.fn(), desabonner: jest.fn() };
    jest.spyOn(useSuivi.getState(), 'setSujets').mockImplementationOnce(() => { throw new Error('boum'); });
    await expect(planifierSynchro(mauvais)).rejects.toThrow('boum');
    const bon = { abonner: jest.fn(() => Promise.resolve()), desabonner: jest.fn(() => Promise.resolve()) };
    await planifierSynchro(bon);
    expect(bon.abonner).toHaveBeenCalledWith('resultats-X');
  });

  test('l’autorisation n’est relue qu’une fois les réglages chargés', async () => {
    useSuivi.setState({ pret: false, autorisation: 'refusee' });
    renderHook(() => useSynchroAbonnements());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(lireAutorisation).not.toHaveBeenCalled();
    await act(async () => {
      useSuivi.setState({ pret: true });
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(useSuivi.getState().autorisation).toBe('accordee');
    expect(lireAutorisation).toHaveBeenCalledTimes(1);
  });
});
