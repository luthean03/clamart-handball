const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const JOURS_LONGS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const deux = (n: number) => String(n).padStart(2, '0');

/** Les dates FFHB portent le décalage de Paris : la partie locale du texte est l'heure à afficher. */
export const jourDuMatch = (iso: string): string => iso.slice(0, 10);
export const heureDuMatch = (iso: string): string => iso.slice(11, 16);

const minuitUTC = (jour: string) => new Date(`${jour}T00:00:00Z`);
export const jourDeSemaine = (jour: string): number => minuitUTC(jour).getUTCDay();

export function decalerJour(jour: string, n: number): string {
  const d = minuitUTC(jour);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 'AAAA-MM-JJ' de l'instant, à l'heure de l'appareil. */
export function jourLocal(date: Date): string {
  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}`;
}

export interface Weekend {
  vendredi: string;
  samedi: string;
  dimanche: string;
}

/** Lundi et mardi : le week-end qui vient de se jouer. Du mercredi au dimanche : celui de la semaine. */
export function weekendDeReference(aujourdhui: string): Weekend {
  const js = jourDeSemaine(aujourdhui);
  const versSamedi = js === 0 ? -1 : js <= 2 ? -(js + 1) : 6 - js;
  const samedi = decalerJour(aujourdhui, versSamedi);
  return { vendredi: decalerJour(samedi, -1), samedi, dimanche: decalerJour(samedi, 1) };
}

export function libelleJour(jour: string, format: 'court' | 'long' = 'court'): string {
  const d = minuitUTC(jour);
  const nom = (format === 'long' ? JOURS_LONGS : JOURS_COURTS)[d.getUTCDay()];
  return `${nom} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`;
}

export function libelleWeekend(w: Weekend): string {
  const s = minuitUTC(w.samedi);
  const d = minuitUTC(w.dimanche);
  return s.getUTCMonth() === d.getUTCMonth()
    ? `${s.getUTCDate()}–${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`
    : `${s.getUTCDate()} ${MOIS[s.getUTCMonth()]}–${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`;
}

export function libelleMiseAJour(iso: string, maintenant: Date): string {
  const d = new Date(iso);
  const heure = `${deux(d.getHours())}:${deux(d.getMinutes())}`;
  return jourLocal(d) === jourLocal(maintenant)
    ? `mis à jour à ${heure}`
    : `mis à jour ${libelleJour(jourLocal(d))} à ${heure}`;
}

const TRENTE_SIX_HEURES = 36 * 60 * 60 * 1000;
export function donneesAnciennes(iso: string, maintenant: Date): boolean {
  return maintenant.getTime() - Date.parse(iso) > TRENTE_SIX_HEURES;
}

export function salutation(maintenant: Date): string {
  return maintenant.getHours() >= 18 ? 'Bonsoir !' : 'Bonjour !';
}
