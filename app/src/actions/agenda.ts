import { equipesDuCollectif } from '../donnees/selecteurs';
import type { Club, MatchAvecEquipe } from '../donnees/types';
import { evenementAgenda } from './actions';

export type Appli = 'google' | 'apple' | 'ics';

const GOOGLE = 'https://calendar.google.com/calendar/render';

/** Google veut des dates UTC compactes : 20261018T133000Z. */
const dateGoogle = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Un seul match : fichier .ics du match (Apple et .ics), ou événement Google prérempli. */
export function lienMatch(appli: Appli, m: MatchAvecEquipe, base: string): string {
  if (appli !== 'google') return `${base}match/${m.equipe.id}-${m.id}.ics`;
  const e = evenementAgenda(m);
  const champs = [
    ['action', 'TEMPLATE'],
    ['text', e.title],
    ['dates', `${dateGoogle(e.startDate)}/${dateGoogle(e.endDate)}`],
    ...(e.location ? [['location', e.location]] : []),
  ];
  return `${GOOGLE}?${champs.map(([cle, valeur]) => `${cle}=${encodeURIComponent(valeur)}`).join('&')}`;
}

/** Une compétition d'un collectif : numéro FFHB (début de l'identifiant d'équipe) et libellé affiché. */
export interface Competition {
  competitionId: string;
  detail: string;
}

/** Les compétitions d'un collectif (une équipe par compétition), dans l'ordre du club. */
export function competitionsDuCollectif(club: Club, collectifId: string): Competition[] {
  const vues = new Set<string>();
  const competitions: Competition[] = [];
  for (const e of equipesDuCollectif(club, collectifId)) {
    const competitionId = e.id.match(/^\d+/)?.[0];
    if (!competitionId || vues.has(competitionId)) continue;
    vues.add(competitionId);
    competitions.push({ competitionId, detail: e.detail });
  }
  return competitions;
}

/** Calendrier officiel FFHB d'une compétition pour le club : webcal (Apple), abonnement Google, ou fichier .ics. */
export function lienCompetitionFfhb(appli: Appli, competitionId: string, clubId: string): string {
  const fichier = `https://competition-calendar.ffhandball.fr/c-${competitionId}/s-${clubId}.ics`;
  if (appli === 'ics') return fichier;
  const abonnement = fichier.replace(/^https:/, 'webcal:');
  return appli === 'apple' ? abonnement : `${GOOGLE}?cid=${encodeURIComponent(abonnement)}`;
}
