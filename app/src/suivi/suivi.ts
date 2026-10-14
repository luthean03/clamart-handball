import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface EtatSuivi {
  /** Ids de collectifs suivis (ex. 'seniors-m'). */
  suivis: string[];
  bienvenueFaite: boolean;
  /** Collectifs retirés car absents des données, à signaler dans Réglages. */
  retires: string[];
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
    },
  ),
);

/** Vrai quand les équipes suivies ont été relues depuis le téléphone. */
export function useSuiviPret(): boolean {
  const [pret, setPret] = useState(() => useSuivi.persist.hasHydrated());
  useEffect(() => {
    const arreter = useSuivi.persist.onFinishHydration(() => setPret(true));
    if (useSuivi.persist.hasHydrated()) setPret(true);
    return arreter;
  }, []);
  return pret;
}
