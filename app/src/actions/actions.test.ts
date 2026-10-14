import * as Calendar from 'expo-calendar/legacy';
import { club } from '../../test/donnees';
import { matchParId } from '../donnees/selecteurs';
import { ajouterAgenda, evenementAgenda, urlAgenda, urlItineraire } from './actions';

// SDK 57 : l'export racine de expo-calendar lève une erreur à l'exécution ; l'API utilisable est dans /legacy.
jest.mock('expo-calendar/legacy', () => ({ createEventInCalendarAsync: jest.fn(() => Promise.resolve({ action: 'saved' })) }));

const salle = { nom: 'GYMNASE DU PETIT CLAMART', adresse: '1 RUE DE L’EXEMPLE 92140 CLAMART' };

test('itinéraire : géo sur Android, Plans sur iOS', () => {
  const q = encodeURIComponent('GYMNASE DU PETIT CLAMART, 1 RUE DE L’EXEMPLE 92140 CLAMART');
  expect(urlItineraire(salle, 'android')).toBe(`geo:0,0?q=${q}`);
  expect(urlItineraire(salle, 'ios')).toBe(`maps:?q=${q}`);
  expect(urlItineraire({ nom: 'VICTOR HUGO', adresse: null }, 'android')).toBe(`geo:0,0?q=${encodeURIComponent('VICTOR HUGO')}`);
});

test('événement d’agenda : match à domicile', () => {
  const m = matchParId(club, '2734038')!;
  const e = evenementAgenda(m);
  expect(e.title).toBe('Clamart Seniors M – Association Sportive St-Cyr/Fontenay Handball 78');
  expect(e.startDate.getTime()).toBe(Date.parse('2026-10-17T18:00:00+02:00'));
  expect(e.endDate.getTime() - e.startDate.getTime()).toBe(90 * 60 * 1000);
  expect(e.location?.startsWith('Gymnase du Petit Clamart')).toBe(true);
  expect(e.notes).toBe(m.url_ffhb);
});

test('événement d’agenda : match à l’extérieur', () => {
  expect(evenementAgenda(matchParId(club, '2729291')!).title).toBe('Cellois HB – Clamart Seniors F 1');
});

test('ajouterAgenda ouvre l’écran système', async () => {
  await ajouterAgenda(matchParId(club, '2729291')!);
  expect(Calendar.createEventInCalendarAsync).toHaveBeenCalledWith(expect.objectContaining({ title: 'Cellois HB – Clamart Seniors F 1' }));
});

test('url de l’agenda d’une équipe', () => {
  expect(urlAgenda('https://x.github.io/clamart-handball/data/agenda/', '32542-clamart-handball-1')).toBe(
    'https://x.github.io/clamart-handball/data/agenda/32542-clamart-handball-1.ics',
  );
});
