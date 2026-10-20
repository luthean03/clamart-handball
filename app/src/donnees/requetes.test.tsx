import { dehydrate, hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { fixtureBrute } from '../../test/donnees';
import { CLE_CLUB, creerClientRequetes, persisteurVerifie, reessayerApresErreur, useClub } from './requetes';

function enveloppe(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
const clients: QueryClient[] = [];
const nouveauClient = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return client;
};

afterEach(() => {
  jest.restoreAllMocks();
  // Les minuteries de ramasse-miettes (gcTime) garderaient Jest ouvert après la fin des tests.
  clients.splice(0).forEach((client) => client.clear());
});

test('charge le club', async () => {
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(fixtureBrute) }),
  ) as unknown as typeof fetch;
  const { result } = renderHook(() => useClub(), { wrapper: enveloppe(nouveauClient()) });
  await waitFor(() => expect(result.current.club).toBeDefined());
  expect(result.current.horsLigne).toBe(false);
  expect(result.current.chargement).toBe(false);
});

test('hors ligne : garde les données en cache et le signale', async () => {
  const client = nouveauClient();
  client.setQueryData(CLE_CLUB, fixtureBrute);
  globalThis.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as unknown as typeof fetch;
  const { result } = renderHook(() => useClub(), { wrapper: enveloppe(client) });
  await act(async () => {
    await result.current.rafraichir();
  });
  await waitFor(() => expect(result.current.horsLigne).toBe(true));
  expect(result.current.club?.saison).toBe('2026-2027');
});

test('sans cache ni réseau : erreur, pas de données', async () => {
  globalThis.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as unknown as typeof fetch;
  const { result } = renderHook(() => useClub(), { wrapper: enveloppe(nouveauClient()) });
  await waitFor(() => expect(result.current.erreur?.name).toBe('ErreurReseau'));
  expect(result.current.club).toBeUndefined();
  expect(result.current.horsLigne).toBe(false);
});

const reseauKO = () =>
  (globalThis.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as unknown as typeof fetch);

/** Client réel de l'app (mêmes options de persistance), sans nouvelle tentative pour garder les tests rapides. */
function clientApp() {
  const client = creerClientRequetes();
  client.setQueryDefaults(CLE_CLUB, { retry: false });
  clients.push(client);
  return client;
}

test('un rafraîchissement raté garde la requête dans ce qui est persisté', async () => {
  const client = clientApp();
  client.setQueryData(CLE_CLUB, fixtureBrute);
  reseauKO();
  const { result } = renderHook(() => useClub(), { wrapper: enveloppe(client) });
  await act(async () => {
    await result.current.rafraichir();
  });
  await waitFor(() => expect(result.current.horsLigne).toBe(true));
  const requete = dehydrate(client).queries.find((q) => q.queryKey[0] === 'club');
  expect(requete?.state.status).toBe('error');
  expect(requete?.state.data).toBeDefined();
});

test('reprise : le réseau revient, le rafraîchissement efface le mode hors ligne', async () => {
  const client = nouveauClient();
  client.setQueryData(CLE_CLUB, fixtureBrute);
  reseauKO();
  const { result } = renderHook(() => useClub(), { wrapper: enveloppe(client) });
  await act(async () => {
    await result.current.rafraichir();
  });
  await waitFor(() => expect(result.current.horsLigne).toBe(true));
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(fixtureBrute) }),
  ) as unknown as typeof fetch;
  await act(async () => {
    await result.current.rafraichir();
  });
  await waitFor(() => expect(result.current.horsLigne).toBe(false));
  expect(result.current.erreur).toBeNull();
  expect(result.current.club?.saison).toBe('2026-2027');
});

test('pendant un nouveau rafraîchissement après une erreur, pas de bandeau hors ligne', async () => {
  const client = nouveauClient();
  client.setQueryData(CLE_CLUB, fixtureBrute);
  reseauKO();
  const { result } = renderHook(() => useClub(), { wrapper: enveloppe(client) });
  await act(async () => {
    await result.current.rafraichir();
  });
  await waitFor(() => expect(result.current.horsLigne).toBe(true));
  let terminer: (r: unknown) => void = () => {};
  globalThis.fetch = jest.fn(
    () => new Promise((resoudre) => (terminer = resoudre)),
  ) as unknown as typeof fetch;
  let fin: Promise<unknown> = Promise.resolve();
  act(() => {
    fin = result.current.rafraichir();
  });
  await waitFor(() => expect(result.current.rafraichissement).toBe(true));
  expect(result.current.horsLigne).toBe(false);
  await act(async () => {
    terminer({ ok: true, status: 200, json: () => Promise.resolve(fixtureBrute) });
    await fin;
  });
  await waitFor(() => expect(result.current.rafraichissement).toBe(false));
});

test('le délai de conservation du cache tient dans un setTimeout (pas de dépassement 32 bits)', () => {
  const gcTime = clientApp().getDefaultOptions().queries?.gcTime as number;
  expect(gcTime).toBeGreaterThan(1000 * 60 * 60 * 24 * 7);
  expect(gcTime).toBeLessThanOrEqual(2 ** 31 - 1);
});

test('format trop récent avec des données en cache : mise à jour requise, pas « hors ligne »', async () => {
  const client = nouveauClient();
  client.setQueryData(CLE_CLUB, fixtureBrute);
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ...fixtureBrute, version_schema: 4 }) }),
  ) as unknown as typeof fetch;
  const { result } = renderHook(() => useClub(), { wrapper: enveloppe(client) });
  expect(result.current.majRequise).toBe(false);
  await act(async () => {
    await result.current.rafraichir();
  });
  await waitFor(() => expect(result.current.majRequise).toBe(true));
  expect(result.current.horsLigne).toBe(false);
  expect(result.current.club?.saison).toBe('2026-2027');
});

test('une simple erreur réseau ne demande pas de mise à jour', async () => {
  const client = nouveauClient();
  client.setQueryData(CLE_CLUB, fixtureBrute);
  reseauKO();
  const { result } = renderHook(() => useClub(), { wrapper: enveloppe(client) });
  await act(async () => {
    await result.current.rafraichir();
  });
  await waitFor(() => expect(result.current.horsLigne).toBe(true));
  expect(result.current.majRequise).toBe(false);
});

describe('cache persisté corrompu', () => {
  const sain = { timestamp: 1, buster: '', clientState: { mutations: [], queries: [{ queryKey: ['club'], queryHash: '["club"]', state: { data: fixtureBrute } }, { queryKey: ['autre'], queryHash: '["autre"]', state: { data: 1 } }] } };
  const corrompu = { ...sain, clientState: { ...sain.clientState, queries: [{ queryKey: ['club'], queryHash: '["club"]', state: { data: { ...fixtureBrute, equipes: 'x' } } }, sain.clientState.queries[1]] } };
  const base = (restaure: unknown) => ({
    persistClient: jest.fn(async () => {}),
    restoreClient: jest.fn(async () => restaure),
    removeClient: jest.fn(async () => {}),
  });

  test('un cache valide est restauré tel quel', async () => {
    const p = persisteurVerifie(base(sain) as never);
    await expect(p.restoreClient()).resolves.toEqual(sain);
  });

  test('un club corrompu est écarté du cache restauré, le reste est gardé', async () => {
    const p = persisteurVerifie(base(corrompu) as never);
    const restaure = await p.restoreClient();
    expect(restaure?.clientState.queries.map((q) => q.queryKey[0])).toEqual(['autre']);
  });

  test('cache corrompu puis réseau rétabli : l’app se récupère avec les données fraîches', async () => {
    const p = persisteurVerifie(base(corrompu) as never);
    const client = nouveauClient();
    const restaure = await p.restoreClient();
    hydrate(client, restaure!.clientState);
    expect(client.getQueryData(CLE_CLUB)).toBeUndefined();
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(fixtureBrute) }),
    ) as unknown as typeof fetch;
    const { result } = renderHook(() => useClub(), { wrapper: enveloppe(client) });
    await waitFor(() => expect(result.current.club?.saison).toBe('2026-2027'));
  });

  test('« Réessayer » vide le cache persisté avant de relancer l’écran', async () => {
    const b = base(sain);
    const retry = jest.fn(async () => {});
    await reessayerApresErreur(retry, b as never);
    expect(b.removeClient).toHaveBeenCalled();
    expect(retry).toHaveBeenCalled();
  });

  test('« Réessayer » relance même si le cache ne peut pas être vidé', async () => {
    const b = base(sain);
    b.removeClient.mockRejectedValueOnce(new Error('stockage'));
    const retry = jest.fn(async () => {});
    await reessayerApresErreur(retry, b as never);
    expect(retry).toHaveBeenCalled();
  });
});
