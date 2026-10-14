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
