import { club } from '../../test/donnees';
import { elementsListeMatchs, grilleMois, indexAujourdhui, matchsParJour, moisDeLaSaison, moisInitial, type ElementListe } from './liste';
import { tousLesMatchs } from './selecteurs';
import type { MatchAvecEquipe } from './types';

const modele = tousLesMatchs(club)[0];
const matchLe = (date: string | null, id = date ?? 'sans-date'): MatchAvecEquipe => ({ ...modele, id, date });
const lire = (elements: ElementListe[]) =>
  elements.map((e) => (e.type === 'jour' ? `jour ${e.jour}` : e.type === 'match' ? `match ${e.match.id}` : 'aujourdhui'));

test('liste : jours croissants, sans matchs non datés, trait Aujourd’hui avant le prochain jour', () => {
  const matchs = [matchLe('2026-10-17T18:00:00+02:00', 'b'), matchLe(null), matchLe('2026-10-11T16:00:00+02:00', 'a')];
  expect(lire(elementsListeMatchs(matchs, '2026-10-16'))).toEqual([
    'jour 2026-10-11', 'match a', 'aujourdhui', 'jour 2026-10-17', 'match b',
  ]);
});

test('liste : les matchs d’un même jour sont groupés sous un seul en-tête, dans l’ordre des heures', () => {
  const matchs = [matchLe('2026-10-17T18:00:00+02:00', 'soir'), matchLe('2026-10-17T14:00:00+02:00', 'midi')];
  expect(lire(elementsListeMatchs(matchs, '2026-10-17'))).toEqual(['aujourdhui', 'jour 2026-10-17', 'match midi', 'match soir']);
});

test('liste : saison terminée → trait à la fin', () => {
  const elements = elementsListeMatchs([matchLe('2026-10-11T16:00:00+02:00', 'a')], '2027-06-01');
  expect(lire(elements)).toEqual(['jour 2026-10-11', 'match a', 'aujourdhui']);
  expect(indexAujourdhui(elements)).toBe(2);
});

test('liste : aucun match daté → liste vide, sans trait', () => {
  expect(elementsListeMatchs([matchLe(null)], '2026-10-16')).toEqual([]);
  expect(indexAujourdhui([])).toBe(-1);
});

test('liste du club : un seul trait, aucun match non daté', () => {
  const elements = elementsListeMatchs(tousLesMatchs(club), '2026-10-11');
  expect(elements.filter((e) => e.type === 'aujourdhui')).toHaveLength(1);
  expect(elements[indexAujourdhui(elements) + 1]).toEqual({ type: 'jour', jour: '2026-10-11' });
  expect(elements.every((e) => e.type !== 'match' || e.match.date !== null)).toBe(true);
});

test('matchs par jour : datés seulement, jours croissants', () => {
  const jours = matchsParJour([matchLe('2026-11-08T16:00:00+01:00', 'b'), matchLe(null), matchLe('2026-11-07T14:00:00+01:00', 'a')]);
  expect(jours.map((j) => [j.jour, j.matchs.map((m) => m.id)])).toEqual([['2026-11-07', ['a']], ['2026-11-08', ['b']]]);
});

test('grille de novembre 2026 : commence un dimanche, points par jour', () => {
  const g = grilleMois('2026-11', [matchLe('2026-11-07T14:00:00+01:00'), matchLe('2026-11-07T18:30:00+01:00'), matchLe('2026-11-08T16:00:00+01:00')]);
  expect(g[0].map((c) => c.jour)).toEqual([null, null, null, null, null, null, '2026-11-01']);
  expect(g[1].find((c) => c.jour === '2026-11-07')!.nb).toBe(2);
  expect(g[1].find((c) => c.jour === '2026-11-08')!.nb).toBe(1);
});

test('grille : semaines complètes de 7 cases, dernière semaine complétée, autres mois et matchs non datés ignorés', () => {
  const g = grilleMois('2026-11', [matchLe('2026-10-31T14:00:00+01:00'), matchLe('2026-11-30T20:00:00+01:00'), matchLe(null)]);
  expect(g).toHaveLength(6);
  expect(g.every((semaine) => semaine.length === 7)).toBe(true);
  expect(g[5].map((c) => c.jour)).toEqual(['2026-11-30', null, null, null, null, null, null]);
  expect(g[5][0].nb).toBe(1);
  expect(g.flat().reduce((n, c) => n + c.nb, 0)).toBe(1);
});

test('mois de la saison : du premier au dernier mois, trous inclus', () => {
  const matchs = [matchLe('2027-01-09T14:00:00+01:00'), matchLe(null), matchLe('2026-09-12T14:00:00+02:00'), matchLe('2026-12-06T14:00:00+01:00')];
  expect(moisDeLaSaison(matchs)).toEqual(['2026-09', '2026-10', '2026-11', '2026-12', '2027-01']);
  expect(moisDeLaSaison([matchLe(null)])).toEqual([]);
});

test('mois d’ouverture : le mois en cours, sinon le mois de la saison le plus proche', () => {
  const mois = ['2026-09', '2026-10', '2026-11'];
  expect(moisInitial(mois, '2026-10-16')).toBe('2026-10');
  expect(moisInitial(mois, '2026-07-01')).toBe('2026-09');
  expect(moisInitial(mois, '2027-06-01')).toBe('2026-11');
  expect(moisInitial([], '2026-10-16')).toBeUndefined();
});
