import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { fixtureBrute } from '../../test/donnees';
import { CLE_CLUB, useClub } from './requetes';

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
