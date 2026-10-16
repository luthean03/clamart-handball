import { club } from '../../test/donnees';
import { matchParId } from '../donnees/selecteurs';
import type { MatchAvecEquipe } from '../donnees/types';
import { lienMatch, lienSaison } from './agenda';

const base = 'https://luthean03.github.io/clamart-handball/data/agenda/';
/** Seniors F 1 à l'extérieur contre Cellois HB, le dimanche 18 octobre 2026 à 15 h 30. */
const m: MatchAvecEquipe = { ...matchParId(club, '2729291')!, date: '2026-10-18T15:30:00+02:00', equipe: { ...matchParId(club, '2729291')!.equipe, id: 'E1' } };

test('saison : .ics, Apple en webcal, Google par abonnement', () => {
  expect(lienSaison('ics', 'seniors-f-1', base)).toBe(`${base}seniors-f-1.ics`);
  expect(lienSaison('apple', 'seniors-f-1', base)).toBe('webcal://luthean03.github.io/clamart-handball/data/agenda/seniors-f-1.ics');
  expect(lienSaison('google', 'seniors-f-1', base)).toBe(
    'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent('webcal://luthean03.github.io/clamart-handball/data/agenda/seniors-f-1.ics'),
  );
});

test('ce match : fichier .ics du match pour Apple et .ics', () => {
  expect(lienMatch('ics', m, base)).toBe(`${base}match/E1-2729291.ics`);
  expect(lienMatch('apple', m, base)).toBe(`${base}match/E1-2729291.ics`);
});

test('ce match : Google Agenda prérempli en UTC', () => {
  const u = new URL(lienMatch('google', m, base));
  expect(u.origin + u.pathname).toBe('https://calendar.google.com/calendar/render');
  expect(u.searchParams.get('action')).toBe('TEMPLATE');
  expect(u.searchParams.get('text')).toBe('Cellois HB – Clamart Seniors F 1');
  expect(u.searchParams.get('dates')).toBe('20261018T133000Z/20261018T150000Z');
});

test('lien Google d’un match après le changement d’heure', () => {
  const u = new URL(lienMatch('google', { ...m, date: '2026-10-25T15:00:00+01:00' }, base));
  expect(u.searchParams.get('dates')).toBe('20261025T140000Z/20261025T153000Z');
});

test('lien Google : le lieu est transmis quand la salle est connue, absent sinon', () => {
  const avec = new URL(lienMatch('google', { ...m, salle: { nom: 'GYMNASE DU PETIT CLAMART', adresse: '1 RUE DE L’EXEMPLE 92140 CLAMART' } }, base));
  expect(avec.searchParams.get('location')).toBe('Gymnase du Petit Clamart, 1 RUE DE L’EXEMPLE 92140 CLAMART');
  const sans = new URL(lienMatch('google', { ...m, salle: null }, base));
  expect(sans.searchParams.has('location')).toBe(false);
});
