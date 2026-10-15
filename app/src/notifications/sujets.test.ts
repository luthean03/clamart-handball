import { planAbonnements, sujetsAttendus } from './sujets';

const prefs = { notifResultats: true, rappels: false, autorisation: 'accordee' as const };

test('résultats seulement par défaut', () => {
  expect(sujetsAttendus(['seniors-m', 'u13-f'], prefs)).toEqual(['resultats-seniors-m', 'resultats-u13-f']);
});

test('rappels en plus quand l’option est active', () => {
  expect(sujetsAttendus(['seniors-m'], { ...prefs, rappels: true })).toEqual(['resultats-seniors-m', 'rappels-seniors-m']);
});

test('aucun sujet si Android refuse les notifications ou si tout est désactivé', () => {
  expect(sujetsAttendus(['seniors-m'], { ...prefs, autorisation: 'refusee' })).toEqual([]);
  expect(sujetsAttendus(['seniors-m'], { ...prefs, notifResultats: false })).toEqual([]);
});

test('autorisation inconnue (Android < 13 ou pas encore demandée) : on s’abonne', () => {
  expect(sujetsAttendus(['u18-f'], { ...prefs, autorisation: 'inconnue' })).toEqual(['resultats-u18-f']);
});

test('plan : ré-abonne tout l’attendu et désabonne le reste', () => {
  expect(planAbonnements(['resultats-a', 'resultats-b'], ['resultats-b', 'rappels-b'])).toEqual({
    abonner: ['resultats-a', 'resultats-b'],
    desabonner: ['rappels-b'],
  });
});
