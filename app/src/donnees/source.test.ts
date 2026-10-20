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

test('accepte les schémas 2 et 3', async () => {
  await expect(chargerClub('u', reponse({ ...fixtureBrute, version_schema: 2 }))).resolves.toBeDefined();
  await expect(chargerClub('u', reponse({ ...fixtureBrute, version_schema: 3 }))).resolves.toBeDefined();
});

test('refuse un schéma plus récent que l’app', async () => {
  await expect(chargerClub('u', reponse({ ...fixtureBrute, version_schema: 4 }))).rejects.toMatchObject({
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

describe('forme du fichier (club.json corrompu ou partiel)', () => {
  const invalide = { name: 'ErreurReseau' };

  test('JSON tronqué : erreur de réseau', async () => {
    const tronque = jest.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')) } as unknown as Response),
    ) as unknown as typeof fetch;
    await expect(chargerClub('u', tronque)).rejects.toMatchObject(invalide);
  });

  test('equipes qui n’est pas un tableau', async () => {
    await expect(chargerClub('u', reponse({ ...fixtureBrute, equipes: {} }))).rejects.toMatchObject(invalide);
  });

  test('equipes absent', async () => {
    const { equipes: _e, ...sans } = fixtureBrute;
    await expect(chargerClub('u', reponse(sans))).rejects.toMatchObject(invalide);
  });

  test('collectifs absent, club absent ou fichier qui n’est pas un objet', async () => {
    const { collectifs: _c, ...sansCollectifs } = fixtureBrute;
    const { club: _k, ...sansClub } = fixtureBrute;
    await expect(chargerClub('u', reponse(sansCollectifs))).rejects.toMatchObject(invalide);
    await expect(chargerClub('u', reponse(sansClub))).rejects.toMatchObject(invalide);
    await expect(chargerClub('u', reponse(null))).rejects.toMatchObject({ name: 'SchemaInconnu' });
  });

  test('équipe sans id, sans collectif ou sans matchs', async () => {
    const [premiere, ...reste] = fixtureBrute.equipes;
    for (const mauvaise of [{ ...premiere, id: undefined }, { ...premiere, collectif: 3 }, { ...premiere, matchs: null }]) {
      await expect(chargerClub('u', reponse({ ...fixtureBrute, equipes: [mauvaise, ...reste] }))).rejects.toMatchObject(invalide);
    }
  });

  test('match sans id', async () => {
    const [premiere, ...reste] = fixtureBrute.equipes;
    const matchs = [{ ...premiere.matchs[0], id: undefined }, ...premiere.matchs.slice(1)];
    await expect(chargerClub('u', reponse({ ...fixtureBrute, equipes: [{ ...premiere, matchs }, ...reste] }))).rejects.toMatchObject(invalide);
  });

  test('erreurs absent : valeur par défaut vide', async () => {
    const { erreurs: _r, ...sans } = fixtureBrute;
    await expect(chargerClub('u', reponse(sans))).resolves.toMatchObject({ erreurs: [] });
  });
});
