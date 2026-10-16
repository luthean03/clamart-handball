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

export function libelleJour(jour: string, format: 'court' | 'long' = 'court'): string {
  const d = minuitUTC(jour);
  const nom = (format === 'long' ? JOURS_LONGS : JOURS_COURTS)[d.getUTCDay()];
  return `${nom} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`;
}

const JOURS_BANDEAU = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
const MOIS_LONGS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** « Dim. 18 octobre · 15:30 », en heure de Paris. */
export function libelleBandeau(iso: string): string {
  const jour = jourDuMatch(iso);
  const d = minuitUTC(jour);
  return `${JOURS_BANDEAU[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS_LONGS[d.getUTCMonth()]} · ${heureDuMatch(iso)}`;
}

/** « aujourd’hui », « demain » ou « dans N jours » entre deux 'AAAA-MM-JJ'. */
export function compteARebours(jourMatch: string, aujourdhui: string): string {
  const n = Math.round((minuitUTC(jourMatch).getTime() - minuitUTC(aujourdhui).getTime()) / 86_400_000);
  return n <= 0 ? 'aujourd’hui' : n === 1 ? 'demain' : `dans ${n} jours`;
}

/** « 17/10 », en heure de Paris. */
export const dateCourte = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

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
