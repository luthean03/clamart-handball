import { lienNotification, parametre } from './liens';

test('paramètre de route : chaîne, tableau ou absent', () => {
  expect(parametre('a')).toBe('a');
  expect(parametre(['a', 'b'])).toBe('a');
  expect(parametre(undefined)).toBeUndefined();
});

test('lien de notification', () => {
  expect(lienNotification({ type: 'resultat', collectif: 'seniors-m', equipe_id: '32546-clamart-handball', match_id: '2673792' }))
    .toBe('/match/2673792?equipe=32546-clamart-handball');
  expect(lienNotification({ type: 'test', collectif: 'seniors-f-1' })).toBe('/equipe/seniors-f-1');
  expect(lienNotification({ match_id: '../../etc', equipe_id: 'x' })).toBeUndefined();
  expect(lienNotification({})).toBeUndefined();
});
