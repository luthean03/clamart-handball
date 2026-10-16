import { club, DIM_SOIR, MAR_SOIR } from '../../test/donnees';
import {
  buteursClubAffichables, buteursDuCollectif, classementDuMatch, collectifsParCategorie, dernierResultat, equipePrincipale, equipesDuCollectif,
  grouperParCategorie, jourParDefaut, joursAvecMatchs, matchParId, matchsDuCollectif, matchsDuJour,
  prochainMatch, prochainMatchDate, prochainsMatchsClub, scoreEnAttente, serieEnCours,
} from './selecteurs';
import type { Club } from './types';

test('un collectif regroupe ses compétitions', () => {
  expect(equipesDuCollectif(club, 'seniors-m').map((e) => e.id)).toEqual([
    '32546-clamart-handball', '33403-clamart-handball', '33244-clamart-handball',
  ]);
  expect(equipePrincipale(club, 'seniors-m')?.id).toBe('32546-clamart-handball');
  expect(equipePrincipale(club, 'seniors-f-1')?.place).toBe(3);
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
  const m = matchsDuJour(club, '2026-10-10').find((x) => x.equipe.collectif === 'u11-mixte-3')!;
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

// Comparaison stricte : seule la valeur booléenne `true` ouvre l'affichage des noms (jamais une valeur « truthy »).
const sansConfiance = (valeur: unknown) => ({
  ...club,
  equipes: club.equipes.map((e) => ({ ...e, stats_joueurs: valeur as boolean })),
});

test('buteurs d’un collectif : stats_joueurs doit valoir exactement true', () => {
  expect(buteursDuCollectif(sansConfiance('false'), 'seniors-f-1')).toEqual([]);
  expect(buteursDuCollectif(sansConfiance(1), 'seniors-f-1')).toEqual([]);
  expect(buteursDuCollectif(sansConfiance(undefined), 'seniors-f-1')).toEqual([]);
});

test('buteurs du club affichables : stats_joueurs doit valoir exactement true', () => {
  expect(buteursClubAffichables(sansConfiance('false'))).toEqual([]);
  expect(buteursClubAffichables(sansConfiance(1))).toEqual([]);
});

describe('buteursClubAffichables', () => {
  const avec = (equipes: string[]) => ({ ...club, buteurs_club: [{ ...club.buteurs_club![0], equipes }, ...club.buteurs_club!.slice(1)] });

  test('données réelles : tous les buteurs du club sont conservés', () => {
    expect(buteursClubAffichables(club)).toHaveLength(42);
  });

  test('une équipe sans statistiques de joueurs exclut le buteur', () => {
    const liste = buteursClubAffichables(avec(['U18 F']));
    expect(liste).toHaveLength(41);
    expect(liste.map((b) => b.joueur)).not.toContain(club.buteurs_club![0].joueur);
  });

  test('une équipe inconnue exclut le buteur', () => {
    expect(buteursClubAffichables(avec(['Équipe inconnue']))).toHaveLength(41);
  });

  test('toutes les équipes citées doivent être sûres', () => {
    expect(buteursClubAffichables(avec(['Seniors M', 'U18 F']))).toHaveLength(41);
  });

  test('un nom partagé par une équipe sans statistiques n’est pas de confiance', () => {
    const premiere = club.equipes.findIndex((e) => e.nom === 'Seniors M');
    const equipes = club.equipes.map((e, i) => (i === premiere ? { ...e, stats_joueurs: false } : e));
    expect(buteursClubAffichables({ ...club, equipes }).every((b) => !b.equipes.includes('Seniors M'))).toBe(true);
  });
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
