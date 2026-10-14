import cas from '../../../partage/phrases-cas.json';
import { nomLisible, ordinal, phraseResultat, scoreTexte } from './phrase';
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

test('score et ordinal', () => {
  expect(scoreTexte({ score_nous: 32, score_eux: 22 })).toBe('32–22');
  expect(ordinal(1)).toBe('1er');
  expect(ordinal(3)).toBe('3e');
});
