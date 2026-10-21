const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const JOURS_LONGS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const deux = (n: number) => String(n).padStart(2, '0');

/** Les dates FFHB portent le décalage de Paris : la partie locale du texte est l'heure à afficher. */
export const jourDuMatch = (iso: string): string => iso.slice(0, 10);
export const heureDuMatch = (iso: string): string => iso.slice(11, 16);

const minuitUTC = (jour: string) => new Date(`${jour}T00:00:00Z`);

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

/** « Sam. 17 octobre » : en-tête de jour des listes de matchs. */
export function titreJour(jour: string): string {
  const d = minuitUTC(jour);
  return `${JOURS_BANDEAU[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS_LONGS[d.getUTCMonth()]}`;
}

/** « samedi 7 novembre » : le même jour, en toutes lettres pour les lecteurs d'écran. */
export function jourLu(jour: string): string {
  const d = minuitUTC(jour);
  return `${JOURS_LONGS[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS_LONGS[d.getUTCMonth()]}`;
}

/** « Dim. 18 octobre » : le bandeau rouge ne porte que le jour, l'heure est affichée sous le VS. */
export function libelleBandeau(iso: string): string {
  return titreJour(jourDuMatch(iso));
}

/** « Octobre 2026 » pour '2026-10'. */
export function libelleMois(mois: string): string {
  const nom = MOIS_LONGS[Number(mois.slice(5, 7)) - 1];
  return `${nom[0].toUpperCase()}${nom.slice(1)} ${mois.slice(0, 4)}`;
}

/** '2027-01' pour '2026-12'. */
export function moisSuivant(mois: string): string {
  const d = new Date(Date.UTC(Number(mois.slice(0, 4)), Number(mois.slice(5, 7)), 1));
  return `${d.getUTCFullYear()}-${deux(d.getUTCMonth() + 1)}`;
}

/** Les 'AAAA-MM-JJ' d'un mois 'AAAA-MM', du 1er au dernier. */
export function joursDuMois(mois: string): string[] {
  const nb = new Date(Date.UTC(Number(mois.slice(0, 4)), Number(mois.slice(5, 7)), 0)).getUTCDate();
  return Array.from({ length: nb }, (_, i) => `${mois}-${deux(i + 1)}`);
}

/** Place du jour dans la semaine : 0 le lundi, 6 le dimanche. */
export const rangDansLaSemaine = (jour: string): number => (minuitUTC(jour).getUTCDay() + 6) % 7;

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
