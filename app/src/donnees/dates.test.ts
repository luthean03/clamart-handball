import {
  compteARebours, dateCourte, decalerJour, donneesAnciennes, heureDuMatch, jourDuMatch, jourLocal, libelleBandeau,
  libelleJour, libelleMiseAJour, libelleWeekend, salutation, weekendDeReference,
} from './dates';

const W_10_11 = { vendredi: '2026-10-09', samedi: '2026-10-10', dimanche: '2026-10-11' };

test('jour et heure lus dans le texte FFHB (heure de Paris)', () => {
  expect(jourDuMatch('2026-10-11T16:15:00+02:00')).toBe('2026-10-11');
  expect(heureDuMatch('2026-10-11T16:15:00+02:00')).toBe('16:15');
});

test('jourLocal et decalerJour', () => {
  expect(jourLocal(new Date('2026-10-11T23:30:00+02:00'))).toBe('2026-10-11');
  expect(decalerJour('2026-10-31', 1)).toBe('2026-11-01');
  expect(decalerJour('2026-10-01', -1)).toBe('2026-09-30');
});

test('week-end de référence : lundi et mardi regardent le week-end passé', () => {
  expect(weekendDeReference('2026-10-12')).toEqual(W_10_11); // lundi
  expect(weekendDeReference('2026-10-13')).toEqual(W_10_11); // mardi
});

test('week-end de référence : du mercredi au dimanche, celui de la semaine', () => {
  expect(weekendDeReference('2026-10-14').samedi).toBe('2026-10-17'); // mercredi
  expect(weekendDeReference('2026-10-16').samedi).toBe('2026-10-17'); // vendredi
  expect(weekendDeReference('2026-10-10')).toEqual(W_10_11); // samedi
  expect(weekendDeReference('2026-10-11')).toEqual(W_10_11); // dimanche
});

test('libellés de jours et de week-end', () => {
  expect(libelleJour('2026-10-10')).toBe('sam. 10 oct.');
  expect(libelleJour('2026-10-11', 'long')).toBe('dimanche 11 oct.');
  expect(libelleWeekend(W_10_11)).toBe('10–11 oct.');
  expect(libelleWeekend(weekendDeReference('2026-10-29'))).toBe('31 oct.–1 nov.');
});

test('libellé de mise à jour', () => {
  const iso = '2026-10-13T14:41:53+00:00'; // 16 h 41 à Paris
  expect(libelleMiseAJour(iso, new Date('2026-10-13T19:05:00+02:00'))).toBe('mis à jour à 16:41');
  expect(libelleMiseAJour(iso, new Date('2026-10-14T08:00:00+02:00'))).toBe('mis à jour mar. 13 oct. à 16:41');
});

test('données anciennes au-delà de 36 h', () => {
  const iso = '2026-10-13T14:41:53+00:00';
  expect(donneesAnciennes(iso, new Date('2026-10-14T20:00:00+02:00'))).toBe(false);
  expect(donneesAnciennes(iso, new Date('2026-10-15T08:00:00+02:00'))).toBe(true);
});

test('salutation selon l’heure', () => {
  expect(salutation(new Date('2026-10-13T17:59:00+02:00'))).toBe('Bonjour !');
  expect(salutation(new Date('2026-10-13T18:00:00+02:00'))).toBe('Bonsoir !');
});

test('libellé du bandeau de date', () => {
  expect(libelleBandeau('2026-10-18T15:30:00+02:00')).toBe('Dim. 18 octobre · 15:30');
  expect(libelleBandeau('2026-11-07T18:30:00+01:00')).toBe('Sam. 7 novembre · 18:30');
});

test('compte à rebours', () => {
  expect(compteARebours('2026-10-16', '2026-10-16')).toBe('aujourd’hui');
  expect(compteARebours('2026-10-17', '2026-10-16')).toBe('demain');
  expect(compteARebours('2026-10-18', '2026-10-16')).toBe('dans 2 jours');
  expect(compteARebours('2026-11-07', '2026-10-16')).toBe('dans 22 jours');
});

test('compte à rebours : sans dérive au changement d’heure', () => {
  expect(compteARebours('2026-10-26', '2026-10-24')).toBe('dans 2 jours');
  expect(compteARebours('2026-03-30', '2026-03-28')).toBe('dans 2 jours');
});

test('date courte', () => expect(dateCourte('2026-10-17T18:00:00+02:00')).toBe('17/10'));
