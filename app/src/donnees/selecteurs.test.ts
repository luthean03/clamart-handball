import { club, MAR_SOIR } from '../../test/donnees';
import {
  classementDuMatch, collectifsParCategorie, equipePrincipale, equipesDuCollectif,
  matchParId, matchsDuCollectif, prochainMatchDate, prochainsMatchsClub, scoreEnAttente, serieEnCours, tousLesMatchs,
} from './selecteurs';
import type { Club } from './types';

test('un collectif regroupe ses compétitions', () => {
  expect(equipesDuCollectif(club, 'seniors-m').map((e) => e.id)).toEqual([
    '32546-clamart-handball', '33403-clamart-handball', '33244-clamart-handball',
  ]);
  expect(equipePrincipale(club, 'seniors-m')?.id).toBe('32546-clamart-handball');
  expect(equipePrincipale(club, 'seniors-f-1')?.place).toBe(3);
});

test('les matchs sans date sont en fin de liste', () => {
  const matchs = matchsDuCollectif(club, 'seniors-f-1');
  expect(matchs[0].date).not.toBeNull();
  expect(matchs[matchs.length - 1].date).toBeNull();
});

test('match par identifiant', () => {
  expect(matchParId(club, '2644292')?.equipe.id).toBe('32542-clamart-handball-1');
  expect(matchParId(club, 'inexistant')).toBeUndefined();
});

test('score en attente : match commencé sans résultat', () => {
  const m = tousLesMatchs(club).find((x) => x.date?.startsWith('2026-10-10') && x.equipe.collectif === 'u11-mixte-3')!;
  expect(scoreEnAttente(m, MAR_SOIR)).toBe(true);
  expect(scoreEnAttente(m, new Date('2026-10-09T12:00:00+02:00'))).toBe(false);
});

test('série en cours', () => {
  expect(serieEnCours(matchsDuCollectif(club, 'seniors-f-1'))).toEqual({ resultat: 'V', longueur: 3 });
  expect(serieEnCours(matchsDuCollectif(club, 'u13-f'))).toEqual({ resultat: 'D', longueur: 5 });
  expect(serieEnCours(matchsDuCollectif(club, 'u11-mixte-3'))).toBeUndefined();
});

test('collectifs groupés par catégorie, seniors d’abord', () => {
  const groupes = collectifsParCategorie(club);
  expect(groupes.map((g) => g.titre)).toEqual(['Seniors', 'U18', 'U15', 'U13', 'U11']);
  expect(groupes[0].collectifs.map((c) => c.id)).toEqual(['seniors-f-1', 'seniors-f-1b', 'seniors-m']);
});

test('matchParId préfère l’équipe du lien', () => {
  const derby: Club = JSON.parse(JSON.stringify(club));
  const copie = { ...derby.equipes[0].matchs[0] }; // même id et même date : seul l'équipe diffère
  derby.equipes[1].matchs.push(copie);
  const id = derby.equipes[0].matchs[0].id;
  expect(matchParId(derby, id, derby.equipes[1].id)?.equipe.id).toBe(derby.equipes[1].id);
  expect(matchParId(derby, id)?.equipe.id).toBe(derby.equipes[0].id);
  expect(matchParId(derby, id, 'equipe-inconnue')?.equipe.id).toBe(derby.equipes[0].id);
});

describe('prochain match daté', () => {
  test('le plus proche match daté, toutes compétitions', () => {
    // la coupe (18 oct.) passe avant le prochain match de championnat (8 nov.)
    expect(prochainMatchDate(club, 'seniors-f-1', MAR_SOIR)?.equipe.competition).toMatch(/COUPE DE FRANCE/);
    expect(prochainMatchDate(club, 'seniors-f-1', MAR_SOIR)?.date).toBe('2026-10-18T15:30:00+02:00');
    expect(prochainMatchDate(club, 'seniors-m', MAR_SOIR)?.date).toBe('2026-10-17T18:00:00+02:00');
  });

  test('ignore les matchs sans date', () => {
    expect(prochainMatchDate(club, 'u18-m', MAR_SOIR)).toBeUndefined();
    expect(prochainMatchDate(club, 'u13-f', MAR_SOIR)).toBeUndefined();
  });

  test('ignore les matchs déjà passés avec un jour antérieur', () => {
    expect(prochainMatchDate(club, 'seniors-m', new Date('2026-12-07T12:00:00+01:00'))?.date).toBe('2027-02-27T18:45:00+01:00');
  });

  test('garde le match du jour sans résultat', () => {
    const jour: Club = JSON.parse(JSON.stringify(club));
    const equipe = jour.equipes.find((e) => e.collectif === 'u18-m')!;
    equipe.matchs[0] = { ...equipe.matchs[0], date: '2026-10-16T10:00:00+02:00', resultat: null };
    const apresCoupDEnvoi = new Date('2026-10-16T15:00:00+02:00');
    expect(prochainMatchDate(jour, 'u18-m', apresCoupDEnvoi)?.id).toBe(equipe.matchs[0].id);
    // et plus le lendemain
    expect(prochainMatchDate(jour, 'u18-m', new Date('2026-10-17T09:00:00+02:00'))).toBeUndefined();
  });
});

test('classementDuMatch : place dans la compétition du match, absent pour la coupe', () => {
  const coupe = prochainMatchDate(club, 'seniors-m', MAR_SOIR)!;
  expect(classementDuMatch(coupe)).toBeUndefined();
  const championnat = prochainMatchDate(club, 'seniors-m', new Date('2026-10-20T12:00:00+02:00'))!;
  expect(championnat.equipe.competition).toMatch(/DIVISION 2/);
  expect(classementDuMatch(championnat)).toEqual({ place: 3, nb: 7 });
  expect(classementDuMatch({ ...championnat, equipe: { ...championnat.equipe, classement: [] } })).toBeUndefined();
  expect(classementDuMatch({ ...championnat, equipe: { ...championnat.equipe, classement: null } })).toBeUndefined();
});

test('prochainsMatchsClub : 5 au plus, datés, sans résultat, dans l’ordre', () => {
  const matchs = prochainsMatchsClub(club, MAR_SOIR);
  expect(matchs).toHaveLength(5);
  expect(matchs.every((m) => m.date !== null && m.resultat === null)).toBe(true);
  const dates = matchs.map((m) => m.date!);
  expect([...dates].sort((a, b) => Date.parse(a) - Date.parse(b))).toEqual(dates);
  expect(dates[0]).toBe('2026-10-17T18:00:00+02:00');
  expect(prochainsMatchsClub(club, MAR_SOIR, 2)).toHaveLength(2);
  expect(prochainsMatchsClub(club, new Date('2027-07-01T12:00:00+02:00'))).toEqual([]);
});
