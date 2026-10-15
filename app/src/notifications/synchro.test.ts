import { synchroniser } from './synchro';

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
