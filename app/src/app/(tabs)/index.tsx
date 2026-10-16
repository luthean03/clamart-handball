import { useRouter } from 'expo-router';
import { ajouterAgenda, sansRejet } from '../../actions/actions';
import { EtatSansDonnees } from '../../composants/EtatSansDonnees';
import { useMaintenant } from '../../donnees/maintenant';
import { useClub } from '../../donnees/requetes';
import { VueAccueil } from '../../ecrans/VueAccueil';
import { useSuivi } from '../../suivi/suivi';

export default function Accueil() {
  const { club, chargement, erreur, horsLigne, majRequise, rafraichir, rafraichissement } = useClub();
  const maintenant = useMaintenant();
  const suivis = useSuivi((s) => s.suivis);
  const routeur = useRouter();
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return (
    <VueAccueil
      club={club}
      maintenant={maintenant}
      suivis={suivis}
      horsLigne={horsLigne}
      majRequise={majRequise}
      rafraichissement={rafraichissement}
      rafraichir={rafraichir}
      onOuvrirEquipe={(id) => routeur.push(`/equipe/${id}`)}
      onOuvrirMatch={(id) => routeur.push(`/match/${id}`)}
      onAgenda={(m) => sansRejet(() => ajouterAgenda(m))}
      onReglages={() => routeur.push('/reglages')}
      onChoisirEquipes={() => routeur.push('/gerer-equipes')}
      onTousLesMatchs={() => routeur.push('/matchs')}
    />
  );
}
