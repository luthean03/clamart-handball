import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Club } from '../donnees/types';
import type { Autorisation } from '../notifications/sujets';

interface EtatSuivi {
  /** Ids de collectifs suivis (ex. 'seniors-m'). */
  suivis: string[];
  bienvenueFaite: boolean;
  /** Collectifs retirés car absents des données, à signaler dans Réglages. */
  retires: string[];
  /** Notifications de résultats des équipes suivies. */
  notifResultats: boolean;
  /** Rappels avant match des équipes suivies. */
  rappels: boolean;
  /** Sujets FCM réellement abonnés sur ce téléphone. */
  sujets: string[];
  /** Autorisation de notifications accordée par Android (ou non encore demandée). */
  autorisation: Autorisation;
  /** Non persisté : vrai une fois la relecture terminée, succès ou échec. */
  pret: boolean;
  basculer: (id: string) => void;
  definirSuivis: (ids: string[]) => void;
  terminerBienvenue: () => void;
  retirerInconnus: (valides: string[]) => string[];
  effacerRetires: () => void;
  setNotifResultats: (b: boolean) => void;
  setRappels: (b: boolean) => void;
  setSujets: (s: string[]) => void;
  setAutorisation: (a: Autorisation) => void;
}

export const useSuivi = create<EtatSuivi>()(
  persist(
    (set, get) => ({
      suivis: [],
      bienvenueFaite: false,
      retires: [],
      notifResultats: true,
      rappels: false,
      sujets: [],
      autorisation: 'inconnue',
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
      effacerRetires: () => set({ retires: [] }),
      setNotifResultats: (b) => set({ notifResultats: b }),
      setRappels: (b) => set({ rappels: b }),
      setSujets: (s) => set({ sujets: s }),
      setAutorisation: (a) => set({ autorisation: a }),
    }),
    {
      name: 'clamart-suivi',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // Version 1 : pas de préférences de notifications, on prend les valeurs par défaut.
      migrate: (etat) => ({
        notifResultats: true,
        rappels: false,
        sujets: [],
        autorisation: 'inconnue',
        ...(etat as object),
      }),
      partialize: ({ suivis, bienvenueFaite, retires, notifResultats, rappels, sujets, autorisation }) => ({
        suivis,
        bienvenueFaite,
        retires,
        notifResultats,
        rappels,
        sujets,
        autorisation,
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
 * Retire des équipes suivies celles qui ont disparu des données. N'agit que si les suivis sont relus (`pret`) et que
 * la collecte est complète : avec une compétition en échec, des équipes absentes ne sont pas pour autant disparues.
 */
export function nettoyerSuivis(
  club: Club | undefined,
  pret: boolean,
  retirer: (valides: string[]) => unknown = (valides) => useSuivi.getState().retirerInconnus(valides),
): void {
  if (!club || !pret || club.erreurs.length > 0) return;
  retirer(club.collectifs.map((c) => c.id));
}
