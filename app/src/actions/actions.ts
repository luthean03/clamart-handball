import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';
import { nomLisible } from '../donnees/phrase';
import type { MatchAvecEquipe, Salle } from '../donnees/types';

const DUREE_MATCH_MS = 90 * 60 * 1000;
const requeteSalle = (salle: Salle) => [salle.nom, salle.adresse].filter(Boolean).join(', ');

export function urlItineraire(salle: Salle, os: string = Platform.OS): string {
  const q = encodeURIComponent(requeteSalle(salle));
  return os === 'ios' ? `maps:?q=${q}` : `geo:0,0?q=${q}`;
}

export async function ouvrirItineraire(salle: Salle): Promise<void> {
  try {
    await Linking.openURL(urlItineraire(salle));
  } catch {
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(requeteSalle(salle))}`);
  }
}

export function evenementAgenda(m: MatchAvecEquipe) {
  const debut = new Date(m.date!);
  const adversaire = nomLisible(m.adversaire);
  const nous = `Clamart ${m.equipe.nom}`;
  const salle = m.salle?.nom ? [nomLisible(m.salle.nom), m.salle.adresse].filter(Boolean).join(', ') : undefined;
  return {
    title: m.domicile ? `${nous} – ${adversaire}` : `${adversaire} – ${nous}`,
    startDate: debut,
    endDate: new Date(debut.getTime() + DUREE_MATCH_MS),
    location: salle,
    notes: m.url_ffhb,
    timeZone: 'Europe/Paris' as const,
  };
}

export const ouvrirLien = (url: string) => WebBrowser.openBrowserAsync(url);
/** Ouvre une adresse dans l'application qui la gère (Google Agenda, Calendrier, téléchargement du .ics…). */
export const ouvrirExterne = (url: string) => Linking.openURL(url);

/** Les actions rendent une promesse : un refus (pas de navigateur, pas d'agenda) ne doit jamais devenir une rejection non gérée. */
export const sansRejet = (action: () => Promise<unknown>) => {
  action().catch(() => {});
};
