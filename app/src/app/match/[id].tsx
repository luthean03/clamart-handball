import { useLocalSearchParams, useRouter } from 'expo-router';
import { ajouterAgenda, ouvrirItineraire, ouvrirLien, sansRejet } from '../../actions/actions';
import { EtatSansDonnees } from '../../composants/EtatSansDonnees';
import { useMaintenant } from '../../donnees/maintenant';
import { useClub } from '../../donnees/requetes';
import { VueMatch } from '../../ecrans/VueMatch';

export default function Match() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { club, chargement, erreur, rafraichir } = useClub();
  const maintenant = useMaintenant();
  const routeur = useRouter();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return (
    <VueMatch
      club={club}
      matchId={id}
      maintenant={maintenant}
      onRetour={() => (routeur.canGoBack() ? routeur.back() : routeur.replace('/'))}
      onItineraire={(salle) => sansRejet(() => ouvrirItineraire(salle))}
      onOuvrirLien={(url) => sansRejet(() => ouvrirLien(url))}
      onAgenda={(m) => sansRejet(() => ajouterAgenda(m))}
    />
  );
}
