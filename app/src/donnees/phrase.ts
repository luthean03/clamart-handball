import type { Match, Resultat } from './types';

const MINUSCULES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'sur', 'en', 'au', 'aux']);
/** Articles élidés : minuscule seulement devant une apostrophe (D'ISSY, L'HAY). */
const ELISIONS = new Set(['d', 'l']);
const ABREVIATIONS = new Set(['st', 'ste']);
const SIGLES = new Set([
  'AC', 'AS', 'ASV', 'ASM', 'US', 'USM', 'UC', 'ES', 'CA', 'CO', 'OC', 'SO', 'CSM', 'AAS',
  'SCUF', 'COM', 'ASPTT', 'ASC', 'USO', 'USMT', 'PUC', 'CSA', 'ACBB',
]);
const ROMAINS = new Set(['I', 'II', 'III', 'IV']);
const SEPARATEUR = /^[\s\-/.'’()]+$/;

/** Nom FFHB en capitales → nom lisible. Sigles (SC, HB, ASV…), numéros et chiffres romains conservés. */
export function nomLisible(brut: string): string {
  const morceaux = brut.trim().split(/([\s\-/.'’()]+)/);
  let premier = true;
  return morceaux
    .map((morceau, i) => {
      if (!morceau || SEPARATEUR.test(morceau)) return morceau;
      const estPremier = premier;
      premier = false;
      if (/\d/.test(morceau) || ROMAINS.has(morceau)) return morceau;
      const bas = morceau.toLowerCase();
      if (!estPremier && MINUSCULES.has(bas)) return bas;
      const elision = /^['’]/.test(morceaux[i + 1] ?? '');
      if (!estPremier && elision && ELISIONS.has(bas)) return bas;
      const capitale = bas.charAt(0).toUpperCase() + bas.slice(1);
      if (ABREVIATIONS.has(bas)) return capitale;
      const enCapitales = morceau === morceau.toUpperCase();
      if (enCapitales && (SIGLES.has(morceau) || (morceau.length <= 3 && !/[AEIOUY]/.test(morceau)))) return morceau;
      return capitale;
    })
    .join('');
}

export interface Phrase {
  titre: string;
  sousTitre?: string;
}

/** Signature de l'app : le résultat dit en une phrase. Jamais d'adjectif sur une défaite. */
export function phraseResultat(
  m: Pick<Match, 'resultat' | 'score_nous' | 'score_eux' | 'adversaire'>,
  serie?: { resultat: Resultat; longueur: number } | null,
): Phrase | undefined {
  if (!m.resultat || m.score_nous === null || m.score_eux === null) return undefined;
  const adversaire = nomLisible(m.adversaire);
  const dUnBut = Math.abs(m.score_nous - m.score_eux) === 1 ? " d'un but" : '';
  const titre =
    m.resultat === 'N'
      ? `Match nul contre ${adversaire}`
      : `${m.resultat === 'V' ? 'Victoire' : 'Défaite'}${dUnBut} contre ${adversaire}`;
  if (m.resultat === 'V' && serie?.resultat === 'V' && serie.longueur >= 3) {
    return { titre, sousTitre: `${serie.longueur}e victoire de suite` };
  }
  return { titre };
}

export const scoreTexte = (m: Pick<Match, 'score_nous' | 'score_eux'>) => `${m.score_nous}–${m.score_eux}`;
export const ordinal = (n: number) => (n === 1 ? '1er' : `${n}e`);

const INSECABLE = ' ';

/**
 * Affichage seulement : lie le dernier jeton numérique (« 1 », « 1B », « 3 ») au mot qui le précède par une
 * espace insécable, pour qu'un numéro d'équipe ne reste jamais seul en début de ligne.
 */
export function lierNumero(texte: string): string {
  return texte.replace(/ (\d+[A-Za-z]?)$/, `${INSECABLE}$1`);
}

/** `nomLisible` prêt à afficher. Le contrat de `nomLisible` (partagé avec le notifieur) ne change pas. */
export const nomAffiche = (brut: string) => lierNumero(nomLisible(brut));

/** « 3e sur 11 » sans coupure possible. */
export const rangAffiche = (place: number, nbEquipes: number) =>
  `${ordinal(place)}${INSECABLE}sur${INSECABLE}${nbEquipes}`;

/** Monogramme décoratif d'un adversaire sans écusson : initiales des deux premiers mots significatifs. */
export function initiales(nom: string): string {
  const mots = nom.split(/[\s\-/.'’()]+/).filter((m) => /^\p{Lu}/u.test(m));
  if (mots.length === 0) return '';
  const lettres = mots.length === 1 ? mots[0].slice(0, 2) : mots[0][0] + mots[1][0];
  return lettres.toUpperCase();
}

/**
 * Affichage seulement : espace de largeur nulle après chaque trait d'union entre deux lettres. Android ne coupe pas
 * une ligne après un trait d'union quand la césure automatique est désactivée : sans cela, « Boulogne-Billancourt »
 * est coupé en plein mot. Les libellés lus (lecteurs d'écran) gardent le texte d'origine.
 */
export const permettreCesure = (texte: string) =>
  texte.replace(/([A-Za-z\u00C0-\u00FF])-(?=[A-Za-z\u00C0-\u00FF])/g, '$1-\u200B');
