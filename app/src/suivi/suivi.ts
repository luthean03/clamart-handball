import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface EtatSuivi {
  /** Ids de collectifs suivis (ex. 'seniors-m'). */
  suivis: string[];
  bienvenueFaite: boolean;
  /** Collectifs retirés car absents des données, à signaler dans Réglages. */
  retires: string[];
  /** Non persisté : vrai une fois la relecture terminée, succès ou échec. */
  pret: boolean;
  basculer: (id: string) => void;
  definirSuivis: (ids: string[]) => void;
  terminerBienvenue: () => void;
  retirerInconnus: (valides: string[]) => string[];
  effacerRetires: () => void;
}

export const useSuivi = create<EtatSuivi>()(
  persist(
    (set, get) => ({
      suivis: [],
      bienvenueFaite: false,
      retires: [],
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
    }),
    {
      name: 'clamart-suivi',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ suivis, bienvenueFaite, retires }) => ({ suivis, bienvenueFaite, retires }),
      // Appelé aussi en cas d'échec de lecture (stockage illisible, JSON corrompu) : sans cela, pret resterait faux.
      onRehydrateStorage: () => () => useSuivi.setState({ pret: true }),
    },
  ),
);

/** Vrai quand les équipes suivies ont été relues depuis le téléphone (ou que la relecture a échoué). */
export function useSuiviPret(): boolean {
  return useSuivi((s) => s.pret);
}
