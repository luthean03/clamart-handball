import fixture from '../../partage/fixtures/club-2026-10-13.json';
import type { Club } from '../src/donnees/types';

export const fixtureBrute = fixture;
/** Données réelles du 13/10/2026 (14 équipes, 11 collectifs). */
export const club = fixture as unknown as Club;
/** Dimanche 11 oct. 2026, 22 h 41 : le soir des matchs. */
export const DIM_SOIR = new Date('2026-10-11T22:41:00+02:00');
/** Mardi 13 oct. 2026, 19 h 05 : après la dernière collecte (16 h 41). */
export const MAR_SOIR = new Date('2026-10-13T19:05:00+02:00');
/** Mercredi 14 oct. 2026, midi : on regarde le week-end suivant. */
export const MER_MIDI = new Date('2026-10-14T12:00:00+02:00');
