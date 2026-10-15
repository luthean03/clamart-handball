import { fixtureBrute } from '../../test/donnees';
import { chargerClub } from './source';

function reponse(corps: unknown, ok = true, status = 200): typeof fetch {
  return jest.fn(() =>
    Promise.resolve({ ok, status, json: () => Promise.resolve(corps) } as unknown as Response),
  ) as unknown as typeof fetch;
}

test('renvoie le club au format v2', async () => {
  const club = await chargerClub('https://exemple/club.json', reponse(fixtureBrute));
  expect(club.collectifs).toHaveLength(11);
});

test('demande une revalidation au serveur (Cache-Control: no-cache) en gardant Accept', async () => {
  const chercher = reponse(fixtureBrute);
  await chargerClub('https://exemple/club.json', chercher);
  expect(chercher).toHaveBeenCalledWith(
    'https://exemple/club.json',
    expect.objectContaining({ headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' } }),
  );
});

test('refuse un schéma plus récent que l’app', async () => {
  await expect(chargerClub('u', reponse({ ...fixtureBrute, version_schema: 3 }))).rejects.toMatchObject({
    name: 'SchemaInconnu',
  });
});

test('refuse un fichier v1 sans version', async () => {
  const { version_schema: _v, ...v1 } = fixtureBrute;
  await expect(chargerClub('u', reponse(v1))).rejects.toMatchObject({ name: 'SchemaInconnu' });
});

test('erreur réseau', async () => {
  const sansReseau = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as unknown as typeof fetch;
  await expect(chargerClub('u', sansReseau)).rejects.toMatchObject({ name: 'ErreurReseau' });
});

test('HTTP 404', async () => {
  await expect(chargerClub('u', reponse({}, false, 404))).rejects.toMatchObject({
    name: 'ErreurReseau',
    message: 'Réponse 404',
  });
});

test('refuse une réponse illisible (portail wi-fi)', async () => {
  const html = jest.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError('Unexpected token <')) }),
  ) as unknown as typeof fetch;
  await expect(chargerClub('u', html)).rejects.toMatchObject({ name: 'ErreurReseau' });
});

describe('délai maximal', () => {
  afterEach(() => jest.useRealTimers());

  test('un téléchargement qui ne répond jamais devient une ErreurReseau « Délai dépassé » après 15 s', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    const silencieux = jest.fn((_url: unknown, init?: RequestInit) => {
      signal = init?.signal;
      return new Promise<Response>(() => {});
    }) as unknown as typeof fetch;
    let resultat: unknown = 'en attente';
    chargerClub('u', silencieux).catch((e) => (resultat = e));
    await jest.advanceTimersByTimeAsync(14_999);
    expect(resultat).toBe('en attente');
    await jest.advanceTimersByTimeAsync(1);
    expect(resultat).toMatchObject({ name: 'ErreurReseau', message: 'Délai dépassé' });
    expect(signal?.aborted).toBe(true);
  });

  test('une réponse à temps ne laisse aucun minuteur actif', async () => {
    jest.useFakeTimers();
    await chargerClub('u', reponse(fixtureBrute));
    expect(jest.getTimerCount()).toBe(0);
  });

  test('un fetch interrompu par le signal (vrai comportement de fetch) donne aussi « Délai dépassé »', async () => {
    jest.useFakeTimers();
    const honnete = jest.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise<Response>((_ok, ko) => init?.signal?.addEventListener('abort', () => ko(new Error('Aborted')))),
    ) as unknown as typeof fetch;
    let resultat: unknown;
    chargerClub('u', honnete).catch((e) => (resultat = e));
    await jest.advanceTimersByTimeAsync(15_000);
    expect(resultat).toMatchObject({ name: 'ErreurReseau', message: 'Délai dépassé' });
  });
});
