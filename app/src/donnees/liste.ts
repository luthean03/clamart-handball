import { jourDuMatch, joursDuMois, moisSuivant, rangDansLaSemaine } from './dates';
import type { MatchAvecEquipe } from './types';

/** Une ligne de la liste Matchs : en-tête de jour, trait « Aujourd'hui » ou match. */
export type ElementListe = { type: 'jour'; jour: string } | { type: 'aujourdhui' } | { type: 'match'; match: MatchAvecEquipe };

/** Matchs datés regroupés par jour (Paris), jours croissants, matchs dans l'ordre des coups d'envoi. Les non datés sont écartés. */
export function matchsParJour(matchs: MatchAvecEquipe[]): { jour: string; matchs: MatchAvecEquipe[] }[] {
  const dates = matchs.filter((m): m is MatchAvecEquipe & { date: string } => m.date !== null);
  dates.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const parJour = new Map<string, MatchAvecEquipe[]>();
  for (const m of dates) {
    const jour = jourDuMatch(m.date);
    parJour.set(jour, [...(parJour.get(jour) ?? []), m]);
  }
  return [...parJour.keys()].sort().map((jour) => ({ jour, matchs: parJour.get(jour)! }));
}

/**
 * Toute la saison, jour par jour, avec un seul trait « Aujourd'hui » placé avant le premier jour ≥ aujourd'hui
 * (à la fin si la saison est finie). Vide s'il n'y a aucun match daté.
 */
export function elementsListeMatchs(matchs: MatchAvecEquipe[], aujourdhui: string): ElementListe[] {
  const jours = matchsParJour(matchs);
  if (jours.length === 0) return [];
  const elements: ElementListe[] = [];
  let trait = false;
  for (const { jour, matchs: duJour } of jours) {
    if (!trait && jour >= aujourdhui) {
      elements.push({ type: 'aujourdhui' });
      trait = true;
    }
    elements.push({ type: 'jour', jour }, ...duJour.map((match) => ({ type: 'match' as const, match })));
  }
  if (!trait) elements.push({ type: 'aujourdhui' });
  return elements;
}

/** Position du trait « Aujourd'hui », -1 si la liste est vide. */
export const indexAujourdhui = (elements: ElementListe[]): number => elements.findIndex((e) => e.type === 'aujourdhui');

/** Mois 'AAAA-MM' du premier au dernier mois ayant un match daté, mois sans match inclus. */
export function moisDeLaSaison(matchs: MatchAvecEquipe[]): string[] {
  const mois = matchs.flatMap((m) => (m.date ? [m.date.slice(0, 7)] : [])).sort();
  if (mois.length === 0) return [];
  const resultat = [mois[0]];
  while (resultat[resultat.length - 1] < mois[mois.length - 1]) resultat.push(moisSuivant(resultat[resultat.length - 1]));
  return resultat;
}

/** Mois d'ouverture de la vue mois : celui d'aujourd'hui, sinon le mois de la saison le plus proche. */
export function moisInitial(mois: string[], aujourdhui: string): string | undefined {
  if (mois.length === 0) return undefined;
  const courant = aujourdhui.slice(0, 7);
  return courant < mois[0] ? mois[0] : courant > mois[mois.length - 1] ? mois[mois.length - 1] : courant;
}

/** Semaines du mois, du lundi au dimanche : `jour` null hors du mois, `nb` = nombre de matchs datés ce jour-là. */
export function grilleMois(mois: string, matchs: MatchAvecEquipe[]): { jour: string | null; nb: number }[][] {
  const nb = new Map<string, number>();
  for (const m of matchs) {
    if (!m.date) continue;
    const jour = jourDuMatch(m.date);
    nb.set(jour, (nb.get(jour) ?? 0) + 1);
  }
  const jours = joursDuMois(mois);
  const cases: { jour: string | null; nb: number }[] = [
    ...Array.from({ length: rangDansLaSemaine(jours[0]) }, () => ({ jour: null, nb: 0 })),
    ...jours.map((jour) => ({ jour, nb: nb.get(jour) ?? 0 })),
  ];
  while (cases.length % 7) cases.push({ jour: null, nb: 0 });
  return Array.from({ length: cases.length / 7 }, (_, i) => cases.slice(i * 7, i * 7 + 7));
}
