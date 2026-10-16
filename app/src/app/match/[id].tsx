import { useLocalSearchParams, useRouter } from 'expo-router';
import { ouvrirItineraire, ouvrirLien, sansRejet } from '../../actions/actions';
import { EtatSansDonnees } from '../../composants/EtatSansDonnees';
import { useAgenda } from '../../composants/useAgenda';
import { useMaintenant } from '../../donnees/maintenant';
import { useClub } from '../../donnees/requetes';
import { VueMatch } from '../../ecrans/VueMatch';
import { parametre } from '../../notifications/liens';

export default function Match() {
  const p = useLocalSearchParams<{ id: string | string[]; equipe?: string | string[] }>();
  const id = parametre(p.id) ?? '';
  const equipe = parametre(p.equipe);
  const { club, chargement, erreur, rafraichir } = useClub();
  const maintenant = useMaintenant();
  const routeur = useRouter();
  const agenda = useAgenda();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return (
    <>
      <VueMatch
        club={club}
        matchId={id}
        equipeId={equipe}
        maintenant={maintenant}
        onRetour={() => (routeur.canGoBack() ? routeur.back() : routeur.replace('/'))}
        onItineraire={(salle) => sansRejet(() => ouvrirItineraire(salle))}
        onOuvrirLien={(url) => sansRejet(() => ouvrirLien(url))}
        onAgenda={(m) => agenda.ouvrir(m.equipe.collectif, m)}
      />
      {agenda.panneau}
    </>
  );
}
