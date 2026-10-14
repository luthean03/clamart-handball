import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, QueryClient, useQuery } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { URL_DONNEES } from '../config';
import { chargerClub } from './source';
import type { Club } from './types';

export const CLE_CLUB = ['club'] as const;
export const UN_MOIS = 1000 * 60 * 60 * 24 * 30;

export function creerClientRequetes(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { gcTime: UN_MOIS, staleTime: 5 * 60 * 1000, retry: 1 } },
  });
}

export const persisteur = createAsyncStoragePersister({ storage: AsyncStorage, key: 'clamart-cache-v1' });

/** Rafraîchit les données au retour au premier plan (si elles ont plus de 5 min). */
export function brancherPremierPlan(): () => void {
  const abonnement = AppState.addEventListener('change', (etat) => focusManager.setFocused(etat === 'active'));
  return () => abonnement.remove();
}

export function useClub() {
  const q = useQuery<Club, Error>({ queryKey: CLE_CLUB, queryFn: () => chargerClub(URL_DONNEES) });
  return {
    club: q.data,
    chargement: q.isPending,
    erreur: q.error,
    /** Le dernier rafraîchissement a échoué mais des données en cache sont affichées. */
    horsLigne: q.isError && q.data !== undefined,
    rafraichir: () => q.refetch(),
    rafraichissement: q.isRefetching,
  };
}
