import { useRoute } from 'expo-router';
import { useNavigationState } from 'expo-router/react-navigation';

/**
 * Vrai tant que cet onglet est l'onglet affiché de la barre. L'onglet ne rend son contenu que dans ce cas : en le
 * quittant pour un autre onglet, le contenu est démonté, et il est remonté à neuf au retour, dans sa vue de base
 * (en haut, filtres par défaut). Une fiche ouverte par-dessus les onglets (match, équipe) ne change pas l'onglet
 * affiché : au retour de la fiche, la vue est restée où on l'avait laissée.
 *
 * (Un remontage pendant que l'onglet est caché laissait la liste des matchs vide au retour : elle se plaçait sur
 * « Aujourd'hui » sans zone visible à remplir.)
 */
export function useOngletAffiche(): boolean {
  const moi = useRoute().key;
  return useNavigationState((etat) => etat.routes[etat.index]?.key) === moi;
}
