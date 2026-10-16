export type Autorisation = 'inconnue' | 'accordee' | 'refusee';

export interface PrefsNotifications {
  notifResultats: boolean;
  rappels: boolean;
  autorisation: Autorisation;
}

/** Sujets FCM auxquels le téléphone doit être abonné. Rien si Android a refusé les notifications. */
export function sujetsAttendus(suivis: string[], prefs: PrefsNotifications): string[] {
  if (prefs.autorisation === 'refusee') return [];
  return suivis.flatMap((id) => [
    ...(prefs.notifResultats ? [`resultats-${id}`] : []),
    ...(prefs.rappels ? [`rappels-${id}`] : []),
  ]);
}

/** Ré-abonne tout l'attendu (idempotent, répare un état perdu) et désabonne ce qui ne l'est plus. */
export function planAbonnements(attendus: string[], actuels: string[]) {
  return { abonner: [...attendus], desabonner: actuels.filter((s) => !attendus.includes(s)) };
}
