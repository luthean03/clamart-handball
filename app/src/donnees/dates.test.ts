import {
  compteARebours, dateCourte, donneesAnciennes, heureDuMatch, jourDuMatch, jourLocal, jourLu, joursDuMois, libelleBandeau,
  libelleJour, libelleMiseAJour, libelleMois, moisSuivant, rangDansLaSemaine, salutation, titreJour,
} from './dates';

test('jour et heure lus dans le texte FFHB (heure de Paris)', () => {
  expect(jourDuMatch('2026-10-11T16:15:00+02:00')).toBe('2026-10-11');
  expect(heureDuMatch('2026-10-11T16:15:00+02:00')).toBe('16:15');
});

test('jourLocal', () => {
  expect(jourLocal(new Date('2026-10-11T23:30:00+02:00'))).toBe('2026-10-11');
});

test('libellés de jours', () => {
  expect(libelleJour('2026-10-10')).toBe('sam. 10 oct.');
  expect(libelleJour('2026-10-11', 'long')).toBe('dimanche 11 oct.');
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

test('titre de jour des listes et jour lu en toutes lettres', () => {
  expect(titreJour('2026-10-17')).toBe('Sam. 17 octobre');
  expect(titreJour('2027-02-01')).toBe('Lun. 1 février');
  expect(jourLu('2026-11-07')).toBe('samedi 7 novembre');
});

test('mois : libellé, mois suivant, jours du mois', () => {
  expect(libelleMois('2026-10')).toBe('Octobre 2026');
  expect(libelleMois('2027-02')).toBe('Février 2027');
  expect(moisSuivant('2026-11')).toBe('2026-12');
  expect(moisSuivant('2026-12')).toBe('2027-01');
  const novembre = joursDuMois('2026-11');
  expect(novembre).toHaveLength(30);
  expect([novembre[0], novembre[29]]).toEqual(['2026-11-01', '2026-11-30']);
  expect(joursDuMois('2028-02')).toHaveLength(29);
});

test('rang dans la semaine, du lundi (0) au dimanche (6), sans dérive au changement d’heure', () => {
  expect(rangDansLaSemaine('2026-10-19')).toBe(0);
  expect(rangDansLaSemaine('2026-11-01')).toBe(6);
  expect(rangDansLaSemaine('2026-10-25')).toBe(6);
  expect(rangDansLaSemaine('2026-03-30')).toBe(0);
});
