import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as { urlDonnees?: string };

/** club.json publié par le Plan 1 (app.json → extra.urlDonnees). */
export const URL_DONNEES: string = extra.urlDonnees ?? '';
/** Dossier des agendas .ics publiés à côté de club.json. */
export const URL_AGENDAS: string = URL_DONNEES.replace(/club\.json$/, 'agenda/');
export const VERSION_SCHEMA_MIN = 2;
export const VERSION_SCHEMA_MAX = 3;
export const URL_PLAY_STORE = 'market://details?id=fr.clamarthandball.app';
