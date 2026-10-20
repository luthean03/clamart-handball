import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, QueryClient, useQuery } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { URL_DONNEES } from '../config';
import { chargerClub, verifierClub } from './source';
import type { Club } from './types';

export const CLE_CLUB = ['club'] as const;
export const UN_MOIS = 1000 * 60 * 60 * 24 * 30;

/** setTimeout plafonne à 2^31-1 ms (~24,8 jours) : au-delà, le minuteur de ramasse-miettes se déclenche aussitôt. */
const GC_MAX = 2 ** 31 - 1;

export function creerClientRequetes(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { gcTime: Math.min(UN_MOIS, GC_MAX), staleTime: 5 * 60 * 1000, retry: 1 },
      // Une requête en erreur qui garde ses données (rafraîchissement raté) reste persistée : sinon le cache
      // hors ligne serait écrasé par un cache vide au premier échec réseau.
      dehydrate: { shouldDehydrateQuery: (q) => q.state.data !== undefined },
    },
  });
}

type Persisteur = ReturnType<typeof createAsyncStoragePersister>;

/**
 * Enveloppe un persisteur : un `club` illisible ou de forme inattendue est écarté à la restauration. L'app le
 * retélécharge alors au lieu d'afficher (ou de planter sur) un cache corrompu.
 */
export function persisteurVerifie(base: Persisteur): Persisteur {
  return {
    ...base,
    restoreClient: async () => {
      const restaure = await base.restoreClient();
      if (!restaure) return restaure;
      const queries = restaure.clientState.queries.filter((q) => {
        if (q.queryKey[0] !== CLE_CLUB[0]) return true;
        try {
          verifierClub(q.state.data);
          return true;
        } catch {
          return false;
        }
      });
      return { ...restaure, clientState: { ...restaure.clientState, queries } };
    },
  };
}

export const persisteur = persisteurVerifie(createAsyncStoragePersister({ storage: AsyncStorage, key: 'clamart-cache-v1' }));

/** « Réessayer » de l'écran d'erreur : repart d'un cache vide, pour ne jamais rejouer un cache corrompu. */
export async function reessayerApresErreur(retry: () => Promise<void>, p: Pick<Persisteur, 'removeClient'> = persisteur): Promise<void> {
  try {
    await p.removeClient();
  } catch {
    // Stockage illisible : on relance quand même.
  }
  await retry();
}

/** Rafraîchit les données au retour au premier plan (si elles ont plus de 5 min). */
export function brancherPremierPlan(): () => void {
  const abonnement = AppState.addEventListener('change', (etat) => focusManager.setFocused(etat === 'active'));
  return () => abonnement.remove();
}

export function useClub() {
  const q = useQuery<Club, Error>({ queryKey: CLE_CLUB, queryFn: () => chargerClub(URL_DONNEES) });
  const majRequise = q.error?.name === 'SchemaInconnu';
  return {
    club: q.data,
    chargement: q.isPending,
    erreur: q.error,
    /** Le fichier publié a un format plus récent que l'app : seule une mise à jour de l'app aide (même avec un cache). */
    majRequise,
    /** Le dernier rafraîchissement a échoué (et aucun n'est en cours) mais des données en cache sont affichées. */
    horsLigne: q.isError && q.data !== undefined && !q.isFetching && !majRequise,
    rafraichir: () => q.refetch(),
    rafraichissement: q.isRefetching,
  };
}
