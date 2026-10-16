import { getApp } from '@react-native-firebase/app';
import {
  getInitialNotification, getMessaging, onMessage, onNotificationOpenedApp, subscribeToTopic, unsubscribeFromTopic,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import type { Autorisation } from './sujets';
import type { ClientSujets } from './synchro';

export interface NotifRecue {
  titre?: string;
  corps?: string;
  donnees: Record<string, string>;
}

const messagerie = () => getMessaging(getApp());
const convertir = (m: RemoteMessage): NotifRecue => ({
  titre: m.notification?.title,
  corps: m.notification?.body,
  donnees: Object.fromEntries(Object.entries(m.data ?? {}).map(([k, v]) => [k, String(v)])),
});

export const clientFcm: ClientSujets = {
  abonner: (sujet) => subscribeToTopic(messagerie(), sujet),
  desabonner: (sujet) => unsubscribeFromTopic(messagerie(), sujet),
};

const PERMISSION = 'android.permission.POST_NOTIFICATIONS' as const;
const exigeAutorisation = () => Platform.OS === 'android' && Number(Platform.Version) >= 33;

export async function lireAutorisation(): Promise<Autorisation> {
  if (!exigeAutorisation()) return 'accordee';
  return (await PermissionsAndroid.check(PERMISSION)) ? 'accordee' : 'inconnue';
}

export async function demanderAutorisation(): Promise<Autorisation> {
  if (!exigeAutorisation()) return 'accordee';
  const r = await PermissionsAndroid.request(PERMISSION);
  return r === PermissionsAndroid.RESULTS.GRANTED ? 'accordee' : 'refusee';
}

export const ecouterPremierPlan = (cb: (n: NotifRecue) => void) => onMessage(messagerie(), async (m) => cb(convertir(m)));
export const ecouterOuverture = (cb: (n: NotifRecue) => void) => onNotificationOpenedApp(messagerie(), (m) => cb(convertir(m)));
export async function notificationInitiale(): Promise<NotifRecue | null> {
  const m = await getInitialNotification(messagerie());
  return m ? convertir(m) : null;
}
