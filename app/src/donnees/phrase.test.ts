import cas from '../../../partage/phrases-cas.json';
import { initiales, lierNumero, permettreCesure, nomAffiche, nomLisible, ordinal, phraseResultat, rangAffiche } from './phrase';
import type { Match, Resultat } from './types';

type CasPhrase = {
  match: Pick<Match, 'resultat' | 'score_nous' | 'score_eux' | 'adversaire'>;
  serie: { resultat: Resultat; longueur: number } | null;
  attendu: { titre: string; sousTitre?: string } | null;
};

test.each(cas.noms)('nomLisible($brut)', ({ brut, attendu }) => {
  expect(nomLisible(brut)).toBe(attendu);
});

test.each(cas.phrases as CasPhrase[])('phraseResultat %#', ({ match, serie, attendu }) => {
  expect(phraseResultat(match, serie) ?? null).toEqual(attendu);
});

test('jamais de vocabulaire dévalorisant, même pour un gros écart', () => {
  const p = phraseResultat({ resultat: 'D', score_nous: 26, score_eux: 45, adversaire: 'PARIS ST-GERMAIN HB 3' });
  expect(p?.titre).toBe('Défaite contre Paris St-Germain HB 3');
});

test('ordinal', () => {
  expect(ordinal(1)).toBe('1er');
  expect(ordinal(3)).toBe('3e');
});

test('affichage : le numéro final reste collé au mot qui le précède', () => {
  expect(nomAffiche('PARIS SC 1D')).toBe('Paris SC\u00A01D');
  expect(nomAffiche('ENT. SURESNES / NANTERRE')).toBe('Ent. Suresnes / Nanterre');
  expect(nomAffiche('CLUB OLYMPIQUE MULTISPORT DE BAGNEUX 1')).toBe('Club Olympique Multisport de Bagneux\u00A01');
  expect(lierNumero('Seniors F 1')).toBe('Seniors F\u00A01');
  expect(lierNumero('U11 Mixte 3')).toBe('U11 Mixte\u00A03');
  expect(lierNumero("Défaite d'un but contre Levallois SC 1D")).toBe("Défaite d'un but contre Levallois SC\u00A01D");
  expect(lierNumero('Cellois HB')).toBe('Cellois HB');
  expect(lierNumero('Nanterre')).toBe('Nanterre');
  expect(lierNumero('U13')).toBe('U13');
});

test('affichage : nomLisible reste inchangé (contrat partagé avec le notifieur)', () => {
  expect(nomLisible('PARIS SC 1D')).toBe('Paris SC 1D');
});

test('rang affiché : espaces insécables', () => {
  expect(rangAffiche(3, 11)).toBe('3e\u00A0sur\u00A011');
  expect(rangAffiche(1, 12)).toBe('1er\u00A0sur\u00A012');
});

test('monogramme : deux initiales en capitales', () => {
  expect(initiales('Paris SC 1D')).toBe('PS');
  expect(initiales('Ent. Suresnes / Nanterre')).toBe('ES');
  expect(initiales('AC Boulogne-Billancourt 1B')).toBe('AB');
  expect(initiales('Club Olympique Multisport de Bagneux 1')).toBe('CO');
  expect(initiales('Nanterre')).toBe('NA');
  expect(initiales('Stade de France')).toBe('SF');
  expect(initiales('')).toBe('');
});

test('affichage : une coupure de ligne possible après chaque trait d’union, jamais en plein mot', () => {
  const zwsp = '\u200B';
  expect(permettreCesure('AC Boulogne-Billancourt 1B')).toBe(`AC Boulogne-${zwsp}Billancourt 1B`);
  expect(permettreCesure('Paris St-Germain HB')).toBe(`Paris St-${zwsp}Germain HB`);
  expect(permettreCesure('Ent. Suresnes / Nanterre')).toBe('Ent. Suresnes / Nanterre');
  expect(permettreCesure('Seniors F 1 - ')).toBe('Seniors F 1 - ');
});
