import { useRouter } from 'expo-router';
import { EtatSansDonnees } from '../../composants/EtatSansDonnees';
import { useAgenda } from '../../composants/useAgenda';
import { useOngletAffiche } from '../../composants/useOngletAffiche';
import { useMaintenant } from '../../donnees/maintenant';
import { useClub } from '../../donnees/requetes';
import { VueAccueil } from '../../ecrans/VueAccueil';
import { routeMatch } from '../../notifications/liens';
import { useSuivi } from '../../suivi/suivi';

export default function Accueil() {
  const { club, chargement, erreur, horsLigne, majRequise, rafraichir, rafraichissement } = useClub();
  const maintenant = useMaintenant();
  const suivis = useSuivi((s) => s.suivis);
  const routeur = useRouter();
  const agenda = useAgenda({ surOnglets: true });
  // Hors de l'onglet affiché, rien n'est rendu : au retour, l'accueil repart en haut, sur la première carte.
  const affiche = useOngletAffiche();
  if (!affiche) return null;
  if (!club) return <EtatSansDonnees chargement={chargement} erreur={erreur} reessayer={rafraichir} />;
  return (
    <>
      <VueAccueil
        club={club}
        maintenant={maintenant}
        suivis={suivis}
        horsLigne={horsLigne}
        majRequise={majRequise}
        rafraichissement={rafraichissement}
        rafraichir={rafraichir}
        onOuvrirMatch={(id, equipe) => routeur.push(routeMatch(id, equipe) as never)}
        onAgenda={(m) => agenda.ouvrir(club, m.equipe.collectif, m)}
        onReglages={() => routeur.push('/reglages')}
        onChoisirEquipes={() => routeur.push('/gerer-equipes')}
        onTousLesMatchs={() => routeur.push({ pathname: '/matchs', params: { filtre: 'tous' } })}
      />
      {agenda.panneau}
    </>
  );
}
