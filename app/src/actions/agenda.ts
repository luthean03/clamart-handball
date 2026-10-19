import type { MatchAvecEquipe } from '../donnees/types';
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

/** Toute la saison : abonnement au calendrier du collectif (webcal pour Apple et Google), ou fichier .ics. */
export function lienSaison(appli: Appli, collectif: string, base: string): string {
  const fichier = `${base}${collectif}.ics`;
  if (appli === 'ics') return fichier;
  const abonnement = fichier.replace(/^https?:\/\//, 'webcal://');
  return appli === 'apple' ? abonnement : `${GOOGLE}?cid=${encodeURIComponent(abonnement)}`;
}
