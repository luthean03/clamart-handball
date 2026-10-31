import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Club } from '../donnees/types';
import type { Autorisation } from '../notifications/sujets';

/** Apparence de l'app : suit le téléphone (`auto`) ou force la palette claire ou sombre. */
export type Apparence = 'auto' | 'clair' | 'sombre';

interface EtatSuivi {
  /** Ids de collectifs suivis (ex. 'seniors-m'). */
  suivis: string[];
  bienvenueFaite: boolean;
  /** Collectifs retirés car absents des données, à signaler dans Réglages. */
  retires: string[];
  /** Saison des données à laquelle correspondent les suivis (null tant qu'elle n'est pas connue). */
  saison: string | null;
  /** Notifications de résultats des équipes suivies. */
  notifResultats: boolean;
  /** Rappels avant match des équipes suivies. */
  rappels: boolean;
  /** Changements de programme des équipes suivies (nouveau match, date, heure, salle). */
  programme: boolean;
  /** Sujets FCM réellement abonnés sur ce téléphone. */
  sujets: string[];
  /** Autorisation de notifications accordée par Android (ou non encore demandée). */
  autorisation: Autorisation;
  /** Thème choisi dans Réglages. */
  apparence: Apparence;
  /** Non persisté : vrai une fois la relecture terminée, succès ou échec. */
  pret: boolean;
  basculer: (id: string) => void;
  definirSuivis: (ids: string[]) => void;
  terminerBienvenue: () => void;
  retirerInconnus: (valides: string[]) => string[];
  synchroniserSaison: (saison: string, valides: string[]) => string[];
  effacerRetires: () => void;
  setNotifResultats: (b: boolean) => void;
  setRappels: (b: boolean) => void;
  setProgramme: (b: boolean) => void;
  setSujets: (s: string[]) => void;
  setAutorisation: (a: Autorisation) => void;
  setApparence: (a: Apparence) => void;
}

export const useSuivi = create<EtatSuivi>()(
  persist(
    (set, get) => ({
      suivis: [],
      bienvenueFaite: false,
      retires: [],
      saison: null,
      notifResultats: true,
      rappels: false,
      programme: true,
      sujets: [],
      autorisation: 'inconnue',
      apparence: 'auto',
      pret: false,
      basculer: (id) =>
        set(({ suivis }) => ({ suivis: suivis.includes(id) ? suivis.filter((s) => s !== id) : [...suivis, id] })),
      definirSuivis: (ids) => set({ suivis: [...new Set(ids)] }),
      terminerBienvenue: () => set({ bienvenueFaite: true }),
      retirerInconnus: (valides) => {
        const { suivis, retires } = get();
        const absents = suivis.filter((s) => !valides.includes(s));
        if (absents.length) set({ suivis: suivis.filter((s) => valides.includes(s)), retires: [...retires, ...absents] });
        return absents;
      },
      // Seul un changement de saison peut faire disparaître des équipes : dans la même saison, un suivi n'est jamais retiré.
      synchroniserSaison: (saison, valides) => {
        const stockee = get().saison;
        if (stockee === null || stockee === saison) {
          if (stockee === null) set({ saison });
          return [];
        }
        set({ saison });
        return get().retirerInconnus(valides);
      },
      effacerRetires: () => set({ retires: [] }),
      setNotifResultats: (b) => set({ notifResultats: b }),
      setRappels: (b) => set({ rappels: b }),
      setProgramme: (b) => set({ programme: b }),
      setSujets: (s) => set({ sujets: s }),
      setAutorisation: (a) => set({ autorisation: a }),
      setApparence: (a) => set({ apparence: a }),
    }),
    {
      name: 'clamart-suivi',
      version: 5,
      storage: createJSONStorage(() => AsyncStorage),
      // Version 1 : pas de préférences de notifications, on prend les valeurs par défaut.
      // Version 2 → 3 : pas d'apparence choisie, elle reste automatique.
      // Version 3 → 4 : saison inconnue (null) ; elle est mémorisée au premier chargement des données, sans rien retirer.
      // Version 4 → 5 : changements de programme activés par défaut.
      migrate: (etat) => ({
        notifResultats: true,
        rappels: false,
        programme: true,
        sujets: [],
        autorisation: 'inconnue',
        apparence: 'auto',
        saison: null,
        ...(etat as object),
      }),
      partialize: ({ suivis, bienvenueFaite, retires, saison, notifResultats, rappels, programme, sujets, autorisation, apparence }) => ({
        suivis,
        bienvenueFaite,
        retires,
        saison,
        notifResultats,
        rappels,
        programme,
        sujets,
        autorisation,
        apparence,
      }),
      // Appelé aussi en cas d'échec de lecture (stockage illisible, JSON corrompu) : sans cela, pret resterait faux.
      onRehydrateStorage: () => () => useSuivi.setState({ pret: true }),
    },
  ),
);

/** Vrai quand les équipes suivies ont été relues depuis le téléphone (ou que la relecture a échoué). */
export function useSuiviPret(): boolean {
  return useSuivi((s) => s.pret);
}

/**
 * Rattache les équipes suivies à la saison des données. Elles ne sont retirées que si la saison a changé (une
 * équipe absente en cours de saison n'a pas disparu pour autant : panne de collecte) ; les écrans ignorent les
 * suivis absents des données. N'agit que si les suivis sont relus (`pret`) et que la collecte est sans erreur.
 */
export function nettoyerSuivis(
  club: Club | undefined,
  pret: boolean,
  synchroniser: (saison: string, valides: string[]) => unknown = (saison, valides) =>
    useSuivi.getState().synchroniserSaison(saison, valides),
): void {
  if (!club || !pret || (club.erreurs?.length ?? 0) > 0) return;
  synchroniser(club.saison, club.collectifs.map((c) => c.id));
}
