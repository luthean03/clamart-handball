import { club, DIM_SOIR, MAR_SOIR } from '../../test/donnees';
import { weekendDeReference } from './dates';
import {
  buteursDuCollectif, collectifsParCategorie, dernierResultat, equipePrincipale, equipesDuCollectif,
  grouperParCategorie, jourParDefaut, joursAvecMatchs, matchParId, matchsDuCollectif, matchsDuJour,
  matchsDuWeekend, prochainMatch, scoreEnAttente, serieEnCours,
} from './selecteurs';

const W_10_11 = weekendDeReference('2026-10-13');

test('un collectif regroupe ses compétitions', () => {
  expect(equipesDuCollectif(club, 'seniors-m').map((e) => e.id)).toEqual([
    '32546-clamart-handball', '33403-clamart-handball', '33244-clamart-handball',
  ]);
  expect(equipePrincipale(club, 'seniors-m')?.id).toBe('32546-clamart-handball');
  expect(equipePrincipale(club, 'seniors-f-1')?.place).toBe(3);
});

test('matchs du week-end des 10 et 11 octobre', () => {
  const matchs = matchsDuWeekend(club, W_10_11);
  expect(matchs).toHaveLength(11);
  expect(new Set(matchs.map((m) => m.equipe.collectif)).size).toBe(10);
  const instants = matchs.map((m) => Date.parse(m.date!));
  expect([...instants].sort((a, b) => a - b)).toEqual(instants);
});

test('matchs d’un jour', () => {
  expect(matchsDuJour(club, '2026-10-11')).toHaveLength(4);
  expect(matchsDuJour(club, '2026-10-10')).toHaveLength(7);
});

test('les matchs sans date sont en fin de liste', () => {
  const matchs = matchsDuCollectif(club, 'seniors-f-1');
  expect(matchs[0].date).not.toBeNull();
  expect(matchs[matchs.length - 1].date).toBeNull();
});

test('prochain match et dernier résultat', () => {
  expect(prochainMatch(club, 'seniors-f-1', DIM_SOIR)?.id).toBe('2729291');
  expect(prochainMatch(club, 'seniors-m', DIM_SOIR)?.id).toBe('2734038');
  expect(prochainMatch(club, 'u18-m', DIM_SOIR)).toBeUndefined();
  expect(dernierResultat(club, 'seniors-f-1')?.id).toBe('2644292');
  expect(dernierResultat(club, 'u11-mixte-3')).toBeUndefined();
});

test('match par identifiant', () => {
  expect(matchParId(club, '2644292')?.equipe.id).toBe('32542-clamart-handball-1');
  expect(matchParId(club, 'inexistant')).toBeUndefined();
});

test('score en attente : match commencé sans résultat', () => {
  const m = matchsDuWeekend(club, W_10_11).find((x) => x.equipe.collectif === 'u11-mixte-3')!;
  expect(scoreEnAttente(m, MAR_SOIR)).toBe(true);
  expect(scoreEnAttente(m, new Date('2026-10-09T12:00:00+02:00'))).toBe(false);
});

test('série en cours', () => {
  expect(serieEnCours(matchsDuCollectif(club, 'seniors-f-1'))).toEqual({ resultat: 'V', longueur: 3 });
  expect(serieEnCours(matchsDuCollectif(club, 'u13-f'))).toEqual({ resultat: 'D', longueur: 5 });
  expect(serieEnCours(matchsDuCollectif(club, 'u11-mixte-3'))).toBeUndefined();
});

test('jours avec matchs et jour par défaut', () => {
  const jours = joursAvecMatchs(club);
  expect(jours).toHaveLength(18);
  expect(jours[0]).toBe('2026-09-12');
  expect(jourParDefaut(jours, '2026-10-11')).toBe('2026-10-11');
  expect(jourParDefaut(jours, '2026-10-12')).toBe('2026-10-17');
  expect(jourParDefaut(jours, '2027-06-01')).toBe('2027-02-27');
  expect(jourParDefaut([], '2026-10-12')).toBeUndefined();
});

test('collectifs et matchs groupés par catégorie, seniors d’abord', () => {
  const groupes = collectifsParCategorie(club);
  expect(groupes.map((g) => g.titre)).toEqual(['Seniors', 'U18', 'U15', 'U13', 'U11']);
  expect(groupes[0].collectifs.map((c) => c.id)).toEqual(['seniors-f-1', 'seniors-f-1b', 'seniors-m']);
  expect(grouperParCategorie(matchsDuJour(club, '2026-10-11')).map((g) => g.titre)).toEqual(['Seniors', 'U13', 'U11']);
});

test('buteurs d’un collectif : seniors seulement', () => {
  const buteurs = buteursDuCollectif(club, 'seniors-f-1');
  expect(buteurs[0]).toEqual({ joueur: 'Diara DORILAS', buts: 38, matchs: 5 });
  expect(buteursDuCollectif(club, 'u18-f')).toEqual([]);
});
