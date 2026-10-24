import { jourDuMatch, jourLocal } from './dates';
import type { Club, Collectif, Equipe, Match, MatchAvecEquipe, Resultat } from './types';

const instant = (m: Match) => (m.date ? Date.parse(m.date) : Number.POSITIVE_INFINITY);

export function equipesDuCollectif(club: Club, id: string): Equipe[] {
  return club.equipes.filter((e) => e.collectif === id);
}

export function equipePrincipale(club: Club, id: string): Equipe | undefined {
  const equipes = equipesDuCollectif(club, id);
  return equipes.find((e) => e.classement) ?? equipes[0];
}

export function tousLesMatchs(club: Club): MatchAvecEquipe[] {
  return club.equipes
    .flatMap((equipe) => equipe.matchs.map((m) => ({ ...m, equipe })))
    .sort((a, b) => instant(a) - instant(b));
}

export const matchsDuCollectif = (club: Club, id: string) =>
  tousLesMatchs(club).filter((m) => m.equipe.collectif === id);

export const matchParId = (club: Club, id: string, equipeId?: string) => {
  const matchs = tousLesMatchs(club).filter((m) => m.id === id);
  return matchs.find((m) => m.equipe.id === equipeId) ?? matchs[0];
};

/** Matchs à venir d'une liste triée : datés, sans résultat, dont le jour (Paris) est aujourd'hui ou après. */
const aVenir = (matchs: MatchAvecEquipe[], maintenant: Date) => {
  const aujourdhui = jourLocal(maintenant);
  return matchs.filter((m) => m.date !== null && m.resultat === null && jourDuMatch(m.date) >= aujourdhui);
};

/** Prochain match daté d'un collectif, toutes compétitions : celui du jour reste affiché après son coup d'envoi. */
export const prochainMatchDate = (club: Club, collectif: string, maintenant: Date): MatchAvecEquipe | undefined =>
  aVenir(matchsDuCollectif(club, collectif), maintenant)[0];

/** Les n prochains matchs du club, toutes équipes, dans l'ordre. */
export const prochainsMatchsClub = (club: Club, maintenant: Date, n = 5): MatchAvecEquipe[] =>
  aVenir(tousLesMatchs(club), maintenant).slice(0, n);

/** Les n prochains matchs des équipes suivies, toutes équipes mêlées, dans l'ordre : une carte chacun sur l'accueil. */
export const prochainsMatchsSuivis = (club: Club, suivis: string[], maintenant: Date, n = 5): MatchAvecEquipe[] =>
  aVenir(tousLesMatchs(club).filter((m) => suivis.includes(m.equipe.collectif)), maintenant).slice(0, n);

/** Place au classement de la compétition du match ; absente pour une compétition sans classement (coupe). */
export function classementDuMatch(m: MatchAvecEquipe): { place: number; nb: number } | undefined {
  const { classement, place, nb_equipes } = m.equipe;
  if (!classement?.length || place == null || nb_equipes == null) return undefined;
  return { place, nb: nb_equipes };
}

/** Match commencé dont le score n'est pas encore publié sur la FFHB. */
export const scoreEnAttente = (m: Match, maintenant: Date) =>
  m.resultat === null && m.date !== null && Date.parse(m.date) < maintenant.getTime();

export function serieEnCours(matchs: Match[]): { resultat: Resultat; longueur: number } | undefined {
  const joues = matchs.filter((m) => m.resultat !== null);
  const dernier = joues[joues.length - 1]?.resultat;
  if (!dernier) return undefined;
  let longueur = 0;
  for (let i = joues.length - 1; i >= 0 && joues[i].resultat === dernier; i--) longueur++;
  return { resultat: dernier, longueur };
}

export const formeRecente = (matchs: Match[], n = 5): Resultat[] =>
  matchs.filter((m) => m.resultat !== null).slice(-n).map((m) => m.resultat as Resultat);

export const libelleCategorie = (c: string) => (c === 'seniors' ? 'Seniors' : c);
/** Seniors, puis U18, U15, U13, U11… */
export const rangCategorie = (c: string) => (c === 'seniors' ? 0 : 100 - Number(c.replace(/\D/g, '') || 0));

export function collectifsParCategorie(club: Club) {
  const categories = [...new Set(club.collectifs.map((c) => c.categorie))].sort(
    (a, b) => rangCategorie(a) - rangCategorie(b),
  );
  return categories.map((categorie) => ({
    categorie,
    titre: libelleCategorie(categorie),
    collectifs: club.collectifs
      .filter((c): c is Collectif => c.categorie === categorie)
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true })),
  }));
}
